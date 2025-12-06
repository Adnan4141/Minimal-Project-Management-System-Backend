# Backend API - Project Management System

RESTful API backend built with Express.js, Prisma ORM, and PostgreSQL for the Project Management System.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **ORM:** Prisma
- **Authentication:** JWT (Access + Refresh Tokens)
- **OAuth:** Google & Facebook integration
- **Validation:** Zod
- **Real-time:** Socket.IO
- **Security:** Helmet, CORS, Rate Limiting

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:push
# OR
npm run db:migrate

# Generate Prisma Client
npm run db:generate

# Start development server
npm run dev
```

API will be available at `http://localhost:5000/api`

## Project Structure

```
src/
├── config/           # Environment configuration
├── controllers/      # Request handlers (business logic)
├── middleware/       # Auth, validation, error handling
├── routes/           # API route definitions
├── services/         # Service layer (OAuth, etc.)
├── types/            # TypeScript type definitions
├── utils/            # Helper functions (JWT, password hashing)
├── validations/      # Zod validation schemas
└── prisma/           # Prisma client and seed scripts
```

## API Endpoints

- **Auth:** `/api/auth/*` - Login, register, OAuth, token refresh
- **Users:** `/api/users/*` - User management (Admin/Manager only)
- **Projects:** `/api/projects/*` - Project CRUD operations
- **Sprints:** `/api/sprints/*` - Sprint management
- **Tasks:** `/api/tasks/*` - Task management and assignments
- **Comments:** `/api/comments/*` - Task comments (threaded)
- **Time Logs:** `/api/timelogs/*` - Time tracking
- **Reports:** `/api/reports/*` - Analytics and reports
- **Attachments:** `/api/attachments/*` - File uploads

## Key Features

- ✅ JWT-based authentication with refresh tokens
- ✅ OAuth integration (Google, Facebook)
- ✅ Role-based access control (Admin, Manager, Member)
- ✅ Project & Sprint management
- ✅ Task assignment and tracking
- ✅ Time logging
- ✅ Activity logging
- ✅ Real-time updates via Socket.IO
- ✅ Input validation with Zod
- ✅ Error handling middleware
- ✅ Rate limiting and security headers

## Database

Uses Prisma ORM with PostgreSQL. Schema defined in `prisma/schema.prisma`.

**Key Models:**
- User (with roles and authentication)
- Project (with status tracking)
- Sprint (numbered sprints per project)
- Task (with status workflow)
- TaskAssignment (many-to-many)
- Comment (with threading support)
- TimeLog (time tracking)
- ActivityLog (audit trail)
- Attachment (file management)

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
FACEBOOK_APP_ID=your-facebook-app-id
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Run production server
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database (dev)
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

## License

Private project - All rights reserved

