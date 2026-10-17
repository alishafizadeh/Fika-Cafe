'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=+process.env.PORT||3000,DB_FILE=process.env.DB_FILE||path.join(__dirname,'data','db.json'),PUB=path.join(__dirname,'public');
const now=()=>new Date().toISOString(),uid=p=>p+crypto.randomBytes(12).toString('hex'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
class E extends Error{constructor(s,c){super(c);this.s=s}}
const SC={N:65536,r:8,p:2},MM=256<<20;
const scA=(p,s,o)=>new Promise((ok,no)=>crypto.scrypt(p,s,64,{...o,maxmem:MM},(e,k)=>e?no(e):ok(k)));
function hashPw(p){const s=crypto.randomBytes(16);return`s2:${SC.N}:${SC.r}:${SC.p}:${s.toString('hex')}:${crypto.scryptSync(p,s,64,{...SC,maxmem:MM}).toString('hex')}`}
async function hashPwA(p){const s=crypto.randomBytes(16);return`s2:${SC.N}:${SC.r}:${SC.p}:${s.toString('hex')}:${(await scA(p,s,SC)).toString('hex')}`}
// accepts the old format (salt:hash, N=16384) as well; needsRehash() upgrades it at the next successful login
async function checkPw(p,h){const a=String(h).split(':');let o,s,k;if(a[0]==='s2'){o={N:+a[1],r:+a[2],p:+a[3]};s=a[4];k=a[5]}else{o={N:16384,r:8,p:1};s=a[0];k=a[1]}
  const d=await scA(p,Buffer.from(s,'hex'),o),e=Buffer.from(k||'','hex');return d.length===e.length&&crypto.timingSafeEqual(d,e)}
const needsRehash=h=>!String(h).startsWith('s2:'+SC.N+':'+SC.r+':'+SC.p+':');
const DUMMY=hashPw('dummy-password-for-unknown-accounts');
// ---- storage: one JSON file. Node is single-threaded and every mutation below is synchronous,
// so each request is atomic; writes go to a temp file then rename (crash-safe).
const FOREVER=4102444800000,SEEDP=process.env.SEED_FILE||path.join(__dirname,'seed.json');
// ---- data key (AES-256-GCM) for 2FA secrets and backups: DATA_KEY env, or a random key file next to the database (mode 600)
const KEYF=DB_FILE+'.key';let DKEY;
function dataKey(){if(DKEY)return DKEY;
  if(process.env.DATA_KEY)DKEY=crypto.createHash('sha256').update(process.env.DATA_KEY).digest();
  else{fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});if(!fs.existsSync(KEYF))fs.writeFileSync(KEYF,crypto.randomBytes(32).toString('hex'),{mode:0o600});DKEY=Buffer.from(fs.readFileSync(KEYF,'utf8').trim(),'hex')}return DKEY}
const enc=t=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',dataKey(),iv),b=Buffer.concat([c.update(t),c.final()]);return Buffer.concat([iv,c.getAuthTag(),b])};
const dec=b=>{const d=crypto.createDecipheriv('aes-256-gcm',dataKey(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()])};
// ---- security log: JSON lines in data/security.log (no passwords, tokens or full e-mails). Lockouts and alerts also go to the console.
const LOGF=path.join(path.dirname(DB_FILE),'security.log'),failWin=[];let logN=0,lastAlert=0;
const mEmail=e=>{e=String(e||'');const i=e.indexOf('@');return i<1?'***':e[0]+'***'+e.slice(i)};
function slog(ev,o={}){const l={at:now(),ev,...o};if(l.email)l.email=mEmail(l.email);const t=JSON.stringify(l);
  try{fs.mkdirSync(path.dirname(LOGF),{recursive:true});if(++logN%200===0&&fs.statSync(LOGF).size>5e6)fs.renameSync(LOGF,LOGF+'.1');fs.appendFileSync(LOGF,t+'\n',{mode:0o600})}catch{}
  if(['lockout','ALERT','setup','account_delete'].includes(ev))console.log('[security] '+t)}
let db;const setupCode=crypto.randomBytes(4).toString('hex');
function save(){const t=DB_FILE+'.tmp';fs.writeFileSync(t,JSON.stringify(db),{mode:0o600});fs.renameSync(t,DB_FILE)}
let dirty=false;setInterval(()=>{if(dirty){dirty=false;try{save()}catch(e){console.error('save failed',e.message)}}},5000).unref();
function init(){
  fs.mkdirSync(path.dirname(DB_FILE),{recursive:true});
  if(fs.existsSync(DB_FILE))db=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));
  else{db=JSON.parse(fs.readFileSync(SEEDP,'utf8'));
    Object.assign(db,{users:[],sessions:{},orders:[],ledger:[],completions:[],inventoryTx:[],audit:[],analytics:[],kv:{},nextOrder:1001});
    const t=Date.now();db.challenges.forEach(c=>{c.startsAt=t;c.endsAt=c.permanent?FOREVER:t+7*864e5})}
  db.plays=db.plays||[];db.gameWeeks=db.gameWeeks||{};
  // Menu migration: when the bundled menu has a newer menuVersion, the old menu is replaced everywhere (products, categories, combos, reward item, challenge categories). Users, orders and points are kept.
  const SD=JSON.parse(fs.readFileSync(SEEDP,'utf8'));
  if(SD.menuVersion&&db.menuVersion!==SD.menuVersion){
    const LEG={coffee:'espresso-bar'};for(const o of db.orders)for(const i of o.items){const k=i.catKey||catOf(i.productId);i.catKey=LEG[k]||k}
    db.cats=SD.cats;db.products=SD.products;db.combos=SD.combos||[];db.settings.freeItem=SD.settings.freeItem;
    const cof=(SD.challenges.find(c=>c.id==='first-coffee')||{rule:{}}).rule.catKey;
    for(const c of db.challenges)if(c.rule&&c.rule.catKey==='coffee'&&cof)c.rule.catKey=cof;
    db.menuVersion=SD.menuVersion;db.audit.push({id:uid('a_'),at:now(),actor:null,actorEmail:'system',action:'menu.replace',entity:'Menu',entityId:String(SD.menuVersion),before:null,after:{products:SD.products.length}});
    console.log('Menu updated: '+SD.products.length+' items in '+SD.cats.length+' categories')}
  // Enrich: bring older databases up to the bundled menu without touching what an admin edited.
  // (descriptions/artwork only fill empty fields; renames only apply to the exact old names; new items are added once.)
  const RENAME={sifano:['سیفانو'],campana:['کمپانا'],'vakan-matcha':['ماچا وکن'],'vakan-latte':['لاته وکن']};
  for(const sc of SD.cats){const c=db.cats.find(x=>x.key===sc.key);if(c&&sc.key==='vakan-bar'&&c.fa==='وکن بار'){c.fa=sc.fa;c.en=sc.en}}
  for(const sp of SD.products)if(!db.products.some(x=>x.id===sp.id))db.products.push(JSON.parse(JSON.stringify(sp)));
  for(const p of db.products){const s=SD.products.find(x=>x.id===p.id);if(!s)continue;
    if(RENAME[p.id]&&RENAME[p.id].includes(p.nameFa)){Object.assign(p,{nameEn:s.nameEn,nameFa:s.nameFa,descEn:s.descEn,descFa:s.descFa,art:s.art})}
    if(p.id==='quince-and-lime'&&p.nameEn==='Quince & Lime')p.nameEn=s.nameEn;
    if(!p.art&&s.art)p.art=s.art;if(!p.descEn&&s.descEn)p.descEn=s.descEn;if(!p.descFa&&s.descFa)p.descFa=s.descFa;
    if(s.groups&&(p.gv||0)<(s.gv||1)){const old=p.variants,oldG=JSON.stringify((p.groups||[]).map(g=>g.k)),same=oldG===JSON.stringify(s.groups.map(g=>g.k)),v0=old[0];
      p.groups=s.groups;p.gv=s.gv||1;
      p.variants=s.variants.map((sv,i)=>{const ov=same?old.find(o=>JSON.stringify(o.sel)===JSON.stringify(sv.sel)):(i===0?v0:null),b=ov||v0;
        return{...JSON.parse(JSON.stringify(sv)),price:b.price,stock:b.stock,available:b.available,active:b.active}})}}
  for(const sb of SD.beans||[])if(!(db.beans=db.beans||[]).some(b=>b.id===sb.id))db.beans.push(JSON.parse(JSON.stringify(sb)));
  if(!db.combosSeeded){if(!db.combos.length)db.combos=JSON.parse(JSON.stringify(SD.combos||[]));db.combosSeeded=true}
  if(!db.challenges.some(c=>c.id==='first-coffee')){const f=JSON.parse(fs.readFileSync(SEEDP,'utf8')).challenges.find(c=>c.id==='first-coffee');if(f)db.challenges.push({...f,startsAt:Date.now(),endsAt:FOREVER})}
  for(const k of Object.keys(db.sessions))if(db.sessions[k].exp<Date.now())delete db.sessions[k];
  // Operator recovery: when OWNER_EMAIL + OWNER_PASSWORD are set, that account is (re)created as OWNER with this password on every start.
  const eEmail=(process.env.OWNER_EMAIL||'').trim().toLowerCase(),ePw=(process.env.OWNER_PASSWORD||'').trim();
  if(eEmail&&ePw){if(ePw.length<(process.env.COOKIE_SECURE==='1'||process.env.ADMIN_STRICT==='1'?12:8)){console.error('OWNER_PASSWORD is too short (8+ characters locally, 12+ in public/strict mode)');process.exit(1)}
    let o=db.users.find(x=>x.email===eEmail);
    if(!o){o={id:uid('u_'),name:'Owner',email:eEmail,createdAt:now(),lastLoginAt:null};db.users.push(o)}
    Object.assign(o,{role:'OWNER',active:true,fails:0,lockedUntil:0,hash:hashPw(ePw)});if(process.env.RESET_OWNER_MFA==='1')delete o.totp;console.log('Owner account ready: '+eEmail)}
  if(!db.users.some(u=>u.role==='OWNER'))console.log(`\nNo owner account yet. Open http://localhost:${PORT}/admin.html and create it there.\nSetup code (needed when you open the page from the internet or another computer, e.g. on Render): ${setupCode}\n`);
  save();maintain();setInterval(maintain,216e5).unref()}
// ---- helpers
const clients=new Map(),hits=new Map();setInterval(()=>{const t=Date.now();for(const[k,h]of hits)if(h.r<t)hits.delete(k)},6e4).unref();
// ---- network helpers. TRUST_PROXY=1 only when a reverse proxy you control sits in front (it must set X-Forwarded-For / X-Forwarded-Proto).
// TRUST_PROXY=N: number of trusted proxy hops in front of the app (1 = one proxy such as Caddy/nginx; Render may need 2, see README). 0/unset = trust nothing.
const TRUST_HOPS=Math.max(0,parseInt(process.env.TRUST_PROXY,10)||0),TRUST_PROXY=TRUST_HOPS>0;
const ipOf=req=>{if(TRUST_PROXY){const p=String(req.headers['x-forwarded-for']||'').split(',').map(x=>x.trim()).filter(Boolean);if(p.length)return p[Math.max(0,p.length-TRUST_HOPS)]}return req.socket.remoteAddress||''};
const isHttps=req=>!!req.socket.encrypted||(TRUST_PROXY&&req.headers['x-forwarded-proto']==='https');
const isLocalHost=req=>/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host||'');
// Secure (+__Host-) cookies whenever the connection is https (directly, or via a trusted proxy) or COOKIE_SECURE=1. A browser silently drops Secure cookies on plain http,
// so on http (localhost, or a phone on the local network) the cookie is a normal HttpOnly+SameSite one; COOKIE_SECURE=0 forces that.
const secureOf=req=>process.env.COOKIE_SECURE==='1'||(process.env.COOKIE_SECURE!=='0'&&isHttps(req));
const cookieSid=req=>{const l=(req.headers.cookie||'').split(/;\s*/);const c=l.find(x=>x.startsWith('__Host-sid='))||l.find(x=>x.startsWith('sid='));return c?c.slice(c.indexOf('=')+1):null};
// Events are public pings. A user id is only ever sent to that user's own browser; staff get a placeholder.
const emit=(type,u)=>{for(const[r,c]of clients){let id=null;if(u){if(c.uid===u)id=u;else if(c.staff)id='-';else continue}
  try{r.write(`data: ${JSON.stringify({type,uid:id})}\n\n`)}catch{}}};
function limit(k,max,ms){const t=Date.now(),h=hits.get(k);if(!h||h.r<t){hits.set(k,{n:1,r:t+ms});return}if(++h.n>max)throw new E(429,'RATE_LIMITED')}
const str=(v,max=200)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new E(400,'INVALID_INPUT');return v.trim()};
const int=(v,a,b)=>{if(!Number.isInteger(v)||v<a||v>b)throw new E(400,'INVALID_INPUT');return v};
const pub=u=>({id:u.id,name:u.name,email:u.email,role:u.role,mfa:!!(u.totp&&u.totp.on),mfaReq:STAFF.includes(u.role)&&MFA_ON(),strict:STRICT()});
const log=(u,action,entity,id,before,after)=>db.audit.push({id:uid('a_'),at:now(),actor:u.id,actorEmail:u.email,action,entity,entityId:id,before,after});
const balance=u=>db.ledger.reduce((a,l)=>a+(l.uid===u.id?l.points:0),0);
const catOf=pid=>(db.products.find(p=>p.id===pid)||{}).catKey;
// s = whoever holds the stock: the variant itself, or the shared specialty-bean pool (Ethiopia, Indonesia ...) it is brewed from.
const beanOf=id=>(db.beans||[]).find(b=>b.id===id);
const vIndex=()=>{const m=Object.create(null);db.products.forEach(p=>p.variants.forEach(v=>m[v.id]={p,v,s:(v.bean&&beanOf(v.bean))||v}));
  (db.beans||[]).forEach(b=>m['bean:'+b.id]={p:{id:'bean',nameEn:b.nameEn,nameFa:b.nameFa},v:b,s:b});return m};
// Sessions: customers idle 14 d / absolute 30 d; staff and owner idle 30 min / absolute 12 h.
const TTL=u=>STAFF.includes(u.role)?{idle:30*6e4,abs:12*36e5}:{idle:14*864e5,abs:30*864e5};
function getUser(req){const c=cookieSid(req);if(!c)return null;const k=sha(c),s=db.sessions[k];if(!s)return null;
  const u=db.users.find(x=>x.id===s.uid);if(!u||!u.active)return null;
  const t=Date.now(),cr=s.cr||s.exp-30*864e5,last=s.last||cr,L=TTL(u);
  if(t>cr+L.abs||t>last+L.idle||s.exp<t){delete db.sessions[k];return null}
  s.last=t;return u}
function startSession(req,res,u){const t=crypto.randomBytes(32).toString('base64url'),n=Date.now(),L=TTL(u);
  const mine=Object.keys(db.sessions).filter(k=>db.sessions[k].uid===u.id).sort((a,b)=>(db.sessions[a].cr||0)-(db.sessions[b].cr||0));
  mine.slice(0,Math.max(0,mine.length-9)).forEach(k=>delete db.sessions[k]);
  db.sessions[sha(t)]={uid:u.id,cr:n,last:n,exp:n+L.abs};
  const sec=secureOf(req);res.setHeader('Set-Cookie',`${sec?'__Host-sid':'sid'}=${t}; HttpOnly; ${sec?'Secure; ':''}SameSite=Lax; Path=/; Max-Age=${Math.floor(L.abs/1000)}`)}
const killSessions=(id,keep)=>{for(const k of Object.keys(db.sessions))if(db.sessions[k].uid===id&&k!==keep)delete db.sessions[k]};
const clearCookies=res=>res.setHeader('Set-Cookie',['sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0','__Host-sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0']);
const orderOut=o=>({id:o.id,n:o.n,status:o.status,createdAt:o.createdAt,total:o.total,subtotal:o.subtotal,discount:o.discount,pts:o.pts,
  lines:o.items.map(i=>({id:i.productId,size:i.size,qty:i.qty,free:i.free,d:i.disc?1:0,name:i.name,unitPrice:i.unitPrice}))});
const stateOf=u=>({points:balance(u),redeemed:-db.ledger.filter(l=>l.uid===u.id&&l.type==='REDEMPTION').reduce((a,l)=>a+l.points,0)/db.settings.goal,
  orders:db.orders.filter(o=>o.uid===u.id).map(orderOut).reverse(),favs:((db.kv[u.id]||{}).favs||[]).filter(f=>db.products.some(p=>p.id===f))});
const inCat=(i,k)=>{const c=catOf(i.productId)||i.catKey;return Array.isArray(k)?k.includes(c):c===k};
function progress(u,c){const os=db.orders.filter(o=>o.uid===u.id&&o.status==='COMPLETED'&&o.t>=c.startsAt);
  if(c.rule.type==='orders')return os.length;
  const s=new Set();os.forEach(o=>o.items.forEach(i=>{if(!i.free&&inCat(i,c.rule.catKey))s.add(i.productId)}));return s.size}
function award(u){const t=Date.now();for(const c of db.challenges){
  if(!c.active||c.startsAt>t||c.endsAt<t||db.completions.some(x=>x.uid===u.id&&x.cid===c.id))continue;
  if(c.rule.firstOnly&&db.orders.filter(o=>o.uid===u.id&&o.status==='COMPLETED'&&o.items.some(i=>!i.free&&inCat(i,c.rule.catKey))).length!==1)continue;
  if(progress(u,c)>=c.goal){db.completions.push({uid:u.id,cid:c.id,at:now()});db.ledger.push({id:uid('l_'),uid:u.id,type:'CHALLENGE',points:c.pts,ref:c.id,at:now()})}}}
// ---- orders: every number is computed here, the client only names items
function placeOrder(u,body){
  limit('ord:'+u.id,30,36e5);
  if(db.orders.filter(o=>o.uid===u.id&&o.status==='PENDING').length>=5)throw new E(429,'TOO_MANY_PENDING');
  const S=db.settings,lines=body.lines;
  if(!Array.isArray(lines)||!lines.length||lines.length>30)throw new E(400,'INVALID_INPUT');
  const idx=vIndex(),need=Object.create(null),paid=Object.create(null),cmb=Object.create(null),cids=new Set(db.combos.map(c=>c.id));let freeQty=0;
  for(const l of lines){if(!l||typeof l!=='object')throw new E(400,'INVALID_INPUT');str(l.variantId,60);int(l.qty,1,20);const r=idx[l.variantId];
    if(l.comboId!==undefined&&(typeof l.comboId!=='string'||!cids.has(l.comboId)))throw new E(400,'INVALID_COMBO');
    if(!r||!r.p.active||!r.v.active)throw new E(400,'INVALID_ITEM');
    need[l.variantId]=(need[l.variantId]||0)+l.qty;
    if(l.free){if(l.variantId!==S.freeItem)throw new E(400,'INVALID_ITEM');freeQty+=l.qty}
    else{paid[l.variantId]=(paid[l.variantId]||0)+l.qty;if(l.comboId){const m=cmb[l.comboId]=cmb[l.comboId]||Object.create(null);m[l.variantId]=(m[l.variantId]||0)+l.qty}}}
  const tot=new Map();for(const id in need){const h=idx[id].s;tot.set(h,(tot.get(h)||0)+need[id])}
  for(const id in need){const{v,s:h}=idx[id];if(!v.available||!h.available||h.stock<tot.get(h))throw new E(409,'OUT_OF_STOCK:'+idx[id].p.id)}
  if(freeQty*S.goal>balance(u))throw new E(409,'NOT_ENOUGH_POINTS');
  const disc=Object.create(null);for(const cid in cmb){const c=db.combos.find(x=>x.id===cid);if(!c)throw new E(400,'INVALID_COMBO');
    const ids=c.items.map(([p,i])=>p+':'+i),K=Math.min(...ids.map(i=>cmb[cid][i]||0));if(K)ids.forEach(i=>disc[i]=(disc[i]||0)+K)}
  let subtotal=0,discount=0;const items=[];
  for(const id in need){const{p,v}=idx[id],fq=lines.filter(l=>l.free&&l.variantId===id).reduce((a,l)=>a+l.qty,0),pq=paid[id]||0,du=Math.min(disc[id]||0,pq),per=Math.round(v.price*S.comboDiscount);
    subtotal+=v.price*pq;discount+=per*du;
    if(pq)items.push({productId:p.id,catKey:p.catKey,variantId:id,size:+id.split(':')[1],name:p.nameEn+' ('+v.labelEn+')',qty:pq,unitPrice:v.price,disc:per*du,free:false});
    if(fq)items.push({productId:p.id,catKey:p.catKey,variantId:id,size:+id.split(':')[1],name:p.nameEn+' ('+v.labelEn+')',qty:fq,unitPrice:0,disc:0,free:true})}
  const total=subtotal-discount,pts=Math.floor(total/S.tomanPerPoint),n=db.nextOrder++,t=Date.now();
  const o={id:uid('o_'),n,uid:u.id,status:'PENDING',subtotal,discount,total,pts,items,createdAt:now(),t};db.orders.push(o);
  for(const id in need){const h=idx[id].s;h.stock-=need[id];db.inventoryTx.push({id:uid('t_'),variantId:h===idx[id].v?id:'bean:'+h.id,type:'SALE',qty:-need[id],reason:'order '+n+(h===idx[id].v?'':' ('+idx[id].p.nameEn+')'),by:u.id,at:now()})}
  if(freeQty)db.ledger.push({id:uid('l_'),uid:u.id,type:'REDEMPTION',points:-S.goal*freeQty,ref:o.id,at:now()});
  db.analytics.push({type:'order_completed',uid:u.id,at:now(),orderId:o.id,total});save();emit('inventory');emit('order');return{order:orderOut(o),state:stateOf(u)}}
function setStatus(a,o,status){
  if(!['PENDING','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'].includes(status))throw new E(400,'INVALID_INPUT');
  const before=o.status;if(before===status)return;
  if(status==='CANCELLED'){const idx=vIndex();o.items.forEach(i=>{const r=idx[i.variantId];if(r){r.s.stock+=i.qty;db.inventoryTx.push({id:uid('t_'),variantId:r.s===r.v?i.variantId:'bean:'+r.s.id,type:'CANCELLED_ORDER',qty:i.qty,reason:'order '+o.n,by:a.id,at:now()})}});
    db.ledger.filter(l=>l.ref===o.id).forEach(l=>db.ledger.push({id:uid('l_'),uid:l.uid,type:'ADJUSTMENT',points:-l.points,ref:o.id,at:now()}))}
  if(before==='CANCELLED')throw new E(409,'ALREADY_CANCELLED');
  o.status=status;
  if(status==='COMPLETED'&&!db.ledger.some(l=>l.type==='ORDER'&&l.ref===o.id)){const cu=db.users.find(x=>x.id===o.uid);
    if(cu&&o.pts)db.ledger.push({id:uid('l_'),uid:cu.id,type:'ORDER',points:o.pts,ref:o.id,at:now()});if(cu)award(cu)}
  o.status=status;log(a,'order.status','Order',o.id,{status:before},{status});save();emit('inventory');emit('order',o.uid)}
// ---- routes
const routes=[],on=(m,p,roles,fn)=>routes.push({m,re:new RegExp('^'+p.replace(/:(\w+)/g,'(?<$1>[^/]+)')+'$'),roles,fn});
const STAFF=['STAFF','OWNER','ADMIN'],OWN=['OWNER','ADMIN'];
const hadIn=(u,k)=>u&&db.orders.some(o=>o.uid===u.id&&o.status!=='CANCELLED'&&o.items.some(i=>!i.free&&inCat(i,k)));
const eligible=(u,c)=>!(c.rule&&c.rule.firstOnly)||!hadIn(u,c.rule.catKey);
const bootstrap=u=>{const cs=db.challenges.filter(c=>c.active&&eligible(u,c)).map(c=>({...c,daysLeft:c.endsAt>=FOREVER?9999:Math.max(0,Math.ceil((c.endsAt-Date.now())/864e5))}));
  return{cats:db.cats,menu:db.products.filter(p=>p.active).map(p=>p.variants.some(v=>v.bean)?{...p,variants:p.variants.map(v=>{const b=v.bean&&beanOf(v.bean);return b?{...v,stock:b.stock,available:v.available&&b.available,lowStock:b.lowStock}:v})}:p),beans:(db.beans||[]).map(b=>({id:b.id,nameEn:b.nameEn,nameFa:b.nameFa,notesEn:b.notesEn,notesFa:b.notesFa,available:b.available&&b.stock>0})),challenges:cs,combos:db.combos,cafe:db.cafe,goal:db.settings.goal,free:String(db.settings.freeItem).split(':')[0],rate:db.settings.comboDiscount,me:u?pub(u):null,state:u?stateOf(u):null}};
on('GET','/api/bootstrap',null,({u})=>bootstrap(u));
const sseIp=new Map();
on('GET','/api/events',null,({req,res,u})=>{const ip=ipOf(req);if(clients.size>=500||(sseIp.get(ip)||0)>=8)throw new E(429,'RATE_LIMITED');sseIp.set(ip,(sseIp.get(ip)||0)+1);
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store',Connection:'keep-alive'});res.write(':ok\n\n');clients.set(res,{uid:u?u.id:null,staff:!!u&&STAFF.includes(u.role)});
  const h=setInterval(()=>res.write(':hb\n\n'),25000);req.on('close',()=>{clients.delete(res);clearInterval(h);const n=(sseIp.get(ip)||1)-1;n?sseIp.set(ip,n):sseIp.delete(ip)});return undefined});
const COMMON=new Set(['password','password1','password123','12345678','123456789','1234567890','12341234','123123123','987654321','qwertyuiop','qwerty123','iloveyou','admin123','welcome1','letmein123','abc12345','abcd1234','11111111','00000000','passw0rd','p@ssw0rd','asdfghjkl','zxcvbnm123','1q2w3e4r','1qaz2wsx','q1w2e3r4','aa123456','a1234567','qazwsxedc','fika1234','coffee123','cafe1234','fikafika','cafecafe']);
// Breached-password check (k-anonymity: only the first 5 characters of the SHA-1 leave the server). Fails open if the service is unreachable; HIBP=0 disables it.
async function pwned(pw){if(process.env.HIBP==='0')return false;
  try{const h=crypto.createHash('sha1').update(pw).digest('hex').toUpperCase(),r=await fetch('https://api.pwnedpasswords.com/range/'+h.slice(0,5),{headers:{'Add-Padding':'true'},signal:AbortSignal.timeout(2000)});
    if(!r.ok)return false;return(await r.text()).split('\n').some(l=>{const[a,n]=l.trim().split(':');return a===h.slice(5)&&+n>0})}catch{return false}}
// Password policy (security.md S12): customers >= 10, staff/owner >= 12 (with enforced 2FA), up to 128, no composition rules, common/breached/e-mail-based passwords refused.
// Customers: 8+ characters is enough; an easy/common/breached password only produces a warning they may confirm (accept=true). Staff: 12+ and no weak passwords at all.
// STRICT = public/production mode (COOKIE_SECURE=1 or ADMIN_STRICT=1): staff need 12+ chars, no easy passwords, and 2FA. Local mode: staff behave like customers (8+, easy password = warning) and 2FA is optional.
const STRICT=()=>process.env.COOKIE_SECURE==='1'||process.env.ADMIN_STRICT==='1',MFA_ON=()=>process.env.ADMIN_MFA==='on'||(STRICT()&&process.env.ADMIN_MFA!=='off');
async function policy(pw,email,role,accept){const staff=STAFF.includes(role)&&STRICT(),l=String(pw).toLowerCase(),loc=String(email||'').split('@')[0].toLowerCase();
  if(typeof pw!=='string'||pw.length<(staff?12:8)||pw.length>128)throw new E(400,staff?'WEAK_PASSWORD':'SHORT_PASSWORD');
  const weak=COMMON.has(l)||/(password|passw0rd|qwerty|123456|abcdef|letmein)/.test(l)||/^(.)\1+$/.test(pw)||(loc.length>=4&&l.includes(loc))||await pwned(pw);
  if(weak&&!(accept===true&&!staff))throw new E(400,'WEAK_PASSWORD')}
// ---- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) + single-use recovery codes
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',b32=b=>{let bits='',o='';for(const x of b)bits+=x.toString(2).padStart(8,'0');for(let i=0;i<bits.length;i+=5)o+=B32[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)];return o};
const hotp=(key,c)=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(c));const h=crypto.createHmac('sha1',key).update(b).digest(),o=h[19]&15;return String(((h[o]&127)<<24|h[o+1]<<16|h[o+2]<<8|h[o+3])%1e6).padStart(6,'0')};
function otpOk(u,code){const t=u.totp;if(!t||!code)return false;
  if(/^\d{6}$/.test(code)){const key=dec(Buffer.from(t.secret,'base64')),st=Math.floor(Date.now()/3e4);
    for(let d=-1;d<=1;d++){const c=st+d;if(c>(t.last||0)&&hotp(key,c)===code){t.last=c;return true}}return false}
  const h=sha(code.toLowerCase()),i=(t.rec||[]).indexOf(h);if(i>=0){t.rec.splice(i,1);return true}return false}
// ---- login throttling: per account (or per unknown e-mail, in memory) AND per IP. 5 failures inside 15 min lock for 15 min, doubling each time up to 24 h.
const ghosts=new Map();
const lockRec=(u,email)=>{if(u)return u;let g=ghosts.get(email);if(!g){if(ghosts.size>5000)ghosts.clear();g={fails:0,lockedUntil:0,lockN:0,failAt:0};ghosts.set(email,g)}return g};
function noteFail(L,u,email,req,why){const t=Date.now();if(t-(L.failAt||0)>9e5)L.fails=0;L.failAt=t;L.fails=(L.fails||0)+1;
  slog('login_fail',{uid:u&&u.id,email,ip:ipOf(req),why,rid:req.rid});failWin.push(t);while(failWin.length&&failWin[0]<t-6e5)failWin.shift();
  if(failWin.length>=30&&t-lastAlert>6e5){lastAlert=t;slog('ALERT',{msg:'30+ failed logins in 10 minutes',ip:ipOf(req)})}
  if(L.fails>=5){L.lockN=(L.lockN||0)+1;L.lockedUntil=t+Math.min(9e5*2**(L.lockN-1),864e5);L.fails=0;slog('lockout',{uid:u&&u.id,email,ip:ipOf(req),minutes:Math.round((L.lockedUntil-t)/6e4)})}
  if(u)save()}
on('POST','/api/auth/register',null,async({body,req,res})=>{limit('reg:'+ipOf(req),10,36e5);
  const email=str(body.email,200).toLowerCase(),name=str(body.name,80),pw=str(body.password,128);
  if(!/^\S+@\S+\.\S+$/.test(email))throw new E(400,'INVALID_INPUT');await policy(pw,email,'CUSTOMER',body.acceptWeak===true);
  if(db.users.some(x=>x.email===email))throw new E(409,'EMAIL_TAKEN');
  const hash=await hashPwA(pw);if(db.users.some(x=>x.email===email))throw new E(409,'EMAIL_TAKEN');
  const u={id:uid('u_'),name,email,hash,role:'CUSTOMER',active:true,fails:0,lockedUntil:0,createdAt:now(),lastLoginAt:now()};
  db.users.push(u);startSession(req,res,u);save();return pub(u)});
on('POST','/api/auth/login',null,async({body,req,res})=>{limit('login:'+ipOf(req),30,9e5);
  const email=str(body.email,200).toLowerCase(),pw=str(body.password,128),u=db.users.find(x=>x.email===email),L=lockRec(u,email);
  const ok=await checkPw(pw,u?u.hash:DUMMY);   // always exactly one hash: unknown e-mails and locked accounts cost the same time
  if(L.lockedUntil>Date.now()){slog('login_blocked',{uid:u&&u.id,email,ip:ipOf(req),rid:req.rid});throw new E(401,'INVALID_CREDENTIALS')}
  if(!u||!u.active||!ok){noteFail(L,u,email,req,u?'bad_password':'unknown');throw new E(401,'INVALID_CREDENTIALS')}
  if(u.totp&&u.totp.on){const otp=typeof body.otp==='string'?body.otp.trim():'';if(!otp)throw new E(401,'OTP_REQUIRED');
    if(!otpOk(u,otp)){noteFail(L,u,email,req,'bad_otp');throw new E(401,'INVALID_OTP')}}
  L.fails=0;L.lockedUntil=0;L.lockN=0;if(needsRehash(u.hash))u.hash=await hashPwA(pw);
  u.lastLoginAt=now();startSession(req,res,u);save();slog('login',{uid:u.id,ip:ipOf(req)});return pub(u)});
on('POST','/api/auth/logout',null,({req,res})=>{const c=cookieSid(req);if(c){delete db.sessions[sha(c)];save()}clearCookies(res);return{ok:true}});
on('POST','/api/auth/logout-all',[],({u,res})=>{killSessions(u.id);save();slog('logout_all',{uid:u.id});clearCookies(res);return{ok:true}});
on('POST','/api/auth/reset',null,async({body,req})=>{limit('rst:'+ipOf(req),10,36e5);
  const tok=str(body.token,100),pw=str(body.password,128),k=sha(tok),r=(db.resets||{})[k],bad=()=>{slog('reset_fail',{ip:ipOf(req),rid:req.rid});return new E(400,'INVALID_RESET')};
  if(!r||r.exp<Date.now())throw bad();const t=db.users.find(x=>x.id===r.uid);if(!t)throw bad();
  await policy(pw,t.email,t.role,body.acceptWeak===true);const h=await hashPwA(pw);if(!db.resets[k])throw bad();   // single use, also against two parallel requests
  delete db.resets[k];t.hash=h;t.fails=0;t.lockedUntil=0;t.lockN=0;killSessions(t.id);save();slog('password_reset',{uid:t.id,ip:ipOf(req)});return{ok:true}});
on('PATCH','/api/me',[],({u,body})=>{u.name=str(body.name,80);save();return pub(u)});
on('PUT','/api/me/favs',[],({u,body})=>{if(!Array.isArray(body.favs)||body.favs.length>200)throw new E(400,'INVALID_INPUT');
  const ok=body.favs.filter(f=>db.products.some(p=>p.id===f));(db.kv[u.id]=db.kv[u.id]||{}).favs=ok;save();return{favs:ok}});
const needsSetup=()=>!db.users.some(x=>x.role==='OWNER');
const EMAIL_RE=/^\S+@\S+\.\S+$/;
on('GET','/api/setup',null,()=>({needed:needsSetup(),strict:STRICT()}));
on('POST','/api/setup',null,async({body,req,res})=>{limit('setup:'+ipOf(req),10,9e5);
  if(!needsSetup())throw new E(409,'ALREADY_SETUP');
  const ra=req.socket.remoteAddress||'',local=/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(ra)&&isLocalHost(req)&&!['x-forwarded-for','x-forwarded-host','forwarded','via','x-real-ip'].some(h=>req.headers[h]);
  if(!local){const c=Buffer.from(String(body.code||'')),k=Buffer.from(setupCode);if(c.length!==k.length||!crypto.timingSafeEqual(c,k))throw new E(403,'SETUP_CODE')}
  const email=str(body.email,200).toLowerCase(),name=str(body.name||'Owner',80),pw=str(body.password,128);
  if(!EMAIL_RE.test(email))throw new E(400,'INVALID_INPUT');await policy(pw,email,'OWNER',body.acceptWeak===true);
  if(db.users.some(x=>x.email===email)||!needsSetup())throw new E(409,'EMAIL_TAKEN');
  const u={id:uid('u_'),name,email,hash:await hashPwA(pw),role:'OWNER',active:true,fails:0,lockedUntil:0,createdAt:now(),lastLoginAt:now()};
  if(!needsSetup())throw new E(409,'ALREADY_SETUP');db.users.push(u);startSession(req,res,u);log(u,'owner.setup','user',u.id,null,{email});slog('setup',{uid:u.id,ip:ipOf(req)});save();return pub(u)});
// Change own name / email / password. Always needs the current password; other sessions are signed out when the password changes.
on('PATCH','/api/me/account',[],async({u,body,req})=>{limit('acct:'+u.id,10,9e5);
  if(typeof body.currentPassword!=='string'||!await checkPw(body.currentPassword,u.hash)){slog('reauth_fail',{uid:u.id,ip:ipOf(req)});throw new E(403,'WRONG_PASSWORD')}
  const before={name:u.name,email:u.email};let nh=null,ne=null,nn=null;
  if(body.name!==undefined)nn=str(body.name,80);
  if(body.email!==undefined){ne=str(body.email,200).toLowerCase();if(!EMAIL_RE.test(ne))throw new E(400,'INVALID_INPUT');if(db.users.some(x=>x.email===ne&&x.id!==u.id))throw new E(409,'EMAIL_TAKEN')}
  if(body.newPassword!==undefined){const p=str(body.newPassword,128);await policy(p,ne||u.email,u.role,body.acceptWeak===true);nh=await hashPwA(p)}
  if(nn!==null)u.name=nn;if(ne!==null)u.email=ne;
  if(nh){u.hash=nh;killSessions(u.id,cookieSid(req)&&sha(cookieSid(req)));slog('password_change',{uid:u.id,ip:ipOf(req)})}
  if(ne&&ne!==before.email)slog('email_change',{uid:u.id,email:ne,ip:ipOf(req)});
  if(STAFF.includes(u.role))log(u,'account.update','user',u.id,before,{name:u.name,email:u.email,passwordChanged:nh!==null});
  save();return pub(u)});
const pwCheck=async(u,v)=>{if(typeof v!=='string'||!await checkPw(v,u.hash))throw new E(403,'WRONG_PASSWORD')};
on('POST','/api/me/2fa/setup',[],async({u,body})=>{limit('acct:'+u.id,10,9e5);await pwCheck(u,body.currentPassword);if(u.totp&&u.totp.on)throw new E(409,'ALREADY_ON');
  const raw=crypto.randomBytes(20);u.totp={secret:enc(raw).toString('base64'),on:false,last:0};save();const sec=b32(raw);
  return{secret:sec,uri:`otpauth://totp/Fika:${encodeURIComponent(u.email)}?secret=${sec}&issuer=Fika`}});
on('POST','/api/me/2fa/enable',[],({u,body,req})=>{limit('otp:'+u.id,10,9e5);if(!u.totp||u.totp.on)throw new E(409,'NOT_PENDING');
  if(!otpOk(u,String(body.code||'').trim()))throw new E(400,'INVALID_OTP');
  const codes=Array.from({length:8},()=>crypto.randomBytes(5).toString('hex'));u.totp.on=true;u.totp.rec=codes.map(sha);
  slog('2fa_enable',{uid:u.id,ip:ipOf(req)});if(STAFF.includes(u.role))log(u,'2fa.enable','user',u.id,null,null);save();return{codes}});
on('POST','/api/me/2fa/disable',[],async({u,body,req})=>{limit('otp:'+u.id,10,9e5);await pwCheck(u,body.currentPassword);if(!u.totp||!u.totp.on)throw new E(409,'NOT_ON');
  if(!otpOk(u,String(body.code||'').trim()))throw new E(400,'INVALID_OTP');delete u.totp;slog('2fa_disable',{uid:u.id,ip:ipOf(req)});if(STAFF.includes(u.role))log(u,'2fa.disable','user',u.id,null,null);save();return{ok:true}});
// Delete my account: personal data goes, past orders stay only as anonymous sales records.
function wipeUser(u){const id=u.id;killSessions(id);db.users=db.users.filter(x=>x.id!==id);delete db.kv[id];
  db.ledger=db.ledger.filter(l=>l.uid!==id);db.completions=db.completions.filter(c=>c.uid!==id);db.plays=db.plays.filter(p=>p.uid!==id);
  db.analytics.forEach(a=>{if(a.uid===id)a.uid=null});db.orders.forEach(o=>{if(o.uid===id)o.uid=null});
  for(const k of Object.keys(db.resets||{}))if(db.resets[k].uid===id)delete db.resets[k];for(const[k,v]of gsess)if(v.uid===id)gsess.delete(k);
  slog('account_delete',{uid:id});save()}
on('POST','/api/me/delete',[],async({u,body,res})=>{limit('acct:'+u.id,10,9e5);if(body.confirm!=='DELETE')throw new E(400,'INVALID_INPUT');await pwCheck(u,body.currentPassword);
  if(u.role==='OWNER'&&db.users.filter(x=>x.role==='OWNER'&&x.active).length<2)throw new E(409,'LAST_OWNER');wipeUser(u);clearCookies(res);return{ok:true}});
const PUBLIC_URL=(process.env.PUBLIC_URL||'').replace(/\/$/,'');
on('POST','/api/admin/users/reset-link',OWN,({u,body})=>{const email=str(body.email,200).toLowerCase(),t=db.users.find(x=>x.email===email);if(!t)throw new E(404,'NOT_FOUND');
  if(t.role!=='CUSTOMER'&&t.id!==u.id)throw new E(403,'FORBIDDEN');
  const tok=crypto.randomBytes(32).toString('base64url');db.resets=db.resets||{};for(const k of Object.keys(db.resets))if(db.resets[k].uid===t.id||db.resets[k].exp<Date.now())delete db.resets[k];
  db.resets[sha(tok)]={uid:t.id,exp:Date.now()+30*6e4};log(u,'user.reset-link','User',t.id,null,null);slog('reset_link',{by:u.id,uid:t.id});save();
  return{path:'/#/reset/'+tok,url:PUBLIC_URL?PUBLIC_URL+'/#/reset/'+tok:null,minutes:30}});

// ---- coffee games: the server owns the questions, the card layout and every score
const MIN_MS=process.env.GAME_MIN_MS!==undefined?+process.env.GAME_MIN_MS:15000;
const gcfg=()=>({ptsMax:10,daily:3,prizes:[50,30,20],...(db.settings.game||{})});
const weekId=t=>Math.floor((t-2*864e5)/(7*864e5)),weekEnd=w=>(w*7+9)*864e5;
const gsess=new Map();
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const sweep=()=>{const t=Date.now();for(const[k,v]of gsess)if(t-v.t>18e5)gsess.delete(k)};
const QB=[
 [['Which country grows the most coffee in the world?','کدام کشور بیشترین قهوهٔ جهان را تولید می‌کند؟'],[['Brazil','برزیل'],['Italy','ایتالیا'],['Sweden','سوئد'],['Japan','ژاپن']]],
 [['Espresso is made by forcing hot water through…','اسپرسو با عبور دادن آب داغ از میان … ساخته می‌شود.'],[['finely ground coffee under pressure','قهوهٔ ریزآسیاب‌شده زیر فشار'],['whole beans with no pressure','دانهٔ کامل بدون فشار'],['instant coffee powder','پودر قهوهٔ فوری'],['frozen coffee cubes','یخ‌قهوه']]],
 [['A classic cappuccino is espresso with…','کاپوچینوی کلاسیک اسپرسو به‌همراه … است.'],[['steamed milk and milk foam','شیر بخارداده و فوم شیر'],['only cold water','فقط آب سرد'],['tonic water','آب تونیک'],['cream and ice only','فقط خامه و یخ']]],
 [['Cold brew is made by steeping coffee in…','کلد برو با خیساندن قهوه در … ساخته می‌شود.'],[['cold water for many hours','آب سرد برای چندین ساعت'],['boiling water for 10 seconds','آب جوش به مدت ۱۰ ثانیه'],['milk for 1 minute','شیر به مدت ۱ دقیقه'],['steam only','فقط بخار']]],
 [['Which usually has more milk?','کدام معمولاً شیر بیشتری دارد؟'],[['Latte','لاته'],['Espresso','اسپرسو'],['Ristretto','ریسترتو'],['Doppio','دوپیو']]],
 [['Which bean type usually has more caffeine?','کدام نوع دانه معمولاً کافئین بیشتری دارد؟'],[['Robusta','روبوستا'],['Arabica','عربیکا'],['Both exactly the same','هر دو دقیقاً برابر'],['Neither has caffeine','هیچ‌کدام کافئین ندارند']]],
 [['A cortado is espresso cut with…','کورتادو اسپرسویی است که با … ترکیب می‌شود.'],[['a little warm milk','کمی شیر گرم'],['a lot of ice','مقدار زیادی یخ'],['soda water','نوشابهٔ گازدار'],['hot chocolate only','فقط شکلات داغ']]],
 [['Coffee beans are actually…','دانه‌های قهوه در واقع …'],[['seeds of a fruit','دانهٔ یک میوه‌اند'],['dried leaves','برگ خشک‌شده‌اند'],['tree roots','ریشهٔ درخت‌اند'],['tiny nuts','آجیل‌های ریزند']]],
 [['"Fika" is a Swedish tradition of…','«فیکا» یک سنت سوئدی برای … است.'],[['a coffee break with something sweet','استراحت با قهوه و یک چیز شیرین'],['an early-morning run','دویدن صبح زود'],['a winter festival','جشن زمستانی'],['fishing trips','سفر ماهیگیری']]],
 [['A good espresso shot usually takes about…','یک شات اسپرسوی خوب معمولاً حدود … طول می‌کشد.'],[['25–30 seconds','۲۵ تا ۳۰ ثانیه'],['2–3 minutes','۲ تا ۳ دقیقه'],['5–6 seconds','۵ تا ۶ ثانیه'],['10 minutes','۱۰ دقیقه']]],
 [['Coffee is traditionally said to have been discovered in…','طبق روایت‌ها قهوه نخست در … کشف شد.'],[['Ethiopia','اتیوپی'],['Norway','نروژ'],['Canada','کانادا'],['Australia','استرالیا']]],
 [['"Macchiato" in Italian means…','«ماکیاتو» در ایتالیایی یعنی …'],[['stained / marked','لکه‌دار / نشان‌دار'],['very strong','خیلی قوی'],['iced','یخی'],['sweet','شیرین']]]];
function boardOf(w){const m={};for(const p of db.plays){if(p.week!==w)continue;const k=p.uid+'|'+p.game;m[k]=Math.max(m[k]||0,p.score)}
  const t={};for(const k in m){const id=k.split('|')[0];t[id]=(t[id]||0)+m[k]}
  return Object.entries(t).sort((a,b)=>b[1]-a[1]).map(([id,score],i)=>({uid:id,score,rank:i+1}))}
function settleWeeks(){const cur=weekId(Date.now());let ch=false;
  for(const w of new Set(db.plays.map(p=>p.week)))if(w<cur&&!db.gameWeeks[w]){const b=boardOf(w).filter(r=>db.orders.some(o=>o.uid===r.uid&&o.status==='COMPLETED')).slice(0,3),pr=gcfg().prizes;   // prizes only for people with a completed order (no throw-away accounts)
   
    b.forEach((r,i)=>{if(r.score>0&&pr[i])db.ledger.push({id:uid('l_'),uid:r.uid,type:'GAME_BONUS',points:pr[i],ref:'week:'+w+':'+(i+1),at:now()})});
    db.gameWeeks[w]={at:now(),winners:b.map(r=>r.uid)};ch=true}
  if(ch)save()}
const shortName=n=>{const p=String(n||'').trim().split(/\s+/);return p.length>1?p[0]+' '+[...p[p.length-1]][0]+'.':p[0]||'—'};
const usedToday=(u,g)=>db.plays.filter(p=>p.uid===u.id&&p.game===g&&p.rewarded&&p.at.slice(0,10)===now().slice(0,10)).length;
function record(u,game,score,rawPts){const c=gcfg(),rewarded=rawPts>0&&usedToday(u,game)<c.daily,pts=rewarded?rawPts:0,w=weekId(Date.now());
  db.plays.push({id:uid('p_'),uid:u.id,game,score,pts,rewarded,at:now(),week:w});
  if(pts)db.ledger.push({id:uid('l_'),uid:u.id,type:'GAME',points:pts,ref:'game:'+game,at:now()});
  save();emit('order',u.id);
  const me=boardOf(w).find(r=>r.uid===u.id);return{score,pts,capped:rawPts>0&&!rewarded,rank:me.rank,weekScore:me.score,points:balance(u)}}
const takeSession=(u,body,game)=>{const s=gsess.get(str(body.sid,40));if(!s||s.uid!==u.id||s.game!==game)throw new E(400,'BAD_SESSION');return s};
on('GET','/api/games',null,({u})=>{settleWeeks();const w=weekId(Date.now()),c=gcfg(),b=boardOf(w),name=id=>(db.users.find(x=>x.id===id)||{}).name;
  const meRow=u&&b.find(r=>r.uid===u.id);
  return{week:{id:w,endsAt:weekEnd(w)},prizes:c.prizes,ptsMax:c.ptsMax,daily:c.daily,
   board:b.slice(0,10).map(r=>({rank:r.rank,name:shortName(name(r.uid)),score:r.score,me:!!u&&r.uid===u.id})),
   me:u?{rank:meRow?meRow.rank:null,score:meRow?meRow.score:0,used:{memory:usedToday(u,'memory'),quiz:usedToday(u,'quiz')}}:null}});
on('POST','/api/games/memory/start',[],({u})=>{limit('gs:'+u.id,60,36e5);sweep();const sid=uid('g_'),lay=shuffle([...Array(8).keys(),...Array(8).keys()]);
  gsess.set(sid,{uid:u.id,game:'memory',t:Date.now(),lay});return{sid,layout:lay}});
on('POST','/api/games/memory/finish',[],({u,body})=>{const s=takeSession(u,body,'memory'),f=body.flips;
  if(!Array.isArray(f)||f.length>300||f.length%2)throw new E(400,'INVALID_INPUT');
  const done=new Set();let turns=0;
  for(let i=0;i<f.length;i+=2){const a=f[i],b=f[i+1];
    if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||a<0||b<0||a>15||b>15||done.has(a)||done.has(b))throw new E(400,'INVALID_INPUT');
    turns++;if(s.lay[a]===s.lay[b]){done.add(a);done.add(b)}}
  if(done.size!==16)throw new E(400,'INCOMPLETE');
  const el=Date.now()-s.t;if(el<MIN_MS)throw new E(400,'TOO_FAST');
  gsess.delete(body.sid);
  const score=Math.max(50,1000-(turns-8)*40-Math.floor(el/1000)*5);
  return{...record(u,'memory',score,Math.min(gcfg().ptsMax,Math.max(1,Math.round(score/100)))),turns,seconds:Math.round(el/1000)}});
on('POST','/api/games/quiz/start',[],({u,body})=>{limit('gs:'+u.id,60,36e5);sweep();const sid=uid('g_'),fa=body&&body.lang==='fa'?1:0;
  const picks=shuffle(QB.map((_,i)=>i)).slice(0,5).map(qi=>({qi,order:shuffle([0,1,2,3])}));
  gsess.set(sid,{uid:u.id,game:'quiz',t:Date.now(),picks,ans:[]});
  return{sid,qs:picks.map(p=>({q:QB[p.qi][0][fa],o:p.order.map(k=>QB[p.qi][1][k][fa])}))}});
on('POST','/api/games/quiz/answer',[],({u,body})=>{const s=takeSession(u,body,'quiz'),i=int(body.i,0,4),ch=int(body.choice,0,3);
  if(i!==s.ans.length)throw new E(400,'OUT_OF_ORDER');
  const p=s.picks[i],ok=p.order[ch]===0;s.ans.push(ok);return{correct:ok,answer:p.order.indexOf(0)}});
on('POST','/api/games/quiz/finish',[],({u,body})=>{const s=takeSession(u,body,'quiz');if(s.ans.length!==5)throw new E(400,'INCOMPLETE');
  const el=Date.now()-s.t;if(el<MIN_MS*0.6)throw new E(400,'TOO_FAST');gsess.delete(body.sid);
  const n=s.ans.filter(Boolean).length,score=n*100+(n>=4?Math.max(0,100-Math.floor(el/1000)):0);
  return{...record(u,'quiz',score,Math.min(gcfg().ptsMax,n*2)),correct:n,seconds:Math.round(el/1000)}});
on('GET','/api/me',[],({u})=>({me:pub(u),state:stateOf(u)}));
on('POST','/api/orders',[],({u,body})=>placeOrder(u,body));
on('POST','/api/track',null,({u,body,req})=>{limit('trk:'+ipOf(req),120,6e4);const t=str(body.type,40);if(!['page_view','product_view','add_to_cart','checkout_started','favorite'].includes(t))throw new E(400,'INVALID_INPUT');
  if(db.analytics.length<50000){db.analytics.push({type:t,uid:u?u.id:null,at:now()});dirty=true}return{ok:true}});
// admin
on('GET','/api/admin/dashboard',STAFF,({q})=>{const days=Math.min(365,Math.max(1,+q.get('days')||7)),since=Date.now()-days*864e5;
  const os=db.orders.filter(o=>o.t>=since&&o.status!=='CANCELLED'),rev=os.reduce((a,o)=>a+o.total,0),top={},series={},cnt={};
  os.forEach(o=>{o.items.forEach(i=>top[i.productId]=(top[i.productId]||0)+i.qty);const d=o.createdAt.slice(0,10);series[d]=(series[d]||0)+o.total;cnt[d]=(cnt[d]||0)+1});
  const vs=[...db.products.flatMap(p=>p.variants.filter(v=>!v.bean).map(v=>({product:p.nameEn,variant:v.labelEn,id:v.id,stock:v.stock,available:v.available,lowStock:v.lowStock}))),...(db.beans||[]).map(b=>({product:'Specialty coffee',variant:b.nameEn,id:'bean:'+b.id,stock:b.stock,available:b.available,lowStock:b.lowStock}))];
  return{days,orders:os.length,revenue:rev,avgOrder:os.length?Math.round(rev/os.length):0,
    newCustomers:db.users.filter(x=>x.role==='CUSTOMER'&&Date.parse(x.createdAt)>=since).length,
    activeCustomers:new Set(os.map(o=>o.uid)).size,pointsIssued:db.ledger.filter(l=>l.points>0&&Date.parse(l.at)>=since).reduce((a,l)=>a+l.points,0),
    rewardsRedeemed:db.ledger.filter(l=>l.type==='REDEMPTION'&&Date.parse(l.at)>=since).length,
    challengeCompletions:db.completions.filter(c=>Date.parse(c.at)>=since).length,
    topProducts:Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5),series:Object.entries(series).sort().map(([d,v])=>[d,v,cnt[d]]),
    lowStock:vs.filter(v=>v.available&&v.stock<=v.lowStock),soldOut:vs.filter(v=>!v.available||v.stock<=0)}});
on('GET','/api/admin/orders',STAFF,()=>db.orders.slice(-100).reverse().map(o=>({...orderOut(o),customer:(db.users.find(x=>x.id===o.uid)||{}).name})));
on('PATCH','/api/admin/orders/:id',STAFF,({u,body,params})=>{const o=db.orders.find(x=>x.id===params.id);if(!o)throw new E(404,'NOT_FOUND');setStatus(u,o,body.status);return orderOut(o)});
on('GET','/api/admin/products',STAFF,()=>db.products);
on('GET','/api/admin/inventory/history',STAFF,()=>db.inventoryTx.slice(-150).reverse().map(t=>{const r=vIndex()[t.variantId]||{p:{}};return{...t,productId:r.p.id,size:+String(t.variantId).split(':')[1],by:(db.users.find(x=>x.id===t.by)||{}).name||''}}));
on('GET','/api/admin/inventory',STAFF,()=>[...db.products.flatMap(p=>p.variants.filter(v=>!v.bean).map(v=>({id:v.id,product:p.nameEn,variant:v.labelEn,price:v.price,stock:v.stock,available:v.available,lowStock:v.lowStock,active:v.active}))),
  ...(db.beans||[]).map(b=>({id:'bean:'+b.id,bean:true,product:'Specialty coffee',variant:b.nameEn,nameEn:b.nameEn,nameFa:b.nameFa,notesEn:b.notesEn,notesFa:b.notesFa,stock:b.stock,available:b.available,lowStock:b.lowStock,active:true}))]);
on('PATCH','/api/admin/beans/:id',OWN,({u,body,params})=>{const b=beanOf(params.id);if(!b)throw new E(404,'NOT_FOUND');const before={notesEn:b.notesEn,notesFa:b.notesFa};
  if(body.notesEn!==undefined)b.notesEn=str(body.notesEn,400);if(body.notesFa!==undefined)b.notesFa=str(body.notesFa,400);
  log(u,'bean.update','Bean',b.id,before,{notesEn:b.notesEn,notesFa:b.notesFa});save();emit('inventory');return b});
on('PATCH','/api/admin/inventory/:id',OWN,({u,body,params})=>{const r=vIndex()[params.id];if(!r)throw new E(404,'NOT_FOUND');const v=r.v,before={stock:v.stock,available:v.available,lowStock:v.lowStock},reason=str(body.reason,200);
  if(body.delta!==undefined){const d=int(body.delta,-10000,10000);if(v.stock+d<0)throw new E(409,'NEGATIVE_STOCK');v.stock+=d;
    db.inventoryTx.push({id:uid('t_'),variantId:v.id,type:d>0?'RESTOCK':'MANUAL_ADJUSTMENT',qty:d,reason,by:u.id,at:now()})}
  if(body.available!==undefined)v.available=!!body.available;if(body.lowStock!==undefined)v.lowStock=int(body.lowStock,0,10000);
  log(u,'inventory.update','Variant',v.id,before,{stock:v.stock,available:v.available,lowStock:v.lowStock,reason});save();emit('inventory');return v});
on('PATCH','/api/admin/products/:id',OWN,({u,body,params})=>{const p=db.products.find(x=>x.id===params.id);if(!p)throw new E(404,'NOT_FOUND');
  const before={active:p.active,featured:p.featured,prices:p.variants.map(v=>v.price)};
  if(body.active!==undefined)p.active=!!body.active;if(body.featured!==undefined)p.featured=!!body.featured;
  (body.prices||[]).forEach((x,i)=>{if(p.variants[i]&&x!=null)p.variants[i].price=int(x,0,100000000)});
  log(u,'product.update','Product',p.id,before,{active:p.active,featured:p.featured,prices:p.variants.map(v=>v.price)});save();emit('menu');return p});
on('POST','/api/admin/challenges',OWN,({u,body})=>{if(!/^[a-z0-9][a-z0-9-]{0,39}$/.test(String(body.id||'')))throw new E(400,'INVALID_INPUT');if(body.catKey&&![].concat(body.catKey).every(k=>typeof k==='string'&&db.cats.some(c=>c.key===k)))throw new E(400,'INVALID_INPUT');const c={id:str(body.id,40),e:'target',titleEn:str(body.titleEn),titleFa:str(body.titleFa),descEn:str(body.descEn,400),descFa:str(body.descFa,400),
  rewardEn:str(body.rewardEn,100),rewardFa:str(body.rewardFa,100),goal:int(body.goal,1,1000),pts:int(body.pts,0,100000),active:true,
  rule:{type:['orders','distinct'].includes(body.ruleType)?body.ruleType:(()=>{throw new E(400,'INVALID_INPUT')})(),catKey:body.catKey||null},startsAt:Date.now(),endsAt:Date.now()+int(body.days,1,365)*864e5};
  if(db.challenges.some(x=>x.id===c.id))throw new E(409,'EXISTS');db.challenges.push(c);log(u,'challenge.create','Challenge',c.id,null,c);save();emit('menu');return c});
on('PATCH','/api/admin/challenges/:id',OWN,({u,body,params})=>{const c=db.challenges.find(x=>x.id===params.id);if(!c)throw new E(404,'NOT_FOUND');const b={...c};
  if(body.active!==undefined)c.active=!!body.active;if(body.goal!==undefined)c.goal=int(body.goal,1,1000);if(body.pts!==undefined)c.pts=int(body.pts,0,100000);
  if(body.extendDays!==undefined)c.endsAt=Math.max(c.endsAt,Date.now())+int(body.extendDays,1,365)*864e5;
  log(u,'challenge.update','Challenge',c.id,b,c);save();emit('menu');return c});
on('GET','/api/admin/challenges',OWN,()=>db.challenges);
on('GET','/api/admin/audit',OWN,()=>db.audit.slice(-200).reverse());
// ---- housekeeping: retention (owner can change the numbers with env vars) and an encrypted daily backup
function backup(){try{const dir=path.join(path.dirname(DB_FILE),'backups'),f=path.join(dir,'db-'+now().slice(0,10)+'.json.enc');fs.mkdirSync(dir,{recursive:true,mode:0o700});
  fs.writeFileSync(f,enc(Buffer.from(JSON.stringify(db))),{mode:0o600});
  fs.readdirSync(dir).filter(x=>/^db-.*\.enc$/.test(x)).sort().slice(0,-(+process.env.BACKUP_KEEP||14)).forEach(x=>fs.unlinkSync(path.join(dir,x)))}catch(e){console.error('backup failed',e.message)}}
function maintain(){const t=Date.now(),D=864e5,n=(k,d)=>+process.env[k]||d,an=n('RETENTION_ANALYTICS_DAYS',90),au=n('RETENTION_AUDIT_DAYS',365),od=n('RETENTION_ORDER_DAYS',395);
  db.analytics=db.analytics.filter(a=>t-Date.parse(a.at)<an*D);db.audit=db.audit.filter(a=>t-Date.parse(a.at)<au*D);
  db.orders.forEach(o=>{if(o.uid&&t-o.t>od*D&&(o.status==='COMPLETED'||o.status==='CANCELLED'))o.uid=null});
  for(const[k,r]of Object.entries(db.resets||{}))if(r.exp<t)delete db.resets[k];
  for(const k of Object.keys(db.sessions)){const s=db.sessions[k];if(s.exp<t)delete db.sessions[k]}
  save();backup()}
// ---- http server
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const SEC={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','Cross-Origin-Opener-Policy':'same-origin',
  'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"};
function body(req){return new Promise((ok,no)=>{let d='';req.on('data',c=>{d+=c;if(d.length>1e5){no(new E(413,'TOO_LARGE'));req.destroy()}});req.on('end',()=>{try{ok(d?JSON.parse(d):{})}catch{no(new E(400,'BAD_JSON'))}})})}
const server=http.createServer(async(req,res)=>{
  req.rid=crypto.randomBytes(6).toString('hex');res.setHeader('X-Request-Id',req.rid);
  for(const k of Object.keys(SEC))res.setHeader(k,SEC[k]);
  if(process.env.COOKIE_SECURE==='1'||isHttps(req))res.setHeader('Strict-Transport-Security','max-age=31536000');
  const url=new URL(req.url,'http://x');
  try{
    if(url.pathname.startsWith('/api/')){
      const r=routes.find(x=>x.m===req.method&&x.re.test(url.pathname));if(!r)throw new E(404,'NOT_FOUND');
      if(req.method!=='GET'){const o=req.headers.origin;if(req.headers['x-requested-with']!=='fika'||(o&&new URL(o).host!==req.headers.host))throw new E(403,'BAD_ORIGIN')}
      const u=getUser(req);req.uid=u&&u.id;if(r.roles){if(!u)throw new E(401,'UNAUTHENTICATED');if(r.roles.length&&!r.roles.includes(u.role))throw new E(403,'FORBIDDEN');
        if(r.roles.length&&MFA_ON()&&!(u.totp&&u.totp.on))throw new E(403,'MFA_REQUIRED')}
      const params=Object.fromEntries(Object.entries(url.pathname.match(r.re).groups||{}).map(([k,v])=>{try{return[k,decodeURIComponent(v)]}catch{throw new E(400,'BAD_PATH')}})),out=await r.fn({req,res,u,params,q:url.searchParams,body:req.method==='GET'?{}:await body(req)});
      if(out===undefined)return;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(out))}
    if(url.pathname==='/healthz'){res.setHeader('Content-Type','text/plain');res.setHeader('Cache-Control','no-store');return res.end('ok')}   // for the host's health check; touches no data
    let f=path.normalize(path.join(PUB,url.pathname==='/'?'index.html':url.pathname));
    if(!f.startsWith(PUB+path.sep)||!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(PUB,'index.html');
    res.setHeader('Content-Type',MIME[path.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control',path.extname(f)==='.html'?'no-cache':'public, max-age=300');res.end(fs.readFileSync(f))
  }catch(e){const s=e instanceof E?e.s:500;if(s===500)console.error('error',req.rid,e.message);if(s===403||s===429||(s===401&&url.pathname.startsWith('/api/admin')))slog('denied',{status:s,code:e.message,method:req.method,path:url.pathname.replace(/[0-9a-f]{12,}/g,'*'),ip:ipOf(req),uid:req.uid,rid:req.rid});
    res.statusCode=s;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');if(s===429)res.setHeader('Retry-After','900');res.end(JSON.stringify({error:e instanceof E?e.message:'SERVER_ERROR',rid:req.rid}))}});
process.on('uncaughtException',e=>console.error('uncaught',e&&e.message));process.on('unhandledRejection',e=>console.error('unhandled',e&&e.message));
// Hosts (Render, Docker...) need 0.0.0.0. Locally we keep Node's default so localhost works on both IPv4 and IPv6. HOST overrides.
const HOST=process.env.HOST||(process.env.RENDER?'0.0.0.0':'');
// Longer than typical load-balancer idle timeouts (60 s) so the proxy never reuses a connection Node already closed (avoids sporadic 502s).
server.keepAliveTimeout=65e3;server.headersTimeout=66e3;
for(const sg of['SIGTERM','SIGINT'])process.on(sg,()=>{try{if(db)save()}catch(e){}server.close(()=>process.exit(0));if(server.closeAllConnections)server.closeAllConnections();setTimeout(()=>process.exit(0),5000).unref()});
init();server.listen(...(HOST?[PORT,HOST]:[PORT]),()=>{console.log(`Fika running on http://localhost:${PORT}`);if(!STRICT())console.log('Local mode: staff passwords need 8+ characters and 2FA is optional. Before going public set COOKIE_SECURE=1 (or ADMIN_STRICT=1) to require 12+ characters and 2FA.');if(process.env.COOKIE_SECURE!=='1')console.log('Note: sign-in cookies are only marked Secure over HTTPS. Before going public put the site behind HTTPS and set COOKIE_SECURE=1 (and TRUST_PROXY=1 behind a proxy).')});
