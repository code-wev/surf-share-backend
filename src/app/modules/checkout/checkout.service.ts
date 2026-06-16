import Stripe from "stripe";
import config from "../../config";
import prisma from "../../utils/prisma";
import AppError from "../../errors/AppError";

const stripe = new Stripe(config.stripe.secretKey);

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
      "None of the selected photos are available for purchase.",
    );
  }

  // Fetch all subscription configs to memory for quick access
  const configs = await prisma.subscriptionConfig.findMany();
  const configMap = new Map(configs.map(c => [c.tier, c]));

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
      }),
    );
  }

  let totalAmount = 0;
  type LocalLineItem = {
    price_data: {
      currency: string;
      product_data: { name: string; images?: string[] };
      unit_amount: number;
    };
    quantity: number;
  };

  const lineItems: LocalLineItem[] = [];

  for (const photo of photos) {
    totalAmount += photo.price;

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `Photo by ${photo.photographer.name}`,
          images: [photo.imageUrl.startsWith("http") ? photo.imageUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}${photo.imageUrl}`],
        },
        unit_amount: Math.round(photo.price * 100), // Stripe expects cents
      },
      quantity: 1,
    });
  }

  // 2. Create pending order
  const order = await prisma.order.create({
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

  // 3. Create Stripe Session
  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    success_url: `${config.stripe.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.stripe.frontendUrl}/cart`,
    client_reference_id: order.id, // Securely link Stripe back to our database Order
    customer_email: (await prisma.user.findUnique({ where: { id: userId } }))
      ?.email,
  });

  // 4. Update the order with the stripeSessionId
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return { url: session.url, sessionId: session.id };
};

const handleWebhook = async (body: Buffer, signature: string) => {
  let event: any;

  try {
    console.log("[WEBHOOK SERVICE] Constructing Stripe Event...");
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret,
    );
    console.log(`[WEBHOOK SERVICE] Event constructed successfully. Type: ${event.type}`);
  } catch (err: any) {
    console.error("[WEBHOOK SERVICE] Error constructing event:", err.message);
    throw new AppError(400, `Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    console.log("[WEBHOOK SERVICE] Processing checkout.session.completed...");
    interface MinimalSession {
      client_reference_id?: string;
      id?: string;
      payment_status?: string;
    }

    const session = event.data.object as unknown as MinimalSession;

    const orderId = session.client_reference_id;
    console.log(`[WEBHOOK SERVICE] Order ID: ${orderId}, Payment Status: ${session.payment_status}`);

    if (orderId && session.payment_status === "paid") {
      // Mark as PAID
      console.log("[WEBHOOK SERVICE] Fetching and updating order...");
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
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
      console.log(`[WEBHOOK SERVICE] Order ${orderId} successfully marked as PAID from webhook.`);

      // Execute Automated Split Payouts via Stripe Connect
      for (const item of updatedOrder.items) {
        const photographer = item.photo.photographer;
        console.log(`[WEBHOOK SERVICE] Processing item photoId: ${item.photoId}. Photographer Stripe ID: ${photographer.stripeAccountId}, OnboardingComplete: ${photographer.stripeOnboardingComplete}, Earnings: ${item.photographerEarnings}`);
        
        // If photographer has completed Stripe onboarding and is owed money
        if (
          photographer.stripeAccountId &&
          photographer.stripeOnboardingComplete &&
          item.photographerEarnings &&
          item.photographerEarnings > 0
        ) {
          try {
            console.log(`[WEBHOOK SERVICE] Attempting transfer of $${item.photographerEarnings} to ${photographer.stripeAccountId}...`);
            const transfer = await stripe.transfers.create({
              amount: Math.round(item.photographerEarnings * 100), // convert to cents
              currency: "usd", // must match charge currency
              destination: photographer.stripeAccountId,
              transfer_group: orderId, // links transfer to original payment
            });
            console.log(`[WEBHOOK SERVICE] Transferred $${item.photographerEarnings} to account ${photographer.stripeAccountId} for photo ${item.photoId}. Transfer ID: ${transfer.id}`);

            // NEW: Record the successful payout in our database ledger
            await prisma.orderItem.update({
              where: { id: item.id },
              data: { payoutStatus: "AUTOMATED_SUCCESS" },
            });
          } catch (transferError: any) {
            console.error(`[WEBHOOK SERVICE ERROR] Failed to transfer funds to ${photographer.stripeAccountId} for photo ${item.photoId}:`, transferError.message);
            // In a production app, we would log this to a failed_transfers table to retry later
          }
        } else {
          console.log(`[WEBHOOK SERVICE] Skipped transfer for photo ${item.photoId}. Conditions not met.`);
        }
      }
    } else {
      console.log("[WEBHOOK SERVICE] Order ID missing or payment not paid.");
    }
  }

  return { received: true };
};

const verifySession = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    const orderId = session.client_reference_id;
    if (orderId) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });
      return { status: "PAID" };
    }
  }

  return { status: session.payment_status };
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

const retryPayment = async (userId: string, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId, userId },
    include: {
      items: {
        include: {
          photo: {
            include: {
              photographer: { select: { name: true } }
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw new AppError(404, "Order not found.");
  }

  if (order.status === "PAID") {
    throw new AppError(400, "Order is already paid.");
  }

  type LocalLineItem = {
    price_data: {
      currency: string;
      product_data: { name: string; images?: string[] };
      unit_amount: number;
    };
    quantity: number;
  };

  const lineItems: LocalLineItem[] = order.items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: `Photo by ${item.photo.photographer.name}`,
        images: [item.photo.imageUrl.startsWith("http") ? item.photo.imageUrl : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}${item.photo.imageUrl}`],
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: 1,
  }));

  // Create new Stripe Session
  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    payment_intent_data: {
      transfer_group: order.id,
    },
    success_url: `${config.stripe.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.stripe.frontendUrl}/cart`,
    client_reference_id: order.id,
    customer_email: (await prisma.user.findUnique({ where: { id: userId } }))?.email,
  });

  // Update order with new stripeSessionId
  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return { url: session.url, sessionId: session.id };
};

export const CheckoutService = {
  createSession,
  retryPayment,
  handleWebhook,
  verifySession,
  getPurchasedPhotoIds,
  getPurchasedPhotos,
};
