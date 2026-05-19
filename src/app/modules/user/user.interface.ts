import type {
  UserRole,
  ModeratorPermission,
} from "../../interfaces/auth.interface";

export interface IBaseUserPayload {
  name: string;
  email: string;
  password?: string;
  countryName?: string;
  address?: string;
  phoneNumber?: string;
}

export interface ISurferRegisterPayload extends IBaseUserPayload {}

export interface ISocialAccount {
  platform: string; // "Instagram"
  url: string; // "https://instagram.com/username"
}

export interface IPhotographerRegisterPayload extends IBaseUserPayload {
  paypalEmail: string;
  socialAccounts?: ISocialAccount[];
}

export interface IModeratorRegisterPayload extends IBaseUserPayload {
  permissions: ModeratorPermission[];
}

export interface IUserLoginPayload {
  email: string;
  password: string;
}

export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  countryName?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  paypalEmail?: string | null;
  permissions?: string[] | null;
  socialAccounts?: ISocialAccount[];
  profileImageUrl?: string | null;
}

export interface ILoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: IUserResponse;
}
