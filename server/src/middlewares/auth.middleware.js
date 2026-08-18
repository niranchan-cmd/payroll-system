const { verifyAccessToken } = require('../utils/jwt.utils');
const { errorResponse } = require('../utils/response.utils');
const prisma = require('../utils/prisma');

/**
 * Middleware: Verify JWT access token from Authorization header.
 * Attaches req.user = { id, email, role } on success.
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'No token provided. Please log in.', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session expired. Please refresh your token.', 401);
    }
    return errorResponse(res, 'Invalid token. Please log in again.', 401);
  }
}

/**
 * Middleware factory: Require one of the listed roles.
 * Usage: requireRole('SUPER_ADMIN', 'ADMIN')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Required role: ${roles.join(' or ')}.`,
        403
      );
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
