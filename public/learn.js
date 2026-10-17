// Coffee library: short reading pages about the coffees we serve. Plain data + two small renderers.
import {art} from './icons.js';
const A=[
{id:'arabica-robusta',art:'cup:coffee:foam,heart',
 en:{t:'Arabica vs Robusta',s:'The two bean species behind almost every cup.',b:[
  'Arabica is the bean most associated with sweetness, fruit and floral aroma. It has softer acidity and a smooth finish, and contains roughly half the caffeine of Robusta.',
  'Robusta is hardier and more bitter, with a heavy body, earthy and chocolatey notes and roughly twice the caffeine. In espresso it gives a thicker, longer-lasting crema.',
  'At Fika you choose the blend yourself: 100% Arabica for a calm, smooth cup, 50/50 for balance, or 30/70 (30% Arabica, 70% Robusta) for a bold, energetic one.']},
 fa:{t:'عربیکا یا روبوستا؟',s:'دو گونهٔ دانه‌ای که پشت تقریباً هر فنجانی هستند.',b:[
  'عربیکا بیشتر با شیرینی، میوه و عطر گلی شناخته می‌شود. اسیدیتهٔ ملایم‌تر و پایانی نرم دارد و حدود نصف روبوستا کافئین دارد.',
  'روبوستا مقاوم‌تر و تلخ‌تر است؛ بدنهٔ سنگین، طعم خاکی و شکلاتی و تقریباً دو برابر کافئین دارد و در اسپرسو کرمای غلیظ‌تر و ماندگارتری می‌دهد.',
  'در فیکا لاین قهوه را خودتان انتخاب می‌کنید: ۱۰۰٪ عربیکا برای فنجانی آرام و نرم، ۵۰/۵۰ برای تعادل، و ۳۰/۷۰ (۳۰٪ عربیکا، ۷۰٪ روبوستا) برای فنجانی پرقدرت و پرانرژی.']}},
{id:'specialty',art:'brew:coffee',cta:['origami','Try a specialty brew','یک دمی اسپشیالیتی امتحان کن'],
 en:{t:'What is specialty coffee?',s:'Traceable, carefully grown and graded beans.',b:[
  'Specialty coffee is the top tier of green coffee: beans that score 80 or more out of 100 in a formal cupping evaluation, grown in a specific place and traceable back to a farm or region.',
  'Because the beans are cleaner and more distinctive, the character of the origin shows in the cup. That is why we brew them as pour-over and let you pick the origin.',
  'Taste for notes rather than strength: floral, fruity, nutty, chocolatey, spiced.']},
 fa:{t:'قهوهٔ اسپشیالیتی چیست؟',s:'دانه‌هایی ردیابی‌پذیر که با دقت کشت و امتیازدهی می‌شوند.',b:[
  'قهوهٔ اسپشیالیتی بالاترین رده‌ٔ دانهٔ سبز است: دانه‌هایی که در ارزیابی رسمی کاپینگ ۸۰ امتیاز یا بیشتر از ۱۰۰ می‌گیرند، از یک منطقهٔ مشخص می‌آیند و تا مزرعه یا منطقه ردیابی‌پذیرند.',
  'چون دانه‌ها تمیزتر و متمایزترند، شخصیت منطقهٔ کشت در فنجان پیداست. به همین دلیل آن‌ها را به‌صورت دمی سرو می‌کنیم و انتخاب خاستگاه را به شما می‌سپاریم.',
  'به‌جای قدرت قهوه، دنبال طعم‌ها بگردید: گلی، میوه‌ای، مغزدار، شکلاتی، ادویه‌ای.']}},
{id:'ethiopia',art:'brew:coffee',cta:['origami','Brew it as Origami','با اوریگامی بنوش'],
 en:{t:'Ethiopia',s:'The birthplace of Arabica.',b:[
  'Ethiopia is widely regarded as the birthplace of Arabica, and coffee has grown there wild for centuries.',
  'Ethiopian specialty coffees are typically floral and fruity: think jasmine, citrus, bergamot and berries, with a light, tea-like body and bright acidity.',
  'Best enjoyed as a pour-over, where the delicate aromas are easy to notice.']},
 fa:{t:'اتیوپی',s:'زادگاه عربیکا.',b:[
  'اتیوپی را زادگاه عربیکا می‌دانند و قهوه قرن‌ها در آنجا به‌صورت وحشی رشد کرده است.',
  'قهوه‌های اسپشیالیتی اتیوپی معمولاً گلی و میوه‌ای‌اند: یاس، مرکبات، برگاموت و توت، با بدنهٔ سبک چای‌مانند و اسیدیتهٔ روشن.',
  'بهترین حالت نوشیدنش دمی است، چون عطرهای ظریفش در آن راحت‌تر حس می‌شود.']}},
{id:'indonesia',art:'cup:espresso',cta:['hario-switch','Brew it as Hario Switch','با هاریو سوییچ بنوش'],
 en:{t:'Indonesia',s:'Full-bodied coffee from the islands.',b:[
  'Indonesian coffees, from islands such as Sumatra, Java and Sulawesi, are known for a full body and low acidity.',
  'Expect earthy, herbal and spicy notes with dark chocolate and sometimes a hint of tobacco or cedar. A good choice if you like depth over brightness.',
  'It holds up well in the Hario Switch, which gives a rounder, more forgiving cup.']},
 fa:{t:'اندونزی',s:'قهوهٔ پربدنه از جزایر.',b:[
  'قهوه‌های اندونزی از جزایری مثل سوماترا، جاوا و سولاوسی با بدنهٔ کامل و اسیدیتهٔ پایین شناخته می‌شوند.',
  'طعم‌های خاکی، گیاهی و ادویه‌ای با شکلات تلخ و گاهی اشاره‌ای به تنباکو یا سرو انتظار داشته باشید. اگر عمق را بیشتر از روشنی دوست دارید انتخاب خوبی است.',
  'در هاریو سوییچ خوب جواب می‌دهد و فنجانی گردتر و ملایم‌تر می‌سازد.']}},
{id:'espresso-drinks',art:'cup:coffee:foam,heart',cta:['cappuccino','See the espresso bar','اسپرسو بار را ببین'],
 en:{t:'Espresso drinks at a glance',s:'What goes into each cup.',b:[
  'Espresso: a short, concentrated shot with a layer of crema.',
  'Americano: espresso lengthened with hot water.',
  'Macchiato: espresso marked with a spot of milk foam.',
  'Cortado: espresso and warm milk in equal parts.',
  'Cappuccino: espresso, steamed milk and a thick cap of foam.',
  'Latte: espresso with plenty of steamed milk and a thin layer of foam.',
  'Mocha: a latte with chocolate. Con Panna: espresso topped with whipped cream.']},
 fa:{t:'نوشیدنی‌های اسپرسو در یک نگاه',s:'در هر فنجان چه چیزی هست.',b:[
  'اسپرسو: شات کوتاه و غلیظ با لایه‌ای از کرما.',
  'آمریکانو: اسپرسو رقیق‌شده با آب داغ.',
  'ماکیاتو: اسپرسو با یک نقطه کف شیر.',
  'کورتادو: اسپرسو و شیر گرم به نسبت مساوی.',
  'کاپوچینو: اسپرسو، شیر بخارداده و لایه‌ای ضخیم از کف.',
  'لاته: اسپرسو با شیر بخارداده فراوان و لایهٔ نازک کف.',
  'موکا: لاته با شکلات. کن پانا: اسپرسو با خامهٔ زده روی آن.']}},
{id:'pour-over',art:'brew:coffee:switch',cta:['hario-switch','Try Hario Switch','هاریو سوییچ را امتحان کن'],
 en:{t:'Origami and Hario Switch',s:'Two ways to brew a clean cup by hand.',b:[
  'Origami is a ridged, cone-shaped dripper. Water flows through quickly, giving a clean, aromatic cup that shows off fruity and floral coffees.',
  'Hario Switch has a valve: you can steep the coffee first, then release it to drip. That mix of soaking and filtering makes a balanced, forgiving cup.',
  'Both are brewed to order, so allow a few minutes.']},
 fa:{t:'اوریگامی و هاریو سوییچ',s:'دو روش برای دم‌کردن یک فنجان تمیز با دست.',b:[
  'اوریگامی یک دریپر مخروطی شیاردار است. آب سریع از آن می‌گذرد و فنجانی تمیز و خوش‌عطر می‌سازد که قهوه‌های میوه‌ای و گلی را خوب نشان می‌دهد.',
  'هاریو سوییچ یک شیر دارد: می‌توانید اول قهوه را خیس بخورانید و بعد باز کنید تا چکه کند. این ترکیب خیساندن و صاف‌کردن فنجانی متعادل و ملایم می‌دهد.',
  'هر دو سفارشی دم می‌شوند، پس چند دقیقه صبر لازم است.']}},
{id:'turkish',art:'cezve:coffee',cta:['turkish','Order Turkish coffee','قهوه ترک سفارش بده'],
 en:{t:'Turkish coffee',s:'Fine as flour, simmered and unfiltered.',b:[
  'Turkish coffee is ground as fine as flour and simmered slowly in a small pot called a cezve. It is poured into a small cup without filtering, so the grounds settle at the bottom.',
  'Sip it slowly and do not stir; stop before the grounds. The foam on top is part of the experience.',
  'At Fika you can have it classic, with cardamom, or as a dark roast.']},
 fa:{t:'قهوهٔ ترک',s:'آسیاب‌شده مثل آرد، آرام‌جوشیده و بدون صافی.',b:[
  'قهوهٔ ترک به ریزی آرد آسیاب می‌شود و آرام در ظرف کوچکی به نام جزوه (cezve) می‌جوشد. بدون صافی در فنجان کوچک ریخته می‌شود و تفاله ته آن می‌نشیند.',
  'آرام بنوشید، هم نزنید و قبل از رسیدن به تفاله تمامش کنید. کف روی آن هم بخشی از تجربه است.',
  'در فیکا می‌توانید آن را کلاسیک، با هل یا رست تیره بنوشید.']}},
{id:'tasting',art:'cup:caramel:foam',
 en:{t:'How to taste coffee',s:'Five things to notice in every sip.',b:[
  'Aroma: smell the cup first; most of what we call flavour is smell.',
  'Acidity: the bright, juicy quality, like citrus or berries. It is not sourness.',
  'Body: how heavy or light the coffee feels in your mouth.',
  'Sweetness: caramel, honey, fruit. Good coffee is not only bitter.',
  'Finish: what stays after you swallow, long and clean or short and sharp.']},
 fa:{t:'قهوه را چطور بچشیم؟',s:'پنج چیز که در هر جرعه باید حواستان به آن باشد.',b:[
  'عطر: اول فنجان را ببویید؛ بیشتر چیزی که طعم می‌نامیم در واقع بوست.',
  'اسیدیته: کیفیت روشن و آبدار، مثل مرکبات یا توت. این ترشی نیست.',
  'بدنه: قهوه در دهان چقدر سنگین یا سبک حس می‌شود.',
  'شیرینی: کارامل، عسل، میوه. قهوهٔ خوب فقط تلخ نیست.',
  'پایان: چیزی که بعد از قورت‌دادن می‌ماند؛ بلند و تمیز یا کوتاه و تیز.']}}];
const TX={en:{h:'Coffee library',sub:'Short reads about the coffees we serve.',more:'Keep reading',back:'← Library',min:'min read',all:'See all'},
 fa:{h:'کتابخانهٔ قهوه',sub:'مطالب کوتاه دربارهٔ قهوه‌هایی که سرو می‌کنیم.',more:'بیشتر بخوانید',back:'→ کتابخانه',min:'دقیقه مطالعه',all:'همه'}};
const mins=(a,l)=>Math.max(1,Math.round(a[l].b.join(' ').split(/\s+/).length/(l==='fa'?150:180)));
const card=(a,l)=>`<a class="lcard" href="#/learn/${a.id}"><div class="ph lph" aria-hidden="true">${art(a.art)}</div><div class="lt"><h3>${a[l].t}</h3><p class="muted">${a[l].s}</p><small class="muted">${mins(a,l).toLocaleString(l==='fa'?'fa-IR':'en-US')} ${TX[l].min}</small></div></a>`;
export const learnHome=l=>`<section class="sec"><div class="row"><h2>${TX[l].h}</h2><a href="#/learn">${TX[l].all}</a></div><div class="lgrid">${A.slice(0,3).map(a=>card(a,l)).join('')}</div></section>`;
export const learnPage=(l,id)=>{const a=A.find(x=>x.id===id),t=TX[l];
 if(!a)return `<h1>${t.h}</h1><p class="muted">${t.sub}</p><div class="lgrid">${A.map(x=>card(x,l)).join('')}</div>`;
 const list=a[l].b.length>5||/:\s/.test(a[l].b[0]);
 return `<p><a href="#/learn">${t.back}</a></p><article class="learn"><div class="ph l" aria-hidden="true">${art(a.art)}</div><h1>${a[l].t}</h1><p class="muted lead">${a[l].s}</p>${a[l].b.map(p=>{const m=p.match(/^([^:]{2,30}):\s(.*)$/);return m?`<p><strong>${m[1]}</strong> ${m[2]}</p>`:`<p>${p}</p>`}).join('')}${a.cta?`<p><a class="btn p" href="#/item/${a.cta[0]}">${a.cta[l==='fa'?2:1]}</a></p>`:''}</article><section class="sec"><h2>${t.more}</h2><div class="lgrid">${A.filter(x=>x.id!==id).slice(0,3).map(x=>card(x,l)).join('')}</div></section>`};
