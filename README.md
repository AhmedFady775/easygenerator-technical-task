# EasyGenerator Auth

Full-stack authentication application built with NestJS, MongoDB, React, and TypeScript.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, React Hook Form, Zod |
| Backend | NestJS, MongoDB with Mongoose, Passport, JWT, httpOnly cookies |
| Docs | Swagger / OpenAPI at `/api/docs` |
| Ops | Docker Compose, Caddy, GitHub Actions CI/CD |

## Features

- Sign up with email, name, and password validation.
- Sign in with email and password.
- Protected `GET /auth/me` endpoint.
- Application page with `Welcome to the application.` and logout.
- Password hashing with bcrypt.
- Access and refresh tokens stored in httpOnly cookies.
- Request validation, centralized error handling, logging, throttling, health checks, Swagger docs, and tests.

## Local Development

### Prerequisites

- Node.js >= 20
- MongoDB Atlas or local MongoDB

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

Backend: `http://localhost:3000`
Swagger: enabled in local development; set `SWAGGER_ENABLED=true` to expose it in a non-production environment.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

The Vite dev server proxies `/api` to `http://localhost:3000`.

## Docker Compose

```bash
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL
docker compose up -d --build
```

Local URLs:

- App: `http://localhost`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

## HTTPS With Caddy

Caddy is included in `docker-compose.yml` and owns ports `80` and `443`.
It proxies:

- `/api/*` to the NestJS backend
- all other requests to the frontend container

For a real HTTPS deployment, set:

```env
CADDY_DOMAIN=your-domain.com
FRONTEND_URL=https://your-domain.com
COOKIE_SECURE=true
```

If you do not own a domain, a free wildcard DNS hostname such as `sslip.io` can be used. For example:

```env
CADDY_DOMAIN=16-170-215-160.sslip.io
FRONTEND_URL=https://16-170-215-160.sslip.io
COOKIE_SECURE=true
```

Make sure your EC2 security group allows inbound `80` and `443`.

## EC2 Deployment

1. Provision an Ubuntu EC2 instance.
2. Install Docker and the Docker Compose plugin.
3. Clone the repository:

```bash
git clone https://github.com/AhmedFady775/easygenerator-technical-task.git /opt/easygenerator
cd /opt/easygenerator
cp .env.example .env
```

4. Fill in `.env`:

```env
MONGODB_URI=<mongodb connection string>
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<different 64-char random string>
FRONTEND_URL=https://<public-hostname>
CADDY_DOMAIN=<public-hostname>
COOKIE_SECURE=true
VITE_API_URL=/api
```

5. Start the app:

```bash
docker compose up -d --build
```

## GitHub Actions

The pipeline runs backend CI, frontend CI, and deploys on pushes to `master`.

Required repository secrets:

| Secret | Value |
| --- | --- |
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_USER` | SSH user, for example `ubuntu` |
| `EC2_SSH_KEY` | Contents of the private SSH key |
| `EC2_APP_PATH` | Deployment path, for example `/opt/easygenerator` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `FRONTEND_URL` | Public app URL |
| `CADDY_DOMAIN` | Hostname served by Caddy |
| `COOKIE_SECURE` | `true` for HTTPS deployments |

Deploy flow:

```text
push to master
  backend CI: type-check, unit tests, e2e tests, build
  frontend CI: type-check, build
  deploy:
    git fetch + reset on EC2
    docker compose build backend
    docker compose build frontend
    docker compose up -d --remove-orphans
    health-check /health and rollback if unhealthy
```

## API Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | public | Register user and set auth cookies |
| `POST` | `/auth/signin` | public | Sign in and set auth cookies |
| `POST` | `/auth/refresh` | refresh cookie | Rotate auth cookies |
| `POST` | `/auth/logout` | access cookie | Revoke refresh token and clear cookies |
| `GET` | `/auth/me` | access cookie | Protected endpoint returning the current user |
| `GET` | `/health` | public | Liveness probe |
| `GET` | `/health/ready` | public | MongoDB readiness probe |

## Environment Variables

### Root `.env`

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `FRONTEND_URL` | Allowed CORS origin |
| `COOKIE_SECURE` | Set `true` for HTTPS cookies |
| `CADDY_DOMAIN` | Hostname served by Caddy |
| `VITE_API_URL` | Frontend API base URL, defaults to `/api` |
| `SWAGGER_ENABLED` | Set `true` to expose Swagger outside production |

### `backend/.env`

Used for backend-only local development.

| Variable | Default |
| --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27017/easygenerator` |
| `JWT_SECRET` | required |
| `JWT_REFRESH_SECRET` | required |
| `PORT` | `3000` |
| `FRONTEND_URL` | `http://localhost:5173` |
| `COOKIE_SECURE` | `false` |
| `SWAGGER_ENABLED` | `false` |

## Tests

```bash
cd backend
npm test
npm run test:e2e
npm run test:cov
```

```bash
cd frontend
npm run build
```

## Project Structure

```text
easygenerator/
  .github/workflows/ci.yml
  .env.example
  AI.md
  Caddyfile
  docker-compose.yml
  backend/
    src/auth/
    src/users/
    src/health/
    src/common/
  frontend/
    src/api/
    src/components/
    src/hooks/
    src/pages/
```
