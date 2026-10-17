# hack.md — Find common attack paths and fix them

> این فایل از AI می‌خواد مثل یه هکر فکر کنه: هوش مصنوعی راه‌های حملهٔ رایج رو می‌گرده، هر چی پیدا کرد با شاهد گزارش می‌ده و کمکت می‌کنه درستش کنی — ولی تضمین نمی‌ده همه‌چی پیدا بشه.
> فقط روی سایت و پروژهٔ خودت استفاده کن.

## Instructions for the AI assistant

Act as a defensive application-security reviewer (white-box audit). Follow the procedure below in order. You review and fix MY project; you do not attack anything else. You check the common attack paths; you cannot prove that nothing is left, so say what you did NOT verify. Never print real secrets or personal data in findings; redact them.

How to read the rules: every item has an ID (H1, H2...) that `checklist.md` uses. Keep the IDs when you report. Think like an attacker, but act like a developer: find, document, fix, re-test.

- **H1 Scope.** MUST test only this project, running locally or on my staging copy, with test accounts and fake data. NEVER scan, probe, or send exploit traffic to systems I do not own, third-party services, or the live production database. Do not run destructive tests (deleting data, flooding) at all. If a test could affect production, stop and ask me.

## Step 1 — Map the attack surface

- **H2** Build a table of everything an outsider can reach: pages and API routes (method + path), forms, file uploads, webhooks, WebSocket endpoints, admin panel, cron/background endpoints, OAuth/OIDC callbacks (check them against `auth.md` A17), public storage buckets, direct DB access (Supabase RLS / Firebase rules / exposed ports), third-party scripts, and env/config files. Save it as `docs/security/attack-surface.md`.

| Route / asset | Method | Auth required? | Input it accepts | Role needed | Notes |
|---------------|--------|----------------|------------------|-------------|-------|

## Step 2 — Check each category (OWASP Top 10:2021 + extras)

- **H3 Broken access control (A01).** For every route that takes an id (`/orders/123`), verify the server checks that the logged-in user OWNS the object (IDOR). Verify admin routes check role on the server. Unauthenticated users get `401/403`, not data. Check mass assignment: each write endpoint accepts only an allowlist of fields; a user cannot set `role`, `isAdmin`, `userId`, `price`, `status`.
- **H4 Injection (A03).** Search for string-built SQL/NoSQL queries, `eval`, `exec`, `child_process`, `os.system`, unsafe template rendering. Every query is parameterized; every shell call avoids user input.
- **H5 XSS (A03).** Search for `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, `|safe`, unescaped template output. Use context-specific output encoding (HTML body, attribute, JavaScript, URL, CSS each differ) and safe DOM sinks (`textContent`). Sanitize with a maintained sanitizer (DOMPurify) ONLY where HTML is intentionally accepted. Validate URL schemes (`https:` / `http:` only, no `javascript:`), and never interpolate untrusted data into scripts or event handlers. Add a CSP.
- **H6 CSRF.** State-changing routes using cookies, including login and logout, need SameSite plus a CSRF token or an exact trusted-`Origin` check (missing, `null`, or untrusted origins are rejected). See `auth.md` A11, A16.
- **H7 SSRF (A10).** Any feature that fetches a user-supplied URL (image import, webhook, link preview, AI "browse") MUST: allow only needed schemes (`https`) and ports; resolve DNS and validate ALL resulting IPv4 and IPv6 addresses against an allowlist/blocklist (block loopback, private, link-local, and cloud metadata such as `169.254.169.254`); connect to the validated address (defends against DNS rebinding); and disable redirects or re-validate every hop.
- **H8 Security misconfiguration (A05).** Check: debug off; default credentials removed; directory listing off; unused routes/sample pages removed; storage buckets private by default; BaaS rules enabled (RLS/Firestore rules) and tested as an anonymous user; DB and admin tools not reachable from the internet.
  - **Security headers** on all HTML responses: `Content-Security-Policy` (start strict, no `unsafe-inline` if possible) that INCLUDES `frame-ancestors 'none'` (or a specific allowlist) to stop clickjacking, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. `X-Frame-Options: DENY` is an optional fallback for old browsers.
  - **CORS**: explicit origin allowlist; NEVER `Access-Control-Allow-Origin: *` together with credentials, and never reflect the request `Origin` blindly.
- **H9 Vulnerable dependencies (A06).** Run `npm audit` (or `pnpm audit`, `pip-audit`, `composer audit`, `bundle audit`), list Critical/High, upgrade them. A Critical/High finding is closed only by an upgrade/patch/removal, or by evidence that it is a false positive or not reachable in this app (written down with proof). Documentation alone does not make an unresolved Critical/High pass. Commit the lockfile, remove unused packages, and ask me before major-version upgrades.
- **H10 File upload.** Validate extension, detected content type (magic bytes), and parsed content TOGETHER (magic bytes alone are not proof of safety). Reject active formats (HTML, SVG, JS, executables) unless truly required. Max size and decompressed-size limits; random server-generated filenames; store outside the web root or in a private bucket; never execute uploads; serve untrusted files as attachments (`Content-Disposition: attachment`) with the correct `Content-Type`, or from a separate isolated origin; re-encode images when possible; malware scanning where applicable.
- **H11 Error messages (A05).** Production errors show a generic message plus a request id. NEVER return stack traces, SQL errors, file paths, or framework versions to the client. Log details server-side only.
- **H12 Rate limits.** Add limits to login, sign-up, reset, OTP/SMS, search, contact forms, file upload, and every route that costs money (AI/LLM calls, email, SMS). Set per-user and per-IP caps.
- **H13 Logging and monitoring (A09).** Security events (failed logins, access denied, role changes, rate-limit hits) are logged without sensitive data, and someone gets alerted on spikes.
- **H14 Integrity (A08) and design (A04).** Verify webhook signatures AND payment details (order, amount, currency, deduplication; see `data.md` D5); lockfiles committed; CI secrets scoped; no unpinned scripts from untrusted CDNs (use SRI); no auto-deploy from unreviewed branches. Check business-logic abuse: negative quantities, price taken from client, coupon reuse, skipping the payment step.
- **H15 If the app calls an LLM:** treat user text and fetched web content as untrusted (prompt injection); give the model only the tools/data the current user is allowed to access; never put secrets in prompts; validate model output before using it in SQL, shell, or HTML.
- **H16 Cryptographic failures (A02) and auth failures (A07):** verify against `security.md` S11–S14 and `auth.md` A1–A17.
- **H20 Unsafe deserialization and XXE (A08 / A05).** Where the app parses untrusted serialized data or XML: NEVER deserialize untrusted input into native objects (`pickle`, Java `ObjectInputStream`, PHP `unserialize`, `node-serialize`, YAML `load` with arbitrary tags); parse with safe parsers and validate against a schema (JSON + `zod`/`pydantic`); disable XML external entities, external DTD loading, and unnecessary entity expansion in every XML parser.

Useful local tools (run against my own local/staging app only): `npm audit`, `gitleaks --redact`, `semgrep` (static analysis), `OWASP ZAP` baseline scan, `curl -I` for headers.

## Step 3 — Write the findings

- **H17** Save `docs/security/findings.md` with one row per problem. Severity: **Critical** (remote data theft/takeover, exposed secrets), **High** (access-control bypass, injection, XSS on authenticated pages), **Medium** (missing headers, weak limits), **Low** (hardening, info leaks).

| ID | Severity | Location (file:line / route) | What an attacker could do | Fix | Status |
|----|----------|------------------------------|---------------------------|-----|--------|

## Step 4 — Fix

- **H18** Fix Critical first, then High, then Medium, then Low. One fix per commit with a clear message. After each fix, add or run a test that would have caught the problem, and re-test. Ask me BEFORE risky changes: DB migrations, deleting data, auth rewrites, major dependency upgrades, rotating live keys. Do not "fix" by disabling a security feature.
- **H19** When done, re-run Steps 1–3 on the changed areas and update the table. Report anything you could not verify honestly as "not verified".

## How to report back to me (گزارش به من)

Answer in Persian, in simple words, not technical jargon. Give a short summary first (how many Critical/High/Medium/Low found, how many fixed, what you could not verify). Then ONE table:

| شدت | کجا | هکر چی کار می‌تونست بکنه (ساده) | راه‌حل | وضعیت (درست شد ✅ / مونده ❌ / منتظر تأیید تو ⏳) |
|-----|-----|-----------|-------|------|

End with: the 3 most important things I should know, and the list of risky changes waiting for my approval.

Reference: OWASP Top 10:2021, OWASP ASVS 5.0.0 (V1 Encoding and Sanitization, V3 Web Frontend Security, V4 API and Web Service, V5 File Handling, V8 Authorization, V13 Configuration), OWASP Cheat Sheet Series (SSRF Prevention, XSS Prevention, CSRF Prevention, File Upload, Content Security Policy, Deserialization, XXE Prevention).
