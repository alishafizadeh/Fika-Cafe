// Hand-drawn SVG illustrations (drinks, desserts) and small UI icons. No external files, no emoji.
// art('cup:coffee:foam,heart') -> "<svg>…</svg>".  Spec = type:tint[:options]. A tint "a+b" is a two-layer drink (bottom+top).
const P={espresso:'#3b2417',coffee:'#6a4430',milk:'#efe0c8',caramel:'#c98a4b',mocha:'#6b3f2a',choc:'#4a2c20',cocoa:'#7a4a35',nutella:'#6a3b25',
 peanut:'#c8935a',pistachio:'#a9c26b',matcha:'#8fb85a',pink:'#f4a4b8',mango:'#f6b042',saffron:'#f3a712',tea:'#b8651b',green:'#b9c96a',white:'#efe3b9',
 red:'#c2263f',lemon:'#f1de5b',verbena:'#b7d36f',borage:'#9b7fd0',apple:'#e2a14a',orange:'#f28c28',cola:'#3a2a22',blue:'#3aa8a0',vanilla:'#f4e6bd',
 lotus:'#b5703a',oreo:'#4b4247',whitechoc:'#f4ead6'};
const col=k=>P[k]||P.coffee;
const mix=(h,t,a)=>{const n=x=>parseInt(x,16),p=s=>[n(s.slice(1,3)),n(s.slice(3,5)),n(s.slice(5,7))],A=p(h),B=p(t);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*a).toString(16).padStart(2,'0')).join('')};
const lt=(h,a=.35)=>mix(h,'#ffffff',a),dk=(h,a=.3)=>mix(h,'#000000',a);
let uid=0;
const steam=(x=60,y=34,o=.45)=>`<g fill="none" stroke="#a89580" stroke-width="3" stroke-linecap="round" opacity="${o}"><path d="M${x-12} ${y+8}c-5-6 5-9 0-16"/><path d="M${x} ${y+10}c-5-7 5-11 0-19"/><path d="M${x+12} ${y+8}c-5-6 5-9 0-16"/></g>`;
const WHITE='#faf5ec',SH='#e3d8c6';

function cup(c,o){const sm=o.has('small'),mug=o.has('mug'),top=o.has('foam')||o.has('heart')?(c==='coffee'||c==='espresso'?P.milk:lt(c,.55)):c;
 const bw=mug?32:34,id=uid++;
 let s=`<ellipse cx="60" cy="100" rx="42" ry="7" fill="${SH}"/><ellipse cx="60" cy="97" rx="40" ry="7" fill="#efe6d6"/>`+
 `<path d="M${60+bw-4} 60h6a10 10 0 0 1 0 24h-12" fill="none" stroke="#efe6d6" stroke-width="7" stroke-linecap="round"/>`+
 `<path d="M${60-bw} 52h${bw*2}v${mug?24:16}c0 ${mug?16:18}-${mug?10:14} ${mug?24:28}-${bw} ${mug?24:28}S${60-bw} ${mug?92:86} ${60-bw} ${mug?76:68}z" fill="${WHITE}"/>`+
 `<path d="M${60+bw-12} 54h12v${mug?22:16}c0 14-8 22-20 26 6-6 8-14 8-26z" fill="#000" opacity=".06"/>`+
 `<ellipse cx="60" cy="52" rx="${bw}" ry="8" fill="${SH}"/><ellipse cx="60" cy="52.5" rx="${bw-4}" ry="6" fill="${c}"/>`;
 if(top!==c)s+=`<ellipse cx="60" cy="52.5" rx="${bw-5}" ry="5.5" fill="${top}"/>`;
 if(o.has('heart'))s+=`<path d="M60 56c-9-5-9-10-4.5-10.5 2.5 0 4.5 2 4.5 3.5 0-1.500 2-3.500 4.5-3.500 4.500.500 4.500 5.500-4.500 10.500z" fill="${c==='coffee'?P.coffee:dk(c,.1)}" opacity=".85" transform="translate(0 -1)"/>`;
 if(o.has('drizzle'))s+=`<path d="M38 52c6 2 10-5 16-2s9 5 14 1 10-4 14-1" fill="none" stroke="${P.caramel}" stroke-width="2.5" stroke-linecap="round"/>`;
 if(o.has('cream'))s+=`<g><ellipse cx="60" cy="48" rx="26" ry="8" fill="#fffaf0"/><ellipse cx="60" cy="40" rx="19" ry="7" fill="#fffaf0"/><ellipse cx="60" cy="33" rx="11" ry="6" fill="#fffaf0"/><path d="M42 49c8 3 28 3 36 0M48 41c6 2 18 2 24 0" fill="none" stroke="#eadfcb" stroke-width="2" stroke-linecap="round"/><circle cx="62" cy="26" r="3.500" fill="#d1344a"/></g>`;
 if(o.has('cinnamon'))s+=`<g stroke-linecap="round"><path d="M84 96L100 62" stroke="#8a4e2a" stroke-width="7"/><path d="M82 96L98 62" stroke="#b06a3a" stroke-width="3"/></g>`;
 if(o.has('lemon'))s+=`<g transform="translate(86 90)"><circle r="11" fill="${P.lemon}"/><circle r="8.500" fill="#f7eb91"/><path d="M0-8v16M-7-4l14 8M-7 4l14-8" stroke="${P.lemon}" stroke-width="1.500"/></g>`;
 if(!o.has('cream'))s+=steam(60,26);
 return sm?`<g transform="translate(60 100) scale(.78) translate(-60 -100)">${s}</g>`:s}

function tall(cs,o){const [c,c2]=cs,id='g'+uid++,xl=y=>38+.1486*(y-24),xr=y=>82-.1486*(y-24),ly=o.has('cream')?36:34,my=70;
 const grad=c2?`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset=".42" stop-color="${c2}"/><stop offset=".62" stop-color="${mix(c,c2,.5)}"/><stop offset=".85" stop-color="${c}"/></linearGradient></defs>`:'';
 const fill=c2?`url(#${id})`:c;
 let s=grad+`<path d="M38 24h44l-5 74a6 6 0 0 1-6 5H49a6 6 0 0 1-6-5z" fill="#fff" fill-opacity=".5" stroke="#cfc3b0" stroke-width="2"/>`;
 if(o.has('straw'))s+=`<path d="M72 8l-5 3-8 52" stroke="${c2||c}" stroke-width="4.500" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
 s+=`<path d="M${xl(ly)+1} ${ly}H${xr(ly)-1}L${xr(98)-1.500} 98a4 4 0 0 1-4 4H${xl(98)+5.500}a4 4 0 0 1-4-4z" fill="${fill}"/>`+
 `<path d="M${xl(ly)+1} ${ly}H${xr(ly)-1}" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`;
 if(o.has('ice'))s+=`<g fill="#fff" fill-opacity=".55" stroke="#fff" stroke-opacity=".8"><rect x="46" y="${ly+2}" width="15" height="15" rx="3" transform="rotate(-12 53 ${ly+9})"/><rect x="62" y="${ly+10}" width="14" height="14" rx="3" transform="rotate(14 69 ${ly+17})"/><rect x="49" y="${ly+26}" width="13" height="13" rx="3" transform="rotate(8 55 ${ly+32})"/></g>`;
 s+=`<path d="M45 30l-1 50" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
 if(o.has('cream'))s+=`<g><ellipse cx="60" cy="31" rx="21" ry="7" fill="#fffaf0"/><ellipse cx="60" cy="24" rx="15" ry="6" fill="#fffaf0"/><ellipse cx="60" cy="18" rx="8" ry="5" fill="#fffaf0"/><circle cx="60" cy="12" r="3.200" fill="#d1344a"/></g>`;
 if(o.has('mint'))s+=`<g><path d="M52 24c-9-2-13-12-12-17 8 0 14 6 12 17z" fill="#4f9d4b"/><path d="M62 22c1-10 7-15 14-15 1 8-4 15-14 15z" fill="#68b75f"/><path d="M57 24c-5-6-3-14 3-17 5 4 5 12-3 17z" fill="#3f8a3f"/></g>`;
 if(o.has('lime'))s+=`<g transform="translate(80 34)"><circle r="12" fill="#6aa83e"/><circle r="9.500" fill="#cfe58c"/><path d="M0-9v18M-8-4.500l16 9M-8 4.500l16-9" stroke="#8cbf56" stroke-width="1.500"/></g>`;
 if(o.has('lemon'))s+=`<g transform="translate(80 34)"><circle r="12" fill="#e5cd2f"/><circle r="9.500" fill="#f7eb91"/><path d="M0-9v18M-8-4.500l16 9M-8 4.500l16-9" stroke="#e5cd2f" stroke-width="1.500"/></g>`;
 if(o.has('orange'))s+=`<g transform="translate(80 34)"><circle r="12" fill="#e57a12"/><circle r="9.500" fill="#fbb04c"/><path d="M0-9v18M-8-4.500l16 9M-8 4.500l16-9" stroke="#e57a12" stroke-width="1.500"/></g>`;
 if(o.has('strawberry'))s+=`<g transform="translate(82 34)"><path d="M0 12C-12 4-12-8 0-8s12 12 0 20z" fill="#e0344f"/><path d="M-6-8l6-5 6 5z" fill="#4f9d4b"/><g fill="#fcd0d6"><circle cx="-3" cy="-1" r="1"/><circle cx="3" cy="1" r="1"/><circle cx="0" cy="6" r="1"/></g></g>`;
 return s}

function shake(c,o){const id=uid++,top=lt(c,.2);
 let s=`<path d="M70 14l-6 30" stroke="#e55a7a" stroke-width="4.500" stroke-linecap="round"/>`+
 `<path d="M33 42h54l-6 56a6 6 0 0 1-6 5H45a6 6 0 0 1-6-5z" fill="#fff" fill-opacity=".5" stroke="#cfc3b0" stroke-width="2"/>`+
 `<path d="M35.500 48h49l-4.500 49a4 4 0 0 1-4 3.500H44a4 4 0 0 1-4-3.500z" fill="${c}"/><path d="M35.500 48h49" stroke="${top}" stroke-width="3"/>`+
 `<path d="M44 52l-1.500 40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".5"/>`+
 `<g><path d="M30 44c-2-16 12-24 30-24s32 8 30 24z" fill="#fffaf0"/><path d="M38 38c8 4 36 4 44 0M44 30c6 3 26 3 32 0" fill="none" stroke="#eadfcb" stroke-width="2" stroke-linecap="round"/></g>`+
 `<path d="M44 33c4 5 8 1 12 6s8 0 12 5" fill="none" stroke="${dk(c,.15)}" stroke-width="3" stroke-linecap="round" opacity=".75"/>`+
 `<circle cx="60" cy="14" r="4" fill="#d1344a"/><path d="M60 10c1-3 3-4 5-4" stroke="#4f9d4b" stroke-width="1.500" fill="none"/>`;
 if(c===P.oreo)s+=`<g fill="#2e272b"><rect x="44" y="28" width="7" height="5" rx="1.500" transform="rotate(-20 47 30)"/><rect x="66" y="26" width="8" height="5" rx="1.500" transform="rotate(16 70 28)"/></g>`;
 return s}

function tea(c,o){let s=`<ellipse cx="60" cy="100" rx="38" ry="6" fill="${SH}"/><ellipse cx="60" cy="97" rx="36" ry="6" fill="#efe6d6"/>`+
 `<path d="M40 28h40c1 14-1 28-8 40-3 5-3 10-3 14H51c0-4 0-9-3-14-7-12-9-26-8-40z" fill="#fff" fill-opacity=".55" stroke="#cfc3b0" stroke-width="2"/>`+
 `<path d="M42 38h36c0 12-2 22-8 32-2 4-3 8-3 12H53c0-4-1-8-3-12-6-10-8-20-8-32z" fill="${c}"/><path d="M42 38h36" stroke="${lt(c,.5)}" stroke-width="2.500"/>`+
 `<path d="M46 34l-.5 22" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/><rect x="48" y="82" width="24" height="12" rx="3" fill="#efe6d6" stroke="#cfc3b0" stroke-width="2"/>`;
 if(o.has('spice'))s+=`<g fill="none" stroke="#7a4a2a" stroke-width="2.500" stroke-linecap="round"><path d="M84 70l10-14"/><path d="M88 72l10-14"/></g><circle cx="96" cy="76" r="4" fill="#9a6a35"/><path d="M93 76l6-3" stroke="#e7c58f" stroke-width="1.500"/>`;
 return s+steam(60,20)}

function leaf(x,y,r,f){return `<path d="M${x} ${y}c-8-4-9-15 0-21 9 6 8 17 0 21z" fill="${f}" transform="rotate(${r} ${x} ${y})"/>`}

function brew(c,o){const sw=o.has('switch');
 return `<path d="M42 70h36l6 24c0 4-3 7-7 7H43c-4 0-7-3-7-7z" fill="#fff" fill-opacity=".55" stroke="#cfc3b0" stroke-width="2"/><path d="M40 84h40l2 10c0 3-2 5-5 5H43c-3 0-5-2-5-5z" fill="${c}"/>`+
 `<path d="M30 30h60l-16 28H46z" fill="#f2e9da" stroke="#d6c9b4" stroke-width="2" stroke-linejoin="round"/><path d="M40 30l8 28M52 30l5 28M64 30l-1 28M76 30l-8 28" stroke="#d6c9b4" stroke-width="1.600" fill="none"/>`+
 `<path d="M26 30h68" stroke="#d6c9b4" stroke-width="5" stroke-linecap="round"/><rect x="48" y="58" width="24" height="9" rx="3" fill="#d9ccb6"/>`+
 (sw?`<rect x="78" y="56" width="22" height="6" rx="3" fill="#6a4430"/>`:'')+
 `<g fill="${c}"><circle cx="60" cy="72" r="2.500"/><circle cx="60" cy="78" r="2" opacity=".7"/></g>`+steam(60,10,.35).replace('stroke-width="3"','stroke-width="2.500"')}

function cezve(c){return `<ellipse cx="54" cy="98" rx="30" ry="5" fill="${SH}"/><path d="M34 44h40l8 48a4 4 0 0 1-4 5H30a4 4 0 0 1-4-5z" fill="#c88a4a"/><path d="M60 46l6 50h16l-8-52z" fill="#000" opacity=".08"/><path d="M34 44l-6-5h8l6 5z" fill="#a8702f"/>`+
 `<path d="M30 70h50" stroke="#a8702f" stroke-width="2.500"/><path d="M34 44c0-8 20-8 40 0z" fill="#a8702f"/><ellipse cx="54" cy="44" rx="20" ry="4.500" fill="${c}"/><ellipse cx="54" cy="43" rx="17" ry="3" fill="#8a5a3a"/>`+
 `<path d="M78 56l24-18" stroke="#4a3426" stroke-width="5" stroke-linecap="round"/>`+steam(54,22)}

function affogato(o){return `<ellipse cx="60" cy="102" rx="26" ry="5" fill="${SH}"/><path d="M56 80h8v18h-8z" fill="#e6dccb"/><path d="M34 54h52c0 20-10 30-26 30S34 74 34 54z" fill="#fff" fill-opacity=".6" stroke="#cfc3b0" stroke-width="2"/>`+
 `<path d="M37 60h46c-1 14-9 22-23 22S38 74 37 60z" fill="${P.espresso}"/><circle cx="60" cy="46" r="19" fill="${P.vanilla}"/><path d="M42 50c3 8 10 7 12 2 3 7 12 7 14 0 3 5 10 5 12-2" fill="${P.espresso}" opacity=".85"/><path d="M48 38c3-6 9-8 14-6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>`+steam(86,20,.35)}

function croissant(){return `<ellipse cx="60" cy="96" rx="42" ry="6" fill="${SH}"/><circle cx="60" cy="40" r="16" fill="${P.pink}"/><path d="M48 46c3 8 10 6 12 1 2 6 9 6 12-1" fill="#fff" opacity=".6"/><circle cx="55" cy="35" r="3" fill="#fff" opacity=".6"/>`+
 `<path d="M14 88C14 66 34 52 60 52s46 14 46 36c-8-6-14-8-22-6-4-12-18-18-24-18s-20 6-24 18c-8-2-14 0-22 6z" fill="#d9913f"/><path d="M60 52c-6 8-6 22 0 30M42 58c-4 8-4 18 0 24M78 58c4 8 4 18 0 24M26 70c-3 6-3 12-2 16M94 70c3 6 3 12 2 16" stroke="#a96a22" stroke-width="2.500" fill="none" stroke-linecap="round"/><path d="M40 60c8-6 28-6 40 0" stroke="#f0b765" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`}

function brownie(){return `<ellipse cx="60" cy="100" rx="40" ry="6" fill="${SH}"/><path d="M22 66l38-18 38 18-38 18z" fill="#6a3b27"/><path d="M22 66v16l38 18V84z" fill="#4a2619"/><path d="M98 66v16L60 100V84z" fill="#3a1d13"/>`+
 `<path d="M34 66l26-12 26 12" fill="none" stroke="#8a5238" stroke-width="2.500" stroke-linecap="round" opacity=".7"/><circle cx="60" cy="42" r="18" fill="${P.vanilla}"/><path d="M45 47c3 8 10 6 12 1 3 7 11 7 14 0 2 4 7 4 9 0" fill="#4a2c20" opacity=".9"/><circle cx="54" cy="34" r="3" fill="#fff" opacity=".7"/>`}

function potion(c){const id='p'+uid++;return `<path d="M52 18h16v22H52z" fill="#fff" fill-opacity=".6" stroke="#cfc3b0" stroke-width="2"/><rect x="50" y="12" width="20" height="8" rx="3" fill="#b9833f"/>`+
 `<circle cx="60" cy="72" r="30" fill="#fff" fill-opacity=".55" stroke="#cfc3b0" stroke-width="2"/><path d="M32.800 64A30 30 0 1 0 87.200 64z" fill="${c}"/><ellipse cx="60" cy="64" rx="27.200" ry="4" fill="${lt(c,.35)}"/>`+
 `<g fill="#fff" opacity=".75"><circle cx="50" cy="78" r="4"/><circle cx="68" cy="86" r="3"/><circle cx="72" cy="72" r="2.500"/></g><path d="M40 60c-2 6-2 12 0 18" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/>`+
 `<g fill="${P.saffron}"><path d="M92 28l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M24 40l1.500 4 4 1.500-4 1.500-1.500 4-1.500-4-4-1.500 4-1.500z"/></g>`}

const KIND={cup:(t,o)=>cup(col(t[0]),o),tall:(t,o)=>tall(t.map(col),o),shake:(t,o)=>shake(col(t[0]),o),tea:(t,o)=>tea(col(t[0]),o),brew:(t,o)=>brew(col(t[0]),o),
 cezve:t=>cezve(col(t[0])),affogato:()=>affogato(),croissant:()=>croissant(),brownie:()=>brownie(),potion:t=>potion(col(t[0]))};
export const CATART={'espresso-bar':'cup:espresso:small','iced-coffee':'tall:coffee:ice,straw','brew':'brew:coffee','matcha-bar':'cup:matcha:foam','vakan-bar':'cup:coffee:foam','milkshake':'shake:vanilla','mocktail':'tall:lemon:ice,straw','desserts':'brownie','hot-bar':'cup:cocoa:mug,cream','herbal-tea':'tea:tea'};
const bgOf=t=>{const c=col(t[t.length-1]);return mix(c,'#ffffff',.78)};
export function art(spec,fallbackCat){const [k,tint='coffee',op=''] =String(spec||CATART[fallbackCat]||CATART['espresso-bar']).split(':'),t=tint.split('+'),o=new Set(op.split(',').filter(Boolean)),f=KIND[k]||KIND.cup;
 const bg=bgOf(t);
 return `<svg class="art" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="64" r="50" fill="${bg}" opacity=".55"/>${f(t,o)}</svg>`}

// ---- small UI icons (stroke style, inherit currentColor) ----
const ST='fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const I={
 cup:'<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.500a2.500 2.500 0 0 1 0 5H16.500"/><path d="M8 3c-1 1.500 1 2 0 3.500M12 3c-1 1.500 1 2 0 3.500"/>',
 bean:'<path d="M6 17C2 12 6 3 14 4c4 .5 6 3 5 6-1.500 5-8 10-13 7z"/><path d="M8 16c1-4 4-7 9-8"/>',
 croissant:'<path d="M3 16c0-5 4-9 9-9s9 4 9 9c-2-1.500-3-1.500-5 0-1-3-3-4-4-4s-3 1-4 4c-2-1.500-3-1.500-5 0z"/><path d="M12 7v6M7.500 9l1 4M16.500 9l-1 4"/>',
 cake:'<path d="M4 13h16v7H4z"/><path d="M4 16.500c2 1.500 3 1.500 4 0s3-1.500 4 0 3 1.500 4 0 3-1.500 4 0"/><path d="M6 13V9h12v4M12 9V5"/><path d="M12 3c-1 1 0 2 0 2s1-1 0-2z"/>',
 ice:'<rect x="4" y="5" width="9" height="9" rx="2" transform="rotate(-10 8 9)"/><rect x="11" y="11" width="9" height="9" rx="2" transform="rotate(12 15 15)"/>',
 leaf:'<path d="M5 19C4 11 9 5 20 4c0 11-6 16-13 15z"/><path d="M5 19c3-4 6-7 10-9"/>',
 milk:'<path d="M9 3h6v3l2.500 3.500V20a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9.500L9 6z"/><path d="M6.500 13h11"/>',
 choc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 9h14M5 15h14M12 3v18"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="1.500"/><path d="M2 9h20v3H2zM12 9v12"/><path d="M12 9C9 9 7 7.500 7.500 6 8.500 4 12 6 12 9c0-3 3.500-5 4.500-3 .5 1.500-1.500 3-4.500 3z"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="8.500" r="1.200"/>',
 trophy:'<path d="M7 4h10v6a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5"/><path d="M12 15v3M8 21h8M9 18h6"/>',
 hourglass:'<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
 star:'<path d="M12 3l2.700 5.600 6.100.8-4.500 4.200 1.100 6.100L12 16.800 6.600 19.700l1.100-6.100L3.200 9.400l6.100-.8z"/>',
 game:'<rect x="2.500" y="7" width="19" height="11" rx="5"/><path d="M8 10.500v4M6 12.500h4"/><circle cx="15.500" cy="11.500" r=".9" fill="currentColor"/><circle cx="18" cy="13.500" r=".9" fill="currentColor"/>',
 brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 4.500A3.500 3.500 0 0 0 6 17a3 3 0 0 0 6 1V5a2.500 2.500 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 4.500A3.500 3.500 0 0 1 18 17a3 3 0 0 1-6 1"/>',
 search:'<circle cx="11" cy="11" r="6.500"/><path d="M16 16l5 5"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.500" fill="currentColor"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2.500M12 19.500V22M2 12h2.500M19.500 12H22M5 5l1.800 1.800M17.200 17.200L19 19M19 5l-1.800 1.800M6.800 17.200L5 19"/>',
 heart:'<path d="M12 20s-8-5-8-11a4.500 4.500 0 0 1 8-2.500A4.500 4.500 0 0 1 20 9c0 6-8 11-8 11z"/>'};
export const ico=(n,cls='')=>`<svg class="ico ${cls}" viewBox="0 0 24 24" ${ST} aria-hidden="true" focusable="false">${I[n]||I.cup}</svg>`;
export const SYMS=['cup','bean','croissant','cake','ice','leaf','milk','choc'];
const MEDAL=['#d4a017','#9aa4ad','#b9743a'];
export const medal=n=>`<svg class="ico medal" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2l5 8 5-8" fill="none" stroke="${MEDAL[n-1]}" stroke-width="2.200" stroke-linejoin="round"/><circle cx="12" cy="15" r="6" fill="${MEDAL[n-1]}"/><text x="12" y="18" text-anchor="middle" font-size="8.500" font-weight="700" fill="#fff" font-family="Inter,sans-serif">${n}</text></svg>`;
// Challenge icon names (stored value "e" may be an old emoji; map it to an icon)
const EM={'☕':'cup','🎯':'target','🍰':'cake','🧁':'cake','🍵':'leaf','⭐':'star','🏆':'trophy','🎁':'gift','🎉':'gift','🫘':'bean','🥐':'croissant','🥛':'milk','🧊':'ice','🍫':'choc','🎮':'game','🧠':'brain','📅':'hourglass','🔥':'star'};
export const chIcon=e=>I[e]?e:(EM[e]||'star');

// Mood faces for the coffee-blend choice (chill / balanced / energetic)
export const face=k=>{const C={chill:'#8ccfc9',ok:'#f4cf6e',energy:'#f58b4c'}[k]||'#f4cf6e',ink='#3b2417';
 const eyes={chill:`<path d="M7.500 11.200q1.500 1.500 3 0M13.500 11.200q1.500 1.500 3 0" fill="none" stroke="${ink}" stroke-width="1.500" stroke-linecap="round"/>`,
  ok:`<circle cx="9" cy="10.500" r="1.200" fill="${ink}"/><circle cx="15" cy="10.500" r="1.200" fill="${ink}"/>`,
  energy:`<circle cx="9" cy="10" r="2.300" fill="#fff"/><circle cx="15" cy="10" r="2.300" fill="#fff"/><circle cx="9.300" cy="10.200" r="1.200" fill="${ink}"/><circle cx="15.300" cy="10.200" r="1.200" fill="${ink}"/>`}[k]||'';
 const mouth={chill:`<path d="M9.500 15.200q2.500 1.600 5 0" fill="none" stroke="${ink}" stroke-width="1.500" stroke-linecap="round"/>`,
  ok:`<path d="M8.500 14.500q3.500 3 7 0" fill="none" stroke="${ink}" stroke-width="1.500" stroke-linecap="round"/>`,
  energy:`<path d="M7.800 14q4.200 5.500 8.400 0z" fill="${ink}"/><path d="M9.500 15.200q2.500 1.600 5 0" fill="#fff" opacity=".0"/>`}[k]||'';
 const extra={chill:`<g fill="#fff" opacity=".7"><circle cx="6" cy="14" r="1.300" fill="#f7a8a0"/><circle cx="18" cy="14" r="1.300" fill="#f7a8a0"/></g><path d="M18 3.500h3l-3 3.500h3" fill="none" stroke="#5aa6a0" stroke-width="1.100" stroke-linecap="round" stroke-linejoin="round"/>`,
  ok:'',energy:`<path d="M20 2l-2.500 4h2.500l-2 4" fill="none" stroke="#e5352b" stroke-width="1.400" stroke-linecap="round" stroke-linejoin="round"/>`}[k]||'';
 return `<svg class="face ${k}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12.500" r="10" fill="${C}"/><circle cx="12" cy="12.500" r="10" fill="none" stroke="${ink}" stroke-opacity=".25"/>${eyes}${mouth}${extra}</svg>`};
