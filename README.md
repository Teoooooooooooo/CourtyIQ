# CourtIQ — Padel Court Booking Platform

CourtIQ is a smart padel court booking platform with AI-powered partner matching, dynamic pricing, social features, and Stripe payments.

## Quick Start

### 1. Start the database

```bash
docker-compose up -d
```

### 2. Set up the backend

```bash
cd backend
cp ../.env.example .env        # edit .env if needed
npm install
npx prisma migrate dev --name init
npm run seed                   # basic seed (3 clubs, 9 courts, 5 players)
# npm run seed:demo            # richer demo seed (5 clubs, 20 players, demo account)
npm run dev                    # starts on http://localhost:3001
```

### 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev                    # starts on http://localhost:5173
```

## Test Credentials

| Account             | Password   | Notes                                    |
| -------------------- | ---------- | ---------------------------------------- |
| `demo@courtiq.com`  | `demo123`  | Silver loyalty, Pro sub, 3 bookings      |
| `player1@test.com`  | `password123` | Basic test account                    |
| `player2@test.com`  | `password123` | Basic test account                    |
| `player3@test.com`  | `password123` | Basic test account                    |
| `player4@test.com`  | `password123` | Basic test account                    |
| `player5@test.com`  | `password123` | Basic test account                    |

## Stripe Test Card

- **Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date
- **CVC:** Any 3 digits

## Team Responsibilities

| Role | Scope                          |
| ---- | ------------------------------ |
| BE1  | Auth + Database                |
| BE2  | Bookings + Stripe              |
| BE3  | AI + Social                    |
| FE   | All screens                    |

## API Base URL

```
http://localhost:3001/api/v1
```

## Tech Stack

- **Backend:** Express 5, Prisma, PostgreSQL 16, Stripe, OpenAI
- **Frontend:** React 18 (Vite), Tailwind CSS, Zustand, React Router, Leaflet
