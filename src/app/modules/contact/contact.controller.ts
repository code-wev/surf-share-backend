import { RequestHandler } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import emailService from "../../utils/emailService";
import AppError from "../../errors/AppError";
import config from "../../config";

const sendContactEmail: RequestHandler = catchAsync(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    throw new AppError(400, "Missing required fields.");
  }

  const emailHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 10px 30px rgba(12, 49, 115, 0.08);">
      <div style="background: linear-gradient(135deg, #0c3173 0%, #1e4d9c 100%); padding: 40px 30px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Contact Submission</h1>
      </div>
      <div style="padding: 40px;">
        <p style="font-size: 16px; color: #333;"><strong>From:</strong> ${name} (${email})</p>
        <p style="font-size: 16px; color: #333;"><strong>Subject:</strong> ${subject || "No Subject"}</p>
        <div style="margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; color: #444;">
          ${message.replace(/\n/g, "<br>")}
        </div>
      </div>
    </div>
  `;

  await emailService.sendEmail({
    email: config.email.adminEmail,
    subject: `Contact Request: ${subject || "New Message"}`,
    message: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}`,
    html: emailHtml,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Email sent successfully.",
    data: null,
  });
});

export const ContactController = {
  sendContactEmail,
};
