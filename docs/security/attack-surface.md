# attack-surface.md — سطح حمله (H2)
| مسیر / دارایی | روش | لاگین؟ | ورودی | نقش | نکته |
|---|---|---|---|---|---|
| `/`، `*.html/js/css` (SPA) | GET | نه | مسیر | — | هر مسیر ناشناس ← index.html؛ تست شد `/server.js`,`/seed.json`,`/data/db.json`,`/.env`,`..` همه index.html برمی‌گردانند |
| /api/bootstrap | GET | نه | — | — | منو، ترکیب‌ها، me/state اگر لاگین باشد |
| /api/events (SSE) | GET | نه | — | — | سقف ۵۰۰ کل و ۸ به‌ازای IP؛ uid فقط به خود کاربر |
| /api/setup | GET/POST | نه | email,password,code | — | فقط تا وقتی مالک نیست؛ لوکال بدون کد (F4) |
| /api/auth/register | POST | نه | name,email,password | — | ۱۰/ساعت/IP |
| /api/auth/login | POST | نه | email,password | — | ۳۰/۱۵ دقیقه/IP + قفل حساب |
| /api/auth/logout | POST | نه | — | — | CSRF header |
| /api/track | POST | نه | type | — | ۱۲۰/دقیقه/IP، ذخیره دسته‌ای |
| /api/games (GET) | GET | نه | — | — | جدول هفتگی با نام کوتاه |
| /api/auth/reset | POST | نه | token,password | — | ۱۰/ساعت/IP؛ توکن یک‌بارمصرف، هش‌شده، ۳۰ دقیقه |
| /api/auth/logout-all، /api/me/delete، /api/me/2fa/(setup\|enable\|disable) | POST | بله | رمز، کد | هر نقش | بازاحراز با رمز؛ سقف نرخ |
| /api/admin/users/reset-link | POST | بله | email | مالک | لینک ریست برای مشتری |
| /api/me، /api/me/favs، /api/me/account | GET/PATCH/PUT | بله | name,email,password,favs | هر نقش | account: رمز فعلی + ۱۰/۱۵دقیقه |
| /api/orders | POST | بله | lines[variantId,qty,free,comboId] | مشتری | بدون rate-limit (F2) · comboId اعتبارسنجی نمی‌شود (F1) |
| /api/games/memory\|quiz/start,finish,answer | POST | بله | sid,flips,choice | مشتری | ۶۰/ساعت |
| /api/admin/dashboard، orders، products، inventory(+history) | GET | بله | days | کارمند/مالک | 401/403 تست شد |
| PATCH /api/admin/orders/:id | PATCH | بله | status | کارمند/مالک | |
| PATCH /api/admin/products/:id، inventory/:id، beans/:id | PATCH | بله | price,stock,notes | مالک | یادداشت‌ها بدون escape در سایت (F10) |
| POST/PATCH/GET /api/admin/challenges، GET /api/admin/audit | * | بله | فیلدهای چالش | مالک | id/title بدون escape در UI (F10) |
| آپلود، وب‌هوک، WebSocket، cron، OAuth، bucket، DB مستقیم | — | — | — | — | وجود ندارند |
| فایل‌ها: `data/db.json` (دیسک، mode 644)، `seed.json`، env: PORT, DB_FILE, COOKIE_SECURE, OWNER_EMAIL/PASSWORD, SEED_FILE, GAME_MIN_MS | — | — | — | — | خارج از `public/` ✔ |
| اسکریپت/استایل خارجی | — | — | — | — | فقط Google Fonts CSS (بدون SRI، ممکن نیست برای CSS پویا) |

**فایل‌های جدید:** `/privacy.html` (استاتیک)؛ روی دیسک: `data/security.log`، `data/backups/*.enc`، `data/db.json.key` (mode 600، کلید رمزنگاری 2FA/بکاپ).
