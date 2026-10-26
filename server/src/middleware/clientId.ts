import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include clientId
declare global {
  namespace Express {
    interface Request {
      clientId: string;
    }
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Middleware that reads and validates the x-client-id header.
 * Attaches req.clientId if valid, otherwise returns 400.
 */
export function clientIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientId = req.headers['x-client-id'];

  if (!clientId || typeof clientId !== 'string' || !UUID_REGEX.test(clientId)) {
    res.status(400).json({ error: 'Missing or invalid x-client-id header' });
    return;
  }

  req.clientId = clientId;
  next();
}
