# AI Assistance Log

This document describes how AI (Claude Code via Anthropic API) was used during the development of this project.

---

## What was AI-assisted

### Scaffolding and boilerplate (high AI involvement)
- Initial NestJS and React+Vite project scaffolding commands
- Mongoose schema with `timestamps` and `toJSON` transform stripping `password` and `refreshTokenHash`
- Passport JWT strategy wiring (`ExtractJwt.fromAuthHeaderAsBearerToken`, `ConfigService` injection)
- Separate `RefreshJwtStrategy` using `ExtractJwt.fromExtractors` reading from the `req.cookies` object
- Global exception filter (`GlobalExceptionFilter`) for uniform error shapes with timestamps
- HTTP logging middleware — per-request `METHOD /path STATUS +Xms` with level mapped to warn/error on 4xx/5xx
- Swagger decorators on controllers and DTOs (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`)
- React Hook Form + Zod schema setup — field-level validation messages matched the task spec exactly
- `appleboy/ssh-action` wiring in the GitHub Actions deploy job

### Validation logic (AI-generated, human-verified)
- Backend: `class-validator` decorators on `SignUpDto` — `@Matches` regexes for letter, number, and special-char rules.
  I verified each regex independently: `/[a-zA-Z]/`, `/[0-9]/`, `/[^a-zA-Z0-9]/` are correct.
- Frontend: Mirror Zod schema in `SignUp.tsx` so client-side errors fire before a round-trip.

### Security (human-directed, AI-implemented)
- `bcryptjs` cost factor **12** — AI suggested 10, I bumped it to 12.
- Password never returned from `UsersService` — AI placed the `toJSON` transform; I confirmed it covers all serialisation paths.
- Identical error message for wrong email **and** wrong password — AI initially returned distinct messages; I corrected this to prevent user enumeration.
- JWT secrets loaded from `ConfigService`, never hard-coded — AI-generated correctly.
- **Helmet** — AI applied all 12 default headers in one call.
- **Rate limiting** — AI wired `@nestjs/throttler` globally and applied tighter per-endpoint `@Throttle()` overrides on signup and signin.
- **NoSQL injection** — AI added `express-mongo-sanitize`; I verified that `class-validator`'s `@IsEmail()` already rejects operator objects, making this defence-in-depth.
- **Refresh token as httpOnly cookie** — I directed this approach; AI implemented the cookie options (`httpOnly`, `secure` gated on `NODE_ENV`, `sameSite: strict`, 30-day `maxAge`) and the `clearCookie` on logout.
- **Refresh token `jti` rotation** — AI proposed storing the hash of the entire refresh JWT; I redirected to hashing only the `jti` UUID (fits within bcrypt's 72-byte limit, avoids hashing variable-length JWTs).
- Access token kept in memory on the frontend (not `localStorage`) — I directed this; AI updated `useAuth` accordingly.

### Testing (AI-generated structure, human-corrected)
- Unit test skeletons for `AuthService`, `AuthController`, `UsersService` — co-located inside their modules
- e2e test suite using `MongoMemoryServer` — no real MongoDB needed in CI
- AI initially placed e2e tests in the top-level `test/` folder; I moved them inside `src/auth/` to keep tests co-located with the module they cover
- `jest-e2e.json` regex updated from `test/.+` to `src/.+` after the move

### Docker and CI/CD (AI-generated, human-reviewed)
- Multi-stage `Dockerfile` for backend (Node 20 alpine builder → production with `--omit=dev`)
- Multi-stage `Dockerfile` for frontend (Vite build → nginx alpine with SPA fallback + asset caching headers)
- `docker-compose.yml` with MongoDB 7, healthcheck dependency so backend waits for a healthy Mongo, and `--remove-orphans` on deploy
- GitHub Actions workflow: parallel `backend` / `frontend` CI jobs, then a `deploy` job gated on both passing
- Deploy script with a 30-second polling health check against `GET /health` and automatic rollback on failure

---

## Prompts that worked well

- **"Implement a NestJS auth module with JWT, bcrypt, Mongoose — separate users and auth modules, no circular deps."**
  Single prompt produced the correct module split with `UsersModule` exported and imported by `AuthModule`.

- **"Add a global exception filter that logs the stack trace and returns a consistent JSON shape."**
  Output was production-quality in one shot — `ArgumentsHost`, proper status extraction, timestamp included.

- **"Mirror the backend password rules in a Zod schema for the signup form."**
  AI translated the regex rules faithfully; no corrections needed.

- **"Add a 401 axios interceptor that silently refreshes the access token and replays the original request."**
  The deduplication pattern (`refreshPromise` singleton to avoid parallel refresh races) came from AI and was correct.

- **"Write e2e tests using MongoMemoryServer — no real MongoDB."**
  The full test suite (14 cases covering signup validation, duplicate detection, signin, and protected endpoint) was generated correctly. I only had to update import paths after moving the file into the auth module.

---

## What I corrected or decided differently

| Area | AI suggestion | What I did instead | Reason |
|------|--------------|-------------------|--------|
| bcrypt cost factor | `10` | `12` | Slightly stronger hashing on modern hardware |
| Error messages | Distinct "user not found" vs "wrong password" | Single `'Invalid credentials'` | Prevent user enumeration |
| CSS approach | Tailwind CSS | Plain CSS custom properties | Zero-config, no PostCSS setup, faster to ship |
| `app.module.ts` | Kept default `AppController` / `AppService` | Removed them | Dead code |
| Password visibility toggle | `<span>` | `<button type="button">` | Accessibility — keyboard-focusable |
| Auth persistence (initial) | `localStorage` for token | Access token in memory, user in `sessionStorage` | Eliminates XSS token theft vector |
| Refresh token hashing | Hash entire refresh JWT | Hash only the `jti` UUID | bcrypt has a 72-byte input limit; JWTs exceed it |
| Refresh token transport | Response body JSON | httpOnly cookie | JS (and therefore XSS) cannot read it |
| Test file location | `test/` directory at repo root | Co-located in `src/auth/` | Keeps tests next to the code they cover — easier to find, harder to forget |
| `require()` for ESM packages | AI used `require('cookie-parser')` etc. | Proper `import … from` with ESM default imports | Project uses `"module": "nodenext"` — `require()` is inconsistent |
| `signAsync` mock in unit tests | `mockResolvedValueOnce` chaining | `mockImplementation` keyed on `expiresIn` option | `Promise.all` consumed both "once" values in the same tick, making the queue approach unreliable |
| e2e test location | `test/auth.e2e-spec.ts` | `src/auth/auth.e2e-spec.ts` | Directed by me; module-based project should keep everything inside the module |

---

## Overall assessment

AI handled approximately 75% of the total implementation work — scaffolding, wiring, boilerplate, test skeletons, Docker configuration, and CI/CD structure. The remaining 25% was:

- Directing security architecture decisions (httpOnly cookies, jti-based rotation, user enumeration prevention)
- Catching correctness bugs in mock setup (`Promise.all` + `mockResolvedValueOnce` race)
- Enforcing project conventions AI didn't know about (module-based test colocation, ESM imports, no `require()`)
- Verifying every security-sensitive code path independently before accepting it
