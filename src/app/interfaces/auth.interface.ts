export type UserRole = 'USER' | 'ADMIN';

export interface IAuthUser {
  userId: string;
  email: string;
  role: UserRole;
}
