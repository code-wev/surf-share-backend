import axios from "axios";
import config from "../../config";
import AppError from "../../errors/AppError";

const getBaseUrl = () => {
  // Use sandbox for development, live for production
  return config.nodeEnv === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
};

/**
 * Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
 */
const generateAccessToken = async () => {
  try {
    if (!config.paypal.clientId || !config.paypal.clientSecret) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      config.paypal.clientId + ":" + config.paypal.clientSecret
    ).toString("base64");

    const response = await axios.post(
      `${getBaseUrl()}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data.access_token;
  } catch (error: any) {
    console.error("Failed to generate Access Token:", error?.response?.data || error.message);
    throw new AppError(500, "Failed to generate PayPal Access Token");
  }
};

/**
 * Create a PayPal Order.
 * @param amount Total amount for the order
 * @param currency Currency code (e.g., "USD")
 */
const createOrder = async (amount: number, currency: string = "USD") => {
  const accessToken = await generateAccessToken();
  const url = `${getBaseUrl()}/v2/checkout/orders`;

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      },
    ],
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data; // contains id (order ID) and status
  } catch (error: any) {
    console.error("Failed to create order:", error?.response?.data || error.message);
    throw new AppError(500, "Failed to create PayPal Order");
  }
};

/**
 * Capture payment for a PayPal order.
 * @param orderId PayPal Order ID
 */
const captureOrder = async (orderId: string) => {
  const accessToken = await generateAccessToken();
  const url = `${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`;

  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Failed to capture order:", error?.response?.data || error.message);
    throw new AppError(500, "Failed to capture PayPal Order");
  }
};

/**
 * Execute automated payouts to multiple recipients.
 * @param payouts Array of payout items (email, amount, currency, note)
 */
const executePayout = async (
  payouts: {
    receiver: string;
    amount: number;
    currency?: string;
    note?: string;
    senderItemId?: string;
  }[]
) => {
  const accessToken = await generateAccessToken();
  const url = `${getBaseUrl()}/v1/payments/payouts`;

  const payload = {
    sender_batch_header: {
      sender_batch_id: `Payouts_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      email_subject: "You have a payout from Surf Share!",
      email_message:
        "You have received a payout for selling your photos on Surf Share. Thanks for using our platform!",
    },
    items: payouts.map((p) => ({
      recipient_type: "EMAIL",
      amount: {
        value: p.amount.toFixed(2),
        currency: p.currency || "USD",
      },
      note: p.note || "Thanks for your patronage!",
      sender_item_id: p.senderItemId || `item_${Date.now()}`,
      receiver: p.receiver,
    })),
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Failed to execute payout:", error?.response?.data || error.message);
    throw new AppError(500, "Failed to execute PayPal Payout");
  }
};

export const PaypalService = {
  generateAccessToken,
  createOrder,
  captureOrder,
  executePayout,
};
