// ─── ACCOUNT LOCKOUT (In-Memory) ─────────────────────────────────────────────
const loginAttempts = new Map(); // email → { count, lockedUntil }
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

function checkLockout(email) {
  const record = loginAttempts.get(email);
  if (!record) return null;
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const remainingMs = record.lockedUntil - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { locked: true, remainingMinutes, remainingMs };
  }
  return null;
}

function recordFailedAttempt(email) {
  const record = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  loginAttempts.set(email, record);
  return MAX_ATTEMPTS - record.count;
}

function clearAttempts(email) {
  loginAttempts.delete(email);
}
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const { successResponse, errorResponse } = require('../utils/response.utils');

const REFRESH_TOKEN_EXPIRES_DAYS = 7;

function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  };
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 'Email and password are required.', 400);
  }

  const normalizedEmail = email.toLowerCase();

  // Check lockout
  const lockout = checkLockout(normalizedEmail);
  if (lockout) {
    return res.status(429).json({
      success: false,
      message: `Account locked. Try again in ${lockout.remainingMinutes} minute${lockout.remainingMinutes > 1 ? 's' : ''}.`,
      remainingMinutes: lockout.remainingMinutes,
      locked: true,
    });
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.is_active) {
    const attemptsRemaining = recordFailedAttempt(normalizedEmail);
    if (attemptsRemaining <= 0) {
      return res.status(429).json({
        success: false,
        message: 'Account locked for 10 minutes due to too many failed attempts.',
        locked: true,
        remainingMinutes: 10,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials.',
      attemptsRemaining,
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const attemptsRemaining = recordFailedAttempt(normalizedEmail);
    if (attemptsRemaining <= 0) {
      return res.status(429).json({
        success: false,
        message: 'Account locked for 10 minutes due to too many failed attempts.',
        locked: true,
        remainingMinutes: 10,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials.',
      attemptsRemaining,
    });
  }

  // Clear attempts on successful login
  clearAttempts(normalizedEmail);

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ ...payload, jti: crypto.randomUUID() });

  // Store refresh token in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { token: refreshToken, user_id: user.id, expires_at: expiresAt },
  });

  // Set refresh token as httpOnly cookie with strict path
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

  return successResponse(
    res,
    {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
    'Login successful.'
  );
}

/**
 * POST /api/v1/auth/refresh
 * Implements Refresh Token Rotation (RTR)
 */
async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return errorResponse(res, 'No refresh token provided.', 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    res.clearCookie('refreshToken', { ...getRefreshCookieOptions(), maxAge: undefined });
    return errorResponse(res, 'Invalid or expired refresh token. Please log in again.', 401);
  }

  // Check DB for existing token
  const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
  if (!storedToken || storedToken.expires_at < new Date()) {
    res.clearCookie('refreshToken', { ...getRefreshCookieOptions(), maxAge: undefined });
    return errorResponse(res, 'Session expired. Please log in again.', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.is_active) {
    res.clearCookie('refreshToken', { ...getRefreshCookieOptions(), maxAge: undefined });
    return errorResponse(res, 'User not found or inactive.', 401);
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const newAccessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken({ ...payload, jti: crypto.randomUUID() });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  // Refresh Token Rotation: Delete old token and insert new rotated token atomically
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: storedToken.id } }),
    prisma.refreshToken.create({
      data: { token: newRefreshToken, user_id: user.id, expires_at: expiresAt },
    }),
  ]);

  // Set new rotated refresh token in cookie
  res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

  return successResponse(
    res,
    {
      accessToken: newAccessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
    'Token refreshed.'
  );
}

/**
 * POST /api/v1/auth/logout
 */
async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  }

  // Explicitly clear cookie using identical path, sameSite, and secure attributes
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
  });

  return successResponse(res, null, 'Logged out successfully.');
}

/**
 * GET /api/v1/auth/me
 */
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, name: true, email: true, role: true, created_at: true },
  });
  return successResponse(res, user);
}

/**
 * POST /api/v1/auth/change-password
 * Authenticated password update with session revocation
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return errorResponse(res, 'Current password and new password are required.', 400);
  }

  if (newPassword.length < 6) {
    return errorResponse(res, 'New password must be at least 6 characters long.', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return errorResponse(res, 'User not found.', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return errorResponse(res, 'Current password is incorrect.', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password and revoke all existing refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prisma.refreshToken.deleteMany({
      where: { user_id: user.id },
    }),
  ]);

  return successResponse(res, null, 'Password changed successfully. Please log in again with your new credentials.');
}

module.exports = { login, refresh, logout, me, changePassword };
