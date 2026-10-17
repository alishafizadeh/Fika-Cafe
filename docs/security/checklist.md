# checklist.md — Pre-release security checklist

> این فایل همهٔ چیزهایی که تو چهار فایل قبلی گفتیم رو یه‌جا جمع کرده. قبل از هر انتشار جدید (ریلیز) بده به AI تا یکی‌یکی چکشون کنه و بهت بگه کدوم درسته و کدوم نه.

## Instructions for the AI assistant

**Before EVERY release, go through this list one by one and report each item as ✅ (passed), ❌ (failed or not verified) or ➖ (not applicable, with evidence that the feature is absent), WITH EVIDENCE.**

Rules for the check:

1. Evidence means something concrete: file and line, command output, test result, a `curl` response, or a screenshot description. "Looks fine" is not evidence.
2. If you could not verify an item, mark it ❌ with "not verified". NEVER mark ✅ by assumption.
3. Every **applicable** item marked **[BLOCKER]** must be ✅ for the release to go out. ➖ is allowed only with evidence that the feature is absent (e.g. no user accounts, no payments). A failed or unverified applicable blocker means: say clearly "Do not release" and list the fixes.
4. Details and exact wording of each rule are in `security.md` (S), `auth.md` (A), `data.md` (D), `hack.md` (H). This file only lists them; open the source file when you need the full rule.
5. Only check my own project (local or staging). Ask before running anything that touches production.

## 1. Secrets and basics (security.md)

- [ ] **S1** No secrets in code, config, tests, or logs **[BLOCKER]**
- [ ] **S2** `.env*` in `.gitignore`; `.env.example` has placeholders only **[BLOCKER]**
- [ ] **S3** No secret in frontend bundle or `NEXT_PUBLIC_`/`VITE_`/`REACT_APP_` vars; public keys are protected by backend rules **[BLOCKER]**
- [ ] **S4** Separate keys for dev / staging / production
- [ ] **S5** Keys have least privilege and spending limits
- [ ] **S6** Privileged/confidential-credential calls (AI, payment, SMS...) run on the backend; browser SDKs use only restricted public keys
- [ ] **S7** Secret scanning (`gitleaks`) ran on code and full history: no findings **[BLOCKER]**
- [ ] **S8** No leaked key is still active (rotated first; git history rewritten only if it was committed, with my approval)
- [ ] **S9** No real secret was pasted into AI chats, issues, or screenshots
- [ ] **S10** Passwords of hosting/DB/GitHub/email are in a password manager with 2FA on
- [ ] **S11** Passwords hashed with Argon2id (or scrypt / PBKDF2 for FIPS; bcrypt legacy only), real parameters verified, no truncation, no plaintext/MD5/SHA1 **[BLOCKER]**
- [ ] **S12** Password policy follows NIST rev. 4 (15+ chars if password-only, 8+ only with enforced MFA, 64+ allowed, no truncation, breached check, no forced composition/rotation)
- [ ] **S13** Tokens/IDs come from a secure random generator
- [ ] **S14** HTTPS only, HTTP redirects, HSTS header present (staged rollout; `includeSubDomains`/preload only after a subdomain inventory) **[BLOCKER]**
- [ ] **S15** All DB queries parameterized **[BLOCKER]**
- [ ] **S16** Server-side schema validation and writable-field allowlists/DTOs on every write endpoint (no mass assignment)
- [ ] **S17** Debug off, no default credentials, DB user has least privilege **[BLOCKER]**

## 2. Login and sessions (auth.md)

- [ ] **A1** Generic error for wrong email/password; no account enumeration (login, sign-up, reset)
- [ ] **A2** Rate limiting on login, sign-up, reset, OTP
- [ ] **A3** Lockout/backoff: 5 failures in 15 min → 15 min lock, stored server-side **[BLOCKER]**
- [ ] **A4** Breached-password check on sign-up/change/reset
- [ ] **A5** Failed logins and password changes are logged (without secrets) and the user is notified
- [ ] **A6** Cookies: `HttpOnly`, `Secure`, `SameSite` (`__Host-` prefix: `Path=/`, no `Domain`) **[BLOCKER]**
- [ ] **A7** Random server-validated session IDs; nothing sensitive in `localStorage`
- [ ] **A8** Session ID rotated on login and privilege change
- [ ] **A9** Idle timeout and absolute timeout enforced; sensitive actions need fresh re-authentication
- [ ] **A10** Logout deletes the session on the server, revokes refresh + remember-me tokens, kills access tokens, clears the cookie **[BLOCKER]**
- [ ] **A11** Logout is `POST` with CSRF protection; old cookie/tokens after logout return `401`; no cached private pages
- [ ] **A12** "Log out all devices"; all sessions/tokens end after password change, reset, account deletion and disablement
- [ ] **A13** Reset tokens: single-use, hashed, expiring (15–60 min) **[BLOCKER]**
- [ ] **A14** Email verification; re-auth for sensitive actions
- [ ] **A15** 2FA available; required for admin accounts
- [ ] **A16** Server-side authorization on every request; CSRF protection on state-changing routes **[BLOCKER]**
- [ ] **A17** If social login is used: PKCE S256 + state, exact redirect URIs; OIDC: nonce + ID token validated, user keyed on (iss, sub); no email-only account merging
- [ ] **A-T** The 8 tests listed in `auth.md` were run and passed

## 3. User data (data.md)

- [ ] **D1** `docs/security/data-inventory.md` exists and matches the current database/forms
- [ ] **D2** No field is collected without a reason
- [ ] **D4** No full card number / CVV / PIN stored or logged; payments via provider's hosted page/SDK **[BLOCKER]**
- [ ] **D5** Payments verified on the server: signature + status + order/amount/currency/merchant match; fulfilment deduplicated
- [ ] **D6** Authenticated TLS for all traffic, including DB/cache connections on private networks (certificate + hostname validated, no insecure fallback)
- [ ] **D7** Encryption at rest; sensitive fields encrypted; keys in a secret manager
- [ ] **D8** APIs return only needed fields; users read only their own data; admin panel masks values
- [ ] **D9** Logs, errors, and error trackers mask personal data; no PII in URLs **[BLOCKER]**
- [ ] **D10** Automatic deletion jobs exist for every retention line
- [ ] **D11** "Delete my account" works end to end (DB, files, third parties) and invalidates all sessions/tokens
- [ ] **D12** Backups are encrypted, automatic, retention set, restore tested
- [ ] **D13** No unnecessary personal data sent to AI/third parties
- [ ] **D14** No production data in dev/staging
- [ ] **D15** Privacy policy matches reality
- [ ] **D16** Incident plan exists (`docs/security/incident.md`)

## 4. Attack paths (hack.md)

- [ ] **H2** `docs/security/attack-surface.md` is up to date for new routes/forms/uploads
- [ ] **H3** Every object route checks ownership (no IDOR); admin routes check role; no mass assignment **[BLOCKER]**
- [ ] **H4** No injection (SQL/NoSQL/command) **[BLOCKER]**
- [ ] **H5** No unsafe HTML rendering; CSP set
- [ ] **H6** CSRF protection verified
- [ ] **H7** URL-fetching features block internal addresses (SSRF)
- [ ] **H8** Security headers set (CSP incl. `frame-ancestors`); CORS allowlist; BaaS rules (RLS etc.) tested as anonymous user **[BLOCKER]**
- [ ] **H9** `npm audit` (or equivalent): 0 open Critical/High; closed only by a fix or by evidence of false positive / not reachable (documentation alone is not enough) **[BLOCKER]**
- [ ] **H10** File uploads: type/size limits, random names, private storage
- [ ] **H11** Production errors show no stack traces or internals
- [ ] **H12** Rate limits on expensive or abusable endpoints (AI, SMS, email)
- [ ] **H13** Security events logged and alerts configured
- [ ] **H14** Webhook signatures and payment details verified; lockfile committed; business-logic abuse checked
- [ ] **H15** If the app uses an LLM: prompt injection considered, tools/data limited per user, output validated
- [ ] **H16** Crypto and auth failures cross-checked against S11–S14 and A1–A17
- [ ] **H17** `docs/security/findings.md` has no open Critical/High **[BLOCKER]**
- [ ] **H20** Unsafe deserialization and XXE checked (safe parsers, XML external entities disabled)

## 5. Deployment (release day)

- [ ] **R1** Code committed and tagged (rollback point exists) **[BLOCKER]**
- [ ] **R2** All production env vars are set on the host; none are missing or taken from `.env` in the repo
- [ ] **R3** Valid HTTPS certificate; HTTP redirects to HTTPS
- [ ] **R4** Database is not reachable from the public internet; only the app can connect
- [ ] **R5** Admin panel is protected (auth + 2FA, ideally IP-restricted); no default admin account
- [ ] **R6** Test accounts, seed data, and sample pages are removed from production
- [ ] **R7** Latest backup exists and a restore was tested recently
- [ ] **R8** Monitoring and alerts are on (errors, failed logins, cost spikes on paid APIs)
- [ ] **R9** Security headers verified on the LIVE URL (`curl -sI https://yourdomain`)
- [ ] **R10** Dependencies installed from the lockfile (`npm ci`), no dev-only packages in production
- [ ] **R11** `hack.md` audit re-run on everything changed since the last release
- [ ] **R12** Rollback steps written down and tried

## How to report back to me (گزارش به من)

Answer in Persian, simple and short. First line: "می‌شه منتشر کرد" or "منتشر نکن" (based on blockers). Then ONE table for every item above:

| # | مورد | وضعیت (✅ / ❌ / ➖) | شاهد (فایل، دستور، خروجی) | کار لازم |
|---|------|------|------|------|

After the table: the list of ❌ items ordered by danger, what you suggest for each, and what needs my approval. Save the filled report as `docs/security/release-report-YYYY-MM-DD.md`.

Reference: OWASP Top 10:2021, OWASP ASVS 5.0.0, OWASP Cheat Sheet Series, NIST SP 800-63B rev. 4.
