import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import config from '../config';
import AppError from '../errors/AppError';
import type { IAuthUser, UserRole } from '../interfaces/auth.interface';

const isAuthUser = (payload: unknown): payload is IAuthUser => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  const role = candidate.role as UserRole;

  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    (role === 'USER' || role === 'ADMIN')
  );
};

const auth = (...requiredRoles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError(401, 'Authorization token is missing.'));
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);

      if (!isAuthUser(decoded)) {
        return next(new AppError(401, 'Invalid authorization token.'));
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(decoded.role)) {
        return next(new AppError(403, 'You do not have permission to access this resource.'));
      }

      req.user = decoded;
      return next();
    } catch (_error) {
      return next(new AppError(401, 'Invalid or expired authorization token.'));
    }
  };
};

export default auth;
