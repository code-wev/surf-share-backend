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
      const message = `Your OTP for password reset is: ${otp}. This OTP will expire in 15 minutes.`;

      const htmlMessage = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 10px 30px rgba(12, 49, 115, 0.08);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0c3173 0%, #1e4d9c 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">SurfShare</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 15px;">Reset Your Password</p>
          </div>

          <!-- Body -->
          <div style="padding: 50px 40px; text-align: center; background: #ffffff;">
            <p style="font-size: 17px; color: #333333; margin: 0 0 12px 0;">
              Hello,
            </p>
            
            <p style="color: #555555; font-size: 15.5px; line-height: 1.65; max-width: 460px; margin: 0 auto 35px auto;">
              You have requested to reset your password. Use the verification code below to proceed.
            </p>

            <!-- OTP Box -->
            <div style="background: #f8fafc; border: 2px solid #0c3173; border-radius: 12px; padding: 28px; margin: 30px auto; max-width: 280px;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
                VERIFICATION CODE
              </p>
              <p style="font-size: 42px; font-weight: 700; color: #0c3173; letter-spacing: 8px; margin: 0; font-family: monospace;">
                ${otp}
              </p>
            </div>

            <p style="color: #e11d48; font-size: 14.5px; font-weight: 600; margin: 20px 0 35px 0;">
              This code expires in 15 minutes
            </p>

            <p style="color: #64748b; font-size: 14.5px; line-height: 1.7;">
              If you didn't request a password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #94a3b8; font-size: 13px;">
              © 2026 SurfShare. All rights reserved.<br>
            </p>
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
   * Send Moderator Credentials email
   */
  async sendModeratorCredentials(
    email: string,
    name: string,
    tempPassword: string,
  ): Promise<boolean> {
    try {
      const message = `Hello ${name},\n\nYou have been added as a Moderator to SurfShare. Your temporary login credentials are:\n\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in and change your password immediately.`;

      const htmlMessage = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 10px 30px rgba(12, 49, 115, 0.08);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0c3173 0%, #1e4d9c 100%); padding: 40px 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Welcome to SurfShare</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 16px;">Invitation to Moderator Account</p>
          </div>

          <!-- Body -->
          <div style="padding: 50px 40px; background: #ffffff;">
            <p style="font-size: 17px; color: #1e2937; margin: 0 0 10px 0;">
              Hello <strong>${name}</strong>,
            </p>
            
            <p style="color: #475569; font-size: 15.5px; line-height: 1.7; margin-bottom: 35px;">
              You have been appointed as a <strong>Moderator</strong> on SurfShare. 
              Here are your temporary login credentials:
            </p>

            <!-- Credentials Card -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; margin-bottom: 35px;">
              <div style="margin-bottom: 20px;">
                <p style="margin: 0 0 6px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  EMAIL ADDRESS
                </p>
                <p style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 500;">${email}</p>
              </div>
              
              <div>
                <p style="margin: 0 0 6px 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  TEMPORARY PASSWORD
                </p>
                <p style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 500; font-family: monospace; letter-spacing: 1px;">${tempPassword}</p>
              </div>
            </div>

            <div style="background: #fef3c7; border: 1px solid #facc15; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 35px;">
              <p style="color: #854d0e; font-size: 15px; font-weight: 600; margin: 0;">
                Please change your password immediately after your first login for security reasons.
              </p>
            </div>

            <p style="color: #64748b; font-size: 14.5px; line-height: 1.7; text-align: center;">
              Thank you for joining the SurfShare moderation team.<br>
              We're excited to have you help maintain our community.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #94a3b8; font-size: 13px;">
              © 2026 SurfShare. All rights reserved.<br>
          </div>
        </div>
      `;

      await this.sendEmail({
        email,
        subject: "Your SurfShare Moderator Credentials",
        message,
        html: htmlMessage,
      });

      return true;
    } catch (error) {
      console.error("Failed to send moderator credentials email:", error);
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
