# EasyGenerator Auth

Full-stack user authentication application built with NestJS (backend) and React (frontend).

## Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, React Router, React Hook Form, Zod |
| Backend  | NestJS, MongoDB (Mongoose), JWT + httpOnly refresh cookies, Passport |
| Docs     | Swagger / OpenAPI at `/api/docs`                        |
| Ops      | Docker Compose, GitHub Actions CI/CD                    |

---

## Local development

### Prerequisites
- Node.js ≥ 20
- A MongoDB Atlas cluster (or local MongoDB)

### Backend

```bash
cd backend
cp .env.example .env   # then fill in JWT_SECRET and JWT_REFRESH_SECRET
npm install
npm run start:dev
```

API: **http://localhost:3000** · Swagger: **http://localhost:3000/api/docs**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: **http://localhost:5173**

---

## Running with Docker Compose (local)

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET, JWT_REFRESH_SECRET, FRONTEND_URL
docker compose up -d --build
```

- Frontend → http://localhost
- Backend  → http://localhost:3000
- Swagger  → http://localhost:3000/api/docs

---

## EC2 deployment

### 1. Provision the instance

- Ubuntu 22.04 LTS, minimum t3.small
- Open inbound ports: **22** (SSH), **80** (HTTP), **443** (HTTPS if TLS)
- Assign an Elastic IP or note the public IP

### 2. Install dependencies on EC2

```bash
# Docker
sudo apt update && sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli docker-compose-plugin
sudo usermod -aG docker $USER   # re-login after this
```

### 3. Clone the repo and configure secrets

```bash
git clone https://github.com/AhmedFady775/easygenerator-technical-task.git /opt/easygenerator
cd /opt/easygenerator

cp .env.example .env
# Generate secrets:  openssl rand -hex 32
nano .env
```

`.env` content:
```
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<different 64-char random string>
FRONTEND_URL=http://<your-ec2-public-ip>
```

### 4. First deploy

```bash
cd /opt/easygenerator
docker compose up -d --build
```

### 5. Set up GitHub Actions for automatic deploys

Add these **Repository Secrets** (`Settings → Secrets → Actions`):

| Secret | Value |
|--------|-------|
| `EC2_HOST` | EC2 public IP or hostname |
| `EC2_USER` | `ubuntu` (or your SSH user) |
| `EC2_SSH_KEY` | Contents of your `.pem` private key |
| `EC2_APP_PATH` | `/opt/easygenerator` |

After that, every push to `master` that passes CI will automatically deploy to EC2.

---

## CI/CD pipeline

```
push to master
    │
    ├─ Backend CI  (type-check → unit tests → e2e → build)
    ├─ Frontend CI (type-check → build)
    │
    └─ Deploy (only if both CI jobs pass)
           SSH into EC2
           git fetch + git reset --hard origin/master
           docker compose up -d --build
           health-check /health → rollback if unhealthy
```

---

## API endpoints

| Method | Path           | Auth     | Description                          |
| ------ | -------------- | -------- | ------------------------------------ |
| POST   | /auth/signup   | —        | Register; sets httpOnly refresh cookie |
| POST   | /auth/signin   | —        | Sign in; sets httpOnly refresh cookie  |
| POST   | /auth/refresh  | cookie   | Issue new access token (token rotation) |
| POST   | /auth/logout   | access cookie | Revoke refresh token + clear both cookies |
| GET    | /auth/me       | access cookie | **Protected** — get current user profile |
| GET    | /health        | —        | Liveness probe                       |
| GET    | /health/ready  | —        | Readiness probe (MongoDB ping)       |

---

## Environment variables

### Root `.env` (docker-compose)

| Variable             | Description                          |
| -------------------- | ------------------------------------ |
| `JWT_SECRET`         | Access token signing secret          |
| `JWT_REFRESH_SECRET` | Refresh token signing secret         |
| `FRONTEND_URL`       | Allowed CORS origin                  |

### `backend/.env` (local dev only)

| Variable             | Default                                   |
| -------------------- | ----------------------------------------- |
| `MONGODB_URI`        | `mongodb://localhost:27017/easygenerator` |
| `JWT_SECRET`         | *(required)*                              |
| `JWT_REFRESH_SECRET` | *(required)*                              |
| `PORT`               | `3000`                                    |
| `FRONTEND_URL`       | `http://localhost:5173`                   |

---

## Running tests

```bash
cd backend
npm test            # unit tests (co-located with modules)
npm run test:e2e    # e2e tests via MongoMemoryServer (no MongoDB needed)
npm run test:cov    # coverage report
```

---

## Project structure

```
easygenerator/
├── .github/workflows/ci.yml   # CI/CD pipeline
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── auth/              # Controller, service, DTOs, JWT + refresh strategies
│       ├── users/             # Service + Mongoose schema
│       ├── health/            # /health endpoint
│       └── common/            # Exception filter, logging middleware
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api/               # Axios instance (withCredentials — cookies sent automatically)
        ├── components/        # AuthProvider (context), PasswordInput
        ├── hooks/             # useAuth context consumer
        └── pages/             # SignUp, SignIn, AppPage
```
