# data.md — Users' important data and when to delete it

> این فایل دستورالعمل داده‌های مهم کاربره برای دستیار هوش مصنوعی‌ت: شماره تلفن، ایمیل، اسم، کارت بانکی و...
> می‌گه چی رو اصلاً نگیر، چی رو چطوری نگه دار، و کِی پاکش کن.

## Instructions for the AI assistant

Treat every piece of personal data as a liability: collect less, protect it, and delete it on schedule. Follow the rules below for new code and review existing code. Create and maintain `docs/security/data-inventory.md` (rule D1). When a retention period needs a legal or business decision, propose a default, mark it "needs owner decision", and ask me. Do not claim legal compliance (GDPR, local laws); only follow the technical practices here. Never print real personal data or secrets in reports; use masked examples.

How to read the rules: **MUST** = required, **NEVER** = forbidden. Every rule has an ID (D1, D2...) that `checklist.md` uses. Keep the IDs when you report.

## 1. Know what you store

- **D1** MUST create `docs/security/data-inventory.md` with one row per stored personal/sensitive field, found by reading the DB schema/models, forms, logs, analytics, and third-party integrations. Fill it in, do not leave it empty:

| Field | Why needed | Where stored (table/service) | Who can read | Encrypted? | Retention / delete when |
|-------|-----------|------------------------------|--------------|-----------|-------------------------|
| email | login, receipts | `users.email` | app, support | in transit + disk | until account deletion |
| phone | OTP login | `users.phone` | app | field-level | until account deletion |
| full name | invoice | `users.name` | app, support | disk | until account deletion |
| ... | ... | ... | ... | ... | ... |

- **D2** MUST apply data minimisation: if a field has no clear purpose, do not collect it. Make optional fields optional. Do not ask for national ID, date of birth, address, or location unless a feature truly needs it. Remove fields that nothing uses.
- **D3** Sensitive categories that need extra care: password hashes, phone, email, full name, address, national ID, bank card and payment data, location, IP address, health data, private messages, uploaded documents/photos, auth tokens.

## 2. Payment cards: never store them

- **D4** NEVER store the full card number (PAN), CVV/CVC, or PIN, not even encrypted, not in logs, not in "temporary" tables, and no inventory justification can allow it. Use the payment provider's hosted page or SDK (Stripe Checkout/Elements, or your gateway's redirect page) so card data never touches your server. Store only what the provider returns: customer id, payment/transaction id, token, brand, last 4 digits, and expiry if needed. If PAN/CVV/PIN is found stored anywhere, it is a failure: remove it through an approved remediation (ask me first) and rotate/notify as needed.
- **D5** MUST verify payments on the SERVER, never from a "payment succeeded" flag sent by the browser. Verify the webhook signature (or call the provider server-to-server), AND check that the provider status is successful and that the order id, amount, currency, and merchant account match what YOUR server expects. Bind each payment to the intended order, and deduplicate fulfilment atomically (unique payment id / DB transaction) so a repeated or replayed webhook cannot deliver twice.

## 3. Protect it while stored and moving

- **D6** All traffic MUST use TLS (see `security.md` S14). Connections to databases, caches, and queues over any network, INCLUDING private networks, MUST use authenticated TLS: validate the server certificate and hostname, with no insecure fallback (no `sslmode=disable`, no `rejectUnauthorized: false`).
- **D7** MUST enable encryption at rest: provider disk/database encryption, and field-level encryption (AES-256-GCM via a maintained library, unique nonce per value) for highly sensitive fields (national ID, documents, third-party account tokens). Encryption keys MUST live in a secret manager/KMS, never next to the data or in the repo.
- **D8** Least privilege on reading: every table/route returns only the fields the caller needs (explicit `select`/DTOs, never `SELECT *` to the client). The admin panel shows masked values by default. Users can only read their OWN records (check ownership on the server).
- **D9** MUST mask personal data in logs, error messages, analytics, and error trackers (Sentry etc.): phone `0912***4567`, email `a***@gmail.com`, card last 4 only. NEVER log passwords, tokens, full request bodies of login/payment routes, or `Authorization`/`Cookie` headers. Add a redaction helper or middleware and use it everywhere. NEVER put personal data in URLs or query strings.

## 4. Retention and deletion (when to delete)

- **D10** MUST define a deletion schedule in the inventory and implement it as an automatic job (cron/scheduled function), not a manual TODO. Proposed defaults (owner decides):
  - password reset / email verification / OTP tokens: delete at expiry (within 24 h)
  - expired or revoked sessions: delete after expiry
  - auth and access logs: 30–90 days
  - temporary uploads, exports, and carts: 7–30 days
  - inactive accounts: warn by email, then delete or anonymise after a period the owner chooses
  - data you no longer need for the feature that collected it: delete it
- **D11** MUST provide a "Delete my account" feature: re-authenticate, confirm, invalidate ALL sessions and tokens of that user (access, refresh, remember-me; see `auth.md` A12), then delete or irreversibly anonymise the user's data across the DB (cascade), file storage, search index, caches, and third-party services (email list, analytics, payment-provider customer, CRM). Keep only what the law requires (e.g. invoices) and write that exception in the inventory. Optional: grace period of at most 30 days with the option to cancel. Also offer "download my data" if feasible.
- **D12** Backups MUST be encrypted, access-restricted, automatic, and stored in a different place than the main data (rule of thumb: 3 copies, 2 media types, 1 off-site). Set a backup retention (e.g. 30 days) so deleted data ages out. TEST a restore at least once and after every big change. After restoring a backup, re-apply account deletions made since that backup.

## 5. Other places data leaks

- **D13** NEVER send personal data to AI APIs, analytics, or other third parties unless necessary; strip or mask it first. List every third party that receives user data in the inventory.
- **D14** NEVER copy production data to dev/staging/laptops. Use fake seed data.
- **D15** Keep a short, honest privacy policy page that matches the inventory (what you collect, why, how long, how to delete).
- **D16** Have a basic incident plan in `docs/security/incident.md`: who to tell, how to rotate keys (`security.md` S8), how to notify affected users, what to log.

## How to verify (examples)

- Search the schema for columns named `card`, `cvv`, `pan`, `ssn`, `national_id`. Any PAN/CVV/PIN storage FAILS D4 and must be removed (it cannot be justified). Other sensitive fields need a documented justification in the inventory, or removal.
- Review logging calls near login/payment/user code (`console.log`, `logger.*`): no sensitive values printed.
- Create a test user, delete the account, then query every table and storage bucket for their id/email: zero rows/files left (except documented legal exceptions), and old tokens no longer work.
- Check a scheduled job exists for each retention line of the inventory.
- Check the DB/cache connection strings enable TLS with certificate verification.

## How to report back to me (گزارش به من)

Answer in Persian, in simple words. First show the filled `data-inventory.md` table (masked examples only). Then ONE table for rules D1–D16:

| # | قانون | وضعیت (✅ / ❌ / ➖) | شاهد (فایل:خط، کوئری، خروجی؛ بدون داده یا رمز واقعی) | کار لازم |
|---|-------|------|------|------|

List separately the retention periods that need MY decision. Ask before deleting any real data or changing the database.

Reference: OWASP Cheat Sheets (Logging, Cryptographic Storage, User Privacy Protection, Third Party Payment Gateway Integration), OWASP Top 10:2021 A02, OWASP ASVS 5.0.0 (V12 Secure Communication, V14 Data Protection), PCI DSS (never store CVV after authorization).
