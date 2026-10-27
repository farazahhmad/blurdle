import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { Game } from '../models/Game';
import { authLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const googleSchema = z.object({
  credential: z.string().min(1, 'Google credential token is required'),
});

const mergeSchema = z.object({
  clientId: z.string().min(1, 'clientId is required'),
});

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'blurdle-dev-secret-key-12345';
}

function setAuthCookie(res: Response, user: IUser): void {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
  };
  const secret = getJwtSecret();
  const token = jwt.sign(payload, secret, { expiresIn: '30d' });

  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

/**
 * POST /api/auth/register
 */
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid registration data', 400);
    }
    const { email, password, displayName } = parsed.data;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      displayName: displayName.trim(),
    });

    setAuthCookie(res, user);
    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0]?.message ?? 'Invalid login data', 400);
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new AppError('Invalid email or password', 401);
    }

    setAuthCookie(res, user);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/google
 */
router.post('/google', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      throw new AppError('Google sign-in is not configured on this server', 501);
    }

    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid Google credential', 400);
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError('Failed to verify Google token payload', 401);
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
    });

    if (!user) {
      user = await User.create({
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        displayName: payload.name || payload.email.split('@')[0],
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      await user.save();
    }

    setAuthCookie(res, user);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (_req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 */
router.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  res.json({
    user: {
      id: req.user.userId,
      email: req.user.email,
      displayName: req.user.displayName,
    },
  });
});

/**
 * POST /api/auth/merge
 * Merges guest games for the given clientId with the authenticated user account.
 */
router.post('/merge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Must be logged in to merge games', 401);
    }

    const parsed = mergeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid clientId', 400);
    }

    const { clientId } = parsed.data;
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    // Find all games played by this guest client
    const guestGames = await Game.find({ clientId });

    for (const gGame of guestGames) {
      // Check if user already has a game for this puzzleNumber
      const userGame = await Game.findOne({ userId, puzzleNumber: gGame.puzzleNumber });
      if (!userGame) {
        // User has no game for this puzzle, attach guest game to user
        gGame.userId = userId;
        await gGame.save();
      } else {
        // If user already has a game, keep the one that is finished or has more guesses
        const gIsFinished = gGame.status === 'won' || gGame.status === 'lost';
        const uIsFinished = userGame.status === 'won' || userGame.status === 'lost';

        if (gIsFinished && !uIsFinished) {
          // Replace userGame with gGame
          await Game.deleteOne({ _id: userGame._id });
          gGame.userId = userId;
          await gGame.save();
        } else if (
          (!gIsFinished && !uIsFinished && gGame.guesses.length > userGame.guesses.length) ||
          (gIsFinished && uIsFinished && gGame.guesses.length < userGame.guesses.length && gGame.status === 'won')
        ) {
          await Game.deleteOne({ _id: userGame._id });
          gGame.userId = userId;
          await gGame.save();
        } else {
          // User game is better or equal; we can remove or leave guest game
          // Remove guest game to avoid duplicate state
          await Game.deleteOne({ _id: gGame._id });
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
