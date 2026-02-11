# FinanceHub — Full-Stack Finance Application

## Project Overview
FinanceHub is a full-stack personal finance application that helps users connect bank accounts, transfer money, and visualize balances and recent transactions in real time. The frontend is built with Next.js (App Router) and TailwindCSS. The backend uses Express.js, MongoDB, and JWT-based authentication. The dashboard includes a doughnut chart visualization and now supports instant, optimistic UI updates for transfers.

## Architecture Diagram (Text-Based)
- Client (Next.js App Router, React client components)
  - Layout, pages, components
  - Custom API client (lib/api.ts)
  - Optimistic UI logic on transfer
  - State managed via React hooks
- Server (Express.js)
  - Routes → Controllers → Services → Models
  - JWT auth middleware
  - Transfer service updates balances and creates transaction atomically
- Database (MongoDB)
  - Users, Accounts, Transactions collections
- Data Flow
  1. Client issues API request
  2. Express validates and authorizes via JWT
  3. Controllers call services
  4. Services perform DB ops and return results
  5. Client updates state (optimistic and/or confirmed) and re-renders

## Folder Structure
### Frontend (Next.js)
- app/
  - page.tsx — Dashboard
  - transfer/page.tsx — Transfer flow
  - components/ — Charts and UI elements
- components/layout/
  - dashboard-layout.tsx — App shell layout
  - header.tsx — Topbar
- lib/
  - api.ts — Custom API client
  - utils.ts — Formatting utilities
- contexts/
  - auth-context.tsx — Client auth state
- public/
  - assets

### Backend (Express)
- backend/
  - routes/
    - auth.js
    - accounts.js
    - transactions.js
    - transfer.js
  - controllers/
    - authController.js
    - accountController.js
    - transactionController.js
    - transferController.js
  - services/
    - accountService.js
    - transactionService.js
    - transferService.js
  - models/
    - User.js
    - Account.js
    - Transaction.js
  - middleware/
    - auth.js — JWT verification
    - errorHandler.js
  - db/
    - connection.js — MongoDB connection
  - app.js — Express server bootstrap

## Backend Explanation
### Routes
- POST /api/auth/login — JWT login
- GET /api/accounts — Get user accounts
- GET /api/transactions/recent — Recent transactions for dashboard
- POST /api/transfer/internal — Transfer between accounts

### Controllers
- Receive HTTP requests, validate payloads, call services, and format responses.

### Models
- User: email, password hash, name, avatar, shareableId
- Account: userId, name, balance, type, shareableId
- Transaction: userId, accountId, type (income, expense, transfer), amount, description, createdAt, metadata

### Middleware
- auth.js: Verifies JWT, attaches user to request.
- errorHandler.js: Handles and formats errors consistently.

### Transfer Logic Flow
1. Validate sourceAccountId, receiverShareableId, and amount.
2. Ensure source account belongs to the authenticated user.
3. Ensure sufficient balance.
4. Start atomic operation:
   - Debit source account
   - Credit receiver account (if receiver belongs to same user or target in DB)
   - Create transaction documents for both sides
5. Commit changes; return success.

### How Balance is Updated in DB
- Uses MongoDB update operators to decrement source and increment receiver balances.
- Ensures both updates occur together via transaction/session when available.

### Transaction Creation Logic
- Creates a transaction document with type, amount, description, timestamps.
- For internal transfers: creates two documents (debit for source, credit for receiver) or metadata to reflect both sides.

### Atomicity Handling
- Uses MongoDB transactions (session) when supported; otherwise performs ordered updates with fallback consistency checks.

## Frontend Explanation
### Layout System
- App Router with dashboard-layout provides shell: header, content area, spacing.

### Dashboard Data Flow
- On mount:
  - Load profile, accounts, transactions via api.ts.
  - Compute total and render doughnut chart.
- Optimistic updates via window events for immediate UI response.

### Transfer Flow
- Transfer page validates input and balance.
- Emits optimistic event to update UI instantly.
- Calls POST /api/transfer/internal.
- On success: reconciles accounts and recent transactions via re-fetch.
- On failure: rolls back optimistic UI changes via event and re-fetch.

### How API Calls are Made
- lib/api.ts centralizes all HTTP calls using fetch.
- Typed methods for accounts, transactions, and transfer.

### State Management
- React useState/useEffect per page.
- Event-driven UI updates for real-time dashboard without global store complexity.

### Loading & Skeleton Behavior
- Dashboard uses loading=false to render; placeholders for charts and list until data arrives.
- Transfer page disables submit while loading.

## Step-by-Step Scenarios
### User Logs In
1. User submits credentials.
2. Server returns JWT.
3. Client stores JWT (secure cookie or memory depending on setup).
4. Protected routes fetch data using JWT in headers.

### User Connects a Bank
1. User adds an account via accounts route.
2. Backend creates Account document for user.
3. Dashboard re-fetches accounts and updates doughnut.

### User Transfers Money
1. User selects source account and receiver shareable ID, enters amount.
2. Client performs validation.
3. Client emits optimistic event to instant-update dashboard balances and recent list.
4. Client calls transfer API.
5. On success: client re-fetches accounts and transactions and emits confirmation event.
6. On failure: client emits rollback event and re-fetches to restore UI.

### Balance Updates
- Dashboard listens for events and re-renders immediately, then reconciles with server state.

## API Call Lifecycle
- Initiate request → show loading state → emit optimistic UI event (when applicable) → receive response → emit confirmed/rollback event → reconcile by re-fetching critical data.

## Security Considerations
- JWT-based authentication; verify token server-side.
- Validate payloads and enforce ownership on accounts.
- Prevent overdrafts and race conditions via DB transactions.
- Avoid storing secrets in client code; use environment variables.
- Rate-limit sensitive routes.

## Data Flow (Frontend → Backend → Database → Back)
1. Client sends authenticated request via api.ts.
2. Express middleware validates token.
3. Controller calls service; service updates MongoDB.
4. Controller returns response.
5. Client updates UI state and re-fetches authoritative data if needed.

## Error Handling Strategy
- Consistent JSON error responses from Express.
- Client shows toast for failures and rolls back optimistic changes.
- Background reconciliation fetches ensure UI consistency.

## Possible Improvements
- Centralized state store (Zustand/Redux) for cross-page state.
- Server-sent events or WebSockets for push updates.
- Caching layer (Redis) for account/transaction queries.
- Background workers for complex transfers.

## Scalability Ideas
- Redis for caching and rate-limiting.
- WebSockets for real-time updates without polling.
- Sharded MongoDB for high-volume transactions.
- Partitioned services (account, transaction, transfer).

## Future Roadmap
- External bank integrations.
- Budgeting features and analytics.
- Scheduled transfers.
- Role-based access and audit trails.

## Deployment Strategy
- Frontend: Deploy Next.js on Vercel or Dockerized container.
- Backend: Deploy Express on Node server (Docker), behind reverse proxy.
- Database: Managed MongoDB (Atlas), appropriate indices.
- Environment-specific config via env vars.

## Environment Variables
- FRONTEND
  - NEXT_PUBLIC_API_BASE_URL
  - NEXT_PUBLIC_JWT_PUBLIC_KEY (if verifying on client)
- BACKEND
  - PORT
  - MONGODB_URI
  - JWT_SECRET
  - CORS_ORIGIN

## Database Schema Overview
- User: { _id, email, passwordHash, name, avatar, shareableId }
- Account: { _id, userId, name, balance, type, shareableId, createdAt }
- Transaction: { _id, userId, accountId, type, amount, description, createdAt, metadata }

## Run Locally
### Prerequisites
- Node.js 18+
- MongoDB instance (local or Atlas)

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd phone-pe-ui-clone
npm install
npm run dev
```

### Configure .env
- backend/.env: MONGODB_URI, JWT_SECRET, PORT, CORS_ORIGIN
- phone-pe-ui-clone/.env.local: NEXT_PUBLIC_API_BASE_URL

## Sample API Request/Response
### Transfer
Request:
```http
POST /api/transfer/internal
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "sourceAccountId": "64f1a...123",
  "receiverShareableId": "SHR-987654",
  "amount": 2500,
  "note": "Rent"
}
```
Success Response:
```json
{ "message": "Transfer successful" }
```
Failure Response:
```json
{ "error": "Insufficient balance" }
```

## Option A: Optimistic UI Update (Implemented)
### Data Flow
1. User submits transfer in transfer/page.tsx.
2. Client validates and immediately emits `finance:transfer-optimistic` with a temp transaction.
3. Dashboard page listens and instantly updates balances and recent list.
4. Client calls API.
5. On success, client emits `finance:transfer-confirmed`, re-fetches accounts and recent transactions, and updates UI.
6. On failure, client emits `finance:transfer-rollback` and re-fetches to restore UI.

### Why Scalable
- Decoupled via events: pages remain independent but coordinate via a small message bus (window events).
- No tight coupling to a global store; easy to migrate to WebSockets later.
- Reconciliation fetch ensures correctness under concurrency.

### Loading and Error Handling
- Transfer button disabled while loading.
- Toast feedback for success/failure.
- Pending transaction appears immediately; replaced by server data after confirmation.

### Failure and Rollback
- On failure: rollback event emitted; dashboard re-fetches state; pending transaction removed.
- Accounts re-fetched from server as source of truth.

### Prevent Double Transfer
- Button disabled while loading to avoid duplicate submissions.
- Backend should enforce idempotency keys in advanced scenarios.

## Interview Questions
1. Explain optimistic UI and trade-offs.
2. How would you migrate this to WebSockets?
3. What are MongoDB transaction limitations?
4. How do you ensure idempotency of transfers?
5. Discuss JWT security best practices.
6. How would you scale reads/writes at high volume?
7. Why use App Router over Pages Router for this app?
8. How do you handle partial failures in multi-document operations?
9. What indices would you add to MongoDB?
10. How do you design a transfer API for external bank integrations?

## Advanced Discussion Topics
- Event-driven architecture on the client
- Using Redis for deduplication and caching
- CQRS for read-optimized dashboards
- Observability: tracing a transfer across services
- Circuit breakers and retries on the backend
