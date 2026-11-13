import { sceneBackground, miniYu } from "./activities.js?v=1.26";

// Original flat illustration. The controller supplies the only animation clock.
export const TEA_TIMELINE=Object.freeze({brewStart:.3,brewEnd:1.1,liftEnd:1.7,pourEnd:3.1,returnEnd:3.8,handsClear:4.25,duration:5});
export const TEA_GEOMETRY=Object.freeze({spout:{x:78,y:-10},handle:{x:-66,y:13},potBottom:54,cupBottom:32,cupEmptyLevel:30,cupFullLevel:4});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
let illustrationId=0;

export function getTeaIntroLayout(aspect=1.5){
 const portrait=aspect<.8;
 return {
  portrait,width:portrait?640:1000,height:portrait?900:660,
  pot:portrait?{x:218,y:483,scale:1.6,pourX:295,pourY:408}:{x:430,y:365,scale:1.7,pourX:480,pourY:290},
  cup:portrait?{x:470,y:568,scale:1.6}:{x:704,y:420,scale:1.55},
  yu:portrait?{x:91,y:401,scale:1.08}:{x:155,y:393,scale:1.2},
  vocabulary:{x:portrait?365:620,y:portrait?180:150},
  caddy:portrait?{x:142,y:718}:{x:831,y:441},
  leafDish:portrait?{x:474,y:741}:{x:790,y:516},
  tray:portrait?{top:408,bottom:666,left:55,right:585}:{top:330,bottom:503,left:225,right:855},
 };
}

export function teaPointOnPot(point,potPose){
 const a=potPose.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return {x:potPose.x+potPose.scale*(point.x*c-point.y*s),y:potPose.y+potPose.scale*(point.x*s+point.y*c)};
}

export function teaIntroPose(seconds=0,layout=getTeaIntroLayout()){
 const t=clamp(Number.isFinite(seconds)?seconds:0,0,5);
 const brew=ease((t-.3)/.8),lift=ease((t-1.1)/.6),returning=ease((t-3.1)/.7);
 const moved=lift*(1-returning),pourProgress=clamp((t-1.7)/1.4),fill=ease(pourProgress);
 const pot={x:layout.pot.x+(layout.pot.pourX-layout.pot.x)*moved,y:layout.pot.y+(layout.pot.pourY-layout.pot.y)*moved,scale:layout.pot.scale,angle:(25*lift+5*fill)*(1-returning)};
 const cupLevel=TEA_GEOMETRY.cupEmptyLevel-26*fill;
 const start=teaPointOnPot(TEA_GEOMETRY.spout,pot);
 const end={x:layout.cup.x-6*layout.cup.scale*Math.sqrt(fill),y:layout.cup.y+cupLevel*layout.cup.scale};
 const flow=ease((t-1.7)/.12)*(1-ease((t-2.98)/.12));
 const release=ease((t-3.8)/.45);
 return {
  t,brew,fill,cupLevel,pot,
  hand:{dx:-250*ease((release-.18)/.82),dy:70*ease(release/.45),angle:-6*release},
  handContact:teaPointOnPot(TEA_GEOMETRY.handle,pot),
  stream:{start,end,control:{x:start.x+(end.x-start.x)*.68,y:start.y+Math.max(0,end.x-start.x)*.16},opacity:flow,width:2+4*Math.sin(pourProgress*Math.PI)},
  liquid:{level:10-5*brew+20*fill,opacity:.48+.25*brew,counterAngle:-pot.angle},
  leaves:Array.from({length:5},(_,i)=>({x:(i%3-1)*17+Math.sin(t*1.5+i)*2*brew,y:10-5*brew+20*fill+9+(i%2)*8+Math.cos(t*1.1+i)*1.4*brew,angle:-25+i*23+Math.sin(t*1.3+i)*10*brew})),
  potSteam:{origin:teaPointOnPot({x:-4,y:-32},pot),opacity:.08+.26*brew},
  cupSteam:{x:layout.cup.x,y:layout.cup.y-8,opacity:.38*fill},
  steamOffset:Math.sin(t*.9)*4,
  vocabularyOpacity:ease((t-2)/.9),yuTail:Math.sin(t*1.1)*4,
 };
}

const leaf=(x,y,scale=1,angle=0)=>`<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><path d="M-13 0Q0-16 14 0Q0 15-13 0Z" fill="#79965f"/><path d="M-10 1 12-1" stroke="#b3c88c" stroke-width="2" stroke-linecap="round"/></g>`;
const steamArt=()=>`<g fill="none" stroke="#fffdf2" stroke-width="4" stroke-linecap="round"><path d="M-17 0Q-29-15-17-30T-17-61"/><path d="M4 2Q16-13 4-29T4-53"/><path d="M25 0Q15-13 25-28T25-66"/></g>`;
const handArt=()=>`<path d="M-19 15Q-30 7-24-8Q-20-18-8-13L8-8Q15-5 11 2L3 7Q17 2 19 10Q18 19 3 25L-9 25Z" fill="#e6bd94" stroke="#cba17e" stroke-width="2"/><path d="m-22 12 17 15-16 22Q-36 46-42 31Z" fill="#cb815c"/><path d="m-23 15 16 13" stroke="#e7ae7b" stroke-width="4" stroke-linecap="round"/>`;

function teapotArt(id){return `<g data-tea-pot-art>
 <path d="M-47 0Q-75-14-73 12Q-69 36-48 20" stroke="#638c72" stroke-width="11" fill="none"/>
 <path d="M38 1 65-14 78-10 54 24 38 27" fill="#7ca17e"/>
 <ellipse cy="20" rx="50" ry="34" fill="#dce8d7" stroke="#789981" stroke-width="3"/>
 <g clip-path="url(#${id}-pot)"><g data-tea-pot-liquid>
  <rect data-tea-pot-water x="-76" y="10" width="152" height="90" fill="#c5a25c" opacity=".48"/>
  <ellipse data-tea-pot-surface cy="10" rx="68" ry="4" fill="#d8bd79" opacity=".55"/>
  ${Array.from({length:5},()=>`<g data-tea-leaf>${leaf(0,0,.57)}</g>`).join('')}
 </g></g>
 <path d="M-36 12Q-40 29-21 40" fill="none" stroke="#f5f5dc" stroke-width="4" stroke-linecap="round" opacity=".72"/>
 <ellipse cy="0" rx="40" ry="10" fill="#b7c7a0"/>
 <path d="M-35-4Q0-35 35-4Z" fill="#759873"/>
 <ellipse cy="-17" rx="10" ry="6" fill="#506f53"/>
 <g data-tea-hand><g transform="translate(-66 13)">${handArt()}</g></g>
 </g>`;}

function cupArt(c,id){return `<g transform="translate(${c.x} ${c.y}) scale(${c.scale})" data-tea-cup>
 <ellipse cy="36" rx="43" ry="8" fill="#eff0d9" stroke="#a6b493" stroke-width="2"/>
 <path d="M25 3Q45 0 42 16Q37 23 24 17" fill="none" stroke="#8fa689" stroke-width="5"/>
 <path d="M-28 2Q-25 32 0 32T28 2Z" fill="#e8ebd1" stroke="#8fa689" stroke-width="2.5"/>
 <ellipse cy="2" rx="28" ry="8" fill="#f9f5dc" stroke="#8fa689" stroke-width="2.5"/>
 <g clip-path="url(#${id}-cup)"><rect data-tea-cup-liquid x="-30" y="30" width="60" height="40" fill="#c6a35d"/><ellipse data-tea-cup-surface cy="30" rx="0" ry="4.5" fill="#d0b36e"/></g>
 <path d="M-18 11Q-17 23-9 25" fill="none" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" opacity=".6"/>
 </g>`;}

export function createTeaIntroArtwork(layout=getTeaIntroLayout(),id='tea-intro'){
 const {width,height,portrait,pot,cup,yu,caddy,leafDish,tray}=layout;
 const table=portrait
  ? '<path d="M100 810V880M540 810V880" stroke="#9d805a" stroke-width="18" stroke-linecap="round"/><path d="M50 280H590L625 820H15Z" fill="#d8b782"/><path d="M15 820H625V850H15Z" fill="#c69d69"/>'
  : '<path d="M210 550 199 635M790 550 801 635" stroke="#9d805a" stroke-width="20" stroke-linecap="round"/><path d="M40 420H960V440Q945 600 500 605Q55 600 40 440Z" fill="#bd9567"/><ellipse cx="500" cy="420" rx="460" ry="170" fill="#dfc395"/>';
 return `<svg class="tea-theme-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-tea-layout="${portrait?'portrait':'landscape'}">
 <style>.tea-theme-art *{animation:none!important;transition:none!important}.tea-theme-art{display:block;max-width:100%;max-height:100%;overflow:hidden}</style>
 <defs><clipPath id="${id}-pot"><ellipse cy="20" rx="45" ry="29"/></clipPath><clipPath id="${id}-cup"><path d="M-26 3Q-23 30 0 30T26 3Z"/></clipPath></defs>
 <rect width="${width}" height="${height}" rx="24" fill="#edf0dd"/>
 <g transform="scale(${width/600})">${sceneBackground('cafe')}</g>
 <path d="M0 ${portrait?210:216}Q${width*.34} ${portrait?235:250} ${width*.7} ${portrait?214:225}T${width} ${portrait?225:240}V${portrait?320:340}H0Z" fill="#a9c8b9"/>
 <path d="M${width*.07} ${portrait?245:265}H${width*.24}M${width*.75} ${portrait?250:277}H${width*.93}" fill="none" stroke="#d8e2cf" stroke-width="3" stroke-linecap="round"/>
 <path d="M33 15V${portrait?291:309}M${width-33} 15V${portrait?291:309}M33 35H${width-33}" stroke="#b18b68" stroke-width="11" fill="none"/>
 <g stroke="#8da584" stroke-width="4" fill="none"><path d="M${width-86} 54V${portrait?254:278}M${width-112} 82V${portrait?260:283}"/><path d="M${width-86} 111Q${width-132} 70 ${width-130} 110Q${width-107} 126 ${width-86} 111M${width-86} 158Q${width-45} 125 ${width-45} 156Q${width-66} 174 ${width-86} 158M${width-112} 203Q${width-150} 172 ${width-151} 201Q${width-130} 216 ${width-112} 203" fill="#a3b993" stroke="none"/></g>
 <g data-tea-vocabulary opacity="0" transform="translate(${layout.vocabulary.x} ${layout.vocabulary.y})" text-anchor="middle" fill="#35574c"><text y="-54" lang="zh-Latn" font-family="var(--sans),sans-serif" font-size="24" font-weight="650">chá</text><text lang="zh-Hans" font-family="var(--chinese),sans-serif" font-size="52" font-weight="800">茶</text><text y="30" font-family="var(--sans),sans-serif" font-size="22" font-weight="650">tea</text></g>
 <ellipse cx="${width/2}" cy="${portrait?886:642}" rx="${portrait?290:440}" ry="13" fill="#9da985" opacity=".2"/>
 ${table}
 <g data-tea-tray><path d="M${tray.left+45} ${tray.top}H${tray.right-45}L${tray.right} ${tray.bottom-8}V${tray.bottom+7}H${tray.left}V${tray.bottom-8}Z" fill="#b18c5f"/><path d="M${tray.left+48} ${tray.top+6}H${tray.right-48}L${tray.right-17} ${tray.bottom-12}H${tray.left+17}Z" fill="#cfb789"/>
 ${[.28,.43,.58,.73].map(f=>`<path d="M${tray.left+35} ${tray.top+(tray.bottom-tray.top)*f}H${tray.right-35}" stroke="#b29d73" stroke-width="2" opacity=".42"/>`).join('')}</g>
 <g data-tea-yu>${miniYu(yu.x,yu.y,yu.scale)}</g>
 <g data-tea-caddy transform="translate(${caddy.x} ${caddy.y})"><ellipse cy="41" rx="37" ry="8" fill="#708568" opacity=".14"/><path d="M-30-17H30L28 32Q0 43-28 32Z" fill="#9cae8b"/><ellipse cy="-17" rx="30" ry="9" fill="#cbd3b0"/><path d="M-30-19Q0-39 30-19Z" fill="#8d9f7c"/><ellipse cy="-29" rx="8" ry="4" fill="#5c7f65"/><path d="M-22-5V26" stroke="#c0cca4" stroke-width="4" stroke-linecap="round"/></g>
 <g data-tea-leaf-dish transform="translate(${leafDish.x} ${leafDish.y})"><ellipse rx="48" ry="18" fill="#f6efd7" stroke="#b9bc99" stroke-width="3"/>${leaf(-15,0,.8,-20)}${leaf(12,-3,.75,15)}${leaf(1,9,.6,-8)}</g>
 <ellipse data-tea-pot-shadow cx="${pot.x}" cy="${pot.y+pot.scale*54}" rx="${pot.scale*52}" ry="${pot.scale*8}" fill="#766c4e" opacity=".13"/>
 ${cupArt(cup,id)}
 <path data-tea-stream d="M0 0" fill="none" stroke="#c4a05c" stroke-width="6" stroke-linecap="round" opacity="0"/>
 <g data-tea-pot-rig>${teapotArt(id)}</g>
 <g data-tea-pot-steam opacity="0">${steamArt()}</g><g data-tea-cup-steam opacity="0">${steamArt()}</g>
 </svg>`;
}

export function createTeaIntroScene(host){
 let layout,svg,refs,lastTime=0,disposed=false;
 function build(next){
  layout=next;host.innerHTML=createTeaIntroArtwork(layout,`tea-scene-${++illustrationId}`);svg=host.querySelector('svg');
  const one=n=>svg.querySelector(`[data-tea-${n}]`);
  refs={rig:one('pot-rig'),hand:one('hand'),liquid:one('pot-liquid'),water:one('pot-water'),surface:one('pot-surface'),cupLiquid:one('cup-liquid'),cupSurface:one('cup-surface'),stream:one('stream'),leaves:[...svg.querySelectorAll('[data-tea-leaf]')],potSteam:one('pot-steam'),cupSteam:one('cup-steam'),vocabulary:one('vocabulary'),tail:one('yu').querySelector('path')};
 }
 function render(seconds=0){
  if(disposed||!svg)return;
  const p=teaIntroPose(seconds,layout);lastTime=p.t;
  refs.rig.setAttribute('transform',`translate(${p.pot.x} ${p.pot.y}) rotate(${p.pot.angle}) scale(${p.pot.scale})`);
  refs.hand.setAttribute('transform',`translate(${p.hand.dx} ${p.hand.dy}) rotate(${p.hand.angle} -66 13)`);
  refs.liquid.setAttribute('transform',`rotate(${p.liquid.counterAngle} 0 20)`);
  refs.water.setAttribute('y',String(p.liquid.level));refs.water.setAttribute('opacity',String(p.liquid.opacity));refs.surface.setAttribute('cy',String(p.liquid.level));
  refs.leaves.forEach((el,i)=>{const l=p.leaves[i];el.setAttribute('transform',`translate(${l.x} ${l.y}) rotate(${l.angle})`);});
  refs.cupLiquid.setAttribute('y',String(p.cupLevel));refs.cupSurface.setAttribute('cy',String(p.cupLevel));refs.cupSurface.setAttribute('rx',String(26*Math.sqrt(p.fill)));refs.cupSurface.setAttribute('opacity',String(p.fill>0?1:0));
  const s=p.stream;refs.stream.setAttribute('d',`M${s.start.x} ${s.start.y}Q${s.control.x} ${s.control.y} ${s.end.x} ${s.end.y}`);refs.stream.setAttribute('stroke-width',String(s.width));refs.stream.setAttribute('opacity',String(s.opacity));
  refs.potSteam.setAttribute('transform',`translate(${p.potSteam.origin.x} ${p.potSteam.origin.y+p.steamOffset}) scale(.8)`);refs.potSteam.setAttribute('opacity',String(p.potSteam.opacity));
  refs.cupSteam.setAttribute('transform',`translate(${p.cupSteam.x} ${p.cupSteam.y+p.steamOffset}) scale(.8)`);refs.cupSteam.setAttribute('opacity',String(p.cupSteam.opacity));
  refs.vocabulary.setAttribute('opacity',String(p.vocabularyOpacity));refs.tail.setAttribute('transform',`rotate(${p.yuTail} 19 36)`);
 }
 function resize(){if(disposed)return;const r=host.getBoundingClientRect(),next=getTeaIntroLayout(Math.max(1,r.width)/Math.max(1,r.height));if(!layout||layout.portrait!==next.portrait)build(next);render(lastTime);}
 function destroy(){if(disposed)return;disposed=true;svg?.remove();}
 resize();return{render,resize,destroy};
}
