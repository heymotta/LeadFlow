import { Request, Response, NextFunction } from 'express';
import { config } from './config';

const AUTH_COOKIE = 'leadflowz_auth';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Webhook route is public (called by Evolution API)
  if (req.path.startsWith('/webhook/')) {
    return next();
  }

  // Login route is public
  if (req.path === '/api/auth/login') {
    return next();
  }

  // Static files are public
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Check auth cookie
  const token = req.cookies?.[AUTH_COOKIE];
  if (token === generateToken()) {
    return next();
  }

  res.status(401).json({ error: 'Não autorizado' });
}

export function loginHandler(req: Request, res: Response): void {
  const { password } = req.body;

  if (password === config.accessPassword) {
    res.cookie(AUTH_COOKIE, generateToken(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
}

export function logoutHandler(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE);
  res.json({ ok: true });
}

export function checkAuthHandler(req: Request, res: Response): void {
  const token = req.cookies?.[AUTH_COOKIE];
  if (token === generateToken()) {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
}

function generateToken(): string {
  // Simple deterministic token based on password — sufficient for single-user app
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(config.accessPassword).digest('hex');
}
