const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const { successResponse, errorResponse } = require('../utils/response.utils');

const REFRESH_TOKEN_EXPIRES_DAYS = 7;

/**
 * POST /api/v1/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 'Email and password are required.', 400);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.is_active) {
    return errorResponse(res, 'Invalid credentials.', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return errorResponse(res, 'Invalid credentials.', 401);
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token in DB
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

  await prisma.refreshToken.create({
    data: { token: refreshToken, user_id: user.id, expires_at: expiresAt },
  });

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });

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
    return errorResponse(res, 'Invalid or expired refresh token. Please log in again.', 401);
  }

  // Check DB
  const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
  if (!storedToken || storedToken.expires_at < new Date()) {
    return errorResponse(res, 'Session expired. Please log in again.', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.is_active) {
    return errorResponse(res, 'User not found.', 401);
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const newAccessToken = signAccessToken(payload);

  return successResponse(res, { accessToken: newAccessToken }, 'Token refreshed.');
}

/**
 * POST /api/v1/auth/logout
 */
async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
    res.clearCookie('refreshToken');
  }
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

module.exports = { login, refresh, logout, me };
