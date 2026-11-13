import { sceneBackground, lantern } from './activities.js?v=1.26';
import { coveredBoatArtwork, coveredBoatHull } from './covered-boat-art.js?v=1.35';

// The same visible-time clock owns boat turns, flowing water and vocabulary.
export const WAYFINDING_TIMELINE=Object.freeze({approachStart:.5,approachEnd:2,leftStart:2.2,leftEnd:3.6,pivotEnd:4.8,rightEnd:6.9,duration:8});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
const mix=(a,b,t)=>a+(b-a)*t;
let illustrationId=0;
export function getWayfindingIntroLayout(aspect=1.5){
 const portrait=aspect<.8;
 return {portrait,width:portrait?640:1000,height:portrait?900:660,
  background:{y:portrait?95:45,scaleX:(portrait?640:1000)/600,scaleY:portrait?2.3:1000/600,groundY:portrait?510:365},
  river:{bank:portrait?685:457,centre:portrait?320:500,y:portrait?806:571,left:portrait?190:300,right:portrait?450:700},
  boatScale:portrait?1.06:1.12,
  words:portrait?{where:{x:320,y:240},left:{x:145,y:420},right:{x:495,y:420}}:{where:{x:500,y:150},left:{x:245,y:275},right:{x:755,y:275}},
 };
}
export function wayfindingIntroPose(seconds=0,layout=getWayfindingIntroLayout()){
 const t=clamp(Number.isFinite(seconds)?seconds:0,0,8),T=WAYFINDING_TIMELINE,r=layout.river;
 let x=r.centre,y=r.y,yaw=.55,phase='drift';
 if(t<T.approachStart){}
 else if(t<T.approachEnd){yaw=mix(.55,Math.PI-.35,ease((t-T.approachStart)/(T.approachEnd-T.approachStart)));phase='turn-left';}
 else if(t<T.leftStart){yaw=Math.PI-.35;phase='left';}
 else if(t<T.leftEnd){const q=ease((t-T.leftStart)/(T.leftEnd-T.leftStart));x=mix(r.centre,r.left,q);y=r.y-Math.sin(q*Math.PI)*6;yaw=Math.PI-.35;phase='left';}
 else if(t<T.pivotEnd){x=r.left;yaw=mix(Math.PI-.35,.35,ease((t-T.leftEnd)/(T.pivotEnd-T.leftEnd)));phase='turn-right';}
 else if(t<T.rightEnd){const q=ease((t-T.pivotEnd)/(T.rightEnd-T.pivotEnd));x=mix(r.left,r.right,q);y=r.y+Math.sin(q*Math.PI)*5;yaw=.35;phase='right';}
 else{x=r.right;yaw=.35;phase='arrived';}
 return {t,phase,boat:{x,y,yaw,scale:layout.boatScale,bob:Math.sin(t*1.6)*.85,roll:Math.sin(t*1.1)*.4},
  vocabulary:{where:ease((t-.6)/1),left:ease((t-2.2)/1),right:ease((t-4.4)/1)}};
}

// One broad foreground river. Its bank has a continuous natural curve; the
// fixed bank encloses a softly layered, continuously flowing surface.
export function riverBankY(x,l){const u=x/l.width;return l.river.bank+12*Math.sin(u*Math.PI*2+.4)+6*Math.sin(u*Math.PI*3-.2);}
function smoothWave(fn,w,reverse=false){
 const start=reverse?w:0;let d=`M${start} ${fn(start).toFixed(2)}`;const step=(reverse?-w:w)/16,eps=.01;
 for(let i=0;i<16;i++){const a=start+i*step,b=a+step,ya=fn(a),yb=fn(b),ma=(fn(a+eps)-fn(a-eps))/(2*eps),mb=(fn(b+eps)-fn(b-eps))/(2*eps);d+=`C${(a+step/3).toFixed(2)} ${(ya+ma*step/3).toFixed(2)} ${(b-step/3).toFixed(2)} ${(yb-mb*step/3).toFixed(2)} ${b.toFixed(2)} ${yb.toFixed(2)}`;}
 return d;
}
function riverShape(l,t){return smoothWave(x=>riverBankY(x,l,t),l.width)+`V${l.height}H0Z`;}
// Visual direction: the broad, overlapping silhouettes in LottieFiles'
// Wave-Water reference, redrawn in the game's muted river palette. Three
// filled shapes replace the old thin stripes, particle marks and wake rings.
// The shoreline stays fixed. Only the water surface travels downstream.
const WAVE_STYLES=Object.freeze([
 {id:'far',level:.18,amplitude:6,wavelength:.78,period:7.5,phase:.4,color:'#a1c3b5'},
 {id:'middle',level:.46,amplitude:10,wavelength:.66,period:6.4,phase:2.1,color:'#94baae'},
 {id:'near',level:.74,amplitude:8,wavelength:.92,period:8.4,phase:4.2,color:'#87aea4'},
]);
export function riverFlowState(seconds,l){
 const t=Number.isFinite(seconds)?Math.max(0,seconds):0,depth=l.height-l.river.bank;
 return {layers:WAVE_STYLES.map(layer=>{
  const wavelength=l.width*layer.wavelength,speed=wavelength/layer.period;
  return {...layer,y:l.river.bank+depth*layer.level,wavelength,speed,offset:t*speed};
 })};
}
export function waveLayerY(x,layer){
 return layer.y+layer.amplitude*Math.sin((x-layer.offset)*Math.PI*2/layer.wavelength+layer.phase);
}
function currentArtwork(l,t){
 return riverFlowState(t,l).layers.map(layer=>{
  const crest=smoothWave(x=>waveLayerY(x,layer),l.width);
  // Each wave fills the complete area beneath its crest: no narrow ribbons,
  // line fragments, opacity pulsing, random particles or visible resets.
  return `<path data-current-wave="${layer.id}" d="${crest}V${l.height}H0Z" fill="${layer.color}"/>`;
 }).join('');
}
const pavilion=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-37 0V74M37 0V74" stroke="#b5845e" stroke-width="8"/><path d="M-30 6H30V60H-30Z" fill="#e4d7a8"/><path d="M-22 10V58M0 10V58M22 10V58M-30 30H30" stroke="#b58f66" stroke-width="3"/><path d="M-53 0Q-23-11 0-29Q23-11 53 0L46 8H-46Z" fill="#638b78"/><path d="M-53 0Q-23-9 0-25Q23-9 53 0" fill="none" stroke="#d8d7b0" stroke-width="3"/><path d="M-43 70H43V79H-43Z" fill="#b5b590"/></g>`;
const text=(content,x,y,size,lang='en')=>`<text x="${x}" y="${y}" text-anchor="middle" style="text-anchor:middle;letter-spacing:0" font-family="${lang==='zh-Hans'?'var(--chinese)':'var(--sans)'},sans-serif" font-size="${size}" font-weight="${lang==='zh-Hans'?800:650}" lang="${lang}">${content}</text>`;
const word=(kind,x,y,opacity,pinyin,hanzi,english)=>`<g data-wayfinding-word="${kind}" transform="translate(${x} ${y})" opacity="${opacity}" fill="#35574c">${kind==='where'?`${text('nǎ',-32,-45,24,'zh-Latn')}${text('lǐ',32,-45,24,'zh-Latn')}${text('哪',-32,8,54,'zh-Hans')}${text('里',32,8,54,'zh-Hans')}${text('？',80,8,40,'zh-Hans')}`:`${text(pinyin,0,-45,24,'zh-Latn')}${text(hanzi,0,8,54,'zh-Hans')}`}${text(english,0,39,22)}</g>`;


function boatTransform(b){return `translate(${b.x} ${b.y+b.bob}) scale(${b.scale}) rotate(${b.roll})`;}
function boatArt(b){return `<g data-wayfinding-boat data-covered-boat data-empty="true" transform="${boatTransform(b)}">${coveredBoatArtwork(b.yaw)}</g>`;}
function waterContactArtwork(b){
 const points=coveredBoatHull(b.yaw),outline=points.slice(0,points.length/2);
 // A single quiet contact shadow grounds the hull. It has no expanding rings
 // or white outlines, and the existing boat geometry remains untouched.
 const path=outline.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)} ${(p.y+14).toFixed(2)}`).join(' ')+'Z';
 return `<path data-hull-contact d="${path}" transform="translate(${b.x+3} ${b.y+2}) scale(${b.scale})" fill="#537e72" opacity=".12"/>`;
}
function applyPose(svg,p,l){
 const boat=svg.querySelector('[data-wayfinding-boat]');boat.setAttribute('transform',boatTransform(p.boat));
 if(boat.dataset.yaw!==String(p.boat.yaw)){boat.innerHTML=coveredBoatArtwork(p.boat.yaw);boat.dataset.yaw=String(p.boat.yaw);}
 const shape=riverShape(l,p.t);
 for(const path of svg.querySelectorAll('[data-river-shape]'))path.setAttribute('d',shape);
 svg.querySelector('[data-wayfinding-current]').innerHTML=currentArtwork(l,p.t);
 svg.querySelector('[data-boat-water-contact]').innerHTML=waterContactArtwork(p.boat);
 for(const kind of ['where','left','right'])svg.querySelector(`[data-wayfinding-word="${kind}"]`).setAttribute('opacity',String(p.vocabulary[kind]));
}
export function createWayfindingIntroArtwork(layout=getWayfindingIntroLayout(),id='wayfinding-intro',seconds=0){
 const {width:w,height:h,portrait:p,words,background:bg}=layout,pose=wayfindingIntroPose(seconds,layout);
 const railY=p?650:423,shape=riverShape(layout,pose.t);
 return `<svg class="wayfinding-theme-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-wayfinding-layout="${p?'portrait':'landscape'}">
 <style>.wayfinding-theme-art *{animation:none!important;transition:none!important}.wayfinding-theme-art{display:block;max-width:100%;max-height:100%;overflow:hidden}</style>
 <defs><clipPath id="${id}-bounds"><rect width="${w}" height="${h}" rx="24"/></clipPath><clipPath id="${id}-river"><path data-river-shape d="${shape}"/></clipPath></defs><g clip-path="url(#${id}-bounds)">
 <rect width="${w}" height="${h}" rx="24" fill="#edf0dd"/>
 <g data-wayfinding-background transform="translate(0 ${bg.y}) scale(${bg.scaleX} ${bg.scaleY})">${sceneBackground('route')}</g>
 <path d="M0 ${bg.groundY}Q${w*.25} ${bg.groundY-33} ${w*.5} ${bg.groundY}T${w} ${bg.groundY-9}V${h}H0Z" fill="#cddbc2"/>
 ${pavilion(p?62:105,p?495:334,p?.65:.88)}${pavilion(p?578:895,p?495:334,p?.65:.88)}
 <g stroke="#a7b69c" stroke-width="5" fill="none"><path d="M35 ${railY}H${w-35}"/>${[.05,.19,.32,.5,.68,.81,.95].map(f=>`<path d="M${w*f} ${railY-11}V${railY+24}"/>`).join('')}</g>
 <g data-wayfinding-lantern-posts fill="none" stroke="#b18b68" stroke-width="4" stroke-linecap="round">${[p?66:122,p?574:878].map(x=>`<path d="M${x-18} ${railY+16}V${(p?610:385)-35*(p?.45:.55)}H${x}"/>`).join('')}</g>
 ${lantern(p?66:122,p?610:385,p?.45:.55)}${lantern(p?574:878,p?610:385,p?.45:.55)}
 <g data-wayfinding-river data-foreground-river><path data-river-shape d="${shape}" fill="#adcabd"/><g clip-path="url(#${id}-river)"><g data-wayfinding-current>${currentArtwork(layout,pose.t)}</g><g data-boat-water-contact>${waterContactArtwork(pose.boat)}</g></g></g>
 ${word('where',words.where.x,words.where.y,pose.vocabulary.where,'nǎ lǐ','哪里？','where')}
 ${word('left',words.left.x,words.left.y,pose.vocabulary.left,'zuǒ','左','left')}
 ${word('right',words.right.x,words.right.y,pose.vocabulary.right,'yòu','右','right')}
 ${boatArt(pose.boat)}
 </g></svg>`;
}
export function createWayfindingIntroScene(host){
 let layout,svg,lastTime=0,disposed=false;
 function build(next){layout=next;host.innerHTML=createWayfindingIntroArtwork(layout,`wayfinding-scene-${++illustrationId}`);svg=host.querySelector('svg');}
 function render(seconds=0){if(disposed||!svg)return;const p=wayfindingIntroPose(seconds,layout);lastTime=p.t;applyPose(svg,p,layout);}
 function resize(){if(disposed)return;const r=host.getBoundingClientRect(),next=getWayfindingIntroLayout(Math.max(1,r.width)/Math.max(1,r.height));if(!layout||layout.portrait!==next.portrait)build(next);render(lastTime);}
 function destroy(){if(disposed)return;disposed=true;svg?.remove();}
 resize();return{render,resize,destroy};
}
