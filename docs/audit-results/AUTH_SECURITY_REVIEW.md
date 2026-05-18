# Auth Security Review

**Last audit:** 2026-05-18
**Audited by:** auth-auditor agent
**Scope:** Authentication system — registration, email verification, password reset, profile actions, session handling

---

## 🟠 HIGH

### H1 — No maximum password length enforced (bcrypt 72-byte silent truncation)

**File:** `src/app/api/auth/register/route.ts` line 12, `src/actions/profile.ts` line 11, `src/app/api/auth/reset-password/route.ts` line 8

**Problem:** bcrypt silently truncates all input beyond 72 bytes. The Zod schemas enforce only a minimum length (`z.string().min(8)`), with no maximum. A user who sets a 100-character password will have it silently truncated to 72 characters at registration. If the same user later signs in with any suffix variation of the first 72 bytes, bcrypt will accept it — including, in the worst case, a completely different string that happens to share the same first 72 bytes. This is the same class of bug at the root of the Okta 2024 bcrypt incident.

**Fix:** Add `.max(72)` to every password field in all three Zod schemas:

```ts
password: z.string().min(8).max(72)
```

This is the OWASP-recommended mitigation when using bcrypt: enforce the limit explicitly rather than relying on silent truncation behaviour.

---

### H2 — Password reset does not invalidate existing sessions

**File:** `src/app/api/auth/reset-password/route.ts` lines 34–38

**Problem:** After a successful password reset, only the reset token is deleted and the user's password is updated. No active JWT sessions are invalidated. Because the app uses the JWT strategy (`session: { strategy: "jwt" }` in `src/auth.ts` line 16), sessions are stateless — there is no server-side session table to purge. This means an attacker who has already compromised an active session retains access even after the victim resets their password. OWASP explicitly requires that all other sessions be invalidated (or the user prompted to do so) after a successful password reset.

**Fix (two-part):**

1. Add a `passwordChangedAt DateTime?` field to the `User` model (new migration required) and set it on every successful password change and reset.
2. In the `auth.ts` JWT callback, compare `token.iat` (issued-at) against `user.passwordChangedAt`; if the token was issued before the password changed, return `null` to force re-authentication:

```ts
callbacks: {
  async jwt({ token, user }) {
    if (user) return token   // initial sign-in
    const dbUser = await prisma.user.findUnique({ where: { id: token.sub! }, select: { passwordChangedAt: true } })
    if (dbUser?.passwordChangedAt && token.iat! < dbUser.passwordChangedAt.getTime() / 1000) {
      return null   // forces sign-out
    }
    return token
  }
}
```

Apply the same stamp in `changePassword` in `src/actions/profile.ts`.

---

## 🟡 MEDIUM

### M1 — `resend-verification` endpoint leaks whether an email is registered via HTTP status code

**File:** `src/app/api/auth/resend-verification/route.ts` lines 39–43

**Problem:** When the email is unknown or already verified, the endpoint returns HTTP 200. When the email *is* registered, unverified, and currently within the 60-second cooldown, the endpoint returns HTTP **429** with a distinct error body `"Please wait a moment before requesting another email."`. An attacker can distinguish registered-but-recently-requested from all other states by observing the 429. This breaks the OWASP anti-enumeration guidance that requires uniform responses regardless of account existence.

**Fix:** Return HTTP 200 (not 429) for the cooldown case as well — matching the behaviour of `/api/auth/forgot-password` which silently swallows the cooldown. If the client-side form needs to show a cooldown message, drive it from local state (timestamp of last request) rather than a server status code:

```ts
// Replace the 429 block with:
if (Date.now() - createdAt.getTime() < COOLDOWN_MS) {
  return OK   // silent 200 — same as unknown/verified
}
```

---

### M2 — No rate limiting on `/api/auth/register`

**File:** `src/app/api/auth/register/route.ts`

**Problem:** The registration endpoint has no rate limiting. An attacker can automate large-scale account creation (e.g., to exhaust email sending quota, probe for existing accounts via the 409 "Email already in use" response, or create spam accounts). The 409 response on line 29–32 also confirms whether a given email address is already registered, which is an enumeration vector. This endpoint performs a DB write, a bcrypt hash, and sends a transactional email per request — all of which make unbounded calls expensive.

**Fix:**
- Add IP-based rate limiting (e.g., using `@upstash/ratelimit` with a Vercel KV/Redis store, or a simple in-memory store for low-traffic early stages). A reasonable limit is 5–10 registration attempts per IP per hour.
- For the 409 enumeration: follow OWASP guidance and return 200 with "If this email is not already registered, a verification link has been sent" — but only if email verification is enabled. With `EMAIL_VERIFICATION_ENABLED=false` (dev mode), the 409 is acceptable.

---

### M3 — No rate limiting on credentials sign-in

**File:** `src/auth.ts` lines 30–52 (Credentials `authorize` callback)

**Problem:** There is no brute-force protection on the credentials sign-in path. An attacker who knows a valid email can submit unlimited password guesses. NextAuth's Credentials provider calls the `authorize` function directly; the default NextAuth implementation does not add rate limiting. Each attempt invokes `prisma.user.findUnique` and `bcrypt.compare` (computationally expensive). Without a lockout or exponential backoff, automated password spraying is unrestricted.

**Fix:** Add a rate-limit check at the top of the `authorize` function keyed on the email address (or IP, or both). Libraries like `@upstash/ratelimit` integrate cleanly. Alternatively, implement an account lockout counter (`failedLoginAttempts`, `lockedUntil`) on the `User` model. A simple 5-attempts-per-15-minutes rule per email is sufficient for early-stage protection.

---

### M4 — No rate limiting on `/api/auth/resend-verification`

**File:** `src/app/api/auth/resend-verification/route.ts`

**Problem:** The only throttle is a 60-second per-email cooldown computed from token creation time. There is no per-IP limit. An attacker can enumerate a list of email addresses and hit this endpoint for each one in rapid succession — limited only by the 60-second cooldown *per address*, not per IP. Because each call to a known unverified address triggers a Resend API call and a DB write, this can be used to exhaust email quota or exfiltrate whether a large list of addresses has pending unverified accounts (via timing or prior M1 leak).

**Fix:** Add a per-IP rate limit (e.g., 10 requests/hour) on top of the existing per-email cooldown.

---

## 🔵 LOW / INFORMATIONAL

### L1 — `changePassword` does not invalidate existing sessions after a password change

**File:** `src/actions/profile.ts` lines 54–58

**Problem:** Same root cause as H2 but triggered from the authenticated profile page. When an authenticated user changes their password, any other active JWT sessions (e.g., a different browser or device) remain valid. OWASP ASVS 3.3.3 requires that the user be prompted to terminate other sessions (or that sessions are invalidated automatically) after a successful credential change.

**Fix:** Apply the same `passwordChangedAt` timestamp solution described in H2. The `changePassword` action already touches the `User` record; add `passwordChangedAt: new Date()` to the same Prisma update on line 55–57.

---

### L2 — Verification tokens use `crypto.randomUUID()` (128-bit) — adequate but not maximally hardened

**File:** `src/app/api/auth/register/route.ts` line 48, `src/app/api/auth/resend-verification/route.ts` line 49, `src/app/api/auth/forgot-password/route.ts` line 43

**Problem:** `crypto.randomUUID()` generates a version-4 UUID which has 122 bits of actual entropy (6 bits are fixed version/variant markers). This is cryptographically adequate and uses the Web Crypto CSPRNG. However, the UUID format is publicly known and predictable in structure (8-4-4-4-12 hex characters). This is not exploitable in practice, but tokens for security-critical flows (password reset, email verification) conventionally use `crypto.randomBytes(32).toString('hex')` for a clean 256-bit token with no structural constraints.

**Fix (informational):** Consider switching to:
```ts
import { randomBytes } from "crypto"
const token = randomBytes(32).toString("hex")
```
This is a minor hardening step; `crypto.randomUUID()` is not considered insecure.

---

### L3 — `deleteAccount` has no re-authentication or typed confirmation requirement

**File:** `src/app/api/auth/register/route.ts` and `src/components/profile/delete-account-dialog.tsx`

**Problem:** Account deletion requires only an active session and a single modal confirmation click. There is no password re-prompt or typed confirmation (e.g., typing "DELETE" or the account email). If a user's browser session is hijacked via XSS or a shared device, an attacker can delete the account with a single authenticated request. This is a low risk at current stage but becomes significant once users have meaningful stored data.

**Fix:** For higher assurance, require the user to type their email address or "delete" into a text input in the confirmation dialog before the delete button activates.

---

## ✅ Passed Checks

| Check | File | Notes |
|---|---|---|
| bcrypt used (not MD5/SHA1/raw SHA256) | `src/auth.ts:5`, `src/app/api/auth/register/route.ts:4` | `bcryptjs` imported and used correctly |
| bcrypt work factor >= 10 | `src/app/api/auth/register/route.ts:35`, `src/actions/profile.ts:54`, `src/app/api/auth/reset-password/route.ts:35` | Work factor 12 throughout |
| `bcrypt.compare` used for verification | `src/auth.ts:39`, `src/actions/profile.ts:49` | Correct — no constant-time bypass issues |
| Raw password never logged or returned | All files | No `console.log(password)` or password in response bodies |
| Token generation uses CSPRNG | `register/route.ts:48`, `resend-verification/route.ts:49`, `forgot-password/route.ts:43` | `crypto.randomUUID()` — Web Crypto API, CSPRNG-backed |
| Token expiry enforced at generation | `register/route.ts:49`, `forgot-password/route.ts:44` | 24h and 1h respectively |
| Token expiry enforced at verification | `verify-email/route.ts:21`, `reset-password/route.ts:29` | Checked before use |
| Expired tokens deleted on rejection | `verify-email/route.ts:23`, `reset-password/route.ts:30` | Cleaned up immediately |
| Reset token is single-use | `reset-password/route.ts:38` | Deleted after successful use |
| Forgot-password uniform response (OWASP) | `forgot-password/route.ts:27–29` | Unknown email, OAuth-only accounts all return 200 |
| Per-email reset cooldown | `forgot-password/route.ts:33–39` | 60-second cooldown silently applied |
| Tokens scoped with identifier prefix | `forgot-password/route.ts:31`, `reset-password/route.ts:25` | `"password-reset:<email>"` prefix prevents cross-flow reuse |
| Reset/verification tokens sent only via email | `email.ts` | Tokens appear only in Resend email body |
| Zod validation on all API routes | `register/route.ts:9–13`, `forgot-password/route.ts:6–8`, `reset-password/route.ts:6–9`, `resend-verification/route.ts:8` | All inputs validated before DB access |
| Email format validated before DB lookup | All API routes | `z.email()` used throughout |
| `changePassword` verifies session | `src/actions/profile.ts:19–21` | `auth()` checked, early return on missing session |
| `deleteAccount` verifies session | `src/actions/profile.ts:64–67` | `auth()` checked, early return on missing session |
| Profile queries scoped to `session.user.id` | `src/lib/db/profile.ts:24`, `src/actions/profile.ts:41–43`, `src/actions/profile.ts:69` | No IDOR — all Prisma queries use authenticated userId |
| Profile page protected at route level | `src/proxy.ts:9–10` | `/profile` in proxy matcher |
| Profile page protected at page level | `src/app/profile/page.tsx:13–14` | Secondary `auth()` guard with redirect |
| Open-redirect safe callbackUrl | `src/components/auth/sign-in-form.tsx:23` | Only accepts paths starting with `/` |
| Email verification gate on credentials sign-in | `src/auth.ts:46–48` | Throws `EmailNotVerified` when `emailVerified` is null and verification enabled |
| GitHub OAuth accounts blocked from password reset | `forgot-password/route.ts:27` | `!user.password` check returns uniform 200 |
| Registration input validated server-side | `src/app/api/auth/register/route.ts:18–23` | Zod parse before any DB interaction |

---

## Summary

- **Total findings:** 7 (Critical: 0, High: 2, Medium: 4, Low: 1)
- **Most impactful fix:** H2 — Introduce a `passwordChangedAt` timestamp and check it in the JWT callback. Until this is done, compromised sessions survive a password reset, undermining the primary account-recovery security control.
- **Overall posture:** Solid foundation. Token flows, CSRF, bcrypt algorithm choice, session checks, and IDOR protections are all correctly implemented. The most urgent gaps are the absence of brute-force protection on the sign-in and register endpoints (M2, M3), the session survival after password reset (H2), and the bcrypt 72-byte truncation ceiling that should be enforced explicitly (H1). None of the findings are exploitable without either network access to the endpoints or a pre-existing session compromise, which keeps the overall risk profile moderate.
