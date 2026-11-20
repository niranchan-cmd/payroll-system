require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { globalLimiter } = require('./middlewares/rateLimiter.middleware');

const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const structureRoutes = require('./routes/structure.routes');
const { flatRouter: structureFlatRouter } = require('./routes/structure.routes');
const employeeRoutes = require('./routes/employee.routes');
const { flatRouter: employeeFlatRouter } = require('./routes/employee.routes');
const payrollRoutes = require('./routes/payroll.routes');
const importRoutes = require('./routes/import.routes');
const reportRoutes = require('./routes/report.routes');
const { errorResponse } = require('./utils/response.utils');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  })
);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── GLOBAL RATE LIMITING ──────────────────────────────────────────────────────
app.use('/api/', globalLimiter);

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clients', clientRoutes);

// Nested: /api/v1/clients/:clientId/structures
app.use('/api/v1/clients/:clientId/structures', structureRoutes);

// Flat: /api/v1/structures/:id
app.use('/api/v1/structures', structureFlatRouter);

// Nested: /api/v1/clients/:clientId/employees
app.use('/api/v1/clients/:clientId/employees', employeeRoutes);

// Flat: /api/v1/employees/:id
app.use('/api/v1/employees', employeeFlatRouter);

// Payroll: /api/v1/clients/:clientId/payroll
app.use('/api/v1/clients/:clientId/payroll', payrollRoutes);

// Bulk Import: /api/v1/clients/:clientId/employees/import
app.use('/api/v1/clients/:clientId/employees/import', importRoutes);

// Reports: /api/v1/reports
app.use('/api/v1/reports', reportRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  return errorResponse(res, `Route not found: ${req.method} ${req.path}`, 404);
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err);
  }

  if (err.message === 'Not allowed by CORS') {
    return errorResponse(res, 'CORS policy violation.', 403);
  }

  // Prisma known errors
  if (err.code === 'P2002') {
    return errorResponse(res, 'A record with that value already exists.', 409);
  }
  if (err.code === 'P2025') {
    return errorResponse(res, 'Record not found.', 404);
  }

  return errorResponse(res, err.message || 'Internal server error.', err.status || 500);
});

// ─── START ────────────────────────────────────────────────────────────────────

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Payroll Server running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API Base    : http://localhost:${PORT}/api/v1\n`);
  });
}

module.exports = app;
