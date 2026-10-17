const {test,before,after}=require('node:test'),assert=require('node:assert'),{spawn}=require('node:child_process'),os=require('os'),path=require('path'),fs=require('fs');
try{for(const x of require('fs').readdirSync(require('os').tmpdir()))if(/^fika-(?!sec-).*\.(json|key|tmp)$/.test(x))require('fs').rmSync(require('path').join(require('os').tmpdir(),x),{force:true})}catch{}
let proc,base;const H={'Content-Type':'application/json','X-Requested-With':'fika'};
const call=async(p,b,m,c)=>{const r=await fetch(base+p,{method:m||(b?'POST':'GET'),headers:{...H,...(c?{cookie:c}:{})},body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));return{s:r.status,j,c:(r.headers.get('set-cookie')||'').split(';')[0]}};
before(async()=>{const port=3100+Math.floor(Math.random()*500);base='http://localhost:'+port;
  proc=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:port,DB_FILE:path.join(os.tmpdir(),'fika-'+port+'.json'),OWNER_EMAIL:'o@t.io',OWNER_PASSWORD:'owner-pass-123',GAME_MIN_MS:'0',ADMIN_MFA:'off',HIBP:'0',SEED_FILE:path.join(__dirname,'fixture-seed.json')}});
  for(let i=0;i<50;i++){try{await fetch(base+'/api/bootstrap');return}catch{await new Promise(r=>setTimeout(r,100))}}throw new Error('server did not start')});
after(()=>proc.kill());
test('register, login, wrong password',async()=>{
  const r=await call('/api/auth/register',{name:'A',email:'a@t.io',password:'Zx-cafe-test-77'});assert.equal(r.s,200);
  assert.equal((await call('/api/auth/login',{email:'a@t.io',password:'nope-nope'})).s,401);
  assert.equal((await call('/api/auth/login',{email:'a@t.io',password:'Zx-cafe-test-77'})).s,200)});
test('customer cannot use admin APIs; anonymous gets 401',async()=>{
  const c=(await call('/api/auth/login',{email:'a@t.io',password:'Zx-cafe-test-77'})).c;
  assert.equal((await call('/api/admin/dashboard',null,'GET',c)).s,403);
  assert.equal((await call('/api/admin/inventory/flat-white:0',{delta:5,reason:'x'},'PATCH',c)).s,403);
  assert.equal((await call('/api/admin/dashboard')).s,401)});
test('order price comes from the server, not the client',async()=>{
  const c=(await call('/api/auth/login',{email:'a@t.io',password:'Zx-cafe-test-77'})).c;
  const r=await call('/api/orders',{lines:[{variantId:'flat-white:0',qty:2,price:1,unitPrice:1}]},'POST',c);
  assert.equal(r.s,200);assert.equal(r.j.order.total,240000);assert.equal(r.j.order.pts,80);
  assert.equal((await call('/api/orders',{lines:[{variantId:'nope:0',qty:1}]},'POST',c)).s,400)});
test('cannot oversell stock and stock is decremented',async()=>{
  const o=(await call('/api/auth/login',{email:'o@t.io',password:'owner-pass-123'})).c;
  assert.equal((await call('/api/admin/inventory/cortado:0',{delta:-48,reason:'test'},'PATCH',o)).s,200);
  const c=(await call('/api/auth/login',{email:'a@t.io',password:'Zx-cafe-test-77'})).c;
  assert.equal((await call('/api/orders',{lines:[{variantId:'cortado:0',qty:3}]},'POST',c)).s,409);
  assert.equal((await call('/api/orders',{lines:[{variantId:'cortado:0',qty:2}]},'POST',c)).s,200);
  assert.equal((await call('/api/orders',{lines:[{variantId:'cortado:0',qty:1}]},'POST',c)).s,409)});
test('free coffee needs points; combo discount is validated',async()=>{
  const c=(await call('/api/auth/login',{email:'a@t.io',password:'Zx-cafe-test-77'})).c;
  assert.equal((await call('/api/orders',{lines:[{variantId:'flat-white:1',qty:1,free:true}]},'POST',c)).s,409);
  const r=await call('/api/orders',{lines:[{variantId:'flat-white:1',qty:1,comboId:'morning'},{variantId:'croissant:0',qty:1,comboId:'morning'}]},'POST',c);
  assert.equal(r.j.order.discount,23500)});
test('CSRF header required for writes',async()=>{
  const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403)});
test('owner can cancel an order and stock is restored',async()=>{
  const o=(await call('/api/auth/login',{email:'o@t.io',password:'owner-pass-123'})).c;
  const list=await call('/api/admin/orders',null,'GET',o);const x=list.j.find(v=>v.lines.some(l=>l.id==='cortado'));
  assert.equal((await call('/api/admin/orders/'+x.id,{status:'CANCELLED'},'PATCH',o)).s,200);
  const inv=await call('/api/admin/inventory',null,'GET',o);assert.equal(inv.j.find(v=>v.id==='cortado:0').stock,2)});
test('admin history, products list and chart series',async()=>{
  const o=(await call('/api/auth/login',{email:'o@t.io',password:'owner-pass-123'})).c;
  const h=await call('/api/admin/inventory/history',null,'GET',o);assert.equal(h.s,200);assert.ok(h.j.length>0&&h.j[0].productId);
  assert.ok((await call('/api/admin/products',null,'GET',o)).j.length>=12);
  const d=await call('/api/admin/dashboard?days=30',null,'GET',o);assert.ok(Array.isArray(d.j.series[0])&&d.j.series[0].length===3);
  const c=(await call('/api/auth/login',{email:'a@t.io',password:'Zx-cafe-test-77'})).c;
  assert.equal((await call('/api/admin/inventory/history',null,'GET',c)).s,403)});
test('URL-encoded variant ids work for admin inventory changes',async()=>{
  const o=(await call('/api/auth/login',{email:'o@t.io',password:'owner-pass-123'})).c;
  const r=await call('/api/admin/inventory/'+encodeURIComponent('flat-white:0'),{delta:7,reason:'Restock'},'PATCH',o);
  assert.equal(r.s,200);assert.ok(r.j.stock>=7);
  assert.equal((await call('/api/admin/inventory/%E0%A4%A',{delta:1,reason:'x'},'PATCH',o)).s,400)});
test('account: wrong current password is refused; email+password change works and signs out other sessions',async()=>{
  await call('/api/auth/register',{name:'B',email:'b@t.io',password:'Zx-cafe-test-77'});
  const s1=(await call('/api/auth/login',{email:'b@t.io',password:'Zx-cafe-test-77'})).c,s2=(await call('/api/auth/login',{email:'b@t.io',password:'Zx-cafe-test-77'})).c;
  assert.equal((await call('/api/me/account',{currentPassword:'bad-bad-bad',newPassword:'Zx-cafe-new-pass-88'},'PATCH',s1)).s,403);
  assert.equal((await call('/api/me/account',{currentPassword:'Zx-cafe-test-77',newPassword:'short'},'PATCH',s1)).s,400);
  assert.equal((await call('/api/me/account',{currentPassword:'Zx-cafe-test-77',email:'a@t.io'},'PATCH',s1)).s,409);
  const r=await call('/api/me/account',{currentPassword:'Zx-cafe-test-77',email:'B2@T.io',newPassword:'Zx-cafe-new-pass-88'},'PATCH',s1);
  assert.equal(r.s,200);assert.equal(r.j.email,'b2@t.io');
  assert.equal((await call('/api/me',null,'GET',s1)).s,200);
  assert.equal((await call('/api/me',null,'GET',s2)).s,401);
  assert.equal((await call('/api/auth/login',{email:'b@t.io',password:'Zx-cafe-test-77'})).s,401);
  assert.equal((await call('/api/auth/login',{email:'b2@t.io',password:'Zx-cafe-new-pass-88'})).s,200)});
test('first-run setup creates the owner once, then is closed',async()=>{
  const port=3300+Math.floor(Math.random()*200),b2='http://localhost:'+port,f=path.join(os.tmpdir(),'fika-setup-'+port+'.json');
  const env={...process.env,PORT:port,DB_FILE:f,ADMIN_MFA:'off',HIBP:'0'};delete env.OWNER_EMAIL;delete env.OWNER_PASSWORD;
  const p=spawn(process.execPath,['server.js'],{env});
  try{for(let i=0;i<50;i++){try{await fetch(b2+'/api/setup');break}catch{await new Promise(r=>setTimeout(r,100))}}
    const q=async(u,b,m)=>{const r=await fetch(b2+u,{method:m||(b?'POST':'GET'),headers:H,body:b?JSON.stringify(b):undefined});return{s:r.status,j:await r.json().catch(()=>({})),c:(r.headers.get('set-cookie')||'').split(';')[0]}};
    assert.equal((await q('/api/setup')).j.needed,true);
    assert.equal((await q('/api/setup',{name:'Boss',email:'boss@t.io',password:'short'})).s,400);
    const r=await q('/api/setup',{name:'Boss',email:'boss@t.io',password:'Zx-owner-pass-1234'});
    assert.equal(r.s,200);assert.equal(r.j.role,'OWNER');
    assert.equal((await q('/api/setup')).j.needed,false);
    assert.equal((await q('/api/setup',{name:'X',email:'x@t.io',password:'xxxxxxxx1-long-pw'})).s,409);
    assert.equal((await q('/api/auth/login',{email:'boss@t.io',password:'Zx-owner-pass-1234'})).s,200)}
  finally{p.kill()}});
test('first-coffee challenge: only for newcomers, awarded once on the first coffee',async()=>{
  const ids=j=>j.challenges.map(c=>c.id);
  assert.ok(ids((await call('/api/bootstrap')).j).includes('first-coffee'));
  await call('/api/auth/register',{name:'Newbie',email:'n@t.io',password:'Zx-cafe-test-77'});
  const c=(await call('/api/auth/login',{email:'n@t.io',password:'Zx-cafe-test-77'})).c;
  assert.ok(ids((await call('/api/bootstrap',null,'GET',c)).j).includes('first-coffee'));
  const r=await call('/api/orders',{lines:[{variantId:'flat-white:0',qty:1}]},'POST',c);assert.equal(r.s,200);
  const b=(await call('/api/bootstrap',null,'GET',c)).j;
  assert.ok(!ids(b).includes('first-coffee'));
  assert.equal(b.state.points,0,'F2: no points while the order is only PENDING');
  const o=(await call('/api/auth/login',{email:'o@t.io',password:'owner-pass-123'})).c;
  assert.equal((await call('/api/admin/orders/'+r.j.order.id,{status:'COMPLETED'},'PATCH',o)).s,200);
  const b2=(await call('/api/bootstrap',null,'GET',c)).j;assert.equal(b2.state.points,r.j.order.pts+30);
  await call('/api/admin/orders/'+r.j.order.id,{status:'COMPLETED'},'PATCH',o);
  assert.equal((await call('/api/bootstrap',null,'GET',c)).j.state.points,b2.state.points,'completing twice never pays twice');
  const r2=await call('/api/orders',{lines:[{variantId:'flat-white:0',qty:1}]},'POST',c);
  await call('/api/admin/orders/'+r2.j.order.id,{status:'COMPLETED'},'PATCH',o);
  assert.equal((await call('/api/bootstrap',null,'GET',c)).j.state.points,b2.state.points+r2.j.order.pts);
  await call('/api/admin/orders/'+r2.j.order.id,{status:'CANCELLED'},'PATCH',o);
  assert.equal((await call('/api/bootstrap',null,'GET',c)).j.state.points,b2.state.points,'cancel takes the points back');
});
test('memory game: replay is verified server-side, points capped daily',async()=>{
  await call('/api/auth/register',{name:'Gamer One',email:'g@t.io',password:'Zx-cafe-test-77'});
  const c=(await call('/api/auth/login',{email:'g@t.io',password:'Zx-cafe-test-77'})).c;
  assert.equal((await call('/api/games/memory/start',{},'POST')).s,401);
  const solve=(lay)=>{const f=[],seen={};lay.forEach((v,i)=>{if(seen[v]!==undefined){f.push(seen[v],i)}else seen[v]=i});return f};
  const play=async()=>{const s=await call('/api/games/memory/start',{},'POST',c);return{s,lay:s.j.layout}};
  let p=await play();assert.equal(p.lay.length,16);
  assert.equal((await call('/api/games/memory/finish',{sid:p.s.j.sid,flips:[0,1]},'POST',c)).s,400);
  p=await play();
  const ok=await call('/api/games/memory/finish',{sid:p.s.j.sid,flips:solve(p.lay)},'POST',c);
  assert.equal(ok.s,200);assert.ok(ok.j.score>=900);assert.ok(ok.j.pts>=9);assert.equal(ok.j.rank,1);
  assert.equal((await call('/api/games/memory/finish',{sid:p.s.j.sid,flips:solve(p.lay)},'POST',c)).s,400);
  let last;for(let i=0;i<3;i++){p=await play();last=await call('/api/games/memory/finish',{sid:p.s.j.sid,flips:solve(p.lay)},'POST',c)}
  assert.equal(last.j.pts,0);assert.equal(last.j.capped,true);
  const g=(await call('/api/games',null,'GET',c)).j;assert.equal(g.board[0].name,'Gamer O.');assert.equal(g.me.used.memory,3)});
test('quiz game: server checks every answer',async()=>{
  const c=(await call('/api/auth/login',{email:'g@t.io',password:'Zx-cafe-test-77'})).c;
  const s=await call('/api/games/quiz/start',{lang:'fa'},'POST',c);assert.equal(s.j.qs.length,5);assert.equal(s.j.qs[0].o.length,4);
  assert.equal((await call('/api/games/quiz/finish',{sid:s.j.sid},'POST',c)).s,400);
  let right=0;for(let i=0;i<5;i++){const a=await call('/api/games/quiz/answer',{sid:s.j.sid,i,choice:0},'POST',c);assert.equal(a.s,200);if(a.j.correct)right++;assert.ok(a.j.answer>=0&&a.j.answer<4)}
  const f=await call('/api/games/quiz/finish',{sid:s.j.sid,},'POST',c);assert.equal(f.s,200);assert.equal(f.j.correct,right)});

const boot=async(port,env)=>{const p=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:port,GAME_MIN_MS:'0',ADMIN_MFA:'off',HIBP:'0',OWNER_EMAIL:'o@t.io',OWNER_PASSWORD:'owner-pass-123',...env}});
  const b='http://localhost:'+port;for(let i=0;i<60;i++){try{await fetch(b+'/api/bootstrap');return{p,b}}catch{await new Promise(r=>setTimeout(r,100))}}throw new Error('no start')};
test('bundled menu: exactly the 65 requested items, categories and prices',async()=>{
  const port=3900+Math.floor(Math.random()*90),{p,b}=await boot(port,{DB_FILE:path.join(os.tmpdir(),'fika-menu-'+port+'.json')});
  try{const exp=require('./menu-expected.json'),j=await (await fetch(b+'/api/bootstrap')).json();
    assert.equal(j.menu.length,65);assert.equal(j.cats.length,10);assert.equal(j.combos.length,4);j.combos.forEach(c=>c.items.forEach(([id,i])=>assert.ok(j.menu.some(m=>m.id===id&&m.variants[i]),'combo item '+id)));
    const cn=Object.fromEntries(j.cats.map(c=>[c.key,c.fa]));
    exp.forEach((e,i)=>{const m=j.menu[i];assert.equal(m.nameFa,e.name,'name '+i);assert.equal(cn[m.catKey],e.cat,'cat '+e.name);assert.equal(m.variants[0].price,e.price*1000,'price '+e.name)});
    const counts={};j.menu.forEach(m=>counts[cn[m.catKey]]=(counts[cn[m.catKey]]||0)+1);
    assert.deepEqual(counts,{'اسپرسو بار':13,'آیس کافی':8,'دمی':3,'ماچا بار':7,'وگن بار':2,'میلک شیک':9,'ماکتیل':3,'دسر':4,'بار گرم':9,'دمنوش‌ها':7});
    assert.ok(j.menu.some(m=>m.variants[0].id===j.free+':0'))}
  finally{p.kill()}});
test('option groups: defaults, variants and ordering a non-default option',async()=>{
  const port=3700+Math.floor(Math.random()*90),{p,b}=await boot(port,{DB_FILE:path.join(os.tmpdir(),'fika-opt-'+port+'.json')});
  try{const j=await (await fetch(b+'/api/bootstrap')).json(),by=id=>j.menu.find(m=>m.id===id),lab=(id,i)=>by(id).variants[i].labelEn;
    assert.equal(lab('latte',0),'50/50 Blend');assert.equal(by('latte').variants.length,3);
    assert.equal(lab('origami',0),'Ethiopia');assert.equal(by('origami').variants.length,2);
    assert.equal(lab('vakan-matcha',0),'Almond milk');assert.equal(by('vakan-latte').variants.length,6);assert.equal(lab('vakan-latte',0),'50/50 Blend · Almond milk');
    assert.equal(lab('classic-tea',0),'For one');assert.equal(by('classic-tea').variants.length,2);
    assert.ok(!by('robusta-espresso').groups);assert.ok(by('mocha-cream').groups);
    assert.ok(!j.menu.some(m=>['violet','amsterdam','redberry','shiraz','tonic-presso'].includes(m.id)),'unpriced items stay hidden');
    j.menu.forEach(m=>{const g=m.groups;if(g)m.variants.forEach(v=>{assert.equal(v.sel.length,g.length)})});
    const r=await fetch(b+'/api/auth/register',{method:'POST',headers:H,body:JSON.stringify({name:'O P',email:'op@t.io',password:'Zx-cafe-test-77'})}),ck=(r.headers.get('set-cookie')||'').split(';')[0];
    const o=await fetch(b+'/api/orders',{method:'POST',headers:{...H,cookie:ck},body:JSON.stringify({lines:[{variantId:'latte:2',qty:1}]})}),oj=await o.json();
    assert.equal(o.status,200,JSON.stringify(oj));assert.match(oj.order.lines[0].name||'',/30\/70 Robusta/)}
  finally{p.kill()}});
test('specialty beans: shared stock pool, turkish coffee types, admin access',async()=>{
  const port=3500+Math.floor(Math.random()*90),{p,b}=await boot(port,{DB_FILE:path.join(os.tmpdir(),'fika-bean-'+port+'.json')});
  try{const j=await (await fetch(b+'/api/bootstrap')).json(),by=id=>j.menu.find(m=>m.id===id);
    assert.deepEqual(by('turkish').variants.map(v=>v.labelEn),['Classic','With cardamom','Dark roast']);
    assert.equal(by('turkish').groups[0].k,'type');
    assert.equal(j.beans.length,2);assert.ok(j.beans[0].notesEn.length>20);
    assert.equal(by('origami').variants[0].bean,'ethiopia');assert.equal(by('hario-switch').variants[0].stock,60);
    const lg=await fetch(b+'/api/auth/login',{method:'POST',headers:H,body:JSON.stringify({email:'o@t.io',password:'owner-pass-123'})}),ck=(lg.headers.get('set-cookie')||'').split(';')[0],A={...H,cookie:ck};
    const inv=await (await fetch(b+'/api/admin/inventory',{headers:A})).json();
    assert.ok(inv.some(r=>r.id==='bean:ethiopia'&&r.stock===60),'beans listed for admin');assert.ok(!inv.some(r=>r.id==='origami:0'),'brew variants are not stocked separately');
    const o=await fetch(b+'/api/orders',{method:'POST',headers:A,body:JSON.stringify({lines:[{variantId:'origami:0',qty:20},{variantId:'hario-switch:0',qty:20}]})});assert.equal(o.status,200);
    const j2=await (await fetch(b+'/api/bootstrap')).json();assert.equal(j2.menu.find(m=>m.id==='hario-switch').variants[0].stock,20,'both brews drew on one pool');
    const over=await fetch(b+'/api/orders',{method:'POST',headers:A,body:JSON.stringify({lines:[{variantId:'origami:0',qty:15},{variantId:'hario-switch:0',qty:15}]})});assert.equal(over.status,409);
    const ad=await fetch(b+'/api/admin/inventory/'+encodeURIComponent('bean:ethiopia'),{method:'PATCH',headers:A,body:JSON.stringify({delta:30,reason:'restock'})});assert.equal(ad.status,200);
    const nt=await fetch(b+'/api/admin/beans/ethiopia',{method:'PATCH',headers:A,body:JSON.stringify({notesEn:'Washed, floral.'})});assert.equal(nt.status,200);
    const j3=await (await fetch(b+'/api/bootstrap')).json();assert.equal(j3.beans.find(x=>x.id==='ethiopia').notesEn,'Washed, floral.');assert.equal(j3.menu.find(m=>m.id==='origami').variants[0].stock,50)}
  finally{p.kill()}});
test('older database gains options, new names, hidden new items and combos without losing admin edits',async()=>{
  const port=3900+Math.floor(Math.random()*90),f=path.join(os.tmpdir(),'fika-enrich-'+port+'.json');
  let s=await boot(port,{DB_FILE:f});s.p.kill();await new Promise(r=>setTimeout(r,300));
  const d=JSON.parse(fs.readFileSync(f,'utf8'));
  d.combos=[];delete d.combosSeeded;d.cats.find(c=>c.key==='vakan-bar').fa='وکن بار';
  for(const p of d.products){if(p.groups){delete p.groups;delete p.gv;p.variants=[{...p.variants[0],labelEn:'Regular',labelFa:'معمولی'}];delete p.variants[0].sel}}
  const sf=d.products.find(p=>p.id==='sifano');sf.nameFa='سیفانو';sf.nameEn='Sifano';
  d.products=d.products.filter(p=>!['violet','shiraz'].includes(p.id));
  const lt=d.products.find(p=>p.id==='latte');lt.variants[0].price=123000;lt.descEn='Admin text';
  fs.writeFileSync(f,JSON.stringify(d));
  s=await boot(port+1,{DB_FILE:f});
  try{const j=await (await fetch(s.b+'/api/bootstrap')).json(),by=id=>j.menu.find(m=>m.id===id);
    assert.equal(by('latte').variants.length,3);assert.equal(by('latte').variants[0].price,123000);assert.equal(by('latte').variants[1].price,123000);assert.equal(by('latte').descEn,'Admin text');
    assert.equal(by('sifano').nameFa,'سینامون');assert.equal(j.cats.find(c=>c.key==='vakan-bar').fa,'وگن بار');assert.equal(j.combos.length,4);
    const all=JSON.parse(fs.readFileSync(f,'utf8'));assert.ok(all.products.some(p=>p.id==='violet'&&!p.active))}
  finally{s.p.kill()}});
test('existing database is migrated to the new menu; users and orders survive',async()=>{
  const port=3800+Math.floor(Math.random()*90),f=path.join(os.tmpdir(),'fika-mig-'+port+'.json');
  let s=await boot(port,{DB_FILE:f,SEED_FILE:path.join(__dirname,'fixture-seed.json')});
  const q=async(b,u,x,m,c)=>{const r=await fetch(b+u,{method:m||(x?'POST':'GET'),headers:{...H,...(c?{cookie:c}:{})},body:x?JSON.stringify(x):undefined});return{s:r.status,j:await r.json().catch(()=>({})),c:(r.headers.get('set-cookie')||'').split(';')[0]}};
  const reg=await q(s.b,'/api/auth/register',{name:'Old User',email:'old@t.io',password:'Zx-cafe-test-77'});
  await q(s.b,'/api/me/favs',{favs:['flat-white']},'PUT',reg.c);
  {const oo=await q(s.b,'/api/orders',{lines:[{variantId:'flat-white:0',qty:1}]},'POST',reg.c);assert.equal(oo.s,200,'order '+JSON.stringify(oo.j)+' reg '+reg.s+JSON.stringify(reg.j))}
  s.p.kill();await new Promise(r=>setTimeout(r,300));
  s=await boot(port+1000,{DB_FILE:f});
  try{const l=await q(s.b,'/api/auth/login',{email:'old@t.io',password:'Zx-cafe-test-77'});assert.equal(l.s,200,JSON.stringify(l.j));
    const j=(await q(s.b,'/api/bootstrap',null,'GET',l.c)).j;
    assert.equal(j.menu.length,65);assert.deepEqual(j.state.favs,[]);assert.equal(j.state.orders.length,1);assert.equal(j.state.points,0);
    const fc=j.challenges.find(c=>c.id==='first-coffee');assert.ok(!fc,'old customer already had a coffee');
    assert.ok(j.challenges.find(c=>c.id==='try-3-coffees').rule.catKey.includes('espresso-bar'));
    const r=await q(s.b,'/api/orders',{lines:[{variantId:'latte:0',qty:2}]},'POST',l.c);assert.equal(r.s,200);assert.equal(r.j.order.total,196000)}
  finally{s.p.kill()}});

test('security F1: prototype-pollution via comboId is rejected and the server stays alive',async()=>{
  const u=await call('/api/auth/register',{name:'P',email:'pp@t.io',password:'a-long-test-pass-1'});
  const m=(await call('/api/bootstrap',null,'GET',u.c)).j.menu,vid=m.find(p=>p.variants[0].price>0&&p.variants[0].stock>5).variants[0].id;
  for(const bad of ['__proto__','constructor','nope',5,{}]){const r=await call('/api/orders',{lines:[{variantId:vid,qty:1,comboId:bad}]},'POST',u.c);assert.equal(r.s,400,'comboId '+JSON.stringify(bad))}
  for(const bad of ['constructor','__proto__','toString']){const r=await call('/api/orders',{lines:[{variantId:bad,qty:1}]},'POST',u.c);assert.equal(r.s,400,'variantId '+bad)}
  assert.equal(({})[vid],undefined);
  assert.equal((await call('/api/bootstrap')).s,200);
  const ok=await call('/api/orders',{lines:[{variantId:vid,qty:1}]},'POST',u.c);assert.equal(ok.s,200);assert.equal(ok.j.order.discount,0)});
test('security F17: static path traversal never leaks sources',async()=>{
  for(const p of ['/server.js','/../server.js','/%2e%2e/server.js','/..%2fserver.js','/data/db.json','/seed.json']){const t=await(await fetch(base+p)).text();assert.ok(!t.includes('crypto.randomBytes')&&!t.includes('menuVersion'),p)}});

test('security F2: pending-order cap stops unpaid-order farming',async()=>{
  const u=await call('/api/auth/register',{name:'F',email:'farm@t.io',password:'a-long-test-pass-1'});let last;
  for(let i=0;i<7;i++)last=await call('/api/orders',{lines:[{variantId:'flat-white:0',qty:1}]},'POST',u.c);
  assert.equal(last.s,429);assert.equal(last.j.error,'TOO_MANY_PENDING');
  assert.equal((await call('/api/me',null,'GET',u.c)).j.state.points,0)});

const http=require('http');
const raw=(port,p,{method='GET',headers={},body}={})=>new Promise((ok,no)=>{const r=http.request({port,host:'127.0.0.1',path:p,method,headers:{'Content-Type':'application/json','X-Requested-With':'fika',...headers}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>ok({s:res.statusCode,h:res.headers,j:(()=>{try{return JSON.parse(d)}catch{return d}})()}))});r.on('error',no);if(body)r.write(JSON.stringify(body));r.end()});
test('security F3/F9: cookie works on plain http for a phone on the local network; Secure/__Host- when https is forced; logout rejects replay; headers present',async()=>{
  const port=+base.split(':').pop();
  const reg=await raw(port,'/api/auth/register',{method:'POST',headers:{Host:'192.168.1.20:3000'},body:{name:'S',email:'sec@t.io',password:'a-long-test-pass-1'}});
  const sc=reg.h['set-cookie'][0];assert.match(sc,/^sid=/);assert.doesNotMatch(sc,/Secure/,'a Secure cookie would be dropped by the phone');assert.match(sc,/HttpOnly/);assert.match(sc,/SameSite=Lax/);
  const ck=sc.split(';')[0];
  assert.equal((await raw(port,'/api/me',{headers:{Host:'192.168.1.20:3000',cookie:ck}})).s,200,'profile reachable after sign-up over plain http');
  assert.equal((await raw(port,'/api/auth/logout',{method:'POST',headers:{cookie:ck},body:{}})).s,200);
  assert.equal((await raw(port,'/api/me',{headers:{cookie:ck}})).s,401,'old cookie replay after logout');
  const h=(await raw(port,'/')).h;
  for(const k of ['content-security-policy','permissions-policy','x-content-type-options','referrer-policy','x-frame-options'])assert.ok(h[k],k);
  assert.match(h['content-security-policy'],/frame-ancestors 'none'/);
  const p2=4400+Math.floor(Math.random()*90),s2=await boot(p2,{DB_FILE:path.join(os.tmpdir(),'fika-cs-'+p2+'.json'),COOKIE_SECURE:'1',ADMIN_MFA:'off',HIBP:'0'});
  try{const r2=await raw(p2,'/api/auth/register',{method:'POST',body:{name:'L',email:'loc@t.io',password:'a-long-test-pass-1'}});
    const c2=r2.h['set-cookie'][0];assert.match(c2,/^__Host-sid=/);assert.match(c2,/; Secure/);assert.match(c2,/Path=\//);assert.doesNotMatch(c2,/Domain/);
    assert.ok(r2.h['strict-transport-security'])}finally{s2.p.kill()}});
test('security F4: first-run setup needs the code when a proxy or a public host name is involved',async()=>{
  const port=3600+Math.floor(Math.random()*90),f=path.join(os.tmpdir(),'fika-setup2-'+port+'.json');
  const env={...process.env,PORT:port,DB_FILE:f,ADMIN_MFA:'off',HIBP:'0'};delete env.OWNER_EMAIL;delete env.OWNER_PASSWORD;
  const p=spawn(process.execPath,['server.js'],{env});
  try{for(let i=0;i<50;i++){try{await fetch('http://localhost:'+port+'/api/setup');break}catch{await new Promise(r=>setTimeout(r,100))}}
    const b={name:'B',email:'b@t.io',password:'a-long-owner-pass-1'};
    for(const hd of [{'X-Forwarded-For':'203.0.113.9'},{Host:'cafe.example'},{Via:'1.1 proxy'}]){
      const r=await raw(port,'/api/setup',{method:'POST',headers:hd,body:b});assert.equal(r.s,403,JSON.stringify(hd))}
    assert.equal((await raw(port,'/api/setup')).j.needed,true)}
  finally{p.kill()}});
