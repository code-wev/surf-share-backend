import Stripe from "stripe";
import config from "../../config";
import prisma from "../../utils/prisma";
import AppError from "../../errors/AppError";

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: "2025-02-24.acacia" as any, // fallback for newest SDKs
});

const createSession = async (userId: string, photoIds: string[]) => {
  // 1. Fetch real prices securely from DB
  const photos = await prisma.photo.findMany({
    where: {
      id: { in: photoIds },
      status: "APPROVED",
    },
    include: {
      photographer: {
        select: { name: true },
      },
    },
  });

  if (photos.length === 0) {
    throw new AppError(400, "None of the selected photos are available for purchase.");
  }

  // Ensure user isn't trying to buy photos they already bought
  // (Optional: depending on requirements. For now, skip to keep simple)

  let totalAmount = 0;
  const lineItems: any[] = [];

  for (const photo of photos) {
    totalAmount += photo.price;
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `Photo by ${photo.photographer.name}`,
          images: [photo.imageUrl],
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
        create: photos.map((photo) => ({
          photoId: photo.id,
          price: photo.price,
        })),
      },
    },
  });

  // 3. Create Stripe Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "paypal"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${config.stripe.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.stripe.frontendUrl}/cart`,
    client_reference_id: order.id, // Securely link Stripe back to our database Order
    customer_email: (await prisma.user.findUnique({ where: { id: userId } }))?.email,
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
    event = stripe.webhooks.constructEvent(body, signature, config.stripe.webhookSecret);
  } catch (err: any) {
    throw new AppError(400, `Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    const orderId = session.client_reference_id;

    if (orderId) {
      // Mark as PAID
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });
      console.log(`Order ${orderId} successfully marked as PAID from webhook.`);
    }
  }

  return { received: true };
};

export const CheckoutService = {
  createSession,
  handleWebhook,
};
