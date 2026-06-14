import Stripe from "stripe";
import config from "../../config";
import prisma from "../../utils/prisma";
import AppError from "../../errors/AppError";

const stripe = new Stripe(config.stripe.secretKey as string, {
  apiVersion: "2022-11-15" as any, // Bypass strict type checking for API version
});

const generateConnectLink = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found.");

  let accountId = user.stripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "AU", // Default to Australia since map is locked to Oceania
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      tos_acceptance: {
        service_agreement: "recipient",
      },
    });

    accountId = account.id;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: accountId },
    });
  }

  // Generate the onboarding link
  const frontendUrl = "http://localhost:3000"; // Should be process.env.CLIENT_URL
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${frontendUrl}/profile?stripe_refresh=true`,
    return_url: `${frontendUrl}/profile?stripe_return=true`,
    type: "account_onboarding",
  });

  return accountLink.url;
};

const checkOnboardingStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.stripeAccountId) {
    return { isComplete: false };
  }

  const account = await stripe.accounts.retrieve(user.stripeAccountId);

  // Checks if they submitted details and if transfers are active
  const isComplete = account.details_submitted && account.capabilities?.transfers === "active";

  if (isComplete !== user.stripeOnboardingComplete) {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeOnboardingComplete: isComplete },
    });
  }

  return { isComplete };
};

export const StripeConnectService = {
  generateConnectLink,
  checkOnboardingStatus,
};
