# PayrollOS — Payroll Management System

A full-stack payroll processing system built with React, Node.js/Express, PostgreSQL (Prisma ORM), and deployable to Vercel + Neon.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL 16 (local) / Neon (production) |
| ORM | Prisma |
| Auth | JWT (httpOnly refresh token + in-memory access token) |

## Features

- **Client Management** — Multi-tenant (multiple companies)
- **CTC Structure** — Versioned salary component builder (Basic, HRA, Allowances)
- **Employee Management** — Add individually or bulk import via Excel
- **Salary Engine** — Zero hardcoded values; all from DB config
- **Payroll Runs** — Monthly run with proration, PF, ESI deductions, net pay
- **Export** — CSV payslip per payroll run

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 16 (`brew install postgresql@16`)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/payroll-system.git
cd payroll-system

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 4. Run database migrations + seed
cd server
npm run db:migrate
npm run db:seed

# 5. Start servers (in two terminals)
# Terminal 1:
cd server && npm run dev     # → http://localhost:5001

# Terminal 2:
cd client && npm run dev     # → http://localhost:5173
```

**Login:** `admin@payroll.com` / `Admin@123`

## Deployment

See the full guide → [Vercel + Neon Deployment](./DEPLOY.md)

## Project Structure

```
payroll-system/
├── .env.example          ← Environment variable template
├── client/               ← React + Vite frontend
│   ├── src/
│   │   ├── pages/        ← All page components
│   │   ├── components/   ← Shared components (AppLayout)
│   │   ├── context/      ← AuthContext, ClientContext
│   │   └── services/     ← Axios API client
│   └── vercel.json       ← Vercel SPA config
└── server/               ← Express backend
    ├── src/
    │   ├── controllers/  ← Route handlers
    │   ├── routes/       ← Express routers
    │   ├── services/     ← Salary + Payroll engine
    │   ├── middlewares/  ← JWT auth
    │   └── utils/        ← Prisma client, JWT utils
    ├── prisma/
    │   ├── schema.prisma ← Database schema
    │   └── seed.js       ← Creates super admin
    ├── api/
    │   └── index.js      ← Vercel serverless entry
    └── vercel.json       ← Vercel function config
```
