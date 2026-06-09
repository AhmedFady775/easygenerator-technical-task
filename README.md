# EasyGenerator Auth

Full-stack user authentication application built with NestJS (backend) and React (frontend).

## Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, React Router, React Hook Form, Zod |
| Backend  | NestJS, MongoDB (Mongoose), JWT, Passport, class-validator |
| Docs     | Swagger / OpenAPI                                       |

---

## Prerequisites

- Node.js ≥ 18
- MongoDB running locally on `mongodb://localhost:27017` (or update the env var)

---

## Getting started

### 1. Clone the repository

```bash
git clone <repo-url>
cd easygenerator
```

### 2. Backend

```bash
cd backend

# Copy env file and adjust values if needed
cp .env.example .env

# Install dependencies
npm install

# Start in development mode (hot-reload)
npm run start:dev

# Or production build
npm run build && npm run start:prod
```

The API will be available at **http://localhost:3000**.  
Swagger docs: **http://localhost:3000/api/docs**

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## Environment variables

### Backend (`backend/.env`)

| Variable        | Default                                    | Description              |
| --------------- | ------------------------------------------ | ------------------------ |
| `MONGODB_URI`   | `mongodb://localhost:27017/easygenerator`  | MongoDB connection string |
| `JWT_SECRET`    | *(required)*                               | Secret for JWT signing   |
| `JWT_EXPIRES_IN`| `7d`                                       | Token lifetime           |
| `PORT`          | `3000`                                     | HTTP port                |
| `FRONTEND_URL`  | `http://localhost:5173`                    | Allowed CORS origin      |

### Frontend (`frontend/.env`)

| Variable       | Default                   | Description    |
| -------------- | ------------------------- | -------------- |
| `VITE_API_URL` | `http://localhost:3000`   | Backend URL    |

---

## API endpoints

| Method | Path          | Auth required | Description              |
| ------ | ------------- | ------------- | ------------------------ |
| POST   | /auth/signup  | No            | Register a new user      |
| POST   | /auth/signin  | No            | Sign in, returns JWT     |
| GET    | /auth/me      | Yes (Bearer)  | Get current user profile |

Full interactive docs available at `/api/docs` (Swagger UI).

---

## Running tests

```bash
cd backend
npm run test        # unit tests
npm run test:e2e    # end-to-end tests
npm run test:cov    # coverage report
```

---

## Project structure

```
easygenerator/
├── backend/
│   └── src/
│       ├── auth/            # Auth module: controller, service, DTOs, JWT strategy
│       ├── users/           # Users module: service, Mongoose schema
│       ├── common/          # Global exception filter
│       └── main.ts          # Bootstrap: CORS, pipes, Swagger
└── frontend/
    └── src/
        ├── api/             # Axios instance + typed API calls
        ├── components/      # Reusable UI components (PasswordInput)
        ├── hooks/           # useAuth hook (token + user state)
        └── pages/           # SignUp, SignIn, AppPage
```
