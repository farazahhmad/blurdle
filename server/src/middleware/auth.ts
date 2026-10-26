import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUserPayload {
  userId: string;
  email: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return next();
    }

    const secret = process.env.JWT_SECRET || 'blurdle-dev-secret-key-12345';
    const decoded = jwt.verify(token, secret) as AuthUserPayload;
    req.user = decoded;
  } catch {
    // If token is invalid or expired, continue as guest without blocking
  }
  next();
}
