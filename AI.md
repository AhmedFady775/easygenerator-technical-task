# AI Assistance Log

This project was developed with AI assistance as a force multiplier. AI was used to move quickly on scaffolding, validation logic, boilerplate, tests, Docker, and CI/CD, while the final architecture and security-sensitive behavior were reviewed and corrected manually.

## What Was AI-Assisted

- NestJS module scaffolding for auth, users, health checks, DTOs, guards, strategies, and tests.
- React + Vite authentication UI structure using TypeScript, React Router, React Hook Form, and Zod.
- Backend validation rules matching the task requirements:
  - valid email format
  - name with at least 3 characters
  - password with at least 8 characters, one letter, one number, and one special character
- Swagger/OpenAPI decorators for API documentation.
- Unit and e2e test structure, including MongoMemoryServer for isolated backend e2e tests.
- Docker multi-stage builds for backend and frontend.
- Docker Compose deployment, Caddy reverse proxy setup, and GitHub Actions CI/CD.
- README and deployment documentation drafts.

## What I Verified

- Signup and signin flows use the same validation rules on the frontend and backend.
- Passwords are hashed with bcrypt before persistence.
- Duplicate emails return a conflict response.
- Invalid signin attempts use a generic `Invalid credentials` error to avoid user enumeration.
- The protected `GET /auth/me` endpoint requires an access cookie and returns the current user profile from MongoDB.
- Auth cookies are `httpOnly`, and `COOKIE_SECURE=true` can be enabled for HTTPS deployments.
- Frontend auth state is restored by calling `/auth/me`, not by storing tokens in browser storage.
- Docker deployment keeps browser API calls same-origin through `/api`.
- Caddy owns ports `80` and `443` and can issue HTTPS certificates for a configured hostname.

## What I Corrected Or Reworked

- Changed token storage to httpOnly cookies so JavaScript cannot read access or refresh tokens.
- Changed `/auth/me` to fetch the current user from MongoDB instead of returning only the JWT payload.
- Added `replace: true` navigation after signin, signup, and logout so browser back navigation does not appear stuck.
- Replaced hard-coded `localhost:3000` frontend API calls with `/api` and added proxying for local dev and production.
- Made secure cookies configurable through `COOKIE_SECURE` so HTTP and HTTPS deployments both work correctly.
- Adjusted the GitHub Actions deploy script to build Docker images sequentially to avoid memory spikes on small EC2 instances.
- Added Caddy for free HTTPS support when a domain or wildcard DNS hostname is available.
- Cleaned the README so setup, deployment, and environment variable instructions match the current code.

## Useful Prompts And Approaches

- "Build a NestJS auth module with DTO validation, JWT guards, Mongoose users, and tests."
- "Mirror the backend signup validation rules in a Zod schema."
- "Review this auth flow for production-readiness and cookie security."
- "Debug why the deployed frontend calls localhost instead of the EC2 host."
- "Add a Caddy reverse proxy for HTTPS in Docker Compose."

## Final Validation

- `npm run build` in `frontend`
- `npm run build` in `backend`
- `npm test -- auth.controller.spec.ts users.service.spec.ts` in `backend`
- `npm run test:e2e` in `backend`
