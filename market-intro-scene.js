import { sceneBackground, miniYu } from './activities.js?v=1.26';

// One visible-time clock keeps the bag, falling coins and vocabulary together.
export const MARKET_TIMELINE=Object.freeze({bagStart:.6,bagEnd:1.3,releases:[1.55,2.05,2.55],landings:[2.05,2.55,3.05],settled:3.3,duration:5});
export const MARKET_CASH=Object.freeze({notes:[5,10,20],coins:[1,1,1],total:38});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
let illustrationId=0;

export function getMarketIntroLayout(aspect=1.5){
 const portrait=aspect<.8,w=portrait?640:1000;
 return {portrait,width:w,height:portrait?900:660,
  notes:portrait?{centre:320,y:731,spread:175,scale:.92}:{centre:420,y:440,spread:170,scale:.98},
  coins:portrait?{centre:300,y:650,spread:58,scale:1.1}:{centre:650,y:543,spread:58,scale:1.05},
  bag:portrait?{x:465,y:558,scale:1.05}:{x:850,y:423,scale:.92},
  yu:portrait?{x:92,y:446,scale:1}:{x:120,y:441,scale:1.05},
  vocabulary:portrait?{x:348,y:250}:{x:535,y:175},
  counter:portrait?{top:410,bottom:811,left:15,right:625}:{top:382,bottom:587,left:25,right:975},
 };
}

export function bagPoint(bag,x,y){
 const a=bag.angle*Math.PI/180;
 return {x:bag.x+bag.scale*(x*Math.cos(a)-y*Math.sin(a)),y:bag.y+bag.scale*(x*Math.sin(a)+y*Math.cos(a))};
}
export function marketIntroPose(seconds=0,layout=getMarketIntroLayout()){
 const t=clamp(Number.isFinite(seconds)?seconds:0,0,5),T=MARKET_TIMELINE;
 const bag={...layout.bag,angle:-110*ease((t-T.bagStart)/(T.bagEnd-T.bagStart))};
 const mouth=bagPoint(bag,0,-150);
 const notes=MARKET_CASH.notes.map((value,i)=>({value,x:layout.notes.centre+(i-1)*layout.notes.spread,y:layout.notes.y,angle:0,scale:layout.notes.scale}));
 const coins=MARKET_CASH.coins.map((value,i)=>{
  const release=T.releases[i],landing=T.landings[i],u=clamp((t-release)/(landing-release));
  const end={x:layout.coins.centre+(i-1)*layout.coins.spread,y:layout.coins.y};
  // Hidden inside the open bag until release; no fade-in or spawn in midair.
  // Constant horizontal speed + accelerating downward movement, then one tiny bounce.
  const after=clamp((t-landing)/.25),bounce=4*Math.sin(after*Math.PI)*(1-after);
  return {value,x:mouth.x+(end.x-mouth.x)*u,y:mouth.y+(end.y-mouth.y)*u*u-bounce,
   angle:-95*(1-u),scale:layout.coins.scale,visible:t>=release,progress:u};
 });
 return {t,notes,coins,bag,mouth,vocabularyOpacity:ease((t-1.4)/1.1),yuTail:Math.sin(t*1.2)*4};
}

// A loosely gathered, visibly open pouch. Coins are drawn behind its front lip.
const bagArt=()=>`<path d="M-24-126C-31-144-35-157-20-168L-3-162 13-171 29-158 24-126Z" fill="#d6b263" stroke="#b39456" stroke-width="3" stroke-linejoin="round"/><path d="M-25-124C-33-106-62-91-72-55-86-10-42 4 0 4S86-10 72-55C62-91 33-106 25-124Z" fill="#dfbc70" stroke="#b39456" stroke-width="3"/><path d="M-37-91C-57-64-61-30-41-16" fill="none" stroke="#efd59a" stroke-width="12" stroke-linecap="round"/><path d="M45-77C63-39 54-22 39-15" fill="none" stroke="#cba45d" stroke-width="10" stroke-linecap="round"/><path d="M-25-121Q0-111 25-121" fill="none" stroke="#94734c" stroke-width="10" stroke-linecap="round"/><path d="M20-118Q36-107 29-95M22-117Q43-125 43-111" fill="none" stroke="#94734c" stroke-width="4" stroke-linecap="round"/><text x="0" y="-37" text-anchor="middle" font-family="var(--sans),sans-serif" font-size="64" font-weight="800" fill="#71573d">¥</text><ellipse cx="0" cy="-150" rx="24" ry="10" fill="#80623d" stroke="#d6b263" stroke-width="4"/>`;
const bagLipArt=()=>`<path d="M-24-150Q0-134 24-150" fill="none" stroke="#e8c784" stroke-width="7" stroke-linecap="round"/>`;
const notePatterns=[
 `<path d="M3 17 12 2 20 6 28-9 37-4 46-24 54-13 65-7V19Z" fill="currentColor" opacity=".18"/><path d="M3 17 12 2 20 6 28-9 37-4 46-24 54-13 65-7M28 20 33 10 39 12 44 0 50 2 53-7"/><path d="M42-23H52M44-26H50M46-30V-23"/>`,
 `<path d="M1-19 14-25 24-15 21-4 29 4 17 15 2 19M65-25 53-18 49-5 39 4 45 12 65 18" fill="currentColor" opacity=".18"/><path d="M1-19 14-25 24-15 21-4 29 4 17 15 2 19M65-25 53-18 49-5 39 4 45 12 65 18M30-24Q43-9 32 0T33 22M5 24H24M43 24H64"/><path d="M27 12H39L36 16H30ZM34 4V12"/>`,
 `<path d="M1 10Q4-26 13-21T25 8Q28-13 36-10T45 10Q50-27 59-21T68 10Z" fill="currentColor" opacity=".18"/><path d="M1 10Q4-26 13-21T25 8Q28-13 36-10T45 10Q50-27 59-21T68 10M1 17Q19 12 35 17T67 17M8 23H53"/><path d="M33 12 35-1 37 12M30 12H45L41 15H33"/>`
];
const noteArt=(value,i)=>{
 const palettes=[['#c9bad0','#8f7b9c','#e7ddea'],['#aac7c1','#6d9690','#d5e6dd'],['#e2ce9d','#ac945c','#f5e5b9']],[paper,line,pale]=palettes[i];
 return `<g data-market-note-value="${value}" data-market-note-pattern="${['mountain-steps','river-gorge','karst-river'][i]}"><rect x="-79" y="-43" width="158" height="86" rx="7" fill="${paper}" stroke="${line}" stroke-width="3"/><rect x="-70" y="-34" width="140" height="68" rx="5" fill="none" stroke="${pale}" stroke-width="2"/><path d="M-65 15H64M-65 21H64" stroke="${line}" stroke-width="1.5" opacity=".38"/><g fill="none" color="${line}" stroke="${line}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${notePatterns[i]}</g><text x="-40" y="10" text-anchor="middle" font-family="var(--sans),sans-serif" font-size="30" font-weight="800" fill="#3e6250">¥${value}</text><path d="M-65-24H-56M56 25H65" stroke="${line}" stroke-width="2" stroke-linecap="round"/></g>`;
};
const coinArt=()=>`<g data-market-coin-value="1"><circle r="19" fill="#d7ad60" stroke="#b38d48" stroke-width="2.5"/><circle cy="-1.5" r="16" fill="#edd194"/><circle cy="-1.5" r="13" fill="none" stroke="#c9a563" stroke-width="1"/><text y="4" text-anchor="middle" font-family="var(--chinese),sans-serif" font-size="12" font-weight="800" fill="#806638">1元</text></g>`;

export function createMarketIntroArtwork(layout=getMarketIntroLayout(),id='market-intro',seconds=0){
 const {width:w,height:h,portrait:p,counter:c,yu,vocabulary:v}=layout;
 const canopyY=p?74:45,canopyBottom=canopyY+67,pose=marketIntroPose(seconds,layout);
 const bagTransform=`translate(${pose.bag.x} ${pose.bag.y}) rotate(${pose.bag.angle}) scale(${pose.bag.scale})`;
 return `<svg class="market-theme-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-market-layout="${p?'portrait':'landscape'}">
 <style>.market-theme-art *{animation:none!important;transition:none!important}.market-theme-art{display:block;max-width:100%;max-height:100%;overflow:hidden}</style>
 <defs><clipPath id="${id}-bounds"><rect width="${w}" height="${h}" rx="24"/></clipPath></defs>
 <g clip-path="url(#${id}-bounds)"><rect width="${w}" height="${h}" rx="24" fill="#edf0dd"/>
 <g transform="translate(0 ${p?190:110}) scale(${w/600})">${sceneBackground('market')}</g>
 <path d="M0 ${p?445:340}Q${w*.35} ${p?410:320} ${w} ${p?435:348}V${h}H0Z" fill="#bad1bd"/>
 <path d="M45 ${p?467:374}H${w*.33}M${w*.72} ${p?480:388}H${w-35}" stroke="#d9e4ce" stroke-width="3" stroke-linecap="round"/>
 <path d="M52 ${canopyY}V${c.bottom}M${w-52} ${canopyY}V${c.bottom}" stroke="#b18b68" stroke-width="13"/>
 <path d="M54 ${canopyY}H${w-54}L${w-25} ${canopyBottom}H25Z" fill="#cf7956"/><path d="M25 ${canopyBottom}${Array.from({length:10},(_,i)=>{const x=25+i*(w-50)/10,step=(w-50)/10;return `Q${x+step/2} ${canopyBottom+26} ${x+step} ${canopyBottom}`;}).join('')}" fill="#e2a177"/>
 <g data-market-vocabulary opacity="${pose.vocabularyOpacity}" transform="translate(${v.x} ${v.y})" fill="#35574c" text-anchor="middle"><text data-market-word="pinyin" x="0" y="-12" font-family="var(--sans),sans-serif" font-size="24" font-weight="650" lang="zh-Latn">yuán</text><text x="-77" y="43" font-family="var(--sans),sans-serif" font-size="49" font-weight="800">¥</text><text data-market-word="hanzi" x="0" y="43" font-family="var(--chinese),sans-serif" font-size="54" font-weight="800" lang="zh-Hans">元</text><text data-market-word="english" x="0" y="76" font-family="var(--sans),sans-serif" font-size="22" font-weight="650">yuan</text></g>
 <ellipse cx="${w/2}" cy="${h-22}" rx="${w*.44}" ry="12" fill="#9da985" opacity=".2"/>
 <path d="M${c.left+88} ${c.bottom}V${h-30}M${c.right-88} ${c.bottom}V${h-30}" stroke="#9d805a" stroke-width="18" stroke-linecap="round"/>
 <path d="M${c.left+43} ${c.top}H${c.right-43}L${c.right} ${c.bottom}H${c.left}Z" fill="#d8b782"/>
 <path d="M${c.left} ${c.bottom}H${c.right}V${c.bottom+24}H${c.left}Z" fill="#b78d63"/>
 <path d="M${c.left+12} ${c.bottom-38}H${c.right-12}" stroke="#d0aa78" stroke-width="3" opacity=".6"/>
 <g data-market-yu>${miniYu(yu.x,yu.y,yu.scale)}</g>
 <rect x="${w/2-(p?275:350)}" y="${p?490:389}" width="${p?550:700}" height="${p?289:180}" rx="15" fill="#ceb889" stroke="#b79b6b" stroke-width="4"/>
 <path d="M${w/2-(p?261:336)} ${p?510:405}H${w/2+(p?261:336)}" stroke="#e4d1a0" stroke-width="3"/>
 ${pose.notes.map((n,i)=>`<g data-market-note="${i}" transform="translate(${n.x} ${n.y}) scale(${n.scale})">${noteArt(n.value,i)}</g>`).join('')}
 <g data-market-bag transform="${bagTransform}">${bagArt()}</g>
 ${pose.coins.map((c,i)=>`<g data-market-coin="${i}" visibility="${c.visible?'visible':'hidden'}" transform="translate(${c.x} ${c.y}) rotate(${c.angle}) scale(${c.scale})">${coinArt()}</g>`).join('')}
 <g data-market-bag-lip transform="${bagTransform}">${bagLipArt()}</g>
 </g></svg>`;
}

export function createMarketIntroScene(host){
 let layout,svg,refs,lastTime=0,disposed=false;
 function build(next){layout=next;host.innerHTML=createMarketIntroArtwork(layout,`market-scene-${++illustrationId}`);svg=host.querySelector('svg');refs={notes:[...svg.querySelectorAll('[data-market-note]')],coins:[...svg.querySelectorAll('[data-market-coin]')],bag:svg.querySelector('[data-market-bag]'),bagLip:svg.querySelector('[data-market-bag-lip]'),vocabulary:svg.querySelector('[data-market-vocabulary]'),tail:svg.querySelector('[data-market-yu]').querySelector('path')};}
 function render(seconds=0){
  if(disposed||!svg)return;const p=marketIntroPose(seconds,layout);lastTime=p.t;
  refs.notes.forEach((el,i)=>{const n=p.notes[i];el.setAttribute('transform',`translate(${n.x} ${n.y}) rotate(${n.angle}) scale(${n.scale})`);});
  refs.coins.forEach((el,i)=>{const c=p.coins[i];el.setAttribute('transform',`translate(${c.x} ${c.y}) rotate(${c.angle}) scale(${c.scale})`);el.setAttribute('visibility',c.visible?'visible':'hidden');});
  const b=p.bag;for(const el of [refs.bag,refs.bagLip])el.setAttribute('transform',`translate(${b.x} ${b.y}) rotate(${b.angle}) scale(${b.scale})`);
  refs.vocabulary.setAttribute('opacity',String(p.vocabularyOpacity));refs.tail.setAttribute('transform',`rotate(${p.yuTail} 19 36)`);
 }
 function resize(){if(disposed)return;const r=host.getBoundingClientRect(),next=getMarketIntroLayout(Math.max(1,r.width)/Math.max(1,r.height));if(!layout||layout.portrait!==next.portrait)build(next);render(lastTime);}
 function destroy(){if(disposed)return;disposed=true;svg?.remove();}
 resize();return{render,resize,destroy};
}
