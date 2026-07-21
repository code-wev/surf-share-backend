import prisma from "../../utils/prisma";
import AppError from "../../errors/AppError";
import { PaypalService } from "../paypal/paypal.service";

const createSession = async (userId: string, photoIds: string[]) => {
  // 1. Fetch real prices securely from DB
  const photos = await prisma.photo.findMany({
    where: {
      id: { in: photoIds },
      status: "APPROVED",
    },
    include: {
      photographer: {
        select: { name: true, subscriptionTier: true },
      },
    },
  });

  if (photos.length === 0) {
    throw new AppError(
      400,
      "None of the selected photos are available for purchase."
    );
  }

  // Fetch all subscription configs to memory for quick access
  const configs = await prisma.subscriptionConfig.findMany();
  const configMap = new Map(configs.map((c) => [c.tier, c]));

  // Ensure user isn't trying to buy photos they already bought
  const alreadyPurchased = await prisma.orderItem.findMany({
    where: {
      order: {
        userId: userId,
        status: "PAID",
      },
      photoId: { in: photoIds },
    },
    select: { photoId: true },
  });

  if (alreadyPurchased.length > 0) {
    const purchasedIds = alreadyPurchased.map((item) => item.photoId);
    throw new AppError(
      400,
      JSON.stringify({
        message: "You already own some of these photos.",
        purchasedIds,
      })
    );
  }

  let totalAmount = 0;
  for (const photo of photos) {
    totalAmount += photo.price;
  }

  // 2. Create pending order in DB
  const localOrder = await prisma.order.create({
    data: {
      userId,
      totalAmount,
      status: "PENDING",
      items: {
        create: photos.map((photo) => {
          const config = configMap.get(photo.photographer.subscriptionTier);
          const photographerSplit = config?.photographerSplit || 70; // fallback to 70%
          const photographerEarnings = (photo.price * photographerSplit) / 100;
          const platformFee = photo.price - photographerEarnings;

          return {
            photoId: photo.id,
            price: photo.price,
            photographerEarnings,
            platformFee,
          };
        }),
      },
    },
  });

  // 3. Create PayPal Order
  const paypalOrder = await PaypalService.createOrder(totalAmount, "USD");

  // 4. Update local order with PayPal Order ID
  await prisma.order.update({
    where: { id: localOrder.id },
    data: { paypalOrderId: paypalOrder.id },
  });

  return { orderId: paypalOrder.id };
};

const captureOrder = async (paypalOrderId: string) => {
  // 1. Capture the order via PayPal API
  const captureData = await PaypalService.captureOrder(paypalOrderId);

  if (captureData.status === "COMPLETED") {
    // 2. Mark order as PAID in DB
    const updatedOrder = await prisma.order.update({
      where: { paypalOrderId: paypalOrderId },
      data: { status: "PAID" },
      include: {
        items: {
          include: {
            photo: {
              include: { photographer: true },
            },
          },
        },
      },
    });

    // 3. Execute Automated Split Payouts via PayPal Payouts
    for (const item of updatedOrder.items) {
      const photographer = item.photo.photographer;
      console.log(
        `[CHECKOUT SERVICE] Processing item photoId: ${item.photoId}. Photographer PayPal Email: ${photographer.paypalEmail}, Connected: ${photographer.paypalConnected}, Earnings: ${item.photographerEarnings}`
      );

      if (
        photographer.paypalEmail &&
        photographer.paypalConnected &&
        item.photographerEarnings &&
        item.photographerEarnings > 0
      ) {
        try {
          console.log(
            `[CHECKOUT SERVICE] Attempting payout of $${item.photographerEarnings} to ${photographer.paypalEmail}...`
          );
          await PaypalService.executePayout([
            {
              receiver: photographer.paypalEmail,
              amount: item.photographerEarnings,
              currency: "USD",
              note: `Payout for photo ${item.photoId} sold on Surf Share`,
              senderItemId: `payout_${item.id}`,
            },
          ]);

          // Record successful payout
          await prisma.orderItem.update({
            where: { id: item.id },
            data: { payoutStatus: "AUTOMATED_SUCCESS" },
          });
          console.log(`[CHECKOUT SERVICE] Payout successful to ${photographer.paypalEmail}`);
        } catch (payoutError: any) {
          console.error(
            `[CHECKOUT SERVICE ERROR] Failed to payout to ${photographer.paypalEmail} for photo ${item.photoId}:`,
            payoutError.message
          );
        }
      } else {
        console.log(`[CHECKOUT SERVICE] Skipped automated payout for photo ${item.photoId}. Photographer not connected to PayPal.`);
      }
    }

    return { status: "COMPLETED" };
  } else {
    throw new AppError(400, "PayPal Order was not completed");
  }
};

const handleWebhook = async (body: Buffer, signature: string) => {
  // TODO: Implement actual PayPal webhook verification if needed
  // For now, since we actively capture the order on the server, the webhook is mostly a fallback.
  console.log("[WEBHOOK SERVICE] Received PayPal webhook notification.");
  return { received: true };
};

const getPurchasedPhotoIds = async (userId: string) => {
  const purchasedItems = await prisma.orderItem.findMany({
    where: {
      order: {
        userId,
        status: "PAID",
      },
    },
    select: { photoId: true },
  });

  return purchasedItems.map((item) => item.photoId);
};

const getPurchasedPhotos = async (userId: string) => {
  const purchasedIds = await getPurchasedPhotoIds(userId);
  return await prisma.photo.findMany({
    where: { id: { in: purchasedIds } },
    include: {
      location: true,
      photographer: { select: { name: true } },
    },
  });
};

const retryPayment = async (userId: string, localOrderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: localOrderId, userId },
  });

  if (!order) {
    throw new AppError(404, "Order not found.");
  }

  if (order.status === "PAID") {
    throw new AppError(400, "Order is already paid.");
  }

  // Create new PayPal Order
  const paypalOrder = await PaypalService.createOrder(order.totalAmount, "USD");

  // Update order with new paypalOrderId
  await prisma.order.update({
    where: { id: order.id },
    data: { paypalOrderId: paypalOrder.id },
  });

  return { orderId: paypalOrder.id };
};

export const CheckoutService = {
  createSession,
  captureOrder,
  retryPayment,
  handleWebhook,
  getPurchasedPhotoIds,
  getPurchasedPhotos,
};
