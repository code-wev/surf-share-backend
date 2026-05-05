export interface IForgotPasswordPayload {
  email: string;
}

export interface IVerifyOtpPayload {
  email: string;
  otp: string;
}

export interface IResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface IVerifyOtpResponse {
  success: boolean;
  message: string;
  resetToken: string;
}

export interface IForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface IResetPasswordResponse {
  success: boolean;
  message: string;
}
