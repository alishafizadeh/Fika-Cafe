/* Fika admin. Plain ES module: no build step. All data comes from /api/admin/*; Light/Dark/System and EN/FA share localStorage keys with the customer site. */
import {art,ico,chIcon} from './icons.js';
const $=(s,r=document)=>r.querySelector(s);
const api=async(p,b,m)=>{try{const r=await fetch(p,{method:m||(b?'POST':'GET'),headers:{'Content-Type':'application/json','X-Requested-With':'fika'},body:b?JSON.stringify(b):undefined});let j={};try{j=await r.json()}catch(e){}return r.ok?j:{error:j.error||'ERROR'}}catch(e){return{error:'NETWORK'}}};
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');

/* ---------- translations ---------- */
const D={
en:{ mfa_h:'Two-step sign-in (2FA)',mfa_on:'Two-step sign-in is ON.',mfa_off:'Two-step sign-in is OFF. Staff accounts must turn it on before using the admin panel.',mfa_start:'Set up 2FA',mfa_scan:'In your authenticator app (Google Authenticator, Aegis, 2FAS…) add a key manually with this secret:',mfa_code:'6-digit code',mfa_enable:'Turn on',mfa_codes:'Save these recovery codes now. Each works once and they are shown only this time:',mfa_done:'I saved them',mfa_disable:'Turn off 2FA',mfa_need:'Set up two-step sign-in to continue.',otp:'6-digit code or recovery code',logoutall:'Log out of all devices',allok:'Signed out everywhere.',rl_h:'Password reset link for a customer',rl_hint:'Enter the customer’s e-mail. Give the link to them in person or by message; it works once for 30 minutes.',rl_btn:'Create link',rl_none:'No customer with this e-mail.',err_OTP_REQUIRED:'Enter your 2FA code.',err_INVALID_OTP:'Wrong or already used code.',err_MFA_REQUIRED:'Set up two-step sign-in first.',err_SHORT_PASSWORD:'Password must be at least 8 characters.',err_WEAK_PASSWORD:'Choose a longer, less common password (12+ characters for staff).',weak:'This password is easy to guess. Are you sure you want to use it?',err_ALREADY_ON:'2FA is already on.',err_NOT_FOUND:'Not found.',err_LAST_OWNER:'You are the only owner.', nav_account:'My account',acct_h:'Your account',acct_hint:'Change the email and password you use to sign in. Your current password is required.',f_name:'Name',f_email:'Email',f_cur:'Current password',f_new:'New password (leave empty to keep)',f_new2:'Repeat new password',acct_save:'Save changes',acct_mismatch:'The new passwords do not match.',acct_pw_hint:'At least 8 characters (12 when the site is public).',setup_title:'Create the owner account',setup_hint:'First run: choose the email and password you will use to manage the cafe.',setup_code:'Setup code (printed in the terminal where the server runs)',setup_btn:'Create account & sign in',err_ALREADY_SETUP:'An owner account already exists.',err_SETUP_CODE:'Setup code is missing or wrong. It is printed in the terminal where the server runs.',err_WRONG_PASSWORD:'Current password is wrong.',err_EMAIL_TAKEN:'That email is already used by another account.',brand_sub:'Admin',toman:'Toman',site:'Customer site',logout:'Log out',th_light:'Light',th_dark:'Dark',th_system:'System',theme:'Theme',language:'Language',
 nav_dashboard:'Dashboard',nav_orders:'Orders',nav_inventory:'Inventory',nav_menu:'Menu & prices',nav_challenges:'Challenges',nav_audit:'Audit log',ns_menu:'Menu',ns_dashboard:'Home',ns_audit:'Audit',
 role_OWNER:'Owner',role_ADMIN:'Admin',role_STAFF:'Staff',loading:'Loading…',saved:'Saved',cancel:'Cancel',confirm:'Confirm',save:'Save',all:'All',yes:'Yes',no:'No',retry:'Try again',fail:'Could not load this page.',
 login_title:'Staff sign in',email:'Email',password:'Password',signin:'Sign in',denied:'This account has no admin access.',
 range_1:'Today',range_7:'7 days',range_30:'30 days',range_90:'3 months',
 k_revenue:'Revenue',k_orders:'Orders',k_avg:'Average order',k_active:'Active customers',k_new:'New customers',k_points:'Points issued',k_redeemed:'Free coffees redeemed',k_challenges:'Challenges completed',
 rev_day:'Revenue per day',last_n:'Last {n} days',chart:'Chart',table:'Table',top_products:'Top products',units:'sold',low_stock:'Low stock',sold_out_h:'Sold out',all_good:'Everything is well stocked',nothing:'Nothing here',no_orders_period:'No orders in this period',no_orders_sub:'Revenue appears here after the first order.',
 col_date:'Date',col_orders:'Orders',col_revenue:'Revenue',left:'left',
 all_orders:'All orders',search_orders:'Search by # or customer name',col_no:'Order',col_customer:'Customer',col_items:'Items',col_total:'Total',col_time:'Time',col_status:'Status',no_orders:'No orders yet',no_match:'No results match your filters',
 PENDING:'Pending',CONFIRMED:'Confirmed',PREPARING:'Preparing',READY:'Ready',COMPLETED:'Completed',CANCELLED:'Cancelled',
 cancel_confirm:'Cancel this order? Stock will be returned and its points removed.',cancel_yes:'Cancel order',new_order:'New order received',
 col_item:'Item',col_stock:'Stock',col_state:'State',col_low:'Low at',col_adjust:'Adjust stock',state_ok:'In stock',state_low:'Low',state_out:'Sold out',
 search_items:'Search items',reason:'Reason for stock changes',r_restock:'Restock',r_waste:'Waste',r_correction:'Correction',r_other:'Other',add:'Add',remove:'Remove',qty:'Qty',mark_out:'Mark sold out',make_avail:'Make available',
 beans_h:'Specialty coffee',beans_notes:'Specialty coffee notes (customers see these when they pick the origin)',notes_en:'English note',notes_fa:'Persian note',view_only:'You can view stock but only an owner can change it.',hist:'Stock history',h_time:'When',h_change:'Change',h_reason:'Reason',h_by:'By',no_hist:'No stock changes yet',
 tx_SALE:'Sale',tx_RESTOCK:'Restock',tx_MANUAL_ADJUSTMENT:'Manual removal',tx_CANCELLED_ORDER:'Cancelled order',
 col_product:'Product',col_cat:'Category',col_prices:'Prices ({u})',col_active:'Active',col_featured:'Featured',menu_hint:'Change prices or visibility, then press Save on that row. Inactive items disappear from the customer menu.',
 col_title:'Challenge',col_goal:'Goal',col_pts:'Points',col_ends:'Ends',new_ch:'New challenge',ext7:'+7 days',ch_active:'Active',ch_ended:'Ended',ch_off:'Off',
 f_id:'ID (letters and dashes)',f_te:'Title (English)',f_tf:'Title (Persian)',f_de:'Description (English)',f_df:'Description (Persian)',f_re:'Reward (English)',f_rf:'Reward (Persian)',f_goal:'Goal',f_pts:'Points reward',f_rule:'Rule',f_cat:'Category',f_days:'Runs for (days)',
 rule_orders:'Number of orders',rule_distinct:'Different items in a category',create:'Create',
 col_when:'When',col_who:'Who',col_action:'Action',col_change:'Change',no_audit:'No admin actions recorded yet',created:'created',
 a_inventory_update:'Stock updated',a_bean_update:'Specialty note updated',a_product_update:'Product updated',a_order_status:'Order status',a_challenge_create:'Challenge created',a_challenge_update:'Challenge updated',
 k_stock:'stock',k_available:'available',k_lowStock:'low at',k_active2:'active',k_featured:'featured',k_prices:'prices',k_status:'status',k_goal:'goal',k_pts:'points',
 err_INVALID_CREDENTIALS:'Wrong email or password.',err_ACCOUNT_LOCKED:'Too many attempts. Try again in 15 minutes.',err_RATE_LIMITED:'Too many attempts. Try again later.',err_NEGATIVE_STOCK:'Not enough stock to remove that many.',err_EXISTS:'That ID already exists.',err_FORBIDDEN:'You do not have permission for this.',err_UNAUTHENTICATED:'Please sign in again.',err_INVALID_INPUT:'Please check the values you entered.',err_ALREADY_CANCELLED:'This order is already cancelled.',err_NETWORK:'Network error. Check your connection.',err_ERROR:'Something went wrong.'},
fa:{ mfa_h:'ورود دومرحله‌ای (2FA)',mfa_on:'ورود دومرحله‌ای روشن است.',mfa_off:'ورود دومرحله‌ای خاموش است. حساب‌های کارکنان باید قبل از استفاده از پنل آن را روشن کنند.',mfa_start:'راه‌اندازی 2FA',mfa_scan:'در برنامهٔ احراز هویت (Google Authenticator، Aegis، 2FAS…) یک کلید دستی با این رمز اضافه کنید:',mfa_code:'کد ۶ رقمی',mfa_enable:'روشن کن',mfa_codes:'همین حالا این کدهای بازیابی را نگه دارید. هرکدام یک‌بار کار می‌کند و فقط همین یک بار نمایش داده می‌شود:',mfa_done:'ذخیره کردم',mfa_disable:'خاموش کردن 2FA',mfa_need:'برای ادامه ورود دومرحله‌ای را راه‌اندازی کنید.',otp:'کد ۶ رقمی یا کد بازیابی',logoutall:'خروج از همهٔ دستگاه‌ها',allok:'از همه‌جا خارج شدید.',rl_h:'لینک بازیابی رمز برای مشتری',rl_hint:'ایمیل مشتری را وارد کنید. لینک را حضوری یا پیام به او بدهید؛ یک‌بار و ۳۰ دقیقه کار می‌کند.',rl_btn:'ساخت لینک',rl_none:'مشتری‌ای با این ایمیل نیست.',err_OTP_REQUIRED:'کد 2FA را وارد کنید.',err_INVALID_OTP:'کد اشتباه است یا قبلاً استفاده شده.',err_MFA_REQUIRED:'ابتدا ورود دومرحله‌ای را راه‌اندازی کنید.',err_SHORT_PASSWORD:'رمز باید حداقل ۸ کاراکتر باشد.',err_WEAK_PASSWORD:'رمز بلندتر و کمتر رایج انتخاب کنید (برای کارکنان ۱۲+ کاراکتر).',weak:'این رمز آسان است. مطمئنید که می‌خواهید از آن استفاده کنید؟',err_ALREADY_ON:'2FA از قبل روشن است.',err_NOT_FOUND:'پیدا نشد.',err_LAST_OWNER:'شما تنها مالک هستید.', nav_account:'حساب من',acct_h:'حساب شما',acct_hint:'ایمیل و رمزی که با آن وارد می‌شوید را تغییر دهید. وارد کردن رمز فعلی الزامی است.',f_name:'نام',f_email:'ایمیل',f_cur:'رمز عبور فعلی',f_new:'رمز جدید (برای حفظ رمز فعلی خالی بگذارید)',f_new2:'تکرار رمز جدید',acct_save:'ذخیرهٔ تغییرات',acct_mismatch:'رمزهای جدید یکسان نیستند.',acct_pw_hint:'حداقل ۸ کاراکتر (وقتی سایت عمومی شود ۱۲).',setup_title:'ساخت حساب مالک',setup_hint:'اولین اجرا: ایمیل و رمزی را که برای مدیریت کافه استفاده می‌کنید انتخاب کنید.',setup_code:'کد راه‌اندازی (در ترمینالی که سرور اجرا شده چاپ شده است)',setup_btn:'ساخت حساب و ورود',err_ALREADY_SETUP:'حساب مالک از قبل وجود دارد.',err_SETUP_CODE:'کد راه‌اندازی وارد نشده یا اشتباه است. این کد در ترمینال سرور چاپ شده است.',err_WRONG_PASSWORD:'رمز فعلی اشتباه است.',err_EMAIL_TAKEN:'این ایمیل قبلاً برای حساب دیگری استفاده شده است.',brand_sub:'پنل مدیریت',toman:'تومان',site:'سایت مشتریان',logout:'خروج',th_light:'روشن',th_dark:'تیره',th_system:'سیستم',theme:'پوسته',language:'زبان',
 nav_dashboard:'داشبورد',nav_orders:'سفارش‌ها',nav_inventory:'موجودی',nav_menu:'منو و قیمت‌ها',nav_challenges:'چالش‌ها',nav_audit:'گزارش تغییرات',ns_menu:'منو',ns_audit:'گزارش',
 role_OWNER:'صاحب کافه',role_ADMIN:'مدیر',role_STAFF:'کارمند',loading:'در حال بارگذاری…',saved:'ذخیره شد',cancel:'انصراف',confirm:'تأیید',save:'ذخیره',all:'همه',yes:'بله',no:'خیر',retry:'تلاش دوباره',fail:'بارگذاری این صفحه ممکن نشد.',
 login_title:'ورود کارکنان',email:'ایمیل',password:'رمز عبور',signin:'ورود',denied:'این حساب دسترسی مدیریتی ندارد.',
 range_1:'امروز',range_7:'۷ روز',range_30:'۳۰ روز',range_90:'۳ ماه',
 k_revenue:'درآمد',k_orders:'سفارش‌ها',k_avg:'میانگین سفارش',k_active:'مشتریان فعال',k_new:'مشتریان جدید',k_points:'امتیاز صادرشده',k_redeemed:'قهوهٔ رایگان دریافت‌شده',k_challenges:'چالش تکمیل‌شده',
 rev_day:'درآمد روزانه',last_n:'{n} روز اخیر',chart:'نمودار',table:'جدول',top_products:'پرفروش‌ترین‌ها',units:'عدد فروش',low_stock:'موجودی کم',sold_out_h:'ناموجود',all_good:'موجودی همه‌چیز مناسب است',nothing:'موردی نیست',no_orders_period:'در این بازه سفارشی ثبت نشده',no_orders_sub:'بعد از اولین سفارش، درآمد اینجا نمایش داده می‌شود.',
 col_date:'تاریخ',col_orders:'سفارش',col_revenue:'درآمد',left:'مانده',
 all_orders:'همهٔ سفارش‌ها',search_orders:'جستجو با شماره یا نام مشتری',col_no:'سفارش',col_customer:'مشتری',col_items:'اقلام',col_total:'مبلغ',col_time:'زمان',col_status:'وضعیت',no_orders:'هنوز سفارشی ثبت نشده',no_match:'نتیجه‌ای با این فیلترها پیدا نشد',
 PENDING:'در انتظار',CONFIRMED:'تأییدشده',PREPARING:'در حال آماده‌سازی',READY:'آماده',COMPLETED:'تحویل داده شد',CANCELLED:'لغو شده',
 cancel_confirm:'این سفارش لغو شود؟ موجودی برمی‌گردد و امتیازهای آن کسر می‌شود.',cancel_yes:'لغو سفارش',new_order:'سفارش جدید رسید',
 col_item:'آیتم',col_stock:'موجودی',col_state:'وضعیت',col_low:'هشدار در',col_adjust:'تغییر موجودی',state_ok:'موجود',state_low:'کم',state_out:'ناموجود',
 search_items:'جستجوی آیتم',reason:'دلیل تغییر موجودی',r_restock:'تأمین موجودی',r_waste:'ضایعات',r_correction:'اصلاح',r_other:'سایر',add:'افزودن',remove:'کم کردن',qty:'تعداد',mark_out:'ناموجود کن',make_avail:'موجود کن',
 beans_h:'قهوهٔ اسپشیالیتی',beans_notes:'توضیح قهوه‌های اسپشیالیتی (مشتری هنگام انتخاب خاستگاه این را می‌بیند)',notes_en:'توضیح انگلیسی',notes_fa:'توضیح فارسی',view_only:'می‌توانید موجودی را ببینید ولی فقط صاحب کافه می‌تواند آن را تغییر دهد.',hist:'تاریخچهٔ موجودی',h_time:'زمان',h_change:'تغییر',h_reason:'دلیل',h_by:'توسط',no_hist:'هنوز تغییری در موجودی ثبت نشده',
 tx_SALE:'فروش',tx_RESTOCK:'تأمین موجودی',tx_MANUAL_ADJUSTMENT:'کسر دستی',tx_CANCELLED_ORDER:'لغو سفارش',
 col_product:'محصول',col_cat:'دسته',col_prices:'قیمت‌ها ({u})',col_active:'فعال',col_featured:'ویژه',menu_hint:'قیمت یا نمایش آیتم را تغییر دهید و روی دکمهٔ ذخیرهٔ همان ردیف بزنید. آیتم‌های غیرفعال از منوی مشتریان حذف می‌شوند.',
 col_title:'چالش',col_goal:'هدف',col_pts:'امتیاز',col_ends:'پایان',new_ch:'چالش جدید',ext7:'+۷ روز',ch_active:'فعال',ch_ended:'تمام‌شده',ch_off:'خاموش',
 f_id:'شناسه (حروف انگلیسی و خط تیره)',f_te:'عنوان (انگلیسی)',f_tf:'عنوان (فارسی)',f_de:'توضیح (انگلیسی)',f_df:'توضیح (فارسی)',f_re:'جایزه (انگلیسی)',f_rf:'جایزه (فارسی)',f_goal:'هدف',f_pts:'امتیاز جایزه',f_rule:'قانون',f_cat:'دسته',f_days:'مدت (روز)',
 rule_orders:'تعداد سفارش',rule_distinct:'آیتم‌های متفاوت از یک دسته',create:'ساخت',
 col_when:'زمان',col_who:'توسط',col_action:'عملیات',col_change:'تغییر',no_audit:'هنوز عملیات مدیریتی ثبت نشده',created:'ساخته شد',
 a_inventory_update:'تغییر موجودی',a_bean_update:'ویرایش توضیح اسپشیالیتی',a_product_update:'ویرایش محصول',a_order_status:'وضعیت سفارش',a_challenge_create:'ساخت چالش',a_challenge_update:'ویرایش چالش',
 k_stock:'موجودی',k_available:'در دسترس',k_lowStock:'هشدار در',k_active2:'فعال',k_featured:'ویژه',k_prices:'قیمت‌ها',k_status:'وضعیت',k_goal:'هدف',k_pts:'امتیاز',
 err_INVALID_CREDENTIALS:'ایمیل یا رمز عبور اشتباه است.',err_ACCOUNT_LOCKED:'تلاش‌های زیاد. ۱۵ دقیقه دیگر دوباره امتحان کنید.',err_RATE_LIMITED:'تلاش‌های زیاد. بعداً دوباره امتحان کنید.',err_NEGATIVE_STOCK:'موجودی برای کم کردن این تعداد کافی نیست.',err_EXISTS:'این شناسه قبلاً وجود دارد.',err_FORBIDDEN:'دسترسی لازم برای این کار را ندارید.',err_UNAUTHENTICATED:'دوباره وارد شوید.',err_INVALID_INPUT:'مقادیر واردشده را بررسی کنید.',err_ALREADY_CANCELLED:'این سفارش قبلاً لغو شده است.',err_NETWORK:'خطای شبکه. اتصال را بررسی کنید.',err_ERROR:'مشکلی پیش آمد.'}};
let lang=store.get('lang','en')==='fa'?'fa':'en';
const t=(k,v)=>{let s=D[lang][k]??D.en[k]??k;if(v)for(const x in v)s=s.replace('{'+x+'}',v[x]);return s};
const L=()=>lang==='fa'?'fa-IR':'en-US';
const nf=n=>Number(n||0).toLocaleString(L());
const money=n=>nf(n)+' '+t('toman');
const compact=n=>new Intl.NumberFormat(L(),{notation:'compact',maximumFractionDigits:1}).format(n);
const dt=x=>new Date(x).toLocaleString(L(),{dateStyle:'medium',timeStyle:'short'});
let STRICT_UI=true;
const callWeak=async(path,b,m)=>{let r=await api(path,b,m);if(r&&r.error==='WEAK_PASSWORD'&&!(me&&me.strict!==undefined?me.strict:STRICT_UI)&&confirm(t('weak')))r=await api(path,{...b,acceptWeak:true},m);return r};
const errMsg=c=>D[lang]['err_'+c]??D.en['err_'+c]??t('err_ERROR');

/* ---------- icons ---------- */
const ICONS={account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
 orders:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',inventory:'<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
 menu:'<path d="M5 8h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2"/>',challenges:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a2 2 0 0 0 2 4M16 6h3a2 2 0 0 1-2 4M12 13v4M9 20h6"/>',
 audit:'<path d="M12 7v5l3 2"/><path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4"/>',light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 dark:'<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',system:'<path d="M3 5h18v11H3zM8 20h8M12 16v4"/>',logout:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',site:'<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>'};
const ic=(n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- state ---------- */
const NAV=[['dashboard'],['orders'],['inventory'],['menu',true],['challenges',true],['audit',true]];
let me=(await api('/api/me')).me||null,tab='dashboard',days=7,PR=[],CATS=[],ORD=[],INV=[],HIS=[],CHS=[],AUD=[];
let ofilter='ALL',oq='',ifilter='all',iq='',ireason='restock',chartTable=false,CHART=[],es=null;
const staff=()=>!!me&&['STAFF','OWNER','ADMIN'].includes(me.role);
const own=()=>!!me&&['OWNER','ADMIN'].includes(me.role);
const app=$('#app');
const prefs=()=>store.get('prefs',{theme:'system'});
const effTheme=()=>{const t=prefs().theme||'system';return t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t};

/* product naming (works for both languages) */
const byPid=id=>PR.find(p=>p.id===id);
const pname=p=>lang==='fa'?p.nameFa:p.nameEn;
const itemName=(pid,i)=>{const p=byPid(pid);if(!p)return pid;const v=p.variants[i];return pname(p)+(p.variants.length>1&&v?` (${lang==='fa'?v.labelFa:v.labelEn})`:'')};
const varName=vid=>{const[p,i]=String(vid).split(':');if(p==='bean'){const r=INV.find(x=>x.id===vid);return r?(lang==='fa'?r.nameFa:r.nameEn)+' · '+t('beans_h'):i}return itemName(p,+i)};
const emojiOf=pid=>{const p=byPid(pid)||{};return art(p.art,p.catKey).replace('class="art"','class="art mini"')};
const catName=k=>{const c=CATS.find(x=>x.key===k);return c?(lang==='fa'?c.fa:c.en):k};

/* ---------- chrome ---------- */
function applyPrefs(){const h=document.documentElement,p=prefs();p.theme&&p.theme!=='system'?h.dataset.theme=p.theme:h.removeAttribute('data-theme');h.classList.toggle('rm',!!p.motion);h.lang=lang;h.dir=lang==='fa'?'rtl':'ltr'}
function chrome(){
  applyPrefs();document.body.classList.toggle('anon',!staff());
  $('#brandName').textContent=lang==='fa'?'فیکا':'Fika';$('#brandSub').textContent=t('brand_sub');
  $('#nav').innerHTML=staff()?NAV.filter(n=>!n[1]||own()).map(([k])=>`<a href="#${k}"${k===tab?' aria-current="page"':''}>${ic(k)}${D[lang]['ns_'+k]?`<span class="l">${t('nav_'+k)}</span><span class="s">${t('ns_'+k)}</span>`:`<span>${t('nav_'+k)}</span>`}</a>`).join(''):'';
  $('#who').innerHTML=staff()?`<a href="#account" style="text-decoration:none;display:grid"><b>${esc(me.name)}</b><span class="muted">${esc(me.email)} · ${t('role_'+me.role)}</span></a>`:'';
  $('#title').textContent=staff()?t('nav_'+tab):(lang==='fa'?'فیکا':'Fika');
  const th=effTheme();
  $('#ctl').innerHTML=`<div class="seg" role="group" aria-label="${t('theme')}">${['light','dark'].map(k=>`<button type="button" data-theme="${k}" aria-pressed="${th===k}" title="${t('th_'+k)}" aria-label="${t('th_'+k)}">${ic(k,16)}</button>`).join('')}</div>`
   +`<div class="seg" role="group" aria-label="${t('language')}"><button type="button" data-lang="en" aria-pressed="${lang==='en'}" lang="en">EN</button><button type="button" data-lang="fa" aria-pressed="${lang==='fa'}" lang="fa">فا</button></div>`
   +(staff()?`<a class="iconbtn" href="#account" title="${t('nav_account')}" aria-label="${t('nav_account')}"${tab==='account'?' aria-current="page"':''}>${ic('account',18)}</a>`:'')
   +`<a class="iconbtn" href="/" title="${t('site')}" aria-label="${t('site')}">${ic('site',18)}</a>`
   +(staff()?`<button type="button" class="iconbtn" data-logout title="${t('logout')}" aria-label="${t('logout')}">${ic('logout',18)}</button>`:'');
  document.title=(staff()?t('nav_'+tab)+' · ':'')+'Fika';
}
function toast(m,bad){const e=document.createElement('div');e.className='toast'+(bad?' bad':'');e.textContent=m;const c=$('#toasts');while(c.children.length>=3)c.firstChild.remove();c.append(e);setTimeout(()=>e.remove(),2600)}
const ok=r=>{if(r.error){toast(errMsg(r.error),true);return false}toast(t('saved'));return true};
function ask(html){const d=$('#dlg');d.innerHTML=html;d.returnValue='';d.showModal();return d}
const confirmBox=(msg,label)=>new Promise(res=>{const d=ask(`<form method="dialog"><p>${esc(msg)}</p><div class="acts"><button class="btn" value="no">${t('cancel')}</button><button class="btn p" value="yes" autofocus>${esc(label||t('confirm'))}</button></div></form>`);d.onclose=()=>res(d.returnValue==='yes')});

/* ---------- shared pieces ---------- */
const badge=s=>`<span class="badge st-${s}">${t(s)}</span>`;
const empty=(a,b)=>`<div class="empty"><b>${a}</b>${b?`<span>${b}</span>`:''}</div>`;
const skeleton=()=>`<div class="stack">${'<div class="card"><div class="skel" style="width:40%"></div><div class="skel" style="margin-top:12px"></div><div class="skel" style="margin-top:8px;width:80%"></div></div>'.repeat(3)}</div>`;
const STATUSES=['PENDING','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'];

/* ---------- chart (single series, SVG, direction-independent geometry) ---------- */
function niceStep(x){const p=Math.pow(10,Math.floor(Math.log10(x||1))),f=x/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p}
function fillSeries(src,n){const m={};src.forEach(s=>m[s[0]]=s);const out=[];for(let i=n-1;i>=0;i--){const k=new Date(Date.now()-i*864e5).toISOString().slice(0,10);out.push([k,m[k]?m[k][1]:0,m[k]?m[k][2]||0:0])}return out}
const dlabel=k=>new Date(k+'T00:00:00Z').toLocaleDateString(L(),{month:'short',day:'numeric',timeZone:'UTC'});
function paintChart(){
  const el=$('#chart');if(!el)return;
  if(chartTable){el.innerHTML=`<div class="scroll"><table><thead><tr><th>${t('col_date')}</th><th>${t('col_orders')}</th><th>${t('col_revenue')}</th></tr></thead><tbody>${CHART.slice().reverse().map(s=>`<tr><td>${dlabel(s[0])}</td><td class="num">${nf(s[2])}</td><td class="num">${money(s[1])}</td></tr>`).join('')}</tbody></table></div>`;return}
  const S=CHART,W=Math.max(300,el.clientWidth),H=230,m={l:46,r:8,t:12,b:28},iw=W-m.l-m.r,ih=H-m.t-m.b,n=S.length,mx=Math.max(...S.map(s=>s[1]));
  if(!mx){el.innerHTML=empty(t('no_orders_period'),t('no_orders_sub'));return}
  const step=niceStep(mx/4),top=Math.ceil(mx/step)*step,band=iw/n,bw=Math.max(3,Math.min(26,band*.6));
  let g='',bars='',xl='';
  for(let v=0;v<=top+1e-9;v+=step){const y=m.t+ih-(v/top)*ih;g+=`<line x1="${m.l}" x2="${W-m.r}" y1="${y}" y2="${y}"/><text x="${m.l-8}" y="${y+4}" text-anchor="end">${compact(v)}</text>`}
  S.forEach((s,i)=>{const h=(s[1]/top)*ih;if(h<=0)return;const x=m.l+(i+.5)*band-bw/2,y=m.t+ih-h,r=Math.min(4,bw/2,h);
    bars+=`<path class="bar-m" data-i="${i}" d="M${x},${m.t+ih}V${y+r}a${r},${r} 0 0 1 ${r},-${r}h${bw-2*r}a${r},${r} 0 0 1 ${r},${r}V${m.t+ih}Z"/>`});
  const idx=n<=7?S.map((_,i)=>i):[0,1,2,3,4,5].map(k=>Math.round(k*(n-1)/5));
  idx.forEach(i=>{xl+=`<text x="${m.l+(i+.5)*band}" y="${H-8}" text-anchor="middle">${dlabel(S[i][0])}</text>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${t('rev_day')}"><g class="grid">${g}</g>${bars}${xl}</svg><div class="tip" hidden></div>`;
  const svg=$('svg',el),tip=$('.tip',el);
  const move=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)*(W/r.width)-m.l,i=Math.floor(x/band);
    if(i<0||i>=n){leave();return}
    svg.querySelectorAll('.bar-m').forEach(b=>b.classList.toggle('dim',+b.dataset.i!==i));
    tip.hidden=false;tip.innerHTML=`<b>${dlabel(S[i][0])}</b><br>${money(S[i][1])} · ${nf(S[i][2])} ${t('col_orders')}`;
    const cx=(m.l+(i+.5)*band)*(r.width/W);tip.style.left=Math.min(Math.max(cx,70),r.width-70)+'px';
    const h=(S[i][1]/top)*ih;tip.style.top=(Math.max(8,(m.t+ih-h)*(r.height/H))-6)+'px'};
  const leave=()=>{tip.hidden=true;svg.querySelectorAll('.bar-m').forEach(b=>b.classList.remove('dim'))};
  svg.addEventListener('pointermove',move);svg.addEventListener('pointerleave',leave);svg.addEventListener('pointerdown',move);
}

/* ---------- views ---------- */
const VIEW={
async dashboard(){
  const [d,d2]=await Promise.all([api('/api/admin/dashboard?days='+days),days<7?api('/api/admin/dashboard?days=7'):null]);
  if(d.error)throw new Error(d.error);
  const n=Math.max(days,7);CHART=fillSeries((d2&&!d2.error?d2:d).series,n);
  const kp=(a,b,c)=>`<div class="kpi"><span>${a}</span><b>${b}</b>${c?`<small>${c}</small>`:''}</div>`;
  const maxQ=Math.max(1,...d.topProducts.map(x=>x[1]));
  const stockRow=(v,out)=>`<li class="hbar" style="grid-template-columns:1fr auto"><span>${esc(varName(v.id))}</span><span class="badge ${out?'b-out':'b-low'} num">${out?t('state_out'):nf(v.stock)+' '+t('left')}</span></li>`;
  return `<div class="stack">
   <div class="head" style="margin:0"><div class="seg" role="group" aria-label="${t('nav_dashboard')}">${[1,7,30,90].map(x=>`<button type="button" data-days="${x}" aria-pressed="${days===x}">${t('range_'+x)}</button>`).join('')}</div></div>
   <div class="kpis">${kp(t('k_revenue'),money(d.revenue))}${kp(t('k_orders'),nf(d.orders))}${kp(t('k_avg'),money(d.avgOrder))}${kp(t('k_active'),nf(d.activeCustomers))}
     ${kp(t('k_new'),nf(d.newCustomers))}${kp(t('k_points'),nf(d.pointsIssued))}${kp(t('k_redeemed'),nf(d.rewardsRedeemed))}${kp(t('k_challenges'),nf(d.challengeCompletions))}</div>
   <div class="two">
    <section class="card"><header><div><h2>${t('rev_day')}</h2><span class="muted sm">${t('last_n',{n:nf(n)})}</span></div>
      <div class="seg" role="group"><button type="button" data-cv="0" aria-pressed="${!chartTable}">${t('chart')}</button><button type="button" data-cv="1" aria-pressed="${chartTable}">${t('table')}</button></div></header>
      <div class="chartwrap" id="chart"></div></section>
    <section class="card"><header><h2>${t('top_products')}</h2></header>
      ${d.topProducts.length?d.topProducts.map(([id,q])=>`<div class="hbar"><span>${emojiOf(id)} ${esc(itemName(id,0).replace(/ \(.*\)$/,''))}</span><span class="t" aria-hidden="true"><i style="width:${q/maxQ*100}%"></i></span><b class="num">${nf(q)}</b></div>`).join(''):empty(t('nothing'))}</section>
   </div>
   <div class="three">
    <section class="card"><header><h2>${t('low_stock')}</h2></header>${d.lowStock.length?`<ul class="plain" style="list-style:none;padding:0;margin:0">${d.lowStock.map(v=>stockRow(v,false)).join('')}</ul>`:empty(t('all_good'))}</section>
    <section class="card"><header><h2>${t('sold_out_h')}</h2></header>${d.soldOut.length?`<ul class="plain" style="list-style:none;padding:0;margin:0">${d.soldOut.map(v=>stockRow(v,true)).join('')}</ul>`:empty(t('nothing'))}</section>
   </div></div>`},

async orders(){ORD=await api('/api/admin/orders');if(ORD.error)throw new Error(ORD.error);
  return `<div class="stack"><div class="head" style="margin:0"><div class="chips" id="ochips"></div><input type="search" id="oq" class="w" style="max-width:300px" placeholder="${t('search_orders')}" aria-label="${t('search_orders')}" value="${esc(oq)}"></div>
   <section class="card" style="padding:6px 10px"><div class="scroll" id="olist"></div></section></div>`},
paintOrders(){
  const cnt=s=>ORD.filter(o=>s==='ALL'||o.status===s).length;
  $('#ochips').innerHTML=['ALL',...STATUSES].map(s=>`<button type="button" class="chip" data-of="${s}" aria-pressed="${ofilter===s}">${s==='ALL'?t('all_orders'):t(s)} <em>${nf(cnt(s))}</em></button>`).join('');
  const q=oq.trim().toLowerCase(),list=ORD.filter(o=>(ofilter==='ALL'||o.status===ofilter)&&(!q||String(o.n).includes(q)||(o.customer||'').toLowerCase().includes(q)));
  $('#olist').innerHTML=!ORD.length?empty(t('no_orders')):!list.length?empty(t('no_match')):
   `<table class="stack-m"><thead><tr><th>${t('col_no')}</th><th>${t('col_customer')}</th><th>${t('col_items')}</th><th>${t('col_total')}</th><th>${t('col_time')}</th><th>${t('col_status')}</th></tr></thead><tbody>${list.map(o=>
   `<tr><td data-l="${t('col_no')}"><b class="num">#${nf(o.n)}</b></td><td data-l="${t('col_customer')}">${esc(o.customer||'—')}</td>
    <td data-l="${t('col_items')}" class="sm">${o.lines.map(l=>`${nf(l.qty)}× ${esc(itemName(l.id,l.size))}${l.free?' '+ico('gift','in'):''}`).join('<br>')}</td>
    <td data-l="${t('col_total')}" class="num">${money(o.total)}</td><td data-l="${t('col_time')}" class="sm muted">${dt(o.createdAt)}</td>
    <td data-l="${t('col_status')}">${o.status==='CANCELLED'?badge('CANCELLED'):`<span class="cell"><select data-os="${o.id}" aria-label="${t('col_status')} #${o.n}" class="st-${o.status}" style="border-inline-start:4px solid var(--c)">${STATUSES.map(s=>`<option value="${s}"${s===o.status?' selected':''}>${t(s)}</option>`).join('')}</select></span>`}</td></tr>`).join('')}</tbody></table>`},

async inventory(){const [a,b]=await Promise.all([api('/api/admin/inventory'),api('/api/admin/inventory/history')]);if(a.error)throw new Error(a.error);INV=a;HIS=b.error?[]:b;
  return `<div class="stack">${own()?'':`<div class="card sm muted">${t('view_only')}</div>`}
   <div class="head" style="margin:0"><div class="chips">${[['all',t('all')],['low',t('state_low')],['out',t('state_out')]].map(([k,l])=>`<button type="button" class="chip" data-if="${k}" aria-pressed="${ifilter===k}">${l}</button>`).join('')}</div>
    <div class="cell"><input type="search" id="iq" placeholder="${t('search_items')}" aria-label="${t('search_items')}" value="${esc(iq)}">${own()?`<label class="cell sm muted">${t('reason')} <select id="ireason">${['restock','waste','correction','other'].map(k=>`<option value="${k}"${k===ireason?' selected':''}>${t('r_'+k)}</option>`).join('')}</select></label>`:''}</div></div>
   <section class="card" style="padding:6px 10px"><div class="scroll" id="ilist"></div></section>
   ${INV.some(r=>r.bean)?`<section class="card"><header><h2>${t('beans_notes')}</h2></header>${INV.filter(r=>r.bean).map(r=>`<div class="bean-ed" data-bean="${r.id.slice(5)}" style="display:grid;gap:8px;margin-bottom:14px"><b>${esc(lang==='fa'?r.nameFa:r.nameEn)}</b><label class="sm muted">${t('notes_en')}<textarea rows="3" data-nen style="width:100%"${own()?'':' readonly'}>${esc(r.notesEn||'')}</textarea></label><label class="sm muted">${t('notes_fa')}<textarea rows="3" data-nfa dir="rtl" style="width:100%"${own()?'':' readonly'}>${esc(r.notesFa||'')}</textarea></label>${own()?`<button type="button" class="btn s p" data-savebean="${r.id.slice(5)}" style="justify-self:start">${t('save')}</button>`:''}</div>`).join('')}</section>`:''}
   <section class="card"><header><h2>${t('hist')}</h2></header>${HIS.length?`<div class="scroll"><table class="stack-m"><thead><tr><th>${t('h_time')}</th><th>${t('col_item')}</th><th>${t('h_change')}</th><th>${t('h_reason')}</th><th>${t('h_by')}</th></tr></thead><tbody>${HIS.slice(0,40).map(h=>`<tr><td data-l="${t('h_time')}" class="sm muted">${dt(h.at)}</td><td data-l="${t('col_item')}">${esc(varName(h.variantId))}</td><td data-l="${t('h_change')}"><b class="num" style="color:${h.qty>0?'var(--s-ready)':'var(--danger)'}">${h.qty>0?'+':'−'}${nf(Math.abs(h.qty))}</b> <span class="muted sm">${t('tx_'+h.type)}</span></td><td data-l="${t('h_reason')}" class="sm">${esc(h.reason||'')}</td><td data-l="${t('h_by')}" class="sm">${esc(h.by||'')}</td></tr>`).join('')}</tbody></table></div>`:empty(t('no_hist'))}</section></div>`},
paintInv(){
  const q=iq.trim().toLowerCase(),state=r=>(!r.available||r.stock<=0)?'out':r.stock<=r.lowStock?'low':'ok';
  const list=INV.filter(r=>(ifilter==='all'||state(r)===ifilter)&&(!q||(r.product+' '+r.variant+' '+varName(r.id)).toLowerCase().includes(q)));
  $('#ilist').innerHTML=!list.length?empty(t('no_match')):`<table class="stack-m"><thead><tr><th>${t('col_item')}</th><th>${t('col_stock')}</th><th>${t('col_state')}</th><th>${t('col_low')}</th>${own()?`<th>${t('col_adjust')}</th>`:''}</tr></thead><tbody>${list.map(r=>{const s=state(r),pct=Math.min(100,r.stock/Math.max(r.lowStock*4,10)*100);
   return `<tr><td data-l="${t('col_item')}"><span class="pname"><span aria-hidden="true">${r.bean?ico('bean'):emojiOf(r.id.split(':')[0])}</span><b>${esc(varName(r.id))}</b></span></td>
    <td data-l="${t('col_stock')}"><b class="num">${nf(r.stock)}</b><div class="stockbar ${s==='ok'?'':s}"><i style="width:${pct}%"></i></div></td>
    <td data-l="${t('col_state')}"><span class="badge b-${s}">${t('state_'+s)}</span></td>
    <td data-l="${t('col_low')}">${own()?`<input class="n" type="number" min="0" value="${r.lowStock}" data-low="${r.id}" aria-label="${t('col_low')}">`:`<span class="num">${nf(r.lowStock)}</span>`}</td>
    ${own()?`<td data-l="${t('col_adjust')}"><span class="cell"><input class="n" type="number" min="1" placeholder="${t('qty')}" data-qty="${r.id}" aria-label="${t('qty')}"><button type="button" class="btn s p" data-adj="${r.id}|1">+ ${t('add')}</button><button type="button" class="btn s" data-adj="${r.id}|-1">− ${t('remove')}</button><button type="button" class="btn s" data-av="${r.id}">${r.available?t('mark_out'):t('make_avail')}</button></span></td>`:''}</tr>`}).join('')}</tbody></table>`},

async menu(){const a=await api('/api/admin/products');if(a.error)throw new Error(a.error);PR=a;
  return `<div class="stack"><p class="muted" style="margin:0">${t('menu_hint')}</p><section class="card" style="padding:6px 10px"><div class="scroll"><table class="stack-m"><thead><tr><th>${t('col_product')}</th><th>${t('col_cat')}</th><th>${t('col_prices',{u:t('toman')})}</th><th>${t('col_active')}</th><th>${t('col_featured')}</th><th></th></tr></thead><tbody>${PR.map(p=>
   `<tr data-pid="${p.id}"><td data-l="${t('col_product')}"><span class="pname"><span aria-hidden="true">${emojiOf(p.id)}</span><b>${esc(pname(p))}</b></span></td><td data-l="${t('col_cat')}" class="muted">${esc(catName(p.catKey))}</td>
    <td data-l="${t('col_prices',{u:t('toman')})}"><span class="cell">${p.variants.map((v,i)=>`<label class="cell sm muted">${p.variants.length>1?esc(lang==='fa'?v.labelFa:v.labelEn):''}<input class="n" style="width:104px" type="number" min="0" step="1000" value="${v.price}" data-price="${i}" aria-label="${esc(pname(p))} ${esc(lang==='fa'?v.labelFa:v.labelEn)}"></label>`).join('')}</span></td>
    <td data-l="${t('col_active')}"><label class="sw"><input type="checkbox" role="switch" data-act${p.active?' checked':''} aria-label="${t('col_active')}"><i></i></label></td>
    <td data-l="${t('col_featured')}"><label class="sw"><input type="checkbox" role="switch" data-feat${p.featured?' checked':''} aria-label="${t('col_featured')}"><i></i></label></td>
    <td><button type="button" class="btn s p" data-savep="${p.id}" disabled>${t('save')}</button></td></tr>`).join('')}</tbody></table></div></section></div>`},

async challenges(){const c=await api('/api/admin/challenges');if(c.error)throw new Error(c.error);CHS=c;const now=Date.now();
  return `<div class="stack"><div class="head" style="margin:0"><span></span><button type="button" class="btn p" data-newch>+ ${t('new_ch')}</button></div>
   <section class="card" style="padding:6px 10px"><div class="scroll"><table class="stack-m"><thead><tr><th>${t('col_title')}</th><th>${t('col_goal')}</th><th>${t('col_pts')}</th><th>${t('col_ends')}</th><th>${t('col_active')}</th><th></th></tr></thead><tbody>${CHS.map(x=>{const ended=x.endsAt<now;
   return `<tr data-cid="${x.id}"><td data-l="${t('col_title')}"><b>${ico(chIcon(x.e))} ${esc(lang==='fa'?x.titleFa:x.titleEn)}</b></td>
    <td data-l="${t('col_goal')}"><input class="n" type="number" min="1" value="${x.goal}" data-cg aria-label="${t('col_goal')}"></td><td data-l="${t('col_pts')}"><input class="n" type="number" min="0" value="${x.pts}" data-cp aria-label="${t('col_pts')}"></td>
    <td data-l="${t('col_ends')}" class="sm"><span class="cell">${new Date(x.endsAt).toLocaleDateString(L(),{dateStyle:'medium'})}<span class="badge ${ended?'b-out':x.active?'b-ok':'b-low'}">${ended?t('ch_ended'):x.active?t('ch_active'):t('ch_off')}</span></span></td>
    <td data-l="${t('col_active')}"><label class="sw"><input type="checkbox" role="switch" data-ca${x.active?' checked':''} aria-label="${t('col_active')}"><i></i></label></td>
    <td><span class="cell"><button type="button" class="btn s p" data-savec="${x.id}" disabled>${t('save')}</button><button type="button" class="btn s" data-extc="${x.id}">${t('ext7')}</button></span></td></tr>`}).join('')}</tbody></table></div></section></div>`},

async audit(){const a=await api('/api/admin/audit');if(a.error)throw new Error(a.error);AUD=a;
  const val=(k,v)=>v===true?t('yes'):v===false?t('no'):Array.isArray(v)?v.map(nf).join(' / '):typeof v==='number'?nf(v):k==='status'?t(v):esc(v);
  const diff=(b,a)=>{if(!a)return '';if(!b)return `<span class="muted">${t('created')}</span>`;return Object.keys(a).filter(k=>k!=='reason'&&JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>`<div><span class="muted">${D[lang]['k_'+k]??k}:</span> <s>${val(k,b[k])}</s> → <b>${val(k,a[k])}</b></div>`).join('')};
  const what=x=>x.entity==='Variant'?varName(x.entityId):x.entity==='Product'?(byPid(x.entityId)?pname(byPid(x.entityId)):x.entityId):x.entity==='Order'?'#'+String(x.entityId).slice(-5):x.entityId;
  return `<section class="card" style="padding:6px 10px"><div class="scroll">${AUD.length?`<table class="stack-m"><thead><tr><th>${t('col_when')}</th><th>${t('col_who')}</th><th>${t('col_action')}</th><th>${t('col_change')}</th></tr></thead><tbody>${AUD.map(x=>`<tr><td data-l="${t('col_when')}" class="sm muted">${dt(x.at)}</td><td data-l="${t('col_who')}" class="sm"><span class="ltr">${esc(x.actorEmail)}</span></td><td data-l="${t('col_action')}"><b>${t('a_'+x.action.replace('.','_'))}</b><br><span class="sm muted">${esc(what(x))}</span></td><td data-l="${t('col_change')}" class="full"><div class="diff">${diff(x.before,x.after)}${x.after&&x.after.reason?`<div class="muted">${esc(x.after.reason)}</div>`:''}</div></td></tr>`).join('')}</tbody></table>`:empty(t('no_audit'))}</div></section>`}
};
VIEW.account=async()=>`<section class="card" style="max-width:520px"><h2 style="font-size:1.15rem;margin:0 0 4px">${t('acct_h')}</h2><p class="muted" style="margin:0 0 14px">${t('acct_hint')}</p><form id="af" novalidate style="display:grid;gap:12px"><label class="field">${t('f_name')}<input name="name" value="${esc(me.name)}" autocomplete="name" required></label><label class="field">${t('f_email')}<input name="email" type="email" value="${esc(me.email)}" autocomplete="username" required></label><label class="field">${t('f_new')}<input name="newPassword" type="password" minlength="8" autocomplete="new-password"><small class="muted">${t('acct_pw_hint')}</small></label><label class="field">${t('f_new2')}<input name="newPassword2" type="password" autocomplete="new-password"></label><label class="field">${t('f_cur')}<input name="currentPassword" type="password" autocomplete="current-password" required></label><div class="err" id="ae" role="alert"></div><button class="btn p">${t('acct_save')}</button></form><p style="margin:16px 0 0;display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="/">${t('site')}</a><button type="button" class="btn" data-logout>${t('logout')}</button> <button type="button" class="btn" id="lall">${t('logoutall')}</button></p></section>
<section class="card" id="mfa" style="max-width:520px;margin-top:16px"><h2 style="font-size:1.15rem;margin:0 0 4px">${t('mfa_h')}</h2><p class="muted">${me.mfa?t('mfa_on'):t(me.mfaReq?'mfa_need':'mfa_off')}</p>${me.mfa?`<form id="m2off" style="display:grid;gap:10px"><label class="field">${t('f_cur')}<input name="currentPassword" type="password" autocomplete="current-password" required></label><label class="field">${t('otp')}<input name="code" dir="ltr" autocomplete="one-time-code" required></label><div class="err" id="me2" role="alert"></div><button class="btn">${t('mfa_disable')}</button></form>`:`<form id="m2on" style="display:grid;gap:10px"><label class="field">${t('f_cur')}<input name="currentPassword" type="password" autocomplete="current-password" required></label><div class="err" id="me2" role="alert"></div><button class="btn p">${t('mfa_start')}</button></form><div id="mbox"></div>`}</section>${own()?`<section class="card" style="max-width:520px;margin-top:16px"><h2 style="font-size:1.15rem;margin:0 0 4px">${t('rl_h')}</h2><p class="muted">${t('rl_hint')}</p><form id="rl" style="display:grid;gap:10px"><label class="field">${t('f_email')}<input name="email" type="email" required></label><div class="err" id="rle" role="alert"></div><button class="btn">${t('rl_btn')}</button><input id="rlo" readonly dir="ltr" hidden></form></section>`:''}`;
const AFTER={account:()=>{$('#af').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target)),er=$('#ae');er.textContent='';
  if(v.newPassword&&v.newPassword!==v.newPassword2){er.textContent=t('acct_mismatch');return}
  const b={currentPassword:v.currentPassword,name:v.name,email:v.email};if(v.newPassword)b.newPassword=v.newPassword;
  const r=await callWeak('/api/me/account',b,'PATCH');if(r.error){er.textContent=errMsg(r.error);return}
  me=r;toast(t('saved'));chrome();e.target.querySelectorAll('[type=password]').forEach(i=>i.value='')};
  $('#lall').onclick=async()=>{await api('/api/auth/logout-all',{});toast(t('allok'));me=null;es&&es.close();es=null;chrome();loginView()};
  const on=$('#m2on');if(on)on.onsubmit=async e=>{e.preventDefault();const er=$('#me2');er.textContent='';const r=await api('/api/me/2fa/setup',{currentPassword:new FormData(on).get('currentPassword')});if(r.error){er.textContent=errMsg(r.error);return}
    on.hidden=true;$('#mbox').innerHTML=`<p class="muted">${t('mfa_scan')}</p><p><code dir="ltr" style="font-size:1.1rem;user-select:all">${esc(r.secret)}</code></p><form id="m2c" style="display:grid;gap:10px"><label class="field">${t('mfa_code')}<input name="code" dir="ltr" inputmode="numeric" autocomplete="one-time-code" required></label><div class="err" id="me3" role="alert"></div><button class="btn p">${t('mfa_enable')}</button></form>`;
    $('#m2c').onsubmit=async ev=>{ev.preventDefault();const x=await api('/api/me/2fa/enable',{code:new FormData(ev.target).get('code').trim()});if(x.error){$('#me3').textContent=errMsg(x.error);return}
      me.mfa=true;$('#mbox').innerHTML=`<p><b>${t('mfa_codes')}</b></p><pre dir="ltr" style="user-select:all">${x.codes.map(esc).join('\n')}</pre><button class="btn p" id="m2d">${t('mfa_done')}</button>`;$('#m2d').onclick=()=>{PR=[];show()}}};
  const off=$('#m2off');if(off)off.onsubmit=async e=>{e.preventDefault();const f=new FormData(off),r=await api('/api/me/2fa/disable',{currentPassword:f.get('currentPassword'),code:String(f.get('code')).trim()});if(r.error){$('#me2').textContent=errMsg(r.error);return}me.mfa=false;toast(t('saved'));show()};
  const rl=$('#rl');if(rl)rl.onsubmit=async e=>{e.preventDefault();const r=await api('/api/admin/users/reset-link',{email:new FormData(rl).get('email')});const er=$('#rle'),o=$('#rlo');er.textContent='';
    if(r.error){er.textContent=r.error==='NOT_FOUND'?t('rl_none'):errMsg(r.error);o.hidden=true;return}o.hidden=false;o.value=r.url||location.origin+r.path;o.select()}},dashboard:paintChart,orders:()=>VIEW.paintOrders(),inventory:()=>VIEW.paintInv()};

/* ---------- login ---------- */
async function loginView(){
  const su=await api('/api/setup');
  STRICT_UI=su?su.strict!==false:true;if(su&&su.needed)return setupView();
  app.innerHTML=`<div class="card login"><h2 style="font-size:1.3rem">${t('login_title')}</h2><form id="lf" novalidate><label class="field">${t('email')}<input name="email" type="email" autocomplete="username" required></label><label class="field">${t('password')}<input name="password" type="password" autocomplete="current-password" required></label><div class="err" id="er" role="alert">${me?esc(t('denied')):''}</div><label class="field" id="otpw" hidden>${t('otp')}<input name="otp" dir="ltr" autocomplete="one-time-code"></label><button class="btn p">${t('signin')}</button></form></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target)),r=await api('/api/auth/login',v);
    if(r.error){$('#er').textContent=errMsg(r.error);if(r.error==='OTP_REQUIRED'||r.error==='INVALID_OTP'){$('#otpw').hidden=false;$('#otpw input').focus()}return}
    if(!['STAFF','OWNER','ADMIN'].includes(r.role)){await api('/api/auth/logout',{});me=r;$('#er').textContent=t('denied');me=null;return}
    me=r;live();show()}}
function setupView(){
  app.innerHTML=`<div class="card login"><h2 style="font-size:1.3rem">${t('setup_title')}</h2><p class="muted" style="margin:0">${t('setup_hint')}</p><form id="sf" novalidate><label class="field">${t('f_name')}<input name="name" autocomplete="name" required></label><label class="field">${t('f_email')}<input name="email" type="email" autocomplete="username" required></label><label class="field">${t('password')}<input name="password" type="password" minlength="8" autocomplete="new-password" required><small class="muted">${t('acct_pw_hint')}</small></label><label class="field" id="scw" hidden>${t('setup_code')}<input name="code" autocomplete="off" dir="ltr"></label><div class="err" id="er" role="alert"></div><button class="btn p">${t('setup_btn')}</button></form></div>`;
  $('#sf').onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target)),r=await callWeak('/api/setup',v);
    if(r.error){$('#er').textContent=errMsg(r.error);if(r.error==='SETUP_CODE')$('#scw').hidden=false;if(r.error==='ALREADY_SETUP')loginView();return}
    me=r;live();show()}}

/* ---------- render ---------- */
let seq=0;
async function show(silent){
  const my=++seq,want=(location.hash.slice(1)||'dashboard');tab=want==='account'?'account':NAV.some(n=>n[0]===want&&(!n[1]||own()))?want:'dashboard';
  chrome();if(!staff()){loginView();return}
  if(me.mfaReq&&!me.mfa)tab='account';
  if(!(me.mfaReq&&!me.mfa)&&(!PR.length||!CATS.length)){const [p,b]=await Promise.all([api('/api/admin/products'),api('/api/bootstrap')]);if(!p.error)PR=p;if(!b.error)CATS=b.cats||[]}
  if(!silent)app.innerHTML=skeleton();
  try{const html=await VIEW[tab]();if(my!==seq)return;app.innerHTML=html;if(AFTER[tab])AFTER[tab]()}
  catch(e){if(my!==seq)return;app.innerHTML=empty(t('fail'),`<button type="button" class="btn" data-retry>${t('retry')}</button>`)}
}
function live(){if(es||!window.EventSource)return;es=new EventSource('/api/events');es.onmessage=e=>{let m={};try{m=JSON.parse(e.data)}catch(x){}
  if(m.type==='order'&&!m.uid)toast(t('new_order'));
  const busy=$('#dlg').open||document.activeElement&&document.activeElement.matches('input,select,textarea');
  if(!busy&&['dashboard','orders','inventory'].includes(tab))show(true)}}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const b=e.target.closest('button,[data-retry]');if(!b)return;const d=b.dataset;
  const mob=matchMedia('(max-width:600px)').matches&&b.closest('.seg');
  if(d.theme){store.set('prefs',{...prefs(),theme:mob?(effTheme()==='dark'?'light':'dark'):d.theme});chrome();return}
  if(d.lang){if(mob)d.lang=lang==='fa'?'en':'fa';lang=d.lang;store.set('lang',lang);chrome();if(staff())show(true);else loginView();return}
  if('logout' in d){await api('/api/auth/logout',{});if(es){es.close();es=null}me=null;chrome();loginView();return}
  if('retry' in d){show();return}
  if(!staff())return;
  if(d.days){days=+d.days;show(true);return}
  if(d.cv!==undefined){chartTable=d.cv==='1';document.querySelectorAll('[data-cv]').forEach(x=>x.setAttribute('aria-pressed',x===b));paintChart();return}
  if(d.of){ofilter=d.of;VIEW.paintOrders();return}
  if(d.if){ifilter=d.if;document.querySelectorAll('[data-if]').forEach(x=>x.setAttribute('aria-pressed',x===b));VIEW.paintInv();return}
  if(d.adj){const[id,sg]=d.adj.split('|'),q=$(`[data-qty="${id}"]`),n=Math.max(1,parseInt(q.value,10)||1);
    if(ok(await api('/api/admin/inventory/'+encodeURIComponent(id),{delta:n*(+sg),reason:D.en['r_'+ireason]},'PATCH')))show(true);return}
  if(d.av){const r=INV.find(x=>x.id===d.av);if(ok(await api('/api/admin/inventory/'+encodeURIComponent(d.av),{available:!r.available,reason:r.available?'Marked sold out':'Made available'},'PATCH')))show(true);return}
  if(d.savep){const tr=b.closest('tr'),prices=[...tr.querySelectorAll('[data-price]')].map(i=>Math.round(+i.value)),
    r=await api('/api/admin/products/'+d.savep,{prices,active:tr.querySelector('[data-act]').checked,featured:tr.querySelector('[data-feat]').checked},'PATCH');
    if(ok(r)){const p=PR.find(x=>x.id===d.savep);if(p)Object.assign(p,r);tr.classList.remove('dirty');b.disabled=true}return}
  if(d.savebean){const bx=b.closest('[data-bean]'),r=await api('/api/admin/beans/'+d.savebean,{notesEn:bx.querySelector('[data-nen]').value,notesFa:bx.querySelector('[data-nfa]').value},'PATCH');if(ok(r))show(true);return}
  if(d.savec){const tr=b.closest('tr'),r=await api('/api/admin/challenges/'+d.savec,{goal:+tr.querySelector('[data-cg]').value,pts:+tr.querySelector('[data-cp]').value,active:tr.querySelector('[data-ca]').checked},'PATCH');if(ok(r))show(true);return}
  if(d.extc){if(ok(await api('/api/admin/challenges/'+d.extc,{extendDays:7},'PATCH')))show(true);return}
  if('newch' in d){newChallenge();return}
});
document.addEventListener('change',async e=>{
  const el=e.target;if(!staff())return;
  if(el.matches('[data-os]')){const id=el.dataset.os,s=el.value;
    if(s==='CANCELLED'&&!(await confirmBox(t('cancel_confirm'),t('cancel_yes')))){show(true);return}
    if(ok(await api('/api/admin/orders/'+id,{status:s},'PATCH')))show(true);else show(true);return}
  if(el.matches('[data-low]')){if(ok(await api('/api/admin/inventory/'+encodeURIComponent(el.dataset.low),{lowStock:Math.max(0,parseInt(el.value,10)||0),reason:'Low-stock threshold'},'PATCH')))show(true);return}
  if(el.id==='ireason'){ireason=el.value;return}
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.id==='oq'){oq=el.value;VIEW.paintOrders()}
  else if(el.id==='iq'){iq=el.value;VIEW.paintInv()}
  else if(el.closest('tr[data-pid],tr[data-cid]')&&el.matches('input')){const tr=el.closest('tr');tr.classList.add('dirty');const b=tr.querySelector('[data-savep],[data-savec]');if(b)b.disabled=false}
});
document.addEventListener('change',e=>{const el=e.target;if(el.matches('[data-act],[data-feat],[data-ca]')){const tr=el.closest('tr');tr.classList.add('dirty');const b=tr.querySelector('[data-savep],[data-savec]');if(b)b.disabled=false}});

function newChallenge(){
  const fld=(k,l,x='')=>`<label class="field">${t(l)}<input name="${k}" ${x} required></label>`;
  const d=ask(`<form id="nf"><h2>${t('new_ch')}</h2>${fld('id','f_id','pattern="[a-z0-9-]+" maxlength="40" dir="ltr"')}
   <div class="grid2">${fld('titleEn','f_te')}${fld('titleFa','f_tf','dir="rtl"')}${fld('descEn','f_de')}${fld('descFa','f_df','dir="rtl"')}${fld('rewardEn','f_re')}${fld('rewardFa','f_rf','dir="rtl"')}</div>
   <div class="grid2">${fld('goal','f_goal','type="number" min="1" value="3"')}${fld('pts','f_pts','type="number" min="0" value="30"')}</div>
   <div class="grid2"><label class="field">${t('f_rule')}<select name="ruleType"><option value="orders">${t('rule_orders')}</option><option value="distinct">${t('rule_distinct')}</option></select></label>
    <label class="field">${t('f_cat')}<select name="catKey">${CATS.map(c=>`<option value="${c.key}">${esc(lang==='fa'?c.fa:c.en)}</option>`).join('')}</select></label></div>
   ${fld('days','f_days','type="number" min="1" max="365" value="7"')}<div class="err" id="ce" role="alert"></div>
   <div class="acts"><button type="button" class="btn" id="cx">${t('cancel')}</button><button class="btn p">${t('create')}</button></div></form>`);
  $('#cx').onclick=()=>d.close();
  $('#nf').onsubmit=async ev=>{ev.preventDefault();const v=Object.fromEntries(new FormData(ev.target));['goal','pts','days'].forEach(k=>v[k]=+v[k]);if(v.ruleType==='orders')v.catKey=null;
    const r=await api('/api/admin/challenges',v);if(r.error){$('#ce').textContent=errMsg(r.error);return}d.close();toast(t('saved'));show(true)}}

let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(tab==='dashboard')paintChart()},150)});
window.addEventListener('hashchange',()=>show());
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if((prefs().theme||'system')==='system')applyPrefs()});
if(staff())live();
show();
