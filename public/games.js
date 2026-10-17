// Coffee games page. The server owns the questions, the card layout and every score;
// this file only draws the games and sends back what the player did.
const T={
 en:{h:'Coffee Games',sub:'Play short coffee games, climb the weekly board and earn points that count towards your free coffee.',
  ends:'Week ends in',d:'d',hr:'h',prizes:'Top 3 each week win',pts:'pts',per:n=>`Up to ${n} points per game`,daily:n=>`${n} rewarded plays per game per day`,
  mem:'Bean Match',memD:'Flip the cards and find all 8 pairs in as few moves as you can.',quiz:'Barista Quiz',quizD:'Five quick questions about coffee. Fast and right scores highest.',
  left:(a,b)=>`${a} of ${b} rewarded plays used today`,play:'Play',login:'Sign in to play',board:'Weekly leaderboard',empty:'Nobody has played yet this week. Be the first!',you:'You',
  rank:'Your rank',score:'score',back:'← Back',moves:'Moves',time:'Time',q:'Question',again:'Play again',home:'All games',
  good:'Nice game!',gain:n=>`+${n} points added to your account`,capped:'Daily reward limit reached — your score still counts on the leaderboard.',zero:'Your score counts on the leaderboard.',
  wk:'This week',correct:'Correct',err:'Something went wrong. Please try again.',fast:'That was too fast to be real — try again.',tomorrow:'Rewards reset every day.'},
 fa:{h:'بازی‌های قهوه',sub:'بازی‌های کوتاه قهوه‌ای بکن، در جدول هفتگی بالا برو و امتیازی بگیر که برای قهوهٔ رایگانت حساب می‌شود.',
  ends:'پایان هفته تا',d:'روز',hr:'ساعت',prizes:'سه نفر اول هر هفته',pts:'امتیاز',per:n=>`تا ${n} امتیاز برای هر بازی`,daily:n=>`${n} بار بازی امتیازدار در روز برای هر بازی`,
  mem:'جفت‌یابی دانه',memD:'کارت‌ها را بچرخان و هر ۸ جفت را با کمترین حرکت پیدا کن.',quiz:'کوییز باریستا',quizD:'پنج سؤال کوتاه دربارهٔ قهوه. سریع و درست، بیشترین امتیاز را دارد.',
  left:(a,b)=>`${a} از ${b} بازی امتیازدار امروز استفاده شده`,play:'شروع بازی',login:'برای بازی وارد شو',board:'جدول هفتگی',empty:'این هفته هنوز کسی بازی نکرده. اولین نفر باش!',you:'تو',
  rank:'رتبهٔ تو',score:'امتیاز بازی',back:'→ بازگشت',moves:'حرکت',time:'زمان',q:'سؤال',again:'بازی دوباره',home:'همهٔ بازی‌ها',
  good:'آفرین!',gain:n=>`${n} امتیاز به حسابت اضافه شد`,capped:'سقف جایزهٔ امروز پر شده — امتیاز بازی‌ات همچنان در جدول حساب می‌شود.',zero:'امتیاز بازی‌ات در جدول حساب می‌شود.',
  wk:'این هفته',correct:'درست',err:'مشکلی پیش آمد. دوباره امتحان کن.',fast:'این‌قدر سریع واقعی نیست — دوباره امتحان کن.',tomorrow:'جایزه‌ها هر روز دوباره شروع می‌شوند.'}};
import {ico,medal,SYMS} from './icons.js';
const SYM=SYMS.map(n=>ico(n,'sym'));
const esc=t=>String(t).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');

export const gamesShell=()=>'<div id="gm" class="gm"><div class="skel" aria-hidden="true"><i style="height:2rem;width:55%"></i><i style="height:8rem"></i><i style="height:8rem"></i></div></div>';

export async function mountGames({lang,api,me,loc,refresh}){
 const t=T[lang],nf=n=>Number(n).toLocaleString(loc),root=()=>document.getElementById('gm');
 let timer=0;const stop=()=>{clearInterval(timer);timer=0};
 const err=c=>c==='TOO_FAST'?t.fast:t.err;
 async function menu(){stop();const el=root();if(!el)return;const g=await api('/api/games');if(!root())return;if(g.error){el.innerHTML=`<p class="err">${t.err}</p>`;return}
  const ms=g.week.endsAt-Date.now(),dd=Math.max(0,Math.floor(ms/864e5)),hh=Math.max(0,Math.floor(ms%864e5/36e5));
  const used=k=>g.me?g.me.used[k]:0,cardHtml=(k,e,title,desc)=>`<article class="gm-card"><div class="gm-ill" aria-hidden="true">${e}</div><h3>${title}</h3><p class="muted">${desc}</p>${g.me?`<p class="gm-left">${t.left(nf(used(k)),nf(g.daily))}</p><button class="btn p" data-play="${k}">${t.play}</button>`:`<a class="btn p" href="#/login">${t.login}</a>`}</article>`;
  const rows=g.board.length?g.board.map(r=>`<li class="${r.me?'me':''}"><span class="rk">${r.rank<=3?medal(r.rank):nf(r.rank)}</span><span class="nm">${esc(r.name)}${r.me?` <small>(${t.you})</small>`:''}</span><b>${nf(r.score)}</b></li>`).join(''):`<li class="empty">${t.empty}</li>`;
  el.innerHTML=`<header id="gm-head"><h1>${ico('game','h')} ${t.h}</h1><p class="muted">${t.sub}</p><ul class="gm-facts"><li>${ico('hourglass','in')} ${t.ends} <b>${nf(dd)} ${t.d} ${nf(hh)} ${t.hr}</b></li><li>${ico('trophy','in')} ${t.prizes}: <b>${g.prizes.map(nf).join(' · ')}</b> ${t.pts}</li><li>${ico('star','in')} ${t.per(nf(g.ptsMax))} · ${t.daily(nf(g.daily))}</li></ul></header>
  <div id="gm-menu"><section class="gm-games">${cardHtml('memory',ico('cup')+ico('bean'),t.mem,t.memD)}${cardHtml('quiz',ico('brain')+ico('cup'),t.quiz,t.quizD)}</section>
  <section class="sec"><div class="row"><h2>${t.board}</h2>${g.me&&g.me.rank?`<span class="tag ok">${t.rank}: ${nf(g.me.rank)}</span>`:''}</div><ol class="gm-board">${rows}</ol></section></div><div id="gm-stage" hidden></div>`;
  el.onclick=e=>{const b=e.target.closest('[data-play]');if(b)start(b.dataset.play)}}
 const stage=html=>{const m=document.getElementById('gm-menu'),s=document.getElementById('gm-stage');if(!s)return null;m.hidden=true;document.getElementById('gm-head').hidden=true;s.hidden=false;s.innerHTML=html;scrollTo({top:0});return s};
 const result=(game,r)=>{stop();const s=stage(`<div class="gm-res"><div class="gm-big" aria-hidden="true">${ico(game==='memory'?'bean':'brain')}</div><h2>${t.good}</h2><div class="gm-score">${nf(r.score)}</div><p class="muted">${t.score}</p>
   <p class="gm-gain">${r.pts>0?t.gain(nf(r.pts)):r.capped?t.capped:t.zero}</p><p>${t.wk}: <b>${nf(r.weekScore)}</b> · ${t.rank}: <b>${nf(r.rank)}</b></p>
   <div class="gm-actions"><button class="btn p" data-again>${t.again}</button><button class="btn" data-home>${t.home}</button></div></div>`);
  s.onclick=e=>{if(e.target.closest('[data-again]'))start(game);else if(e.target.closest('[data-home]'))menu()};refresh&&refresh()};
 const topBar=(extra)=>`<div class="gm-bar"><button class="btn s" data-home>${t.back}</button>${extra}</div>`;
 async function start(game){stop();game==='memory'?memory():quiz()}
 async function memory(){const r=await api('/api/games/memory/start',{},'POST');if(r.error){menu();return}
  const lay=r.layout,flips=[],done=new Set();let open=[],lock=false,moves=0,t0=0;
  const s=stage(topBar(`<span>${t.moves} <b id="mv">0</b></span><span>${t.time} <b id="tm">0</b></span>`)+`<div class="mem" role="group" aria-label="${t.mem}">${lay.map((v,i)=>`<button type="button" class="mc" data-i="${i}" aria-label="${t.mem} ${i+1}"><span class="f" aria-hidden="true" data-s="${v}">${SYM[v]}</span></button>`).join('')}</div>`);
  s.onclick=async e=>{if(e.target.closest('[data-home]')){stop();menu();return}
   const b=e.target.closest('.mc');if(!b||lock)return;const i=+b.dataset.i;if(done.has(i)||open.includes(i))return;
   if(!t0){t0=Date.now();timer=setInterval(()=>{const x=document.getElementById('tm');if(!x)return stop();x.textContent=nf(Math.floor((Date.now()-t0)/1000))},500)}
   flips.push(i);open.push(i);b.classList.add('up');
   if(open.length===2){moves++;document.getElementById('mv').textContent=nf(moves);const[a,c]=open;
    if(lay[a]===lay[c]){done.add(a);done.add(c);open.forEach(k=>{const el=s.querySelector(`[data-i="${k}"]`);el.classList.add('ok');el.disabled=true});open=[];
     if(done.size===16){stop();lock=true;const res=await api('/api/games/memory/finish',{sid:r.sid,flips},'POST');if(res.error){stage(`<p class="err">${err(res.error)}</p><button class="btn" data-home>${t.home}</button>`).onclick=menu;return}result('memory',res)}}
    else{lock=true;const pair=open;open=[];setTimeout(()=>{pair.forEach(k=>{const el=s.querySelector(`[data-i="${k}"]`);el&&el.classList.remove('up')});lock=false},750)}}}}
 async function quiz(){const r=await api('/api/games/quiz/start',{lang},'POST');if(r.error){menu();return}
  const qs=r.qs;let i=0;const t0=Date.now();
  const show=()=>{const q=qs[i],s=stage(topBar(`<span>${t.q} <b>${nf(i+1)}</b> / ${nf(qs.length)}</span><span>${t.time} <b id="tm">${nf(Math.floor((Date.now()-t0)/1000))}</b></span>`)+
    `<div class="bar" style="margin:6px 0 18px"><i style="width:${i/qs.length*100}%"></i></div><h2 class="gm-q">${esc(q.q)}</h2><div class="gm-opts">${q.o.map((o,k)=>`<button type="button" class="gm-opt" data-k="${k}">${esc(o)}</button>`).join('')}</div>`);
   delete s.dataset.lock;stop();timer=setInterval(()=>{const x=document.getElementById('tm');if(!x)return stop();x.textContent=nf(Math.floor((Date.now()-t0)/1000))},500);
   s.onclick=async e=>{if(e.target.closest('[data-home]')){stop();menu();return}
    const b=e.target.closest('.gm-opt');if(!b||s.dataset.lock)return;s.dataset.lock=1;const k=+b.dataset.k;
    const a=await api('/api/games/quiz/answer',{sid:r.sid,i,choice:k},'POST');if(a.error){menu();return}
    b.classList.add(a.correct?'right':'wrong');s.querySelector(`[data-k="${a.answer}"]`).classList.add('right');s.querySelectorAll('.gm-opt').forEach(x=>x.disabled=true);
    setTimeout(async()=>{i++;if(i<qs.length){show();return}stop();const res=await api('/api/games/quiz/finish',{sid:r.sid},'POST');if(res.error){stage(`<p class="err">${err(res.error)}</p><button class="btn" data-home>${t.home}</button>`).onclick=menu;return}result('quiz',res)},a.correct?800:1300)}};
  show()}
 await menu();
}
