# AI Assistance Log

This document describes how AI (Claude Code via Anthropic API) was used during the development of this project.

---

## What was AI-assisted

### Scaffolding and boilerplate (high AI involvement)
- Initial NestJS and React+Vite project scaffolding commands
- Mongoose schema with `timestamps` and `toJSON` password-stripping transform
- Passport JWT strategy wiring (`ExtractJwt.fromAuthHeaderAsBearerToken`, `ConfigService` injection)
- Global exception filter (`GlobalExceptionFilter`) for uniform error shapes
- Swagger decorators on the controller and DTOs (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth`)
- React Hook Form + Zod schema setup — the field-level validation messages matched the task spec exactly

### Validation logic (AI-generated, human-verified)
- Backend: `class-validator` decorators on `SignUpDto` — `@Matches` regexes for letter, number, and special-char rules.  
  I verified each regex independently: `/[a-zA-Z]/`, `/[0-9]/`, `/[^a-zA-Z0-9]/` are correct.
- Frontend: Mirror Zod schema in `SignUp.tsx` so client-side errors fire before a round-trip.

### Security decisions (human-directed, AI-implemented)
- `bcryptjs` with cost factor **12** — AI suggested 10, I bumped it to 12 for better resistance on modern hardware.
- Password never returned from `UsersService` — AI placed the `toJSON` transform on the schema, I confirmed it strips the field from all serialisation paths.
- Identical error message for wrong email **and** wrong password (`'Invalid credentials'`) — AI initially returned distinct messages; I corrected this to prevent user enumeration.
- JWT secret loaded from `ConfigService`, never hard-coded — AI-generated correctly.

### Routing and state management (AI-assisted, human-shaped)
- `PrivateRoute` / `PublicRoute` wrappers for React Router — AI generated clean `Navigate` guards, which I kept as-is.
- `useAuth` hook persisting token + user to `localStorage` — straightforward; I chose `localStorage` over `sessionStorage` for the UX of surviving a page refresh, which the spec does not constrain.

---

## Prompts that worked well

- **"Implement a NestJS auth module with JWT, bcrypt, Mongoose — separate users and auth modules, no circular deps."**  
  Single prompt produced the correct module split with `UsersModule` exported and imported by `AuthModule`.

- **"Add a global exception filter that logs the stack trace and returns a consistent JSON shape."**  
  Output was production-quality in one shot — `ArgumentsHost`, proper status extraction, timestamp included.

- **"Mirror the backend password rules in a Zod schema for the signup form."**  
  AI translated the regex rules faithfully; no corrections needed.

---

## What I corrected or decided differently

| Area | AI suggestion | What I did instead | Reason |
|------|--------------|-------------------|--------|
| bcrypt cost factor | `10` | `12` | Slightly stronger hashing on modern hardware |
| Error messages | Distinct "user not found" vs "wrong password" | Single `'Invalid credentials'` | Prevent user enumeration |
| CSS approach | Tailwind CSS | Plain CSS custom properties | Zero-config, no PostCSS setup needed, faster to ship |
| `app.module.ts` | Kept default `AppController` / `AppService` | Removed them | They are dead code once auth is the only feature |
| Password visibility toggle | Render as `<span>` | Render as `<button type="button">` | Accessibility — focusable and keyboard-operable |
| Auth persistence | `sessionStorage` | `localStorage` | Better UX: survives refresh without re-login |

---

## Overall assessment

AI accelerated approximately 70–80 % of the mechanical work (scaffolding, wiring, decorators, CSS). The remaining effort was verifying correctness of security-sensitive code, making deliberate UX/security trade-off decisions, and catching the small gaps AI left (enumeration vulnerability, accessibility of the toggle button, dead code cleanup).
