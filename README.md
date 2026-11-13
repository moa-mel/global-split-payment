# SplitFlow

AI-assisted group contributions and multi-recipient payment distribution.

## Structure
- `frontend/`: Next.js App Router application
- `backend/`: NestJS REST API, Prisma and PostgreSQL

## Prerequisites
- Node.js 20+
- Docker Desktop (or a local PostgreSQL instance)
- Bifrost gateway and a model provider configured in Bifrost
- Tavily API key

## 1. Start PostgreSQL
From the repository root:

```bash
docker compose up -d
```

## 2. Start Bifrost
In another terminal:

```bash
npx -y @maximhq/bifrost
```

Open `http://localhost:8080`, configure a model provider and verify the model name you intend to use. The default backend model is `openai/gpt-4o-mini`.

## 3. Configure and start the backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Backend: `http://localhost:4000`

## 4. Configure and start the frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend: `http://localhost:3000`

## Environment variables

Backend `.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `BIFROST_BASE_URL`: Bifrost gateway URL
- `BIFROST_API_KEY`: optional gateway key if your deployment requires one
- `BIFROST_MODEL`: configured model identifier, e.g. `openai/gpt-4o-mini`
- `TAVILY_API_KEY`: Tavily API key

Frontend `.env.local`:
- `NEXT_PUBLIC_API_URL`: backend base URL

## Implemented starter flow
- Create a payment group with equal contributions.
- List groups.
- Add recipients to a group.
- Preview fixed-amount allocations and validate the total.
- Ask Bifrost to turn a natural-language request into a structured draft.
- Research payment providers with Tavily.
- Preview fixed-amount allocations using integer kobo arithmetic.

## Important scope and safety notes
This is a hackathon starter, not a production payment processor. It does not move real money, authenticate users, send invitations, or verify recipients. The payment and transfer models are groundwork for a later sandbox integration. Do not store bank credentials or expose provider API keys in the frontend.

Before real payments, add authentication/authorization, recipient verification, signed webhook handling, idempotency, a proper double-entry ledger, reconciliation, rate limits, audit logging, and a regulated payment provider integration. AI output is always a draft and must be validated by backend code and approved by a human.
