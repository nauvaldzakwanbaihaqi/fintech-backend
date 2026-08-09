# Fintech Backend

A robust backend application for fintech operations, built with TypeScript and Express.

## Project Description

This is a fintech backend service that handles financial transactions with a focus on transfers. It provides a secure and scalable API for managing financial operations.

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Package Manager**: pnpm
- **Validation**: Header validation middleware

## Project Structure

```
├── src/
│   ├── index.ts                 # Application entry point
│   ├── controllers/
│   │   └── transferController.ts  # Transfer request handlers
│   ├── db/
│   │   ├── main.ts              # Database connection
│   │   └── schema.ts            # Database schema definitions
│   ├── middlewares/
│   │   └── validateHeader.ts    # Header validation middleware
│   └── routes/
│       └── transferRoutes.ts    # Transfer API routes
├── drizzle.config.ts            # Drizzle ORM configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Project dependencies
└── pnpm-lock.yaml              # Dependency lock file
```

## Installation

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- PostgreSQL database

### Setup

1. Clone the repository:

```bash
git clone https://github.com/nauvaldzakwanbaihaqi/fintech-backend.git
cd fintech-backend
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure environment variables:
   Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fintech_db
PORT=3000
NODE_ENV=development
```

4. Setup database:

```bash
pnpm run db:migrate
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build TypeScript to JavaScript
- `pnpm start` - Start production server
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Drizzle Studio for database management

## API Endpoints

### Transfer Endpoints

- `POST /api/transfers` - Create a new transfer
- `GET /api/transfers/:id` - Get transfer details
- `GET /api/transfers` - List all transfers
- `PUT /api/transfers/:id` - Update transfer status
- `DELETE /api/transfers/:id` - Cancel a transfer

## Features

- ✅ TypeScript for type safety
- ✅ Express.js for routing
- ✅ Drizzle ORM for database operations
- ✅ Header validation middleware
- ✅ PostgreSQL database support
- ✅ Modular controller and route architecture

## Development

### Run in Development Mode

```bash
pnpm dev
```

The server will start on `http://localhost:3000` (or the port specified in `.env`)

### Database Management

```bash
pnpm run db:studio
```

Open Drizzle Studio to inspect and manage your database.

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**Nauval Dzakwan Baihaqi**

---

For more information or support, please open an issue on GitHub.
