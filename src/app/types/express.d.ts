import type { IAuthUser } from '../interfaces/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser;
    }
  }
}

export {};
