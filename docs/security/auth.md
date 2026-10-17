# auth.md — Login, logout and sessions

> این فایل دستورالعمل ورود و خروج کاربره برای دستیار هوش مصنوعی‌ت. هر لاگین و لاگ‌اوت رو چک می‌کنه، بعد از چند بار رمز اشتباه پشت‌سرهم حساب رو قفل می‌کنه و بعد از خروج حتماً نشست (session) رو می‌بنده.
> بذارش تو پروژه و به AI بگو طبقش کد رو بنویس و چک کنه.

## Instructions for the AI assistant

Review and implement authentication following the rules below. Prefer the framework's or a well-maintained library's auth and session features (Auth.js, Supabase Auth, Clerk, Django/Rails/Laravel built-ins...) over custom code, and check that the library is still maintained. Do not invent your own crypto or session scheme. Password hashing and password policy are defined in `security.md` (S11, S12) and are not repeated here. Ask before changing an existing login flow that real users depend on. Never print real tokens, cookies, or secrets in reports.

How to read the rules: **MUST** = required, **NEVER** = forbidden, and every rule has an ID (A1, A2...) that `checklist.md` uses. Keep the IDs when you report.

## 1. Login: errors, throttling, lockout

- **A1** MUST return the SAME generic message for wrong email and wrong password: "Email or password is incorrect". Same HTTP status, same response shape, and similar response time (hash a dummy password when the user does not exist). The same applies to sign-up ("check your email") and password reset ("if this email exists, we sent a link"). Do not reveal whether an account exists.
- **A2** MUST rate-limit login, sign-up, password reset, OTP/2FA verification, and email-sending endpoints per IP AND per account/identifier (e.g. `express-rate-limit`, `slowapi`, Upstash Ratelimit, Cloudflare rules). Return `429` with `Retry-After`.
- **A3** MUST lock or slow down accounts after repeated failures. Default policy (adjust only with my approval): after **5 failed attempts within 15 minutes** → lock the account for **15 minutes**; repeated lockouts increase the delay (exponential backoff: 15 min, 30 min, 1 h, capped at 24 h). Store the counter and lock time SERVER-SIDE (DB/Redis), reset the counter after a successful login, and keep returning the generic message while locked (do not tell attackers "account locked"; tell the real owner by email). Provide an unlock path via password reset email. To reduce lockout abuse, also throttle per IP and consider CAPTCHA after 3 failures.
- **A4** MUST check new passwords at sign-up / change / reset against the policy in `security.md` S12 (NIST length rules + breached-password list).
- **A5** MUST log failed logins, lockouts, password changes, and resets (user id, time, IP, user agent). NEVER log the password itself or tokens. Notify the user by email on password change and on lockout.

## 2. Sessions and cookies

- **A6** Session cookies MUST be set with `HttpOnly`, `Secure`, and `SameSite=Lax` (use `Strict` when the app allows it). Prefer the `__Host-` prefix, which REQUIRES `Secure`, `Path=/`, and NO `Domain` attribute (a narrower path needs a different cookie name). Example: `Set-Cookie: __Host-sid=...; HttpOnly; Secure; SameSite=Lax; Path=/`.
- **A7** Session IDs MUST be random with at least 128 bits of entropy (CSPRNG), meaningless to the client, and validated against a SERVER-SIDE store (DB/Redis) on every request. NEVER store the session token or JWT in `localStorage`/`sessionStorage`. If JWTs are used: short-lived access token (5–15 min), refresh token in an `HttpOnly` cookie with rotation, and a server-side revocation check on every request. MUST verify the signature with the trusted issuer's keys (reject `alg: none`; pin allowed algorithms) AND check issuer, audience, expiry, `nbf` when present, and the intended token type. NEVER authorize from merely decoded claims, and NEVER accept an ID token as an API access token.
- **A8** MUST rotate (regenerate) the session ID on login and on any privilege change (e.g. user becomes admin, MFA completed). This prevents session fixation. Never accept a session ID from URL parameters.
- **A9** MUST enforce timeouts on the SERVER: idle timeout (default 30 min, shorter for admin/finance) and absolute timeout (default 12 h). "Remember me" is optional, uses a separate long-lived token (max 30 days) stored hashed in the DB, and sensitive actions still require fresh re-authentication with a method the user has enrolled (password, passkey, or the external provider for federated-only accounts).

## 3. Logout (the part people forget)

AI-generated apps very often "log out" by only deleting the cookie in the browser, while the session stays valid on the server. A stolen cookie then still works. Check this first.

- **A10** Logout MUST invalidate the session on the SERVER: delete the session row, revoke the refresh token and the remember-me token, and make already-issued access tokens stop working (per-request revocation check or a very short access-token lifetime plus denylist). Also clear the cookie (`Max-Age=0`, same attributes).
- **A11** Logout MUST be a `POST` WITH CSRF protection (see A16), never a plain `GET` link. After logout, using the OLD cookie / access token / refresh token / remember-me token on any protected route MUST return `401`, and the back button must not show private pages (`Cache-Control: no-store` on authenticated pages).
- **A12** MUST offer "log out of all devices". All sessions and tokens (access, refresh, remember-me) MUST also be invalidated after password change, password reset, account deletion, and account disablement (by admin or by the user).

## 4. Reset, verification, 2FA, authorization

- **A13** Password reset tokens MUST be random (≥128 bits), stored HASHED in the DB, **single-use**, expire in 15–60 minutes, and be invalidated when a newer one is requested. Email an HTTPS reset URL built from a configured trusted application origin (an env var), NEVER from an unchecked `Host` / `X-Forwarded-Host` header. Keep tokens out of logs and out of `Referer` (`Referrer-Policy: no-referrer` on the reset page). After a successful reset: invalidate all sessions, notify the user, and keep MFA enabled (reset must not remove MFA).
- **A14** MUST verify the email address at sign-up (single-use expiring link). When a user CHANGES their email: keep the new address pending until verified, require re-authentication, and notify the OLD address. Password-only accounts should confirm from both addresses or use a documented secure recovery procedure. Other sensitive actions (change password, delete account, payment details) MUST require re-authentication.
- **A15** MFA: available to every user, REQUIRED for admin accounts (for apps that handle payments or sensitive data, require it for all users). Prefer passkeys (WebAuthn) or TOTP apps; SMS only as a fallback. OTPs and recovery codes MUST be single-use (reject replay), OTPs short-lived, recovery codes shown once and stored hashed. Re-authenticate before adding, replacing, or removing a factor, and notify the user of every factor change. A passkey counts as MFA only when WebAuthn user verification is required and verified.
- **A16** Every protected route/API MUST check authentication AND authorization on the SERVER on every request (role + ownership of the object). Hiding a button in the UI is not protection. State-changing requests that rely on cookies, INCLUDING login and logout, MUST have CSRF protection: SameSite plus a CSRF token or an exact `Origin` check against a list of trusted origins (reject missing, `null`, or untrusted origins unless another valid CSRF defense passes).
- **A17** If the app uses "Sign in with Google/GitHub/..." MUST use a maintained library for that provider; authorization-code flow with PKCE (`S256`) where the provider supports it; validate `state` bound to the user's browser session; exact registered redirect URIs (no wildcards). **For OpenID Connect providers** (e.g. Google) also validate `nonce` and the ID token (signature, issuer, audience, expiry) and identify the user by `(iss, sub)`, never by email alone. **For plain OAuth providers without ID tokens** (e.g. GitHub OAuth apps) get the identity from the provider's user API with the access token and key the account on the provider's stable user ID. Never use an ID token as an access token. NEVER auto-merge accounts by matching email: linking an external login to an existing account requires the user to be signed in to (or re-authenticate on) BOTH.

## Tests the AI MUST run (or write) and show results for

1. Wrong password 5 times in a row → 6th attempt is blocked even with the correct password; works again after the lock period.
2. Login with a non-existent email vs. existing email + wrong password → identical response (body, status, ~timing).
3. Login → copy the cookie → logout → replay the old cookie on a protected API → `401`.
4. Session ID before login ≠ session ID after login.
5. Reset link used twice → second use fails; expired link fails.
6. Cookie flags visible in the response: `HttpOnly; Secure; SameSite`.
7. Change password → other devices' sessions stop working.
8. After logout, password reset, and account deletion/disablement: replay the old access token, refresh token, and remember-me token → all rejected.

Run these only against local/staging copies of MY app.

## How to report back to me (گزارش به من)

Answer in Persian, in simple words. Begin with a short summary, then ONE table for rules A1–A17 and the 8 tests:

| # | قانون یا تست | وضعیت (✅ / ❌ / ➖) | شاهد (فایل:خط، خروجی تست، curl، بدون توکن واقعی) | کار لازم |
|---|-------------|------|------|------|

Then list what you want to change, in order of danger. Ask me before touching the login flow that existing users use.

Reference: OWASP Cheat Sheets (Authentication, Session Management, Forgot Password, Password Storage, CSRF Prevention, Multifactor Authentication), OWASP ASVS 5.0.0 (V6 Authentication, V7 Session Management, V9 Self-contained Tokens, V10 OAuth and OIDC), NIST SP 800-63B rev. 4. Target level: ASVS Level 1 as the minimum for every project, Level 2 for apps handling payments or sensitive data.
