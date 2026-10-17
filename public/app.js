import {gamesShell,mountGames} from './games.js';
import {art,ico,chIcon,face} from './icons.js';
import {learnHome,learnPage} from './learn.js';
if(!document.startViewTransition)document.documentElement.classList.add('no-vt');
// Option groups (coffee blend, origin, milk, serving). A product's variants are every combination of the options;
// variant 0 is always the default one, `vsel[i]` lists the option picked in each group for variant i.
const optsUI=(m,sl,pref)=>{const sel=m.vsel[sl]||[],fa=document.documentElement.lang==='fa';return `<div id="sz" class="opts" data-pid="${m.id}">${m.groups.map((g,gi)=>{const cur=g.opts[sel[gi]]||g.opts[0];
 return `<fieldset class="og" data-gi="${gi}"><legend><strong>${g.label}</strong>${cur.mood?`<span class="mood" aria-live="polite"><span class="mf">${face(cur.mood)}</span><small>${cur.h||''}</small></span>`:''}</legend><div class="seg">${g.opts.map((o,oi)=>`<button type="button" class="chip og-c" data-g="${gi}" data-o="${oi}" aria-pressed="${oi===sel[gi]}"${o.off?' disabled':''}>${o.mood?`<span class="mf" aria-hidden="true">${face(o.mood)}</span>`:''}<span>${o.t}</span>${o.off?`<em class="usual">${fa?'ناموجود':'Sold out'}</em>`:pref&&o.bean===pref?`<em class="usual">${fa?'همیشگی تو':'Your usual'}</em>`:''}</button>`).join('')}</div>${!cur.mood&&cur.n?`<p class="onote" aria-live="polite">${cur.n}</p>`:''}</fieldset>`}).join('')}</div>`};const api=async(p,b,m)=>{const r=await fetch(p,{method:m||(b?'POST':'GET'),headers:{'Content-Type':'application/json','X-Requested-With':'fika'},body:b?JSON.stringify(b):undefined});let j={};try{j=await r.json()}catch(e){}return r.ok?j:{error:j.error||'ERROR'}};
const EMPTY={points:0,redeemed:0,orders:[],favs:[]};
let DATA=await api('/api/bootstrap'),ME=DATA.me,ST=DATA.state||EMPTY;
async function loadMe(){const r=await api('/api/bootstrap');DATA=r;ME=r.me;ST=r.state||EMPTY}
const mem={};
// The server owns users, sessions, orders, points. Only UI preferences, the cart and guest favourites live in localStorage.
const S={get(k,d){
  if(k==='session')return ME;if(k==='users')return[];
  if(k.startsWith('orders:'))return ST.orders.filter(o=>o.status!=='CANCELLED').map(o=>({...o,date:new Date(o.createdAt).toLocaleDateString(S.get('lang','en')==='fa'?'fa-IR':'en-US'),total:o.total/1000}));
  if(k.startsWith('redeem:'))return ST.redeemed;
  if(k==='favs'&&ME)return ST.favs;
  if(k in mem)return mem[k];try{const v=localStorage.getItem(k);if(v)return(mem[k]=JSON.parse(v))}catch(e){}return d},
 set(k,v){if(k==='favs'&&ME){ST.favs=v;api('/api/me/favs',{favs:v},'PUT');return}
  if(k==='session'||k==='users'||/^(orders|ledger|redeem):/.test(k))return;
  mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
function buildData(L){const E=L==='en',N=E?'En':'Fa',cn={},q=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');DATA.cats.forEach(c=>cn[c.key]=c[E?'en':'fa']);
 const MENU=DATA.menu.map(p=>{const b=p.variants[0].price;return{id:p.id,name:p['name'+N],cat:cn[p.catKey],price:b/1000,groups:p.groups?p.groups.map(g=>({k:g.k,label:g[E?'en':'fa'],opts:g.opts.map(o=>{const bn=o.bean&&(DATA.beans||[]).find(b=>b.id===o.bean);return{t:o[E?'en':'fa'],mood:o.mood,h:o['h'+N],bean:o.bean,n:q(bn?bn['notes'+N]:o['h'+N]),off:!!bn&&!bn.available}})})):undefined,vsel:p.variants.map(v=>v.sel),vbean:p.variants.map(v=>v.bean),e:art(p.art,p.catKey),desc:p['desc'+N],ing:p['ing'+N],sizes:p.variants.map(v=>v['label'+N]),sp:p.variants.length>1?p.variants.map(v=>(v.price-b)/1000):undefined}});
 return{MENU,CATS:[E?'All':'همه',...DATA.cats.map(c=>c[E?'en':'fa'])],
  CHALLENGES:DATA.challenges.map(c=>({id:q(c.id),title:q(c['title'+N]),e:ico(chIcon(c.e)),desc:q(c['desc'+N]),goal:c.goal,pts:c.pts,reward:q(c['reward'+N]),daysLeft:c.daysLeft,rule:{type:c.rule.type,cat:c.rule.catKey?[].concat(c.rule.catKey).map(k=>cn[k]):undefined}})),
  COMBOS:DATA.combos.map(c=>({id:c.id,title:c['title'+N],desc:c['desc'+N],items:c.items,popular:c.popular})),
  CAFE:{hours:DATA.cafe['hours'+N],addr:DATA.cafe['addr'+N],about:DATA.cafe['about'+N]}}}
async function checkout(btn){btn.disabled=true;
 const lines=cart().map(l=>({variantId:l.id+':'+(Number.isInteger(l.size)?l.size:0),qty:l.qty,free:!!l.free,comboId:l.cb||undefined}));
 const r=await api('/api/orders',{lines});btn.disabled=false;
 if(r.error){const c=r.error.split(':');toast(c[0]==='OUT_OF_STOCK'?u().over(X().byId(c[1]).name,0):(c[0]==='TOO_MANY_PENDING'?u().x.pend:c[0]==='RATE_LIMITED'?u().x.busy:r.error));await loadMe();route(1);return}
 ST=r.state;S.set('cart',[]);toast((r.order.pts?'+'+r.order.pts.toLocaleString(loc())+' '+u().pt+' · ':'')+u().after);route(1)}
// Live updates. Events that arrive together (a purchase sends 'inventory' and 'order') are merged into one refresh, and the page is only redrawn
// when the server data really differs from what is on screen (a like or a purchase made here is already shown), so the scroll position never moves.
const dsig=(m,st)=>JSON.stringify([m.menu,st,m.beans,m.challenges,m.combos]);
let evT=0,evBusy=false;
async function liveRefresh(){if(evBusy){evT=setTimeout(liveRefresh,300);return}evBusy=true;
 try{const r=await api('/api/bootstrap');if(r.error||!r.menu)return;const same=dsig(r,r.state||ST)===dsig(DATA,ST);DATA.menu=r.menu;DATA.beans=r.beans;DATA.challenges=r.challenges;DATA.combos=r.combos;ST=r.state||ST;if(!same)route(1)}catch(e){}finally{evBusy=false}}
function connectEvents(){try{const es=new EventSource('/api/events');es.onmessage=e=>{let m={};try{m=JSON.parse(e.data)}catch(x){return}
 if(m.type==='menu'){try{sessionStorage.setItem('fika:pos',JSON.stringify({h:location.hash,y:scrollY}))}catch(x){}location.reload();return}
 if(m.type==='order'&&m.uid&&(!ME||m.uid!==ME.id))return;
 clearTimeout(evT);evT=setTimeout(liveRefresh,250)}}catch(e){}}
const LG={};
const heart=on=>`<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style="fill:${on?'currentColor':'none'};stroke:currentColor;stroke-width:2;stroke-linejoin:round"><path d="M12 20.5s-8-4.8-9.6-9.7C1.300 7.600 3.200 4.500 6.400 4.500c2 0 3.700 1.100 5.600 3.300 1.900-2.200 3.600-3.300 5.600-3.300 3.200 0 5.100 3.100 4 6.300-1.600 4.900-9.600 9.700-9.600 9.700z"/></svg>`;
const EXP='return{P,pts,prog,GOAL,unit,money,card,COMBOS,byId,MENU,CHALLENGES,setCat:v=>{cat=v},user,users,favs,cart,orders}';
LG.en=(()=>{const {MENU,CATS,CHALLENGES,COMBOS,CAFE}=buildData('en');
const byId=id=>MENU.find(m=>m.id===id);
const pickCards=()=>MENU.length?card(MENU[Math.floor(Date.now()/864e5)%MENU.length]):'';
const featuredCards=()=>{let f=DATA.menu.filter(p=>p.featured).map(p=>byId(p.id)).filter(Boolean).slice(0,3);if(!f.length){const seen=new Set();for(const m of MENU){if(!seen.has(m.cat)){seen.add(m.cat);f.push(m);if(f.length===3)break}}}return f.map(card).join('')};
const clubCard=()=>{const g=user(),p=g?Math.max(0,pts()):0;return `<a class="ch" href="${g?'#/profile':'#/login'}"><span class="e" aria-hidden="true">${ico('cup')}</span><div><div class="row"><h3>Coffee Club</h3><span class="tag">Always on</span></div><p class="muted" style="margin:0 0 6px;font-size:.9rem">Every order earns points. Fill the bar and add a free coffee to your cart.</p>${g?bar(p,GOAL)+`<small class="muted">${String(p)} / ${String(GOAL)}</small>`:'<small class="muted">Log in to start earning</small>'}</div></a>`};

const GOAL=DATA.goal;
const pts=()=>ST.points;
const loyalty=()=>{const p=Math.max(0,pts()),r=S.get('redeem:'+user().email,0),F=n=>n;return `<section class="sec"><h2>Free coffee rewards</h2>${bar(Math.min(p,GOAL),GOAL)}<p class="row" style="margin:8px 0 4px"><strong>${F(p)} / ${F(GOAL)}</strong><span class="muted">${p>=GOAL?'Ready to redeem!':F(GOAL-p)+' points to go'}</span></p><p class="muted" style="font-size:.9rem">Earn points with every order and every completed challenge.${r?' · Redeemed: '+F(r):''}</p>${p-GOAL*cart().filter(l=>l.free).length>=GOAL?`<button class="btn p" data-redeem>Add free coffee to cart</button>`:''}</section>`};

const unit=(m,i)=>m.price+((m.sp||[])[i]||0);
const comboCard=c=>{const t=c.items.reduce((a,[id,i])=>a+unit(byId(id),i),0);return `<article class="card"><div class="b"><div class="ph cbph" aria-hidden="true">${c.items.map(([id])=>byId(id).e).join('<b>+</b>')}</div><div class="row"><h3>${c.title}</h3><span class="tags">${c.popular?'<span class="tag">Popular</span>':''}<span class="tag ok">10% off</span></span></div><p class="muted" style="margin:0;font-size:.9rem">${c.desc}</p><p class="muted" style="margin:0;font-size:.85rem">${c.items.map(([id,i])=>byId(id).name+(byId(id).sizes.length>1?' ('+byId(id).sizes[i]+')':'')).join(' + ')}</p><div class="a"><span><s class="muted" style="font-size:.85rem">${money(t)}</s> <strong>${money(t*.9)}</strong></span><button class="btn s" data-combo="${c.id}">Add all</button></div></div></article>`};

const money=n=>(n*1000).toLocaleString('en-US')+' Toman';
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// ---------- State helpers ----------
const user=()=>{const x=S.get('session',null);return x&&(!x.exp||x.exp>Date.now())?x:null};
const users=()=>S.get('users',[]);
const favs=()=>S.get('favs',[]);
const cart=()=>S.get('cart',[]);
const orders=()=>S.get('orders:'+(user()||{}).email,[]);
const prog=c=>{const o=orders();if(c.rule.type==='orders')return o.length;return new Set(o.flatMap(x=>x.lines).map(l=>l.id).filter(id=>byId(id)&&c.rule.cat.includes(byId(id).cat))).size};
let cat='All',flash='';
// ---------- Components ----------
const ph=(e,l)=>`<div class="ph${l?' l':''}" aria-hidden="true">${e}</div>`;
const card0=m=>`<article class="card"><a href="#/item/${m.id}" aria-label="Details of ${esc(m.name)}">${ph(m.e)}</a><div class="b"><div class="row"><h3><a href="#/item/${m.id}" style="text-decoration:none">${m.name}</a></h3><button class="fav" data-fav="${m.id}" aria-pressed="${favs().includes(m.id)}" aria-label="Favorite ${esc(m.name)}">${heart(favs().includes(m.id))}</button></div><p class="muted desc">${m.desc}</p><div class="a"><strong>${m.sp?'from ':''}${money(m.price)}</strong>${ctl(m)}</div></div></article>`;
const card=(m,vi)=>{const h=card0(m);if(vi===undefined||!m.groups||!m.sizes[vi])return h;return h.replace('</div><p class="muted desc">','</div><span class="tag vt">'+m.sizes[vi]+'</span><p class="muted desc">').split('data-add="'+m.id+'"').join('data-add="'+m.id+'" data-vi="'+vi+'"')};
const bar=(v,g)=>`<div class="bar" role="progressbar" aria-valuenow="${Math.min(v,g)}" aria-valuemin="0" aria-valuemax="${g}"><i style="width:${Math.min(100,v/g*100)}%"></i></div>`;
const chCard=c=>{const v=prog(c),done=v>=c.goal;return `<a class="ch" href="#/challenge/${c.id}"><span class="e" aria-hidden="true">${c.e}</span><div><div class="row"><h3>${c.title}</h3><span class="tag${done?' ok':''}">${done?'Completed':user()?'In progress':c.daysLeft>999?'Welcome gift':c.daysLeft+' days left'}</span></div>${user()?bar(v,c.goal)+`<small class="muted">${Math.min(v,c.goal)} / ${c.goal} · ${c.daysLeft} days left</small>`:`<small class="muted">Reward: ${c.reward}</small>`}</div></a>`};
const hours=()=>CAFE.hours.map(h=>`<li class="li"><span>${h[0]}</span><span class="muted">${h[1]}</span></li>`).join('');
// ---------- Pages ----------
const P={
home:()=>`<section class="hero"><p class="muted">Small-batch coffee · Old Town</p>${greet()}<p class="muted">Order ahead, save your favourites and take on a weekly challenge.</p><a class="btn p" href="#/menu">View menu</a> <a class="btn" href="#/challenges">This week's challenge</a></section>
${usualSection()}<section class="sec"><div class="row"><h2>Today's pick</h2></div><div class="pick">${pickCards()}${gameTile()}</div></section>
<section class="sec"><div class="row"><h2>Featured</h2><a href="#/menu">See all</a></div><div class="grid">${featuredCards()}</div></section>
${learnHome(lang())}
${COMBOS.length?`<section class="sec"><div class="row"><h2>Suggested combos</h2></div><div class="grid">${COMBOS.map(comboCard).join('')}</div></section>`:''}
<section class="sec"><h2>Weekly challenge</h2>${chCard(CHALLENGES[0])}</section>
<section class="sec split"><div><h2>Visit us</h2><p class="muted">${CAFE.addr}</p><a href="#/about">About the cafe</a></div><ul class="plain" aria-label="Opening hours">${hours()}</ul></section>`,
menu:()=>{const L=MENU.filter(m=>cat==='All'||m.cat===cat);return `<div class="row mh"><h1>Menu</h1>${viewBar()}</div><div class="stick"><div class="chips" role="group" aria-label="Categories">${CATS.map(c=>`<button class="chip" data-cat="${c}" aria-pressed="${c===cat}">${c}</button>`).join('')}</div></div><div class="grid vw-${view()}">${L.length?L.map(card).join(''):'<p class="muted">No items in this category.</p>'}</div>${cat==='All'?`${COMBOS.length?`<section class="sec"><div class="row"><h2>Suggested combos</h2></div><div class="grid">${COMBOS.map(comboCard).join('')}</div></section>`:''}`:''}`},
item:id=>{const m=byId(id);if(!m)return P.nf();const f=favs().includes(id),sl=Math.min(SEL[id]??defSize(m),m.sizes.length-1);return `<p><a href="#/menu">← Menu</a></p><div class="split">${ph(m.e,1)}<div><span class="tag">${m.cat}</span><h1 style="margin-top:8px">${m.name}</h1><p class="price"><strong id="pr">${money(unit(m,sl))}</strong></p>${m.desc?`<p class="muted">${m.desc}</p>`:''}${m.ing.length?`<h3>Ingredients</h3><p class="muted">${m.ing.join(' · ')}</p>`:''}${m.groups?optsUI(m,sl,prefBean()):`<fieldset style="border:0;padding:0;margin:0"><legend><strong>Size</strong></legend><div class="seg" id="sz">${m.sizes.map((z,i)=>`<button type="button" class="chip" data-p="${money(unit(m,i))}" data-size="${i}" aria-pressed="${i==sl}">${z}</button>`).join('')}</div></fieldset>`}<p class="muted" style="font-size:.9rem;margin-top:12px">${limitOf(m.id)<1?'Currently unavailable':'Up to '+limitOf(m.id)+' per order'}</p><div class="acts"><span id="actl" data-pid="${m.id}">${ctl(m,sl)}</span><button class="btn sv" data-fav="${m.id}" aria-pressed="${f}">${heart(f)} ${f?'Saved':'Save'}</button></div></div></div>`},
challenges:()=>`<h1>Challenges</h1>${clubCard()}<h2 style="margin:28px 0 4px">Weekly challenges</h2><p class="muted">New challenges every Monday.${user()?'':' <a href="#/login">Log in</a> to track progress.'}</p>${CHALLENGES.map(chCard).join('')}`,
challenge:id=>{const c=CHALLENGES.find(x=>x.id===id);if(!c)return P.nf();const v=prog(c);return `<p><a href="#/challenges">← Challenges</a></p><div class="split">${ph(c.e,1)}<div><h1>${c.title}</h1><p class="muted">${c.desc}</p><ul class="plain"><li class="li"><span>Reward</span><strong>${c.reward} · +${c.pts} pts</strong></li><li class="li"><span>Time left</span><strong>${c.daysLeft} days</strong></li><li class="li"><span>Status</span><strong>${!user()?'Log in to join':v>=c.goal?'Completed':'In progress'}</strong></li></ul>${user()?`<p style="margin-top:16px">${bar(v,c.goal)}<small class="muted">${Math.min(v,c.goal)} of ${c.goal}</small></p><a class="btn p" href="#/menu">Go to menu</a>`:`<a class="btn p" href="#/login">Log in to join</a>`}</div></div>`},
favorites:()=>`<h1>Favorites</h1>${favs().length?`<div class="grid">${favs().map(i=>card(byId(i))).join('')}</div>`:'<p class="muted">Nothing saved yet. Tap the heart on any item in the <a href="#/menu">menu</a>.</p>'}`,
orders:()=>{const C=calc(),h=user()?orders():[];return `<div class="row"><h1>Your order</h1>${C.lines.length?`<button class="btn s" data-clear>Clear all</button>`:''}</div>${C.lines.length?`<ul class="plain">${C.lines.map(({l,idx,units,disc,sub})=>`<li class="ln"><div class="lt"><b>${l.free?ico('gift','in')+' ':units?ico('tag','in')+' ':''}${byId(l.id).name}</b> <small class="muted">${byId(l.id).sizes[l.size]||''}</small>${units?`<div><small class="tag ok">−${money(disc)}</small></div>`:''}</div><div class="lr">${l.free?`<span class="muted">× 1</span>`:`<div class="step" role="group" aria-label="${esc(byId(l.id).name)}"><button type="button" class="sb" data-ldec="${idx}" aria-label="Remove one">−</button><output aria-live="polite">${nf(l.qty)}</output><button type="button" class="sb" data-linc="${idx}" aria-label="Add one">+</button></div>`}<span class="lp">${money(sub)}</span><button type="button" class="sb del" data-rm="${idx}" aria-label="Remove all ${esc(byId(l.id).name)}">${TRASH}</button></div></li>`).join('')}</ul>${C.discount?`<p class="row muted" style="margin:16px 0 0"><span>Discount</span><span>−${money(C.discount)}</span></p>`:''}<p class="row" style="margin-top:8px"><strong>Total</strong><strong>${money(C.total)}</strong></p><button class="btn p" data-checkout>Place order</button> <span class="err" role="alert">${flash}</span>`:'<p class="muted">Your order is empty. <a href="#/menu">Browse the menu</a>.</p>'}<section class="sec"><h2>Order history</h2>${user()?(h.length?h.slice().reverse().map(o=>`<div class="li"><span>#${nf(o.n)} · ${o.date} · ${o.status}<br><small class="muted">${o.lines.map(l=>nf(l.qty)+'× '+(byId(l.id)||l).name).join(', ')}</small></span><strong>${money(o.total)}</strong></div>`).join(''):'<p class="muted">No past orders yet.</p>'):'<p class="muted"><a href="#/login">Log in</a> to place orders and see your history.</p>'}</section>`},
profile:()=>{const u=user();const done=CHALLENGES.filter(c=>prog(c)>=c.goal);return `<div class="row" style="justify-content:flex-start;gap:16px"><div class="av" aria-hidden="true">${esc(u.name[0].toUpperCase())}</div><div><h1 style="margin:0">${esc(u.name)}</h1><span class="muted">${esc(u.email)}</span></div></div>
${loyalty()}<section class="sec"><h2>Challenge progress</h2>${CHALLENGES.filter(c=>prog(c)<c.goal).map(chCard).join('')||'<p class="muted">All done this week!</p>'}${done.length?`<h3>Completed</h3>${done.map(chCard).join('')}`:''}</section>
<section class="sec"><div class="row"><h2>Favorites</h2><a href="#/favorites">View all</a></div><p class="muted">${favs().length} saved item${favs().length==1?'':'s'}</p></section>
<section class="sec"><div class="row"><h2>Orders</h2><a href="#/orders">History</a></div><p class="muted">${orders().length} past order${orders().length==1?'':'s'}</p></section>
<section class="sec"><h2>Settings</h2><form data-form="settings"><label>Display name<input name="name" value="${esc(u.name)}" required></label><div><button class="btn">Save</button> <button type="button" class="btn" data-logout>Log out</button></div></form></section>
<section class="sec"><h2>Security &amp; privacy</h2><p><button type="button" class="btn" data-logoutall>Log out of all devices</button></p><form data-form="del" novalidate><label>Password<input name="password" type="password" autocomplete="current-password" required></label><label>Type DELETE to delete my account<input name="confirm" autocomplete="off" required></label><div class="err" role="alert"></div><button class="btn">Delete my account</button></form><p><a href="/privacy.html">Privacy policy</a></p></section>`},
about:()=>`<h1>About Fika</h1><p class="muted">${CAFE.about}</p><div class="split"><div><h2>Hours</h2><ul class="plain">${hours()}</ul></div><div><h2>Find us</h2><p class="muted">${CAFE.addr}</p></div></div><p class="muted"><a href="/privacy.html">Privacy policy</a></p>`,
login:()=>`<h1>Log in</h1><form data-form="login" novalidate><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><div class="err" role="alert"></div><button class="btn p">Log in</button><small><a href="#/forgot">Forgot password?</a> · <a href="#/register">Create account</a></small></form>`,
register:()=>`<h1>Create account</h1><form data-form="register" novalidate><label>Name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password (at least 8 characters)<input name="password" type="password" autocomplete="new-password" required></label><div class="err" role="alert"></div><button class="btn p">Register</button><small>Have an account? <a href="#/login">Log in</a></small></form>`,
forgot:()=>`<h1>Reset password</h1><p class="muted">There is no e-mail service yet. Ask the staff at the counter: they create a one-time link (valid for 30 minutes) that lets you choose a new password.</p><p><a href="#/login">Back to log in</a></p>`,
reset:t=>`<h1>Choose a new password</h1><form data-form="reset" data-token="${esc(t||'')}" novalidate><label>New password (at least 8 characters)<input name="password" type="password" autocomplete="new-password" required></label><div class="err" role="alert"></div><button class="btn p">Save password</button></form>`,
nf:()=>`<h1>Page not found</h1><a href="#/">Back home</a>`
};

return{P,pts,prog,GOAL,unit,money,card,COMBOS,byId,MENU,CHALLENGES,setCat:v=>{cat=v},user,users,favs,cart,orders};})();
LG.fa=(()=>{const {MENU,CATS,CHALLENGES,COMBOS,CAFE}=buildData('fa');
const byId=id=>MENU.find(m=>m.id===id);
const pickCards=()=>MENU.length?card(MENU[Math.floor(Date.now()/864e5)%MENU.length]):'';
const featuredCards=()=>{let f=DATA.menu.filter(p=>p.featured).map(p=>byId(p.id)).filter(Boolean).slice(0,3);if(!f.length){const seen=new Set();for(const m of MENU){if(!seen.has(m.cat)){seen.add(m.cat);f.push(m);if(f.length===3)break}}}return f.map(card).join('')};
const clubCard=()=>{const g=user(),p=g?Math.max(0,pts()):0;return `<a class="ch" href="${g?'#/profile':'#/login'}"><span class="e" aria-hidden="true">${ico('cup')}</span><div><div class="row"><h3>باشگاه قهوه</h3><span class="tag">همیشگی</span></div><p class="muted" style="margin:0 0 6px;font-size:.9rem">با هر سفارش امتیاز می‌گیری. نوار را پر کن و یک قهوهٔ رایگان به سبدت اضافه کن.</p>${g?bar(p,GOAL)+`<small class="muted">${fa(p)} / ${fa(GOAL)}</small>`:'<small class="muted">برای شروع وارد شوید</small>'}</div></a>`};

const GOAL=DATA.goal;
const pts=()=>ST.points;
const loyalty=()=>{const p=Math.max(0,pts()),r=S.get('redeem:'+user().email,0),F=fa;return `<section class="sec"><h2>قهوهٔ رایگان</h2>${bar(Math.min(p,GOAL),GOAL)}<p class="row" style="margin:8px 0 4px"><strong>${F(p)} / ${F(GOAL)}</strong><span class="muted">${p>=GOAL?'آمادهٔ دریافت!':F(GOAL-p)+' امتیاز تا قهوهٔ رایگان'}</span></p><p class="muted" style="font-size:.9rem">با هر خرید و هر چالش تکمیل‌شده امتیاز بگیرید.${r?' · دریافت‌شده: '+F(r):''}</p>${p-GOAL*cart().filter(l=>l.free).length>=GOAL?`<button class="btn p" data-redeem>افزودن قهوهٔ رایگان به سبد</button>`:''}</section>`};

const unit=(m,i)=>m.price+((m.sp||[])[i]||0);
const comboCard=c=>{const t=c.items.reduce((a,[id,i])=>a+unit(byId(id),i),0);return `<article class="card"><div class="b"><div class="ph cbph" aria-hidden="true">${c.items.map(([id])=>byId(id).e).join('<b>+</b>')}</div><div class="row"><h3>${c.title}</h3><span class="tags">${c.popular?'<span class="tag">پرطرفدار</span>':''}<span class="tag ok">تخفیف ۱۰٪</span></span></div><p class="muted" style="margin:0;font-size:.9rem">${c.desc}</p><p class="muted" style="margin:0;font-size:.85rem">${c.items.map(([id,i])=>byId(id).name+(byId(id).sizes.length>1?' ('+byId(id).sizes[i]+')':'')).join(' + ')}</p><div class="a"><span><s class="muted" style="font-size:.85rem">${money(t)}</s> <strong>${money(t*.9)}</strong></span><button class="btn s" data-combo="${c.id}">افزودن همه</button></div></div></article>`};

const fa=n=>Number(n).toLocaleString('fa-IR');const money=n=>fa(n*1000)+' تومان';
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// ---------- State helpers ----------
const user=()=>{const x=S.get('session',null);return x&&(!x.exp||x.exp>Date.now())?x:null};
const users=()=>S.get('users',[]);
const favs=()=>S.get('favs',[]);
const cart=()=>S.get('cart',[]);
const orders=()=>S.get('orders:'+(user()||{}).email,[]);
const prog=c=>{const o=orders();if(c.rule.type==='orders')return o.length;return new Set(o.flatMap(x=>x.lines).map(l=>l.id).filter(id=>byId(id)&&c.rule.cat.includes(byId(id).cat))).size};
let cat='همه',flash='';
// ---------- Components ----------
const ph=(e,l)=>`<div class="ph${l?' l':''}" aria-hidden="true">${e}</div>`;
const card0=m=>`<article class="card"><a href="#/item/${m.id}" aria-label="جزئیات ${esc(m.name)}">${ph(m.e)}</a><div class="b"><div class="row"><h3><a href="#/item/${m.id}" style="text-decoration:none">${m.name}</a></h3><button class="fav" data-fav="${m.id}" aria-pressed="${favs().includes(m.id)}" aria-label="علاقه‌مندی ${esc(m.name)}">${heart(favs().includes(m.id))}</button></div><p class="muted desc">${m.desc}</p><div class="a"><strong>${m.sp?'از ':''}${money(m.price)}</strong>${ctl(m)}</div></div></article>`;
const card=(m,vi)=>{const h=card0(m);if(vi===undefined||!m.groups||!m.sizes[vi])return h;return h.replace('</div><p class="muted desc">','</div><span class="tag vt">'+m.sizes[vi]+'</span><p class="muted desc">').split('data-add="'+m.id+'"').join('data-add="'+m.id+'" data-vi="'+vi+'"')};
const bar=(v,g)=>`<div class="bar" role="progressbar" aria-valuenow="${Math.min(v,g)}" aria-valuemin="0" aria-valuemax="${g}"><i style="width:${Math.min(100,v/g*100)}%"></i></div>`;
const chCard=c=>{const v=prog(c),done=v>=c.goal;return `<a class="ch" href="#/challenge/${c.id}"><span class="e" aria-hidden="true">${c.e}</span><div><div class="row"><h3>${c.title}</h3><span class="tag${done?' ok':''}">${done?'تکمیل شد':user()?'در حال انجام':c.daysLeft>999?'هدیهٔ خوش‌آمد':fa(c.daysLeft)+' روز مانده'}</span></div>${user()?bar(v,c.goal)+`<small class="muted">${fa(Math.min(v,c.goal))} از ${fa(c.goal)} · ${fa(c.daysLeft)} روز مانده</small>`:`<small class="muted">جایزه: ${c.reward}</small>`}</div></a>`};
const hours=()=>CAFE.hours.map(h=>`<li class="li"><span>${h[0]}</span><span class="muted">${h[1]}</span></li>`).join('');
// ---------- Pages ----------
const P={
home:()=>`<section class="hero"><p class="muted">قهوهٔ بچ‌کوچک · بافت قدیم</p>${greet()}<p class="muted">پیش‌سفارش بده، موردعلاقه‌هایت را ذخیره کن و چالش هفتگی را شروع کن.</p><a class="btn p" href="#/menu">مشاهدهٔ منو</a> <a class="btn" href="#/challenges">چالش این هفته</a></section>
${usualSection()}<section class="sec"><div class="row"><h2>پیشنهاد امروز</h2></div><div class="pick">${pickCards()}${gameTile()}</div></section>
<section class="sec"><div class="row"><h2>منتخب‌ها</h2><a href="#/menu">همه</a></div><div class="grid">${featuredCards()}</div></section>
${learnHome(lang())}
${COMBOS.length?`<section class="sec"><div class="row"><h2>ترکیب‌های پیشنهادی</h2></div><div class="grid">${COMBOS.map(comboCard).join('')}</div></section>`:''}
<section class="sec"><h2>چالش هفتگی</h2>${chCard(CHALLENGES[0])}</section>
<section class="sec split"><div><h2>به ما سر بزنید</h2><p class="muted">${CAFE.addr}</p><a href="#/about">دربارهٔ کافه</a></div><ul class="plain" aria-label="ساعات کاری">${hours()}</ul></section>`,
menu:()=>{const L=MENU.filter(m=>cat==='همه'||m.cat===cat);return `<div class="row mh"><h1>منو</h1>${viewBar()}</div><div class="stick"><div class="chips" role="group" aria-label="دسته‌ها">${CATS.map(c=>`<button class="chip" data-cat="${c}" aria-pressed="${c===cat}">${c}</button>`).join('')}</div></div><div class="grid vw-${view()}">${L.length?L.map(card).join(''):'<p class="muted">آیتمی در این دسته نیست.</p>'}</div>${cat==='همه'?`${COMBOS.length?`<section class="sec"><div class="row"><h2>ترکیب‌های پیشنهادی</h2></div><div class="grid">${COMBOS.map(comboCard).join('')}</div></section>`:''}`:''}`},
item:id=>{const m=byId(id);if(!m)return P.nf();const f=favs().includes(id),sl=Math.min(SEL[id]??defSize(m),m.sizes.length-1);return `<p><a href="#/menu">→ منو</a></p><div class="split">${ph(m.e,1)}<div><span class="tag">${m.cat}</span><h1 style="margin-top:8px">${m.name}</h1><p class="price"><strong id="pr">${money(unit(m,sl))}</strong></p>${m.desc?`<p class="muted">${m.desc}</p>`:''}${m.ing.length?`<h3>مواد تشکیل‌دهنده</h3><p class="muted">${m.ing.join(' · ')}</p>`:''}${m.groups?optsUI(m,sl,prefBean()):`<fieldset style="border:0;padding:0;margin:0"><legend><strong>اندازه</strong></legend><div class="seg" id="sz">${m.sizes.map((z,i)=>`<button type="button" class="chip" data-p="${money(unit(m,i))}" data-size="${i}" aria-pressed="${i==sl}">${z}</button>`).join('')}</div></fieldset>`}<p class="muted" style="font-size:.9rem;margin-top:12px">${limitOf(m.id)<1?'در حال حاضر موجود نیست':'حداکثر '+fa(limitOf(m.id))+' عدد در هر سفارش'}</p><div class="acts"><span id="actl" data-pid="${m.id}">${ctl(m,sl)}</span><button class="btn sv" data-fav="${m.id}" aria-pressed="${f}">${heart(f)} ${f?'ذخیره‌شده':'ذخیره'}</button></div></div></div>`},
challenges:()=>`<h1>چالش‌ها</h1>${clubCard()}<h2 style="margin:28px 0 4px">چالش‌های هفتگی</h2><p class="muted">هر دوشنبه چالش‌های تازه می‌آید.${user()?'':' برای دیدن پیشرفت <a href="#/login">وارد شوید</a>.'}</p>${CHALLENGES.map(chCard).join('')}`,
challenge:id=>{const c=CHALLENGES.find(x=>x.id===id);if(!c)return P.nf();const v=prog(c);return `<p><a href="#/challenges">→ چالش‌ها</a></p><div class="split">${ph(c.e,1)}<div><h1>${c.title}</h1><p class="muted">${c.desc}</p><ul class="plain"><li class="li"><span>جایزه</span><strong>${c.reward} · +${fa(c.pts)} امتیاز</strong></li><li class="li"><span>زمان باقی‌مانده</span><strong>${fa(c.daysLeft)} روز</strong></li><li class="li"><span>وضعیت</span><strong>${!user()?'برای شرکت وارد شوید':v>=c.goal?'تکمیل شد':'در حال انجام'}</strong></li></ul>${user()?`<p style="margin-top:16px">${bar(v,c.goal)}<small class="muted">${fa(Math.min(v,c.goal))} از ${fa(c.goal)}</small></p><a class="btn p" href="#/menu">رفتن به منو</a>`:`<a class="btn p" href="#/login">ورود و شرکت در چالش</a>`}</div></div>`},
favorites:()=>`<h1>علاقه‌مندی‌ها</h1>${favs().length?`<div class="grid">${favs().map(i=>card(byId(i))).join('')}</div>`:'<p class="muted">هنوز چیزی ذخیره نکرده‌اید. در <a href="#/menu">منو</a> روی قلب بزنید.</p>'}`,
orders:()=>{const C=calc(),h=user()?orders():[];return `<div class="row"><h1>سفارش شما</h1>${C.lines.length?`<button class="btn s" data-clear>حذف همه</button>`:''}</div>${C.lines.length?`<ul class="plain">${C.lines.map(({l,idx,units,disc,sub})=>`<li class="ln"><div class="lt"><b>${l.free?ico('gift','in')+' ':units?ico('tag','in')+' ':''}${byId(l.id).name}</b> <small class="muted">${byId(l.id).sizes[l.size]||''}</small>${units?`<div><small class="tag ok">−${money(disc)}</small></div>`:''}</div><div class="lr">${l.free?`<span class="muted">× 1</span>`:`<div class="step" role="group" aria-label="${esc(byId(l.id).name)}"><button type="button" class="sb" data-ldec="${idx}" aria-label="کم کردن یکی">−</button><output aria-live="polite">${nf(l.qty)}</output><button type="button" class="sb" data-linc="${idx}" aria-label="اضافه کردن یکی">+</button></div>`}<span class="lp">${money(sub)}</span><button type="button" class="sb del" data-rm="${idx}" aria-label="حذف کامل ${esc(byId(l.id).name)}">${TRASH}</button></div></li>`).join('')}</ul>${C.discount?`<p class="row muted" style="margin:16px 0 0"><span>تخفیف</span><span>−${money(C.discount)}</span></p>`:''}<p class="row" style="margin-top:8px"><strong>جمع کل</strong><strong>${money(C.total)}</strong></p><button class="btn p" data-checkout>ثبت سفارش</button> <span class="err" role="alert">${flash}</span>`:'<p class="muted">سفارش شما خالی است. <a href="#/menu">منو را ببینید</a>.</p>'}<section class="sec"><h2>تاریخچهٔ سفارش‌ها</h2>${user()?(h.length?h.slice().reverse().map(o=>`<div class="li"><span>#${nf(o.n)} · ${o.date} · ${o.status}<br><small class="muted">${o.lines.map(l=>nf(l.qty)+'× '+(byId(l.id)||l).name).join('، ')}</small></span><strong>${money(o.total)}</strong></div>`).join(''):'<p class="muted">هنوز سفارشی ثبت نشده است.</p>'):'<p class="muted">برای ثبت سفارش و دیدن تاریخچه <a href="#/login">وارد شوید</a>.</p>'}</section>`},
profile:()=>{const u=user();const done=CHALLENGES.filter(c=>prog(c)>=c.goal);return `<div class="row" style="justify-content:flex-start;gap:16px"><div class="av" aria-hidden="true">${esc(u.name[0].toUpperCase())}</div><div><h1 style="margin:0">${esc(u.name)}</h1><span class="muted" dir="ltr">${esc(u.email)}</span></div></div>
${loyalty()}<section class="sec"><h2>پیشرفت چالش‌ها</h2>${CHALLENGES.filter(c=>prog(c)<c.goal).map(chCard).join('')||'<p class="muted">همهٔ چالش‌ها تمام شد!</p>'}${done.length?`<h3>تکمیل‌شده</h3>${done.map(chCard).join('')}`:''}</section>
<section class="sec"><div class="row"><h2>علاقه‌مندی‌ها</h2><a href="#/favorites">مشاهده</a></div><p class="muted">${fa(favs().length)} مورد ذخیره‌شده</p></section>
<section class="sec"><div class="row"><h2>سفارش‌ها</h2><a href="#/orders">تاریخچه</a></div><p class="muted">${fa(orders().length)} سفارش قبلی</p></section>
<section class="sec"><h2>تنظیمات</h2><form data-form="settings"><label>نام نمایشی<input name="name" value="${esc(u.name)}" required></label><div><button class="btn">ذخیره</button> <button type="button" class="btn" data-logout>خروج از حساب</button></div></form></section>
<section class="sec"><h2>امنیت و حریم خصوصی</h2><p><button type="button" class="btn" data-logoutall>خروج از همهٔ دستگاه‌ها</button></p><form data-form="del" novalidate><label>رمز عبور<input name="password" type="password" autocomplete="current-password" required></label><label>برای حذف حساب DELETE را تایپ کنید<input name="confirm" autocomplete="off" required></label><div class="err" role="alert"></div><button class="btn">حذف حساب من</button></form><p><a href="/privacy.html">سیاست حریم خصوصی</a></p></section>`},
about:()=>`<h1>دربارهٔ فیکا</h1><p class="muted">${CAFE.about}</p><div class="split"><div><h2>ساعات کاری</h2><ul class="plain">${hours()}</ul></div><div><h2>نشانی</h2><p class="muted">${CAFE.addr}</p></div></div><p class="muted"><a href="/privacy.html">سیاست حریم خصوصی</a></p>`,
login:()=>`<h1>ورود</h1><form data-form="login" novalidate><label>ایمیل<input name="email" type="email" autocomplete="email" required></label><label>رمز عبور<input name="password" type="password" autocomplete="current-password" required></label><div class="err" role="alert"></div><button class="btn p">ورود</button><small><a href="#/forgot">رمز را فراموش کرده‌اید؟</a> · <a href="#/register">ساخت حساب</a></small></form>`,
register:()=>`<h1>ساخت حساب</h1><form data-form="register" novalidate><label>نام<input name="name" autocomplete="name" required></label><label>ایمیل<input name="email" type="email" autocomplete="email" required></label><label>رمز عبور (حداقل ۸ کاراکتر)<input name="password" type="password" autocomplete="new-password" required></label><div class="err" role="alert"></div><button class="btn p">ثبت‌نام</button><small>حساب دارید؟ <a href="#/login">وارد شوید</a></small></form>`,
forgot:()=>`<h1>بازیابی رمز عبور</h1><p class="muted">فعلاً سرویس ایمیل نداریم. از کارکنان کافه بخواهید یک لینک یک‌بارمصرف (۳۰ دقیقه اعتبار) بسازند تا رمز جدید انتخاب کنید.</p><p><a href="#/login">بازگشت به ورود</a></p>`,
reset:t=>`<h1>انتخاب رمز جدید</h1><form data-form="reset" data-token="${esc(t||'')}" novalidate><label>رمز جدید (حداقل ۸ کاراکتر)<input name="password" type="password" autocomplete="new-password" required></label><div class="err" role="alert"></div><button class="btn p">ذخیره رمز</button></form>`,
nf:()=>`<h1>صفحه پیدا نشد</h1><a href="#/">بازگشت به خانه</a>`
};

return{P,pts,prog,GOAL,unit,money,card,COMBOS,byId,MENU,CHALLENGES,setCat:v=>{cat=v},user,users,favs,cart,orders};})();
const {user,users,favs,cart,orders}=LG.en;
const lang=()=>S.get('lang','en'),X=()=>LG[lang()],loc=()=>lang()==='fa'?'fa-IR':'en-US';
const prefs=()=>S.get('prefs',{theme:'system',motion:false,n1:true,n2:false,n3:true});
// 'system' (the default) follows the device; the buttons only offer light/dark and show the one in effect
const effTheme=()=>{const t=prefs().theme||'system';return t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t};


const limitOf=id=>{const p=DATA.menu.find(m=>m.id===id);return p?p.variants.reduce((a,v)=>Math.max(a,v.available?v.stock:0),0):0};
const inCart=id=>cart().filter(l=>l.id===id).reduce((a,l)=>a+l.qty,0);
const over=()=>{const t={};cart().forEach(l=>t[l.id]=(t[l.id]||0)+l.qty);return Object.keys(t).find(i=>t[i]>limitOf(i))};



const setPref=(k,v)=>S.set('prefs',{...prefs(),[k]:v});
const U={en:{x:{cookie:'Signed in, but the browser did not keep the session (cookies blocked?). Allow cookies for this site and try again.',keep:'Yes, use it anyway',weak:'This password is easy to guess. Are you sure you want to use it?',otp:'This account uses two-step sign-in. Please sign in from the staff page (/admin.html).',rstOk:'Password changed. You can sign in now.',rstBad:'This link is invalid or has expired. Ask the staff for a new one.',pw2:'New password (at least 8 characters)',busy:'Too many attempts. Try again later.',pend:'You have several unfinished orders. Please wait until they are handled.',after:'',delAsk:'Your account and points will be deleted for good. Type DELETE to confirm.',delOk:'Your account was deleted.',delBad:'Password or confirmation is wrong.',allOk:'Signed out on every device.'},nav:[['/','Home','⌂'],['/menu','Menu','☰'],['/challenges','Challenges','★'],['P','Profile','☺']],order:'Order',gi:'Sign in to earn points',title:'Fika — Cafe',sold:'Sold out',inc:'Add one',dec:'Remove one',clr:'Remove all items from your order?',vw:{lbl:'View',grid:'Grid',list:'List',compact:'Compact',large:'Large'},over:(n,q)=>q<1?n+' is currently unavailable':'You can order at most '+q+' × '+n+' at a time',ad:{h:'Order limits',hint:'Set the maximum quantity of each item a customer can order at once. Use 0 to mark an item as unavailable.',save:'Save limits',al:'Cafe owner: order limits'},pt:'points',after:'credited when your order is ready',rd:'Free coffee added to your cart',added:'Added ✓',add:'Add',addo:'Add to order',okAdd:'Added to order',fav:'Favorites updated',saved:'Settings saved',ok:'Logged in',bad:['Enter a valid email address.','Password must be at least 8 characters.','Enter your name.','This email is already registered.','Incorrect email or password.','Ask the staff at the counter for a one-time reset link.'],st:{h:'Settings',ap:'Appearance',th:'Theme',L:'Light',D:'Dark',Y:'System',rm:'Reduced motion',lg:'Language',nt:'Notifications',n1:'Challenge notifications',n2:'Promotions',n3:'Order updates',lo:'Log out',ph:'Search menu and challenges…',nr:'No results found'}},
fa:{x:{cookie:'ورود انجام شد ولی مرورگر نشست را نگه نداشت (کوکی مسدود است؟). کوکی را برای این سایت مجاز کنید و دوباره امتحان کنید.',keep:'بله، همین را می‌خواهم',weak:'این رمز ساده است و حدس‌زدنش آسان. مطمئنید که می‌خواهید از همین استفاده کنید؟',otp:'این حساب ورود دومرحله‌ای دارد. از صفحهٔ کارکنان (/admin.html) وارد شوید.',rstOk:'رمز عبور تغییر کرد. اکنون می‌توانید وارد شوید.',rstBad:'این لینک نامعتبر است یا منقضی شده. از کارکنان لینک جدید بخواهید.',pw2:'رمز جدید (حداقل ۸ کاراکتر)',busy:'تلاش‌های زیاد. کمی بعد دوباره امتحان کنید.',pend:'چند سفارش نیمه‌تمام دارید. لطفاً تا رسیدگی به آن‌ها صبر کنید.',after:'',delAsk:'حساب و امتیازهای شما برای همیشه حذف می‌شود. برای تأیید DELETE را تایپ کنید.',delOk:'حساب شما حذف شد.',delBad:'رمز یا تأیید اشتباه است.',allOk:'از همهٔ دستگاه‌ها خارج شدید.'},nav:[['/','خانه','⌂'],['/menu','منو','☰'],['/challenges','چالش‌ها','★'],['P','پروفایل','☺']],order:'سفارش',gi:'برای امتیاز وارد شوید',title:'فیکا — کافه',sold:'ناموجود',inc:'اضافه کردن یکی',dec:'کم کردن یکی',clr:'همهٔ آیتم‌های سفارش حذف شوند؟',vw:{lbl:'نمایش',grid:'شبکه‌ای',list:'فهرست',compact:'فشرده',large:'بزرگ'},over:(n,q)=>q<1?n+' فعلاً موجود نیست':'حداکثر '+q.toLocaleString('fa-IR')+' عدد '+n+' در هر سفارش مجاز است',ad:{h:'محدودیت سفارش',hint:'حداکثر تعدادی از هر آیتم را که مشتری می‌تواند در یک سفارش بخرد تعیین کنید. عدد ۰ یعنی آیتم فعلاً موجود نیست.',save:'ذخیرهٔ محدودیت‌ها',al:'کافه‌دار: محدودیت سفارش'},pt:'امتیاز',after:'پس از آماده‌شدن سفارش اضافه می‌شود',rd:'قهوهٔ رایگان به سبد اضافه شد',added:'اضافه شد ✓',add:'افزودن',addo:'افزودن به سفارش',okAdd:'به سفارش اضافه شد',fav:'علاقه‌مندی‌ها به‌روز شد',saved:'تنظیمات ذخیره شد',ok:'وارد شدید',bad:['یک ایمیل معتبر وارد کنید.','رمز عبور باید حداقل ۸ کاراکتر باشد.','نام خود را وارد کنید.','این ایمیل قبلاً ثبت‌نام کرده است.','ایمیل یا رمز عبور اشتباه است.','از کارکنان کافه یک لینک یک‌بارمصرف بازیابی بخواهید.'],st:{h:'تنظیمات',ap:'ظاهر',th:'پوسته',L:'روشن',D:'تیره',Y:'سیستم',rm:'کاهش حرکت',lg:'زبان',nt:'اعلان‌ها',n1:'اعلان چالش‌ها',n2:'تخفیف‌ها',n3:'وضعیت سفارش',lo:'خروج از حساب',ph:'جستجو در منو و چالش‌ها…',nr:'نتیجه‌ای پیدا نشد'}}};
const u=()=>U[lang()];
function applyAll(){const h=document.documentElement,p=prefs(),L=lang();
p.theme==='system'?h.removeAttribute('data-theme'):h.dataset.theme=p.theme;
h.classList.toggle('rm',!!p.motion);h.lang=L;h.dir=L==='fa'?'rtl':'ltr'}
function toast(m){const c=document.getElementById('toasts');while(c.children.length>=3)c.firstChild.remove();const t=document.createElement('div');t.className='toast';t.textContent=m;document.getElementById('toasts').append(t);setTimeout(()=>t.remove(),2200)}

// ---- friendly greeting (different wording each visit) and the games tile
const GREET={en:{any:['Welcome back, {n}!','Hi {n} — good to see you.','Hey {n}, ready for a good one?','Look who is here — {n}!','{n}! Your table is waiting.','Nice to have you back, {n}.'],
 morning:['Good morning, {n}.','Rise and shine, {n}','Morning, {n} — coffee first?'],afternoon:['Good afternoon, {n}.','Afternoon pick-me-up, {n}?'],evening:['Good evening, {n}.','Evening, {n} — something cozy?'],night:['Late one, {n}? We have got you.','Hi {n}, a calm cup for the night?'],
 guest:['Hello and welcome!','Welcome in!','Hi there — pull up a chair.','Hello, coffee lover!'],gsub:'We do not know your name yet — sign up and join the Fika family.',su:'Sign up',pts:(p,g)=>`${p} / ${g} points to a free coffee`},
 fa:{any:['خوش اومدی {n}!','سلام {n} جان، خوش برگشتی!','{n}! دلمون برات تنگ شده بود.','سلام {n}، یه قهوهٔ خوب؟','به فیکا خوش اومدی، {n}.','{n} عزیز، میزت آماده‌ست!'],
 morning:['صبح بخیر {n}!','{n} جان صبحت بخیر، قهوه‌ات رو بگیر!','سلام {n}، صبح قهوه‌ای!'],afternoon:['ظهر بخیر {n}!','{n} جان، وقت یه قهوهٔ عصرگاهیه!'],evening:['عصر بخیر {n}!','سلام {n}، یه چیز گرم برای عصر؟'],night:['شب بخیر {n}، قهوهٔ شبانه؟','{n} جان، شب‌زنده‌دار شدی؟'],
 guest:['سلام، خوش اومدی!','سلام و خوش‌آمد!','به فیکا خوش اومدی!','سلام قهوه‌دوست!'],gsub:'ما هنوز اسمت رو نمی‌دونیم؛ ثبت‌نام کن تا عضو خانوادهٔ فیکا بشی.',su:'ثبت‌نام',pts:(p,g)=>`${p} از ${g} امتیاز تا قهوهٔ رایگان`}};

// Personal default for specialty coffee: if one origin is clearly what this person always picks, it becomes their default.
function prefBean(){if(!user())return null;const c={};let n=0;
 for(const o of X().orders())for(const l of (o.lines||[])){if(l.free)continue;const p=DATA.menu.find(m=>m.id===l.id),b=p&&p.variants[l.size]&&p.variants[l.size].bean;if(b){c[b]=(c[b]||0)+l.qty;n+=l.qty}}
 const r=Object.entries(c).sort((a,b)=>b[1]-a[1]);return r.length&&r[0][1]>=2&&r[0][1]>=.6*n?r[0][0]:null}
function defSize(m){if(!m||!m.vbean)return 0;const pb=prefBean();if(!pb)return 0;const i=m.vbean.indexOf(pb);return i<0?0:i}

// "Your usual / favourites": built from the person's own order history.
// One item that clearly dominates (the only item ever ordered, or at least twice as many as the next) is called "your usual".
function usualSection(){const me=user();if(!me)return '';const x=X(),cnt={};
 const vc={};for(const o of x.orders())for(const i of (o.lines||[])){if(i.free||!x.byId(i.id))continue;cnt[i.id]=(cnt[i.id]||0)+i.qty;const k=i.id+':'+i.size;vc[k]=(vc[k]||0)+i.qty}
 const topV=id=>{let b=0,bn=-1;for(const k in vc){if(k.startsWith(id+':')&&vc[k]>bn){bn=vc[k];b=+k.slice(id.length+1)}}return b};
 const r=Object.entries(cnt).sort((a,b)=>b[1]-a[1]);if(!r.length)return '';
 const usual=r.length===1||(r[0][1]>=2&&r[0][1]>=2*r[1][1]),fa=lang()==='fa',ids=usual?[r[0][0]]:r.slice(0,3).map(e=>e[0]);
 const h=usual?(fa?'همیشگی تو':'Your usual'):(fa?'مورد علاقه‌های تو':'Your favourites'),
  sub=usual?(fa?'همان چیزی که همیشه سفارش می‌دهی.':'The one you always come back for.'):(fa?'بیشتر از همه این‌ها را سفارش داده‌ای.':'What you order most.');
 return `<section class="sec" id="usual"><div class="row"><h2>${h}</h2></div><p class="muted" style="margin:-4px 0 12px">${sub}</p><div class="grid${usual?' one':''}">${ids.map(id=>x.card(x.byId(id),topV(id))).join('')}</div></section>`}
const GPICK={};
function greet(){const L=lang(),G=GREET[L],me=user(),h=new Date().getHours(),b=h<5?'night':h<12?'morning':h<17?'afternoon':h<21?'evening':'night';
 const key=L+(me?'u':'g'),pool=me?[...G.any,...G[b]]:G.guest;
 if(GPICK[key]===undefined){let last=-1;try{last=+localStorage.getItem('glast'+key)}catch(e){}let i;do{i=Math.floor(Math.random()*pool.length)}while(pool.length>1&&i===last);GPICK[key]=i;try{localStorage.setItem('glast'+key,i)}catch(e){}}
 const x=pool[GPICK[key]%pool.length];
 if(!me)return `<h1>${esc(x)}</h1><p class="gsub">${G.gsub} <a href="#/register">${G.su}</a></p>`;
 const n=esc(String(me.name||'').trim().split(/\s+/)[0]),p=Math.max(0,X().pts()),g=X().GOAL,fmt=v=>Number(v).toLocaleString(loc());
 return `<h1>${x.replace('{n}',n)}</h1><a class="gsub pill" href="#/profile">${ico('cup','in')} ${G.pts(fmt(Math.min(p,g)),fmt(g))}</a>`}
const gameTile=()=>{const fa=lang()==='fa';return `<a class="gtile" href="#/games"><svg viewBox="0 0 120 80" aria-hidden="true"><rect class="p2" x="8" y="44" width="30" height="30" rx="5"/><rect class="p1" x="45" y="28" width="30" height="46" rx="5"/><rect class="p3" x="82" y="54" width="30" height="20" rx="5"/><g class="gt-i" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(46 4) scale(1.1)"><path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5"/><path d="M12 15v3M8 21h8M9 18h6"/></g><g transform="translate(10 24) scale(.75)"><path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/></g><g transform="translate(86 34) scale(.75)"><path d="M6 17C2 12 6 3 14 4c4 .5 6 3 5 6-1.500 5-8 10-13 7z"/></g></g></svg><div><span class="tag">${fa?'جایزهٔ هفتگی':'Weekly prizes'}</span><h3>${fa?'بازی‌های قهوه':'Coffee Games'}</h3><p>${fa?'بازی کن، در جدول هفته بالا برو و امتیاز ببر.':'Play, top the weekly board and win points.'}</p><span class="btn s gbtn">${fa?'شروع بازی':'Play now'}</span></div></a>`};
function syncCh(){const x=X();x.CHALLENGES.splice(0,x.CHALLENGES.length,...buildData(lang()).CHALLENGES)}
const settingsPage=()=>{const s=u().st,p=prefs(),L=lang();
const seg=(k,o)=>o.map(([v,t])=>`<button type="button" class="chip" data-${k}="${v}" aria-pressed="${k==='theme'?effTheme()===v:L===v}">${t}</button>`).join('');
const sw=(k,t)=>`<label style="display:flex;gap:10px;align-items:center;font-weight:400"><input type="checkbox" data-pref="${k}"${p[k]?' checked':''}>${t}</label>`;
return `<h1>${s.h}</h1><section class="sec"><h2>${s.ap}</h2><p>${s.th}</p><div class="seg">${seg('theme',[['light',s.L],['dark',s.D]])}</div>${sw('motion',s.rm)}</section><section class="sec"><h2>${s.lg}</h2><div class="seg">${seg('lang',[['en','English'],['fa','فارسی']])}</div></section><section class="sec"><h2>${s.nt}</h2><div style="display:grid;gap:10px">${sw('n1',s.n1)}${sw('n2',s.n2)}${sw('n3',s.n3)}</div></section>${user()?`<section class="sec"><button class="btn" data-logout>${s.lo}</button></section>`:''}${['STAFF','OWNER','ADMIN'].includes((user()||{}).role)?`<section class="sec"><a class="btn" href="/admin.html">${u().ad.al}</a></section>`:''}`};
const SEL={};
const esc=t=>String(t).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const nf=n=>Number(n).toLocaleString(loc());
const view=()=>prefs().view||'grid';
const IC=b=>`<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
const VI={grid:IC('<rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="11.500" y="3" width="5.5" height="5.5" rx="1"/><rect x="3" y="11.500" width="5.5" height="5.5" rx="1"/><rect x="11.500" y="11.500" width="5.5" height="5.5" rx="1"/>'),
 list:IC('<rect x="3" y="3.500" width="4" height="4" rx="1"/><path d="M10 5.500h7"/><rect x="3" y="12.500" width="4" height="4" rx="1"/><path d="M10 14.500h7"/>'),
 compact:IC('<path d="M3 5h14M3 10h14M3 15h14"/>'),
 large:IC('<rect x="3" y="3" width="14" height="9" rx="1.500"/><path d="M3 15.500h9"/>')};
const TRASH=IC('<path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.600L14 6"/>');
const viewBar=()=>`<div class="views" role="group" aria-label="${u().vw.lbl}">${['grid','list','compact','large'].map(v=>`<button type="button" class="vbtn" data-view="${v}" aria-pressed="${view()===v}" aria-label="${u().vw[v]}" title="${u().vw[v]}">${VI[v]}</button>`).join('')}</div>`;
const qtyOf=(id,sz)=>cart().filter(l=>l.id===id&&!l.free&&(sz===undefined||l.size===sz)).reduce((a,l)=>a+l.qty,0);
/* Add button becomes  [-] n [+]  once the item is in the order. sz===undefined: menu card (all sizes together). */
const ctl=(m,sz)=>{if(limitOf(m.id)<1)return `<span class="tag">${u().sold}</span>`;const q=qtyOf(m.id,sz);
 if(!q)return sz===undefined?`<button class="btn s" data-add="${m.id}">${u().add}</button>`:`<button class="btn p" data-add="${m.id}" data-detail>${u().addo}</button>`;
 return `<div class="step" role="group" aria-label="${esc(m.name)}"><button type="button" class="sb" data-dec="${m.id}"${sz===undefined?'':` data-sz="${sz}"`} aria-label="${q===1?u().rem||u().dec:u().dec}">${q===1?TRASH:'−'}</button><output aria-live="polite">${nf(q)}</output><button type="button" class="sb" data-add="${m.id}" aria-label="${u().inc}">+</button></div>`};
const RATE=()=>DATA.rate==null?0.1:DATA.rate;
/* Mirrors the server's combo rule so the order page shows the same discount the server will apply. */
function calc(){const c=cart(),en=LG.en,K={};
 c.forEach(l=>{if(l.cb&&!l.free&&!(l.cb in K)){const cb=en.COMBOS.find(k=>k.id===l.cb);K[l.cb]=cb?Math.min(...cb.items.map(([id,i])=>c.filter(z=>z.cb===l.cb&&z.id===id&&z.size===i&&!z.free).reduce((a,z)=>a+z.qty,0))):0}});
 const lines=c.map((l,idx)=>{const up=en.unit(en.byId(l.id),l.size),units=l.cb&&!l.free?Math.min(l.qty,K[l.cb]||0):0,disc=Math.round(up*1000*RATE())/1000*units;return{l,idx,units,disc,sub:l.free?0:up*l.qty-disc}});
 return{lines,discount:lines.reduce((a,x)=>a+x.disc,0),total:lines.reduce((a,x)=>a+x.sub,0)}}
// One-time, gentle reveal of sections that start below the fold. Skipped for reduced motion.
const RM=matchMedia('(prefers-reduced-motion:reduce)');let IO;
function reveal(root){if(RM.matches||prefs().motion||!window.IntersectionObserver)return;IO&&IO.disconnect();
 IO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting||e.boundingClientRect.top<0){e.target.classList.add('in');IO.unobserve(e.target)}}),{rootMargin:'0px 0px -40px 0px'});
 root.querySelectorAll('.sec,.ch').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('rv');IO.observe(el)}})}
let lastN=0,raf=0;addEventListener('scroll',()=>{document.getElementById('top').classList.toggle('sc',scrollY>6);if(raf)return;raf=requestAnimationFrame(()=>{raf=0;document.querySelectorAll('.rv:not(.in)').forEach(e=>{if(e.getBoundingClientRect().top<innerHeight-40)e.classList.add('in')})})},{passive:true});
const swap=()=>{const g=document.querySelector('.grid[class*=vw-]');if(g){g.classList.remove('swap');g.offsetWidth;g.classList.add('swap')}};
// ---- fluid motion: View Transitions (page slide, card morph), sliding nav pill, ripple
const canVT=()=>!!document.startViewTransition&&!RM.matches&&!prefs().motion;
function vt(kind,fn){if(!canVT()){fn();return}
 const h=document.documentElement,nm=()=>document.querySelectorAll('.grid[class*=vw-] .card').forEach(c=>{const a=c.querySelector('a[href^="#/item/"]');if(a)c.style.viewTransitionName='c-'+a.getAttribute('href').slice(7).replace(/[^\w-]/g,'_')});
 h.dataset.vt=kind;if(kind==='filter')nm();
 let t;try{t=document.startViewTransition(()=>{fn();if(kind==='filter')nm()})}catch(e){delete h.dataset.vt;fn();return}
 t.finished.finally(()=>{delete h.dataset.vt;document.querySelectorAll('.card').forEach(c=>c.style.viewTransitionName='')})}
const RORD={'':0,menu:1,item:1.5,learn:0.5,challenges:2,challenge:2.5,games:2.6,orders:3,login:4,register:4.1,forgot:4.2,reset:4.25,favorites:4.3,profile:4,settings:5};let lastR=0;
function goRoute(){const a=(location.hash.slice(1)||'/').split('/')[1]||'',r=RORD[a]??6;document.documentElement.dataset.dir=r>=lastR?'fwd':'back';lastR=r;vt('page',()=>route())}
function moveInd(anim){const n=document.getElementById('nav'),i=n&&n.querySelector('.ind');if(!i)return;const c=n.querySelector('[aria-current]');if(!c){i.style.opacity=0;return}
 if(!anim)i.style.transition='none';i.style.opacity=1;i.style.width=c.offsetWidth+'px';i.style.height=c.offsetHeight+'px';i.style.transform=`translate(${c.offsetLeft}px,${c.offsetTop}px)`;if(!anim){i.offsetWidth;i.style.transition=''}}
document.addEventListener('pointerdown',e=>{const t=e.target.closest('.btn,.chip,.iconbtn,#nav a,.vbtn,.sfield');if(!t||RM.matches||prefs().motion)return;const r=t.getBoundingClientRect();
 t.style.setProperty('--rx',e.clientX-r.left+'px');t.style.setProperty('--ry',e.clientY-r.top+'px');t.classList.remove('rp');t.offsetWidth;t.classList.add('rp');t.addEventListener('animationend',()=>t.classList.remove('rp'),{once:true})},{passive:true});
const hh=()=>document.getElementById('top').offsetHeight;
function route(keep){
const cl=keep&&document.querySelector(".chips"),csl=cl?cl.scrollLeft:0;
const y=window.scrollY,ae=keep&&document.activeElement,fk=ae&&ae.dataset&&Object.keys(ae.dataset)[0],fv=fk&&ae.dataset[fk];
const [,a='',b]=(location.hash.slice(1)||'/').split('/');syncCh();const P=X().P;
if(a==='profile'&&!user()){location.hash='#/login';return}
if((a==='login'||a==='register')&&user()){location.hash='#/profile';return}
const pg=a===''?P.home():a==='item'?P.item(b):a==='reset'?P.reset(b):a==='challenge'?P.challenge(b):a==='settings'?settingsPage():a==='games'?gamesShell():a==='learn'?learnPage(lang(),b):(P[a]&&a!=='nf'?P[a]():P.nf());
const app=document.getElementById('app');
if(keep)app.style.minHeight=app.offsetHeight+'px';
if(!(a==='games'&&keep&&document.getElementById('gm')))app.innerHTML=pg;app.querySelectorAll('.ph').forEach(p=>{if(!p.firstElementChild)p.innerHTML='<span class="em">'+p.innerHTML+'</span>'});
if(a==='challenges')app.insertAdjacentHTML('beforeend','<section class="sec">'+gameTile()+'</section>');
if(a==='games'&&!keep)mountGames({lang:lang(),api,me:user(),loc:loc(),refresh:async()=>{await loadMe();route(1)}});
if(!keep){app.style.animation='none';app.offsetWidth;app.style.animation='';if(document.documentElement.dataset.vt==='page')app.classList.remove('enter');else app.classList.add('enter');reveal(app)}else app.classList.remove('enter')
const nav=u().nav.map(n=>[n[0]==='P'?(user()?'/profile':'/login'):n[0],n[1],n[2]]);
const cur=h=>('/'+a)===h||(a===''&&h==='/')||(a==='item'&&h==='/menu')||((a==='challenge'||a==='games')&&h==='/challenges')||(a==='learn'&&h==='/')||((a==='login'||a==='register'||a==='forgot'||a==='favorites')&&/profile|login/.test(h));
const SV=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const n=cart().reduce((s,l)=>s+l.qty,0),all=[nav[0],nav[1],nav[2],['/orders',u().order],nav[3]];
const ICN={'/':'<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>','/menu':'<path d="M5 8h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16M9 3v2M12.500 3v2"/>','/challenges':'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>','/orders':'<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>','/profile':'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'};
const ccur=h=>h==='/orders'?a==='orders':cur(h);
const pop=n!==lastN&&n>0&&lastN!==undefined&&keep;lastN=n;
const NV=document.getElementById('nav'),sig=lang()+'|'+n+'|'+(user()?1:0)+'|'+all.map(x=>x[1]).join(),navHtml=all.map(x=>{const h=x[0],ik=/^\/(login|profile)$/.test(h)?'/profile':h,on=ccur(h);
 return `<a href="#${h}"${on?' aria-current="page"':''}${h==='/orders'&&n?` aria-label="${x[1]} (${n.toLocaleString(loc())})"`:''}>${SV(ICN[ik])}<span>${x[1]}</span>${h==='/orders'&&n?`<span class="n${pop?' pop':''}" aria-hidden="true">${n.toLocaleString(loc())}</span>`:''}</a>`}).join('');
if(NV.dataset.sig===sig){const hs=all.map(x=>x[0]);NV.querySelectorAll('a').forEach((el,k)=>{ccur(hs[k])?el.setAttribute('aria-current','page'):el.removeAttribute('aria-current')});moveInd(true)}
else{NV.dataset.sig=sig;NV.innerHTML='<i class="ind" aria-hidden="true"></i>'+navHtml;moveInd(false)}
const me=user(),who=document.getElementById('who');who.href=me?'#/profile':'#/login';who.innerHTML=me?`<b>${esc(me.name)}</b><span>${Math.max(0,X().pts()).toLocaleString(loc())} ${u().pt}</span>`:`<b>${u().gi}</b>`;
const pr=prefs(),th=effTheme(),L=lang(),ss=u().st,TI={light:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600l1.400 1.400M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400"/>',dark:'<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',system:'<path d="M3 5h18v11H3zM8 20h8M12 16v4"/>'},TL={light:ss.L,dark:ss.D,system:ss.Y};
document.getElementById('ctl').innerHTML=`<div class="hseg dsk" role="group" aria-label="${ss.th}">${['light','dark'].map(k=>`<button type="button" data-theme="${k}" aria-pressed="${th===k}" title="${TL[k]}" aria-label="${TL[k]}">${SV(TI[k])}</button>`).join('')}</div>`
+`<div class="hseg dsk" role="group" aria-label="${ss.lg}"><button type="button" data-lang="en" lang="en" aria-pressed="${L==='en'}">EN</button><button type="button" data-lang="fa" lang="fa" aria-pressed="${L==='fa'}">فا</button></div>`
+`<button type="button" class="iconbtn mob" data-theme="cycle" title="${ss.th}: ${TL[th]}" aria-label="${ss.th}: ${TL[th]}">${SV(TI[th])}</button>`
+`<button type="button" class="iconbtn mob" data-lang="toggle" lang="${L==='fa'?'en':'fa'}" aria-label="${ss.lg}">${L==='fa'?'EN':'فا'}</button>`
+`<a class="iconbtn" href="#/settings" title="${ss.h}" aria-label="${ss.h}"${a==='settings'?' aria-current="page"':''}>${SV('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>')}</a>`;
const sb=document.getElementById('sbtn');sb.setAttribute('aria-label',ss.ph);sb.querySelector('.sl').textContent=ss.ph;
document.querySelectorAll('.bt').forEach(e=>e.textContent=lang()==='fa'?'فیکا':'Fika');document.title=u().title;document.documentElement.style.setProperty('--hh',hh()+'px');
if(keep){window.scrollTo(0,y);requestAnimationFrame(()=>{window.scrollTo(0,y);app.style.minHeight=''});const q=k=>document.querySelector('[data-'+k+'="'+fv+'"]'),f=fk&&(q(fk)||(fk==='dec'?q('add'):fk==='ldec'?q('linc'):null));if(f)f.focus({preventScroll:true});
const c2=document.querySelector('.chips');if(c2){c2.scrollLeft=csl;const p=c2.querySelector('[aria-pressed=true]');if(p){const r=p.getBoundingClientRect(),cr=c2.getBoundingClientRect();if(r.left<cr.left||r.right>cr.right)p.scrollIntoView({inline:'center',block:'nearest'})}}}else window.scrollTo(0,0)}
document.addEventListener('click',e=>{
const t=e.target.closest('[data-fav],[data-add],[data-cat],[data-size],[data-o],[data-rm],[data-checkout],[data-combo],[data-dec],[data-ldec],[data-linc],[data-clear],[data-view],[data-redeem],[data-logout],[data-logoutall],button[data-theme],button[data-lang]');if(!t)return;
const d=t.dataset,x=X();
if(d.fav){const f=favs();S.set('favs',f.includes(d.fav)?f.filter(i=>i!==d.fav):[...f,d.fav]);toast(u().fav);route(1);const hb=document.querySelector('[data-fav="'+d.fav+'"]');if(hb&&!RM.matches){hb.classList.add('heartpop')}}
else if(d.add){if(inCart(d.add)+1>limitOf(d.add)){toast(u().over(x.byId(d.add).name,limitOf(d.add)));return}const sz=document.querySelector('#sz [data-size][aria-pressed=true]');let size=0;if(sz){size=+sz.dataset.size;SEL[d.add]=size}else{const bx=document.getElementById('sz');size=bx&&bx.dataset.pid===d.add?(SEL[d.add]??defSize(x.byId(d.add))):d.vi!==undefined?+d.vi:defSize(x.byId(d.add))}const c=cart();const l=c.find(i=>i.id===d.add&&i.size===size&&!i.free&&!i.d);l?l.qty++:c.push({id:d.add,size,qty:1});S.set('cart',c);toast(u().okAdd);route(1)}
else if('redeem' in d){const c=cart();if(inCart(DATA.free)+1>limitOf(DATA.free)){toast(u().over(x.byId(DATA.free).name,limitOf(DATA.free)));return}if(x.pts()-x.GOAL*c.filter(l=>l.free).length>=x.GOAL){c.push({id:DATA.free,size:0,qty:1,free:true});S.set('cart',c);toast(u().rd);route(1)}}
else if(d.combo){const c=cart(),bd=x.COMBOS.find(k=>k.id===d.combo).items.find(([id])=>inCart(id)+1>limitOf(id));if(bd){toast(u().over(x.byId(bd[0]).name,limitOf(bd[0])));return}x.COMBOS.find(k=>k.id===d.combo).items.forEach(([id,i])=>{const l=c.find(z=>z.id===id&&z.size===i&&!z.free&&z.cb===d.combo);l?l.qty++:c.push({id,size:i,qty:1,d:.1,cb:d.combo})});S.set('cart',c);toast(u().okAdd);route(1)}
else if(d.cat){x.setCat(d.cat);vt('filter',()=>route(1));const st=document.querySelector('.stick'),g=document.querySelector('.grid[class*=vw-]');if(st&&g){const y=g.getBoundingClientRect().top+scrollY-hh()-st.offsetHeight-8;if(scrollY>y)scrollTo(0,Math.max(0,y))}}
else if(d.o!==undefined){const bx=t.closest('#sz'),m=x.byId(bx.dataset.pid);bx.querySelectorAll('.chip[data-g="'+d.g+'"]').forEach(i=>i.setAttribute('aria-pressed',i===t));
 const cur=[...bx.querySelectorAll('fieldset')].map(f=>+f.querySelector('[aria-pressed=true]').dataset.o),vi=Math.max(0,m.vsel.findIndex(v=>v.every((n,i)=>n===cur[i])));SEL[m.id]=vi;
 const g=m.groups[+d.g],o=g.opts[+d.o],fs=t.closest('fieldset'),md=fs.querySelector('.mood'),nt=fs.querySelector('.onote');if(!o.mood){let n=nt;if(!n&&o.n){n=document.createElement('p');n.className='onote';n.setAttribute('aria-live','polite');fs.append(n)}if(n){n.textContent=o.n||'';n.classList.remove('pop');void n.offsetWidth;n.classList.add('pop')}}if(md&&o.mood){md.querySelector('.mf').innerHTML=face(o.mood);md.querySelector('small').textContent=o.h||'';md.classList.remove('pop');void md.offsetWidth;md.classList.add('pop')}
 const pr=document.getElementById('pr');if(pr)pr.textContent=x.money(x.unit(m,vi));const a=document.getElementById('actl');if(a)a.innerHTML=ctl(m,vi)}
else if(d.size){document.querySelectorAll('#sz button').forEach(i=>i.setAttribute('aria-pressed',i===t));const pr=document.getElementById('pr');if(pr)pr.textContent=d.p;const a=document.getElementById('actl');if(a){SEL[a.dataset.pid]=+d.size;a.innerHTML=ctl(x.byId(a.dataset.pid),+d.size)}}
else if(d.dec){const c=cart(),sz=d.sz===undefined?null:+d.sz,pick=dis=>{for(let i=c.length-1;i>=0;i--){const l=c[i];if(l.id===d.dec&&!l.free&&!!l.d===dis&&(sz===null||l.size===sz))return i}return -1};let i=pick(false);if(i<0)i=pick(true);if(i>=0){c[i].qty--;if(c[i].qty<1)c.splice(i,1)}S.set('cart',c);route(1)}
else if(d.ldec!==undefined){const c=cart(),i=+d.ldec;if(c[i]){c[i].qty--;if(c[i].qty<1)c.splice(i,1)}S.set('cart',c);route(1)}
else if(d.linc!==undefined){const c=cart(),l=c[+d.linc];if(!l)return;if(inCart(l.id)+1>limitOf(l.id)){toast(u().over(x.byId(l.id).name,limitOf(l.id)));return}l.qty++;S.set('cart',c);route(1)}
else if(d.rm!==undefined){const c=cart();c.splice(+d.rm,1);S.set('cart',c);route(1)}
else if('clear' in d){if(confirm(u().clr)){S.set('cart',[]);route(1)}}
else if(d.view){const o=['grid','list','compact','large'];setPref('view',matchMedia('(max-width:480px)').matches?o[(o.indexOf(view())+1)%4]:d.view);vt('filter',()=>route(1))}
else if('checkout' in d){if(!user()){location.hash='#/login';return}checkout(t)}
else if('logoutall' in d){api('/api/auth/logout-all',{}).then(async()=>{toast(u().x.allOk);await loadMe();location.hash='#/';route()})}
else if('logout' in d){api('/api/auth/logout',{}).then(async()=>{await loadMe();location.hash='#/';route()})}
else if(d.theme){setPref('theme',d.theme==='cycle'?(effTheme()==='dark'?'light':'dark'):d.theme);applyAll();route(1)}
else if(d.lang){S.set('lang',d.lang==='toggle'?(lang()==='fa'?'en':'fa'):d.lang);applyAll();route(1)}
});
document.addEventListener('change',e=>{const k=e.target.dataset.pref;if(!k)return;setPref(k,e.target.checked);applyAll();toast(u().saved)});
document.addEventListener('submit',async e=>{
const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();
const v=Object.fromEntries(new FormData(f)),k=f.dataset.form,er=f.querySelector('.err'),bad=i=>{er.textContent=u().bad[i]};
const em=(v.email||'').trim().toLowerCase(),sess=n=>({uid:n.id,name:n.name,email:n.email,exp:Date.now()+2592e6});
if(k==='settings'){await api('/api/me',{name:v.name},'PATCH');await loadMe();toast(u().saved);route();return}
const askWeak=p=>{er.textContent=u().x.weak;f.dataset.okweak=p;const b=f.querySelector('button.p');if(b)b.textContent=u().x.keep};
if(k==='reset'){const p=v.password||'';if(p.length<8){bad(1);return}const r=await api('/api/auth/reset',{token:f.dataset.token,password:p,...(f.dataset.okweak===p?{acceptWeak:true}:{})});
  if(r.error){if(r.error==='WEAK_PASSWORD'){askWeak(p);return}er.textContent=r.error==='SHORT_PASSWORD'?u().bad[1]:u().x.rstBad;return}toast(u().x.rstOk);location.hash='#/login';return}
if(k==='del'){if(v.confirm!=='DELETE'){er.textContent=u().x.delBad;return}const r=await api('/api/me/delete',{currentPassword:v.password,confirm:'DELETE'});
  if(r.error){er.textContent=u().x.delBad;return}toast(u().x.delOk);await loadMe();location.hash='#/';route();return}
if(!/^\S+@\S+\.\S+$/.test(em))return bad(0);
if(k==='forgot'){er.style.color='var(--brand)';return bad(5)}
if(!v.password||(k==='register'?v.password.length<8:v.password.length<1))return bad(1);
if(k==='register'&&!v.name.trim())return bad(2);
const r=await api('/api/auth/'+k,{email:em,password:v.password,name:(v.name||'').trim(),...(k==='register'&&f.dataset.okweak===v.password?{acceptWeak:true}:{})});
if(r.error==='WEAK_PASSWORD'&&k==='register'){askWeak(v.password);return}
if(r.error){er.textContent=({EMAIL_TAKEN:u().bad[3],INVALID_CREDENTIALS:u().bad[4],ACCOUNT_LOCKED:u().bad[4],RATE_LIMITED:u().x.busy,SHORT_PASSWORD:u().bad[1],WEAK_PASSWORD:u().x.weak,OTP_REQUIRED:u().x.otp,INVALID_OTP:u().x.otp})[r.error]||u().bad[0];return}
await loadMe();if(!user()){er.textContent=u().x.cookie;return}toast(u().ok);location.hash='#/profile'});
const sd=document.getElementById('sd'),si=document.getElementById('si'),sr=document.getElementById('sr');
const nz=t=>t.replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,'').toLowerCase();
const hay=(o,k)=>{const l=[LG.en[k].find(i=>i.id===o.id),LG.fa[k].find(i=>i.id===o.id)];return nz(l.map(i=>(i.name||i.title)+' '+i.desc+' '+(i.cat||'')+' '+i.id.replace(/-/g,' ')).join(' '))};
function doS(){const x=X(),q=nz(si.value.trim());
const m=x.MENU.filter(i=>!q||hay(i,'MENU').includes(q)).map(i=>['/item/'+i.id,i.name,i.cat]);
const c=q?x.CHALLENGES.filter(i=>hay(i,'CHALLENGES').includes(q)).map(i=>['/challenge/'+i.id,i.title,'']):[];
const r=[...m,...c].slice(0,8);
sr.innerHTML=r.length?r.map(([h,t,k])=>`<li><a class="li" href="#${h}" style="text-decoration:none">${t}<span class="muted">${k}</span></a></li>`).join(''):`<li class="muted" style="padding:16px 0">${ico('search','in')} ${u().st.nr}</li>`}
function openS(){if(sd.open)return;si.placeholder=u().st.ph;si.value='';doS();sd.showModal();si.focus()}
si.addEventListener('input',doS);
sr.addEventListener('click',()=>sd.close());
sd.addEventListener('click',e=>{if(e.target===sd)sd.close()});
sd.addEventListener('keydown',e=>{if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();const l=[si,...sr.querySelectorAll('a')],i=l.indexOf(document.activeElement);(l[i+(e.key==='ArrowDown'?1:-1)]||l[i]).focus()});
document.getElementById('sbtn').addEventListener('click',openS);
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openS()}});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(prefs().theme==='system')applyAll()});
window.addEventListener('hashchange',goRoute);addEventListener('resize',()=>{document.documentElement.style.setProperty('--hh',hh()+'px');moveInd(false)});addEventListener('load',()=>moveInd(false));S.set('cart',S.get('cart',[]).filter(l=>LG.en.byId(l.id)));applyAll();route();(()=>{try{const v=JSON.parse(sessionStorage.getItem('fika:pos')||'null');sessionStorage.removeItem('fika:pos');if(v&&v.h===location.hash&&v.y>0){scrollTo(0,v.y);requestAnimationFrame(()=>scrollTo(0,v.y))}}catch(e){}})();connectEvents();
