import type { UserRole, ModeratorPermission } from '../../interfaces/auth.interface';

export interface IBaseUserPayload {
  name: string;
  email: string;
  password?: string;
  countryName?: string;
  address?: string;
  phoneNumber?: string;
}

export interface ISurferRegisterPayload extends IBaseUserPayload {}

export interface IPhotographerRegisterPayload extends IBaseUserPayload {
  paypalEmail: string;
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
  role: UserRole;
  countryName?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  paypalEmail?: string | null;
  permissions?: ModeratorPermission[];
}

export interface ILoginResponse {
  accessToken: string;
  user: IUserResponse;
}
