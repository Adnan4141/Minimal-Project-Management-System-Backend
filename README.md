# Multi-Vendor eCommerce Marketplace — Backend API

> Backend API for a multi-vendor marketplace supporting multiple sellers, single checkout, order splitting, commission calculations, and automated payouts.

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 14+ (or compatible database)
- **npm** or **yarn** or **pnpm**

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Set up database
npm run db:push
# OR
npm run db:migrate

# 4. Generate Prisma Client
npm run db:generate

# 5. (Optional) Seed database
npm run db:seed

# 6. Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Run production server |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:migrate` | Create and run migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database with sample data |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Validation:** Zod
- **Real-time:** Socket.IO

## Project Structure

```
src/
├── config/           # Configuration files
├── routes/           # API route handlers
├── controllers/      # Business logic
├── services/         # Service layer
├── middleware/       # Express middleware
├── utils/            # Helper functions
├── types/            # TypeScript types
├── prisma/           # Prisma files
│   └── seed.ts      # Database seed script
└── server.ts         # Application entry point
```

## API Documentation

See `Backend.md` for complete API documentation.

## License

Private project - All rights reserved

