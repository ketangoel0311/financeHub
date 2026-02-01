# FinanceHub - Local Setup Guide

## Prerequisites

Make sure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local installation or MongoDB Atlas account)

## Project Structure

```
financehub/
├── app/                    # Next.js frontend (pages, components)
├── components/             # React components
├── contexts/               # React contexts (auth)
├── lib/                    # Utilities and API service
├── backend/                # Express.js backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Auth middleware
│   └── server.js           # Express server
```

## Setup Instructions

### Step 1: Clone/Download the Project

After downloading, you'll have two main parts:
- Frontend (Next.js) - root directory
- Backend (Express.js) - `/backend` directory

### Step 2: Setup MongoDB

**Option A: Local MongoDB**
1. Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
2. Start MongoDB service:
   - Windows: MongoDB runs as a service automatically
   - Mac: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

**Option B: MongoDB Atlas (Cloud)**
1. Create a free account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Get your connection string (looks like: `mongodb+srv://username:password@cluster.xxxxx.mongodb.net/financehub`)

### Step 3: Setup Backend

1. Open terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend folder:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file with your settings:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/financehub
   JWT_SECRET=your_super_secret_key_change_this_to_something_random
   JWT_EXPIRES_IN=7d
   ```
   
   If using MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string.

5. Start the backend server:
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   Server running on port 5000
   Connected to MongoDB
   ```

### Step 4: Setup Frontend

1. Open a NEW terminal and navigate to the root project folder:
   ```bash
   cd financehub  # or wherever your project is
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root folder:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   
   The app should be running at `http://localhost:3000`

## Running the Application

You need TWO terminals running simultaneously:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

## Using the Application

1. Open your browser and go to `http://localhost:3000`
2. You'll be redirected to the login page
3. Click "Create one" to register a new account
4. Fill in your details and create an account
5. You'll be automatically logged in with sample data (transactions, contacts, accounts)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/dashboard` - Get dashboard data

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get single transaction
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/recent/list` - Get recent transactions

### Accounts
- `GET /api/accounts` - Get all accounts
- `POST /api/accounts` - Add new account
- `DELETE /api/accounts/:id` - Delete account

### Transfer
- `GET /api/transfer/contacts` - Get contacts
- `POST /api/transfer/contacts` - Add contact
- `POST /api/transfer` - Make transfer
- `GET /api/transfer/favorites` - Get favorite contacts

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check your connection string in `.env`
- For Atlas, make sure your IP is whitelisted

### CORS Error
- Make sure the backend is running on port 5000
- Check that `NEXT_PUBLIC_API_URL` is set correctly

### JWT/Auth Issues
- Clear browser localStorage: `localStorage.clear()`
- Make sure `JWT_SECRET` is set in backend `.env`

## Tech Stack

**Frontend:**
- Next.js 16 (React)
- Tailwind CSS
- shadcn/ui components
- Recharts for charts

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
