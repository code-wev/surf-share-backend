import nodemailer, { type Transporter } from "nodemailer";
import config from "../config";

interface IEmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  /**
   * Send OTP email
   */
  async sendOtpEmail(email: string, otp: string): Promise<boolean> {
    try {
      const message = `Your OTP for password reset is: ${otp}\n\nThis OTP will expire in 15 minutes.`;

      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0c3173 0%, #09a3dc 100%); padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">SurfShare</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f8f9fa;">
            <p style="color: #333; font-size: 16px;">Hello,</p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              You requested a password reset. Use the OTP below to verify your identity:
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #0c3173;">
              <p style="font-size: 32px; font-weight: bold; color: #0c3173; letter-spacing: 2px; margin: 0;">
                ${otp}
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              ⏱️ This OTP will expire in 15 minutes
            </p>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
          
          <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            <p style="margin: 0;">© 2026 SurfShare. All rights reserved.</p>
          </div>
        </div>
      `;

      await this.sendEmail({
        email,
        subject: "Password Reset OTP - SurfShare",
        message,
        html: htmlMessage,
      });

      return true;
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      return false;
    }
  }

  /**
   * Send generic email
   */
  private async sendEmail(options: IEmailOptions): Promise<void> {
    const mailOptions = {
      from: config.email.from,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message,
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Verify transporter connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("Email service connected successfully");
      return true;
    } catch (error) {
      console.error("Email service connection failed:", error);
      return false;
    }
  }
}

export default new EmailService();
