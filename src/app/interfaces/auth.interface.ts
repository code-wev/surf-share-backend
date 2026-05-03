export type UserRole = 'SURFER' | 'PHOTOGRAPHER' | 'MODERATOR' | 'ADMIN';
export type ModeratorPermission = 'APPROVE_PHOTO' | 'ADD_LOCATION' | 'ALL_ACCESS';

export interface IAuthUser {
  userId: string;
  email: string;
  role: UserRole;
}
