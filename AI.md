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

## Post-submission fixes (local dev session)

### Build pipeline issues fixed
- **`module: "nodenext"` → `"commonjs"`** — The tsconfig had `module: "nodenext"` and `moduleResolution: "nodenext"` which caused `nest build` / `nest start --watch` to compile with 0 errors but emit nothing to `dist/`. Root cause: stale `.tsbuildinfo` from a prior build told incremental TypeScript nothing had changed, so after `deleteOutDir` cleaned `dist/` no files were re-emitted. Fixed by switching back to `module: "commonjs"` (the NestJS standard) and clearing the stale build cache. `tsBuildInfoFile` moved to `./dist/.tsbuildinfo` so it is cleaned alongside the output.
- **`baseUrl` removed** — Was deprecated in TypeScript 6 and not needed since no `paths` aliases are used.

### Runtime compatibility fixes (Node.js v24)
- **`express-mongo-sanitize` crash** — The library unconditionally executes `req[key] = sanitized` for `body`, `params`, `headers`, and `query`. In Node.js v24, `IncomingMessage.query` became a read-only getter, so this threw `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter` on every request, including the Swagger UI route. Fixed by replacing the global `app.use(mongoSanitize())` call with a custom inline middleware that only sanitises `req.body` and `req.params` (both writable), skipping `req.query`. The `ValidationPipe` with `whitelist: true` already rejects operator objects in query strings, so coverage is not reduced.
- **Helmet CSP blocking Swagger UI** — `helmet()` default `Content-Security-Policy` blocked the inline scripts Swagger UI requires, returning 500 on `GET /api/docs`. Fixed by passing `{ contentSecurityPolicy: false }` to `helmet()`.

### Full cookie-based auth (access + refresh tokens)

Previously only the refresh token was an httpOnly cookie; the access token lived in JS memory and was sent as `Authorization: Bearer`.

**Backend changes:**
- `auth.controller.ts` — `signUp`, `signIn`, and `refresh` now set both `accessToken` (15-min `maxAge`) and `refreshToken` (30-day `maxAge`) as `httpOnly; SameSite=Strict` cookies. Response bodies no longer contain `accessToken` — `signUp`/`signIn` return `{ user }`, `refresh` returns `{}`.
- `jwt.strategy.ts` — Changed `jwtFromRequest` from `ExtractJwt.fromAuthHeaderAsBearerToken()` to a cookie extractor reading `req.cookies.accessToken`, mirroring the existing `RefreshJwtStrategy` pattern.
- `logout` — Now clears both `accessToken` and `refreshToken` cookies.
- `/auth/me` decorated with `@SkipThrottle()` — The endpoint is called on every page load by the frontend; the global 5 req/sec limit caused 429s during normal navigation.

**Frontend changes:**
- `api/auth.ts` — Stripped out the in-memory `_accessToken` store, the `Authorization` header request interceptor, and the entire 401 → silent-refresh → replay response interceptor. The axios instance now just uses `withCredentials: true`; the browser handles cookie transport automatically.
- `useAuth.ts` — Converted from a standalone hook with `sessionStorage` persistence to an exported `AuthContext` + `useAuth` context consumer. `login()` now takes only `userData` (no token argument).
- `AuthProvider.tsx` (new) — Wraps the app; calls `GET /auth/me` on mount to restore the session from the access token cookie. Provides `{ user, isAuthenticated, isLoading, login, logout }` via context. `isLoading` prevents `PrivateRoute`/`PublicRoute` from redirecting before the server responds.
- `App.tsx` — Wraps routes in `<AuthProvider>`; `PrivateRoute` and `PublicRoute` both render `null` while `isLoading` is true to avoid a flash-to-signin on page refresh.
- `main.tsx` — Removed `<StrictMode>` wrapper to prevent the double-mount behaviour that caused `AuthProvider`'s `useEffect` to fire twice, triggering two concurrent `/auth/me` requests on every page load.

### SignUp form
- Added confirm-password field with Zod `.refine()` cross-field validation (`d.password === d.confirmPassword`).

### ESLint / code quality pass
- Ran `eslint src/ --fix` across the entire backend — resolved ~60 prettier formatting errors automatically (import grouping, trailing commas, line-length wraps).
- `auth.service.ts` — replaced `(user._id as object).toString()` with `String(user._id)` to fix `@typescript-eslint/no-base-to-string` (casting to `object` uses `[object Object]` stringification).
- `main.ts` — typed the mongo-sanitize middleware with explicit `Request`, `Response`, `NextFunction` imports; used named `sanitize` export instead of `mongoSanitize.sanitize` (was typed as `any`); added `void` before `bootstrap()` for `no-floating-promises`.
- `auth.controller.spec.ts` — updated assertions for new cookie-based response shape (`{ user }` not `{ accessToken, user }`); added `eslint-disable-next-line @typescript-eslint/unbound-method` on `expect(res.cookie)` / `expect(res.clearCookie)` calls (standard Jest pattern that triggers the rule).
- `auth.e2e-spec.ts` — rewrote for cookie-based auth: extracts `accessToken` cookie from `set-cookie` header and sends it via `.set('Cookie', ...)` instead of `Authorization: Bearer`; added `cookieParser()` to the test app; added `JWT_REFRESH_SECRET` to the test config (was missing, caused silent failures); added `{ logger: false }` to suppress expected error logs during tests; typed supertest response bodies with `AuthBody` interface to satisfy `no-unsafe-assignment`.
- `tsconfig.json` — added `"types": ["jest", "node"]` so the IDE language server resolves Jest globals (`jest`, `describe`, `it`, `expect`) in spec files without `Cannot find name 'jest'` errors.
- `confirmPassword` is destructured out of the form data before the API call so it is never sent to the backend.

### Tailwind CSS migration
- Replaced the entire hand-written `index.css` (CSS custom properties + BEM-style classes) with a single `@import "tailwindcss"` line.
- Installed `tailwindcss` and `@tailwindcss/vite` (v4); wired the Vite plugin into `vite.config.ts` — no `tailwind.config.js` needed for v4.
- All components (`SignIn`, `SignUp`, `AppPage`, `PasswordInput`) rewritten with utility classes only. No custom class names remain.

### Frontend UI redesign — split-panel auth layout
- Both `SignIn` and `SignUp` replaced the centred card layout with a two-column split: white form panel on the left (`flex-1`), blue gradient panel on the right (`w-[45%]`, hidden on mobile via `lg:block`).
- Inputs use a light border (`border-gray-200`) with a blue focus ring; submit button is a full-width pill (`rounded-full bg-blue-600`).
- Password visibility toggle icons changed from emoji (`👁`/`🙈`) to inline SVGs for consistent rendering across platforms.
- Layout is responsive: the right panel hides below the `lg` breakpoint so the form fills the full viewport on mobile.

### AppPage dashboard redesign
- Header changed from a solid blue bar to a white bar with a bottom border (`border-b border-gray-200`) — cleaner, closer to a standard app shell.
- User info area now shows an avatar circle with initials derived from `user.name`, stacked name + email, and a minimal outlined "Sign out" button.
- Main content simplified to a bare greeting (`Good to see you, {firstName}!`) directly on the background — removed the white welcome card wrapper.

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
| CSS approach (initial) | Tailwind CSS | Plain CSS custom properties | Zero-config, no PostCSS setup, faster to ship |
| CSS approach (final) | Plain CSS | Tailwind CSS v4 | Switched during UI redesign — utility classes are faster to iterate on for layout-heavy work; v4 Vite plugin requires no config file |
| `app.module.ts` | Kept default `AppController` / `AppService` | Removed them | Dead code |
| Password visibility toggle | `<span>` | `<button type="button">` | Accessibility — keyboard-focusable |
| Auth persistence (initial) | `localStorage` for token | Access token in memory, user in `sessionStorage` | Eliminates XSS token theft vector |
| Auth persistence (final) | Access token in JS memory + Bearer header | Both tokens as httpOnly cookies, session restored via `/auth/me` on mount | JS can never read either token; no client-side storage at all |
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
