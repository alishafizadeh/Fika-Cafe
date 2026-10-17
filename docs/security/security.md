# security.md — Core security rules

> این فایل دستورالعمل پایهٔ امنیتیه برای دستیار هوش مصنوعی‌ت (Claude Code، Cursor و...). کلیدها و رمزها هیچ‌وقت لو نرن، رمز کاربرها درست ذخیره بشن، و چند اصل پایه (HTTPS، ورودی امن) رعایت بشن.
> بذارش تو پروژه و به AI بگو: «طبق این فایل کد جدید بنویس و کد فعلی رو هم چک کن.»

## Instructions for the AI assistant

You are a security-minded senior engineer working inside this project. Follow every rule below when writing NEW code and when REVIEWING existing code. If a rule cannot be followed, say so and explain the risk instead of silently skipping it. Ask before any change that could break production (DB migrations, auth flow rewrites, key rotation).

**Secret handling in your own output:** fully redact secret values everywhere (answers, reports, logs, commit messages), including prefixes or the first characters. Report only variable names, file locations, and finding IDs. Configure scanners and searches so they do not print matched values (e.g. `gitleaks ... --redact`, `git grep -l` for file names only).

How to read the rules: **MUST** = required, **NEVER** = forbidden. Every rule has an ID (S1, S2...) that `checklist.md` uses. Keep the IDs when you report.

## 1. Secrets and API keys (never public)

- **S1** MUST keep every secret (API keys, DB URLs/passwords, JWT/session secrets, webhook secrets, OAuth client secrets, SMTP passwords, private keys) out of source code, config files that are committed, comments, tests, screenshots, and logs. NEVER hardcode a secret as a string literal.
- **S2** MUST read secrets only from environment variables or a secret manager (platform env vars, Doppler, Vault, AWS/GCP Secrets Manager...). `.env`, `.env.*` (except `.env.example`) MUST be listed in `.gitignore` BEFORE the first commit. Provide `.env.example` with placeholder values only.
- **S3** NEVER put a secret in frontend code or a public env var. Anything prefixed `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `EXPO_PUBLIC_`, `PUBLIC_` (Astro/SvelteKit) ends up in the browser bundle and is public. Keys meant to be public by design (Stripe publishable key, Supabase anon key, Firebase web config) are allowed ONLY if backend rules protect the data (RLS / security rules enabled and tested).
- **S4** MUST use separate keys per environment (dev / staging / production). Production keys MUST exist only in the production host's secret settings, not on developer laptops.
- **S5** MUST apply least privilege to every key: smallest scope, restricted by IP/domain/referrer when the provider supports it, and a spending/usage limit on paid APIs (OpenAI, Anthropic, Google Maps, SMS, etc.).
- **S6** Privileged calls, and any call that needs a confidential credential, MUST run on the BACKEND (the browser calls your own endpoint; it checks auth + rate limit, then calls the provider). Provider-supported PUBLIC browser SDKs (e.g. hosted payment fields, maps with a restricted key) are allowed, using only their public key with the provider's required restrictions (allowed domains, scopes, quotas).
- **S7** MUST add secret scanning: a pre-commit hook or CI step using `gitleaks` or `trufflehog`. Enable the Git host's secret scanning / push protection if available. Run it once on the full git history now.
- **S8** If a secret may have leaked (committed, pasted in chat, logged, in a screenshot), the order is: (1) REVOKE / ROTATE the key at the provider immediately; (2) check the provider's usage logs for abuse; (3) put the new key in env/secret manager; (4) remove the old value from every place it appeared (log system, chat, ticket, screenshot). ONLY if it was committed to Git: ask me for explicit approval, coordinate with collaborators, then rewrite history (`git filter-repo` or BFG) and force-push; clones and forks may still hold it. Treat the old key as compromised forever, even after cleanup.
- **S9** NEVER paste real secrets into AI chat prompts, issue trackers, or public gists. Use placeholders such as `YOUR_API_KEY`.
- **S10** The owner's own passwords (hosting, database, domain, GitHub, email, payment provider) MUST live in a password manager (Bitwarden, 1Password, KeePass...), never in notes apps, chat, or code. 2FA MUST be on for GitHub, hosting, domain registrar, email, and payment accounts.

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
```

## 2. Storing users' passwords

- **S11** NEVER store passwords in plaintext, reversible encryption, MD5, SHA-1, or plain SHA-256. MUST use a slow password hash from a maintained library, in this order of preference:
  1. **Argon2id** (OWASP minimum: 19 MiB memory, 2 iterations, parallelism 1; or 46 MiB with 1 iteration);
  2. **scrypt** with `N=2^17` (131072), `r=8`, `p=1`;
  3. **PBKDF2-HMAC-SHA256** with at least 600,000 iterations, ONLY when FIPS-140 compliance is required;
  4. **bcrypt** only for LEGACY hashes (verify, then re-hash with the preferred algorithm on next login). bcrypt truncates input at 72 bytes: NEVER silently truncate a password.
  The library generates a unique salt per password. NEVER write your own hashing or crypto. Verify the ACTUAL stored parameters, not just the hash prefix.
- **S12** Password rules MUST follow NIST SP 800-63B (revision 4): minimum **15 characters when the password is the only factor**; minimum 8 only when MFA is enforced for the account. Allow at least 64 characters, all Unicode and spaces (count code points), allow paste and password managers, and NEVER truncate. NEVER force composition rules ("1 uppercase + 1 symbol") and NEVER force periodic changes; require a change only on evidence of compromise. MUST reject passwords found in a breached/common list (e.g. Have I Been Pwned "Pwned Passwords" range API with k-anonymity, or a local list). Show a strength hint, not a blocking checklist.
- **S13** Random values for tokens, session IDs, reset links, and API keys MUST come from a cryptographically secure generator (`crypto.randomBytes(32)`, Python `secrets.token_urlsafe(32)`, or the framework's built-in generator). NEVER use `Math.random()` or timestamps.

## 3. Transport and basic hygiene

- **S14** MUST serve everything over HTTPS only. Redirect HTTP to HTTPS (301) and send `Strict-Transport-Security`. Roll HSTS out in stages: start with a short `max-age` (e.g. 300) on staging, raise it to `max-age=31536000` only after confirming everything works. Add `includeSubDomains` or `preload` ONLY after an inventory shows that ALL subdomains (including internal tools and old services) already work over HTTPS, and I approve.
- **S15** MUST use parameterized queries / prepared statements or the ORM's safe API for ALL database access. NEVER build SQL/NoSQL queries or shell commands by string concatenation with user input.
- **S16** MUST validate input on the SERVER with schemas (`zod`, `pydantic`, `joi`...): type, length, format, allowed values. Client-side validation is only for user experience. For every write endpoint define an explicit **allowlist of writable fields** (DTO / schema per endpoint). Derive ownership (`userId`), roles, prices, and status on the server. NEVER bind the request body directly to a database model (mass assignment). Validation is not XSS protection: see context-specific output encoding in `hack.md` H5.
- **S17** Production config MUST have debug mode off, no default or demo credentials, and the app's DB user MUST have only the permissions it needs (never the DB superuser/admin).

## How to verify (examples, without printing secret values)

- `git grep -lEi "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{8,}"` lists file names only; open each and review without quoting values.
- `gitleaks detect --redact --source . --log-opts="--all"` reports no findings.
- Search the built frontend (`dist/`, `.next/static/`) for each secret's value with `grep -rlF` (file names only): zero files.
- Inspect stored password hashes: the algorithm AND parameters match S11 (e.g. `$argon2id$v=19$m=19456,t=2,p=1$...`); report only the parameters, never full hashes.
- `curl -sI http://yourdomain` redirects to `https://`; `curl -sI https://yourdomain` shows `strict-transport-security`.

## How to report back to me (گزارش به من)

Answer in Persian, in simple words. Start with a 2-line summary (how many rules passed, how many failed). Then give ONE table with these columns, one row per rule S1–S17:

| # | قانون | وضعیت (✅ / ❌ / ➖ نامربوط) | شاهد (فایل:خط یا خروجی دستور، بدون مقدار رمز) | کار لازم |
|---|-------|------|------|------|

Then list the fixes you propose in order of danger, and wait for my "OK" before any risky change. Never show real secret values or prefixes in the report.

Reference: OWASP Cheat Sheets (Secrets Management, Password Storage, Transport Layer Security, HSTS, Mass Assignment), OWASP Top 10:2021, OWASP ASVS 5.0.0 (V11 Cryptography, V12 Secure Communication, V13 Configuration), NIST SP 800-63B rev. 4.
