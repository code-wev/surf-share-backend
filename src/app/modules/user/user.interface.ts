import type { UserRole } from '../../interfaces/auth.interface';

export interface IUserRegisterPayload {
  email: string;
  password: string;
}

export interface IUserLoginPayload {
  email: string;
  password: string;
}

export interface IUserResponse {
  id: string;
  email: string;
  role: UserRole;
}

export interface ILoginResponse {
  accessToken: string;
  user: IUserResponse;
}
