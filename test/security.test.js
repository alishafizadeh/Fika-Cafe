// Security regression tests (docs/security). Each test would have caught a finding from the 2026-10-12 audit.
try{for(const x of require('fs').readdirSync(require('os').tmpdir()))if(/^fika-sec-.*\.(json|key|tmp)$/.test(x))require('fs').rmSync(require('path').join(require('os').tmpdir(),x),{force:true})}catch{}
const {test,after}=require('node:test'),assert=require('node:assert'),{spawn}=require('node:child_process'),os=require('os'),path=require('path'),fs=require('fs'),crypto=require('crypto');
const H={'Content-Type':'application/json','X-Requested-With':'fika'},procs=[];
const PW='Zx-cafe-test-77',OWN_PW='Zx-owner-pass-1234';
const hotp=(key,c)=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(c));const h=crypto.createHmac('sha1',key).update(b).digest(),o=h[19]&15;return String(((h[o]&127)<<24|h[o+1]<<16|h[o+2]<<8|h[o+3])%1e6).padStart(6,'0')};
const unb32=s=>{const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const ch of s)bits+=A.indexOf(ch).toString(2).padStart(5,'0');const o=[];for(let i=0;i+8<=bits.length;i+=8)o.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(o)};
const code=(sec,d=0)=>hotp(unb32(sec),Math.floor(Date.now()/3e4)+d);
async function boot(env={},db){const port=5200+Math.floor(Math.random()*700),f=db||path.join(os.tmpdir(),'fika-sec-'+port+'.json');
  const p=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:port,DB_FILE:f,HIBP:'0',GAME_MIN_MS:'0',OWNER_EMAIL:'o@t.io',OWNER_PASSWORD:OWN_PW,SEED_FILE:path.join(__dirname,'fixture-seed.json'),...env}});procs.push(p);
  const base='http://localhost:'+port;for(let i=0;i<80;i++){try{await fetch(base+'/api/bootstrap');break}catch{await new Promise(r=>setTimeout(r,100))}}
  const call=async(u,b,m,c)=>{const r=await fetch(base+u,{method:m||(b?'POST':'GET'),headers:{...H,...(c?{cookie:c}:{})},body:b?JSON.stringify(b):undefined});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return{s:r.status,j,h:r.headers,c:(r.headers.get('set-cookie')||'').split(';')[0]}};
  return{p,port,f,base,call,kill:()=>new Promise(r=>{p.on('exit',r);p.kill()})}}
after(()=>procs.forEach(p=>p.kill()));
const reg=(S,e,pw=PW)=>S.call('/api/auth/register',{name:'T',email:e,password:pw});
async function ownerWithMfa(S){const l=await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW});assert.equal(l.s,200);
  assert.equal((await S.call('/api/admin/dashboard',null,'GET',l.c)).j.error,'MFA_REQUIRED');
  const su=await S.call('/api/me/2fa/setup',{currentPassword:OWN_PW},'POST',l.c);assert.equal(su.s,200);
  const en=await S.call('/api/me/2fa/enable',{code:code(su.j.secret)},'POST',l.c);assert.equal(en.s,200);assert.equal(en.j.codes.length,8);
  return{c:l.c,secret:su.j.secret,codes:en.j.codes}}

test('A3/A1: 5 failures lock the account; unknown e-mail behaves identically; no "locked" message; timing is similar',async()=>{
  const S=await boot({ADMIN_MFA:'off'});try{await reg(S,'lock@t.io');
  const fail=async e=>S.call('/api/auth/login',{email:e,password:'wrong-wrong-wrong'});
  const t=[],tu=[];let a,b;
  for(let i=0;i<5;i++){let x=performance.now();a=await fail('lock@t.io');t.push(performance.now()-x);x=performance.now();b=await fail('ghost'+(i%1)+'@t.io');tu.push(performance.now()-x)}
  assert.deepEqual([a.s,a.j.error],[b.s,b.j.error]);assert.equal(a.s,401);
  const lk=await S.call('/api/auth/login',{email:'lock@t.io',password:PW});assert.equal(lk.s,401);assert.equal(lk.j.error,'INVALID_CREDENTIALS');
  const gl=await S.call('/api/auth/login',{email:'ghost0@t.io',password:PW});assert.equal(gl.s,401);
  const avg=x=>x.reduce((p,c)=>p+c,0)/x.length;assert.ok(avg(tu)>avg(t)/3,'unknown e-mail must cost about as much time as a known one: '+avg(tu)+' vs '+avg(t));
  assert.equal((await S.call('/api/auth/register',{name:'x',email:'lock@t.io',password:PW})).s,409)}finally{await S.kill()}});

test('A3 backoff + unlock path, A9 idle/absolute timeouts, A13 reset link (single use, hashed, expiring), A12 sessions',async()=>{
  let S=await boot({ADMIN_MFA:'off'});const f=S.f;
  try{const r=await reg(S,'u1@t.io');const old=r.c;
    for(let i=0;i<5;i++)await S.call('/api/auth/login',{email:'u1@t.io',password:'bad-bad-bad-bad'});
    assert.equal((await S.call('/api/auth/login',{email:'u1@t.io',password:PW})).s,401,'locked');
    const own=(await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW})).c;
    const rl=await S.call('/api/admin/users/reset-link',{email:'u1@t.io'},'POST',own);assert.equal(rl.s,200);const tok=rl.j.path.split('/').pop();
    const dbtxt=fs.readFileSync(f,'utf8');assert.ok(!dbtxt.includes(tok),'reset token must be stored hashed');
    assert.equal((await S.call('/api/auth/reset',{token:tok,password:'short'})).s,400);
    assert.equal((await S.call('/api/auth/reset',{token:tok,password:'Zx-brand-new-pass-1'})).s,200);
    assert.equal((await S.call('/api/auth/reset',{token:tok,password:'Zx-another-pass-22'})).s,400,'single use');
    assert.equal((await S.call('/api/me',null,'GET',old)).s,401,'reset kills old sessions');
    const li=await S.call('/api/auth/login',{email:'u1@t.io',password:'Zx-brand-new-pass-1'});assert.equal(li.s,200,'reset also unlocks');
    const rl2=await S.call('/api/admin/users/reset-link',{email:'u1@t.io'},'POST',own),tok2=rl2.j.path.split('/').pop();
    // two sessions + logout-all
    const s2=(await S.call('/api/auth/login',{email:'u1@t.io',password:'Zx-brand-new-pass-1'})).c;
    assert.equal((await S.call('/api/auth/logout-all',{},'POST',li.c)).s,200);assert.equal((await S.call('/api/me',null,'GET',s2)).s,401);
    // timeouts: restart with edited sessions
    const s3=(await S.call('/api/auth/login',{email:'u1@t.io',password:'Zx-brand-new-pass-1'})).c,ow2=(await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW})).c;
    await S.kill();const d=JSON.parse(fs.readFileSync(f,'utf8'));
    for(const k in d.sessions){const u=d.users.find(x=>x.id===d.sessions[k].uid);if(u.role==='OWNER')d.sessions[k].last=Date.now()-31*6e4;else d.sessions[k].last=Date.now()-13*864e5}
    d.resets[Object.keys(d.resets)[0]].exp=Date.now()-1000;fs.writeFileSync(f,JSON.stringify(d));
    S=await boot({ADMIN_MFA:'off'},f);
    assert.equal((await S.call('/api/me',null,'GET',s3)).s,200,'customer idle 13 days is still fine');
    assert.equal((await S.call('/api/me',null,'GET',ow2)).s,401,'staff idle 31 minutes is logged out');
    assert.equal((await S.call('/api/auth/reset',{token:tok2,password:'Zx-late-pass-1234'})).s,400,'expired link');
    await S.kill();const d2=JSON.parse(fs.readFileSync(f,'utf8'));for(const k in d2.sessions)d2.sessions[k].cr=Date.now()-13*36e5;fs.writeFileSync(f,JSON.stringify(d2));
    S=await boot({ADMIN_MFA:'off'},f);assert.equal((await S.call('/api/me',null,'GET',s3)).s,200,'customer absolute limit is 30 days');
  }finally{await S.kill()}});

test('A15/A8: admin needs 2FA; TOTP is single-use; recovery codes work once; wrong code counts as a failure',async()=>{
  const S=await boot({ADMIN_STRICT:'1'});try{const o=await ownerWithMfa(S);
    assert.equal((await S.call('/api/admin/dashboard',null,'GET',o.c)).s,200);
    const need=await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW});assert.equal(need.s,401);assert.equal(need.j.error,'OTP_REQUIRED');
    assert.equal((await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW,otp:'000000'})).j.error,'INVALID_OTP');
    const ok=await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW,otp:code(o.secret,1)});assert.equal(ok.s,200);
    assert.equal((await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW,otp:code(o.secret,1)})).j.error,'INVALID_OTP','same code cannot be replayed');
    const rc=await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW,otp:o.codes[0]});assert.equal(rc.s,200);
    assert.equal((await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW,otp:o.codes[0]})).j.error,'INVALID_OTP','recovery code is single use');
    assert.ok(!fs.readFileSync(S.f,'utf8').includes(o.codes[1]),'recovery codes stored hashed');
    assert.ok(!fs.readFileSync(S.f,'utf8').includes(o.secret),'TOTP secret is encrypted at rest');
    const dis=await S.call('/api/me/2fa/disable',{currentPassword:OWN_PW,code:o.codes[1]},'POST',rc.c);assert.equal(dis.s,200);
    assert.equal((await S.call('/api/admin/dashboard',null,'GET',rc.c)).j.error,'MFA_REQUIRED')}finally{await S.kill()}});

test('F11: password policy (length, common, e-mail based) on register, change and reset',async()=>{
  const S=await boot({ADMIN_MFA:'off'});try{
    const code=async(e,p,x)=>(await S.call('/api/auth/register',{name:'T',email:e,password:p,...x})).j.error;
    assert.equal(await code('p1@t.io','short12'),'SHORT_PASSWORD');assert.equal(await code('p5@t.io','x'.repeat(129)),'INVALID_INPUT');
    for(const [e,p] of [['p2@t.io','password123'],['p3@t.io','aaaaaaaaaaaa'],['pablo@t.io','my-pablo-secret-1']]){assert.equal(await code(e,p),'WEAK_PASSWORD',p);}
    assert.equal((await S.call('/api/auth/register',{name:'T',email:'weak@t.io',password:'password123',acceptWeak:true})).s,200,'customer may confirm an easy password');
    assert.equal((await reg(S,'eight@t.io','Xk9#mPq2')).s,200,'8 characters are enough');
    assert.equal((await S.call('/api/setup',{email:'x@t.io',password:'password123',acceptWeak:true})).s,409);
    const r=await reg(S,'ok@t.io','a long passphrase with spaces');assert.equal(r.s,200);
    assert.equal((await S.call('/api/me/account',{currentPassword:'a long passphrase with spaces',newPassword:'123456789012'},'PATCH',r.c)).j.error,'WEAK_PASSWORD')}finally{await S.kill()}});

test('D11: delete my account removes personal data, ends sessions, keeps only anonymous sales',async()=>{
  const S=await boot({ADMIN_MFA:'off'});try{const r=await reg(S,'bye@t.io');
    const m=(await S.call('/api/bootstrap',null,'GET',r.c)).j.menu,vid=m.find(p=>p.variants[0].price>0&&p.variants[0].stock>3).variants[0].id;
    const od=await S.call('/api/orders',{lines:[{variantId:vid,qty:1}]},'POST',r.c);assert.equal(od.s,200);await S.call('/api/me/favs',{favs:[m[0].id]},'PUT',r.c);
    assert.equal((await S.call('/api/me/delete',{currentPassword:'wrong',confirm:'DELETE'},'POST',r.c)).s,403);
    assert.equal((await S.call('/api/me/delete',{currentPassword:PW},'POST',r.c)).s,400,'needs the confirm word');
    assert.equal((await S.call('/api/me/delete',{currentPassword:PW,confirm:'DELETE'},'POST',r.c)).s,200);
    assert.equal((await S.call('/api/me',null,'GET',r.c)).s,401);assert.equal((await S.call('/api/auth/login',{email:'bye@t.io',password:PW})).s,401);
    const d=JSON.parse(fs.readFileSync(S.f,'utf8'));assert.ok(!JSON.stringify(d).includes('bye@t.io'));assert.equal(d.orders.length,1);assert.equal(d.orders[0].uid,null);assert.ok(!d.ledger.some(l=>l.uid&&!d.users.some(u=>u.id===l.uid)));
    const own=(await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW})).c;assert.equal((await S.call('/api/me/delete',{currentPassword:OWN_PW,confirm:'DELETE'},'POST',own)).j.error,'LAST_OWNER')}finally{await S.kill()}});

test('F15/F7: SSE never shows user ids to strangers, is capped; /api/track is rate limited',async()=>{
  const S=await boot({ADMIN_MFA:'off'});try{const r=await reg(S,'sse@t.io');const own=(await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW})).c;
    const m=(await S.call('/api/bootstrap',null,'GET',r.c)).j.menu,vid=m.find(p=>p.variants[0].price>0&&p.variants[0].stock>3).variants[0].id;
    const ac=new AbortController(),anon=await fetch(S.base+'/api/events',{signal:ac.signal}),mine=await fetch(S.base+'/api/events',{headers:{cookie:r.c},signal:ac.signal});
    const read=async res=>{let t='';const rd=res.body.getReader();const end=Date.now()+700;while(Date.now()<end){const x=await Promise.race([rd.read(),new Promise(z=>setTimeout(()=>z(null),200))]);if(x&&x.value)t+=Buffer.from(x.value).toString()}return t};
    const od=await S.call('/api/orders',{lines:[{variantId:vid,qty:1}]},'POST',r.c);
    await S.call('/api/admin/orders/'+od.j.order.id,{status:'COMPLETED'},'PATCH',own);
    const [a,b]=await Promise.all([read(anon),read(mine)]);ac.abort();
    assert.ok(!/u_[0-9a-f]/.test(a),'anonymous stream must not contain a user id');assert.match(b,/"uid":"u_/);
    let last;for(let i=0;i<125;i++)last=await S.call('/api/track',{type:'page_view'});assert.equal(last.s,429);assert.ok(last.h.get('retry-after'))}finally{await S.kill()}});

test('F13/D7: db and backup files are private, backup is encrypted; security log has no secrets',async()=>{
  const S=await boot({ADMIN_MFA:'off'});try{await reg(S,'log@t.io');await S.call('/api/auth/login',{email:'log@t.io',password:'Wrong-Wrong-1'});await new Promise(r=>setTimeout(r,300));
    if(process.platform!=='win32')assert.equal((fs.statSync(S.f).mode&0o777),0o600);
    const dir=path.join(path.dirname(S.f),'backups'),bk=fs.readdirSync(dir).filter(x=>x.endsWith('.enc')).sort().pop();assert.ok(bk);
    assert.ok(!fs.readFileSync(path.join(dir,bk),'utf8').includes('log@t.io'),'backup is encrypted');
    const lg=fs.readFileSync(path.join(path.dirname(S.f),'security.log'),'utf8');assert.match(lg,/login_fail/);assert.ok(!lg.includes('log@t.io')&&!lg.includes('Wrong-Wrong'),'log has masked e-mail and no password');
    const r=await S.call('/api/orders',{lines:[]},'POST','sid=nope');assert.equal(r.s,401);assert.ok(r.j.rid&&r.h.get('x-request-id'))}finally{await S.kill()}});

test('F10: challenge ids/categories are validated; backup restore tool round-trips',async()=>{
  const S=await boot({ADMIN_MFA:'off'});try{const o=(await S.call('/api/auth/login',{email:'o@t.io',password:OWN_PW})).c;
    const ch=b=>S.call('/api/admin/challenges',{titleEn:'T',titleFa:'T',descEn:'d',descFa:'d',rewardEn:'r',rewardFa:'r',goal:2,pts:5,days:3,ruleType:'orders',...b},'POST',o);
    assert.equal((await ch({id:'"><img src=x onerror=alert(1)>'})).s,400);assert.equal((await ch({id:'ok-id',catKey:'nope'})).s,400);assert.equal((await ch({id:'ok-id'})).s,200);
    await new Promise(r=>setTimeout(r,200));const dir=path.join(path.dirname(S.f),'backups'),bk=fs.readdirSync(dir).filter(x=>x.endsWith('.enc')).sort().pop();
    const out=path.join(os.tmpdir(),'fika-sec-restore-'+Date.now()+'.json');fs.copyFileSync(S.f+'.key',out+'.key');
    require('child_process').execFileSync(process.execPath,['tools/restore-backup.js',path.join(dir,bk),out]);
    assert.ok(JSON.parse(fs.readFileSync(out,'utf8')).users.some(u=>u.email==='o@t.io'))}finally{await S.kill()}});

test('Staff login: local mode is easy (8 chars, easy password = confirm, 2FA optional); strict mode keeps 12 chars, no easy passwords, 2FA required',async()=>{
  let S=await boot({ADMIN_MFA:'',OWNER_EMAIL:'',OWNER_PASSWORD:''});try{
    assert.equal((await S.call('/api/setup')).j.strict,false);
    assert.equal((await S.call('/api/setup',{email:'own@t.io',password:'short1'})).j.error,'SHORT_PASSWORD');
    assert.equal((await S.call('/api/setup',{email:'own@t.io',password:'password123'})).j.error,'WEAK_PASSWORD','easy password asks first');
    const r=await S.call('/api/setup',{email:'own@t.io',password:'password123',acceptWeak:true});assert.equal(r.s,200,'...and is accepted once confirmed');
    assert.equal(r.j.mfaReq,false);assert.equal((await S.call('/api/admin/dashboard',null,'GET',r.c)).s,200,'no 2FA needed locally');
    assert.equal((await S.call('/api/me/2fa/setup',{currentPassword:'password123'},'POST',r.c)).s,200,'2FA can still be turned on')}finally{await S.kill()}
  S=await boot({ADMIN_MFA:'',ADMIN_STRICT:'1',OWNER_EMAIL:'',OWNER_PASSWORD:''});try{
    assert.equal((await S.call('/api/setup')).j.strict,true);
    assert.equal((await S.call('/api/setup',{email:'own@t.io',password:'Xk9#mPq2'})).j.error,'WEAK_PASSWORD','8 chars refused in strict mode');
    assert.equal((await S.call('/api/setup',{email:'own@t.io',password:'password123456',acceptWeak:true})).j.error,'WEAK_PASSWORD','no override in strict mode');
    const r=await S.call('/api/setup',{email:'own@t.io',password:'cafe-blue-27-coffee!'});assert.equal(r.s,200);
    assert.equal((await S.call('/api/admin/dashboard',null,'GET',r.c)).j.error,'MFA_REQUIRED')}finally{await S.kill()}});

test('Hosting: /healthz answers without data; TRUST_PROXY=N picks the client IP N hops from the right; SIGTERM exits cleanly',async()=>{
  for(const [hops,want] of [['1','2.2.2.2'],['2','1.1.1.1']]){
    const S=await boot({OWNER_EMAIL:'',OWNER_PASSWORD:'',TRUST_PROXY:hops,COOKIE_SECURE:'1'});let out='';S.p.stdout.on('data',d=>out+=d);
    try{const h=await fetch(S.base+'/healthz');assert.equal(h.status,200);assert.equal(await h.text(),'ok');assert.equal(h.headers.get('cache-control'),'no-store');
      await new Promise(r=>setTimeout(r,300));const sc=/Setup code[^:]*: (\w+)/.exec(out);assert.ok(sc,'setup code is printed for non-local first run');
      const r=await fetch(S.base+'/api/setup',{method:'POST',headers:{'content-type':'application/json','x-requested-with':'fika','x-forwarded-for':'1.1.1.1, 2.2.2.2','x-forwarded-proto':'https'},body:JSON.stringify({email:'own@t.io',password:'cafe-blue-27-coffee!',code:sc[1]})});
      assert.equal(r.status,200);assert.match(r.headers.get('set-cookie')||'',/__Host-sid=/);
      await new Promise(r=>setTimeout(r,200));assert.ok(out.includes('"ip":"'+want+'"'),'hops='+hops+' -> '+want+' but log was: '+out.split('\n').filter(l=>l.includes('setup')).join('|'))}
    finally{const code=await new Promise(r=>{S.p.on('exit',(c,s)=>r(c));S.p.kill('SIGTERM')});assert.equal(code,0,'SIGTERM shuts down cleanly')}}});
