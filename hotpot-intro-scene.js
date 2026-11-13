import { sceneBackground, miniYu, pot, vegetables } from "./activities.js?v=1.26";

// This introduction deliberately shares the editable, flat illustration
// vocabulary of the lesson cards. The controller owns its only animation clock.
export const HOTPOT_SERVING_TIMES = Object.freeze({ pot: 1.2, handsClear: 2.4, simmer: 1.4 });
const clamp = (n, a=0, b=1) => Math.max(a, Math.min(b,n));
const ease = n => { n=clamp(n); return n*n*(3-2*n); };
const names = ["tofu","lotus-root","vegetables-and-mushrooms","fish-fillets","pork-belly","beef-balls","rolled-beef"];

export function getHotpotIntroLayout(aspect=1.5) {
  const portrait=aspect<.8;
  const positions=portrait
    ? [[180,280,61,25],[330,265,62,23],[480,280,76,27],[515,370,70,26],[327,655,73,28],[145,650,66,26],[512,650,70,26]]
    : [[327,306,61,25],[480,285,62,23],[664,305,79,27],[838,343,73,27],[820,490,78,28],[620,526,68,27],[392,522,72,26]];
  return {
    portrait,width:portrait?640:1000,height:portrait?900:660,
    pot:{x:portrait?320:510,y:portrait?455:365,scale:2.15},
    vocabulary:{x:portrait?320:510,y:portrait?118:148},
    yu:{x:portrait?97:177,y:portrait?370:340,scale:portrait?1.0:1.25},
    plates:positions.map(([x,y,rx,ry],index)=>({name:names[index],x,y,rx,ry})),
  };
}

export function hotpotIntroPose(seconds=0,layout=getHotpotIntroLayout()) {
  const t=clamp(Number.isFinite(seconds)?seconds:0,0,5),served=ease(t/HOTPOT_SERVING_TIMES.pot);
  const releaseLeft=ease((t-1.34)/.9),releaseRight=ease((t-1.43)/.97);
  const simmer=ease((t-HOTPOT_SERVING_TIMES.simmer)/.75),arc=served>=1?0:Math.sin(served*Math.PI);
  return {
    t, served, simmer,
    vocabularyOpacity:ease((t-HOTPOT_SERVING_TIMES.pot)/.9),
    pot:{dx:-7*(1-served)+4*arc,dy:served>=1?0:-30*(1-served)-3*arc,angle:.55*arc},
    hands:[
      {sign:-1,dx:-360*releaseLeft,dy:100*ease((releaseLeft-.7)/.3),angle:-7*releaseLeft},
      {sign:1,dx:360*releaseRight,dy:100*ease((releaseRight-.7)/.3),angle:7*releaseRight},
    ],
    steam:[0,.31,.67].map((phase,i)=>({dy:-4-Math.sin(t*.91+phase*5)*4-i*2,opacity:simmer*(.4+.16*Math.sin(t*.8+phase*6)),scale: .9+.08*Math.sin(t*.7+phase*3)})),
    bubbles:[0,.38,.71].map((phase)=>({r:1+simmer*(.18+.14*Math.sin(t*3.5+phase*7)),opacity:simmer*(.65+.2*Math.sin(t*2+phase*5))})),
    yuTail:Math.sin(t*1.25)*5,
    // Stationary plates are intentionally not part of the animated pose.
    layout,
  };
}

const plate = (p,food) => `<g data-intro-ingredient="${p.name}" transform="translate(${p.x} ${p.y})"><ellipse cy="${p.ry*.45}" rx="${p.rx}" ry="${p.ry*.8}" fill="#708568" opacity=".12"/><ellipse rx="${p.rx}" ry="${p.ry}" fill="#faf2d9" stroke="#cdb989" stroke-width="3"/>${food}</g>`;
function tofuArt(){return [-27,0,27].map((x,i)=>`<g transform="translate(${x} ${i===1?-9:3})"><path d="M-13-15 1-22 15-15 1-8Z" fill="#fff1cf"/><path d="M-13-15 1-8V12L-13 5Z" fill="#eed8a7"/><path d="M1-8 15-15V5L1 12Z" fill="#e0c28e"/></g>`).join("");}
function lotusArt(){return [[-22,1],[8,-8],[25,8]].map(([x,y])=>`<g transform="translate(${x} ${y})"><ellipse rx="23" ry="17" fill="#edd49e"/><ellipse cy="-3" rx="23" ry="16" fill="#f7e5b7"/>${[0,1,2,3,4,5].map(i=>`<ellipse cx="${Math.cos(i*Math.PI/3)*14}" cy="${-3+Math.sin(i*Math.PI/3)*9}" rx="3.8" ry="2.8" fill="#cdbb91"/>`).join("")}<ellipse cy="-3" rx="3.5" ry="2.6" fill="#cdbb91"/></g>`).join("");}
function mushroom(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-5-1-6 15Q0 20 6 15L5-1Z" fill="#ebd9ad"/><path d="M-20 0Q-17-24 0-23Q18-22 21 0Q0 10-20 0Z" fill="#a67a51"/><path d="m-9-12 18 7M-5-4 10-12" stroke="#eddcb6" stroke-width="3" stroke-linecap="round"/></g>`;}
function fishArt(){return [[-18,-7,-9],[18,8,10]].map(([x,y,a])=>`<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-31 0Q-18-21 14-16Q40-12 30 7Q7 25-31 0Z" fill="#f1dfc7" stroke="#d0b89b" stroke-width="2"/><path d="M-28 1Q-10 15 25 9" fill="none" stroke="#91a79b" stroke-width="4" stroke-linecap="round"/><path d="M-14-5-5 5M1-9 10 2M15-9 23-2" stroke="#d6afa4" stroke-width="2" stroke-linecap="round"/></g>`).join("");}
function porkArt(){return [-32,0,32].map((x,i)=>`<g transform="translate(${x} ${i===1?-6:2}) rotate(-13)"><path d="M-11-26Q0-30 11-25L12 20Q0 29-11 22Z" fill="#ce8c81"/><path d="M-11-16Q0-11 11-17M-11-1Q0 5 12-2M-11 15Q0 21 12 14" stroke="#f4ddc7" stroke-width="6" fill="none"/><path d="M-10-25Q0-20 10-25" stroke="#e2b09d" stroke-width="3" fill="none"/></g>`).join("");}
function ballsArt(){return [[-28,-3],[0,-10],[28,-2],[-15,13],[17,14]].map(([x,y])=>`<g transform="translate(${x} ${y})"><circle r="14" fill="#aa7b55"/><path d="M-7-5Q-2-12 6-6" fill="none" stroke="#c79d73" stroke-width="3" stroke-linecap="round"/><circle cx="4" cy="4" r="1.5" fill="#8d684b"/><circle cx="-5" cy="2" r="1.4" fill="#8d684b"/></g>`).join("");}
function beefArt(){return [-31,0,31].map((x,i)=>`<g transform="translate(${x} ${i===1?-7:3}) rotate(-12)"><path d="M-13-21H12V13Q0 28-13 14Z" fill="#ce8e7e"/><path d="M-10-14Q0-6 11-12M-10-1Q0 7 11 0" stroke="#edc4ad" stroke-width="4" fill="none"/><ellipse cy="13" rx="13" ry="12" fill="#e4af98"/><path d="M7 15Q9 3 0 5Q-9 6-6 15Q-2 22 4 16" stroke="#f5d5bc" stroke-width="3" fill="none" stroke-linecap="round"/></g>`).join("");}
function handArt(){return `<path d="M-27 21Q-43 10-32-4Q-27-14-15-12L2-9Q10-8 10-2Q9 6 2 7L-1 10Q14 2 17 10Q19 18 7 25L-8 33Z" fill="#e6bd94" stroke="#cba17e" stroke-width="2"/><path d="M-31 15-9 31-23 52Q-43 51-53 32Z" fill="#cb815c"/><path d="m-31 17 20 15" stroke="#e7ae7b" stroke-width="4" stroke-linecap="round"/>`;}
function waterArt(x,y){return `<g transform="translate(${x} ${y})"><ellipse cy="37" rx="24" ry="5" fill="#708b7b" opacity=".15"/><path d="m-20-27 4 57Q0 38 16 30L20-27Z" fill="#eaf2e6" stroke="#87aaa4" stroke-width="3"/><path d="m-17-8 3 35Q0 32 14 27L17-8Z" fill="#a5d4cc"/><ellipse cy="-27" rx="20" ry="5" fill="#f5f6e7" stroke="#87aaa4" stroke-width="3"/><path d="M-11-17-9 24" stroke="#fffdf2" stroke-width="3" stroke-linecap="round"/></g>`;}

export function createHotpotIntroArtwork(layout=getHotpotIntroLayout()) {
  const {width,height,portrait,pot:p,yu,plates}=layout;
  const art=[tofuArt(),lotusArt(),`${vegetables(-20,-5,1.1)}${mushroom(34,-2,.8)}${mushroom(51,10,.65)}`,fishArt(),porkArt(),ballsArt(),beefArt()];
  const scale=width/600;
  const tabletop=portrait
    ? '<path data-intro-table-legs d="M100 810V882M540 810V882" stroke="#9d805a" stroke-width="18" stroke-linecap="round"/><path d="M65 230H575L625 820H15Z" fill="#d8b782"/><path d="M15 820H625V850H15Z" fill="#c69d69"/>'
    : '<path data-intro-table-legs d="M210 550 199 635M790 550 801 635" stroke="#9d805a" stroke-width="20" stroke-linecap="round"/><path d="M30 410H970V435Q957 600 500 605Q43 600 30 435Z" fill="#bd9567"/><ellipse cx="500" cy="410" rx="470" ry="170" fill="#e0bd87"/>';
  const leftX=p.x-99*p.scale,rightX=p.x+99*p.scale,handY=p.y+25*p.scale;
  return `<svg class="hotpot-theme-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-illustration-layout="${portrait?'portrait':'landscape'}">
    <style>.hotpot-theme-art *{animation:none!important;transition:none!important}.hotpot-theme-art{display:block;max-width:100%;max-height:100%;overflow:hidden}</style>
    <rect width="${width}" height="${height}" rx="24" fill="#edf0dd"/>
    <g transform="scale(${scale})">${sceneBackground("restaurant")}</g>
    <path d="M0 ${portrait?180:215}Q${width*.3} ${portrait?202:247} ${width*.6} ${portrait?185:218}T${width} ${portrait?196:237}V${portrait?310:330}H0Z" fill="#a9c8b9"/>
    <g stroke="#d6e2cc" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M${width*.06} ${portrait?216:253}H${width*.18}M${width*.75} ${portrait?217:264}H${width*.92}"/></g>
    <ellipse cx="${width/2}" cy="${portrait?887:642}" rx="${portrait?294:440}" ry="15" fill="#9da985" opacity=".2"/>
    <g data-intro-vocabulary opacity="0" transform="translate(${layout.vocabulary.x} ${layout.vocabulary.y})" text-anchor="middle" fill="#35574c">
      <text y="-56" lang="zh-Latn" font-family="var(--sans),sans-serif" font-size="24" font-weight="650">huǒ guō</text>
      <text lang="zh-Hans" font-family="var(--chinese),sans-serif" font-size="50" font-weight="800">火锅</text>
      <text y="29" font-family="var(--sans),sans-serif" font-size="22" font-weight="650">hot pot</text>
    </g>
    ${tabletop}
    ${plates.slice(0,4).map((q,i)=>plate(q,art[i])).join("")}
    <g data-intro-yu>${miniYu(yu.x,yu.y,yu.scale)}</g>
    <g data-intro-pot-rig>${pot(p.x,p.y,p.scale)}
      <g data-intro-hand="left" data-base-x="${leftX}" data-base-y="${handY}"><g transform="translate(${leftX} ${handY})">${handArt()}</g></g>
      <g data-intro-hand="right" data-base-x="${rightX}" data-base-y="${handY}"><g transform="translate(${rightX} ${handY}) scale(-1 1)">${handArt()}</g></g>
    </g>
    ${plates.slice(4).map((q,i)=>plate(q,art[i+4])).join("")}
    ${waterArt(portrait?205:250,portrait?759:508)}
    <g transform="translate(${portrait?445:170} ${portrait?773:500})"><ellipse rx="30" ry="13" fill="#f8efd3" stroke="#c6b68c" stroke-width="3"/><ellipse rx="23" ry="8" fill="#b59a62"/><g fill="#8eab6c"><circle cx="-9" cy="-1" r="4"/><circle cx="4" cy="2" r="4"/><circle cx="12" cy="-3" r="3"/></g></g>
    <g transform="translate(${portrait?500:730} ${portrait?771:545}) rotate(-12)" stroke="#9c7049" stroke-width="5" stroke-linecap="round"><path d="M-32-5H32M-32 5H32"/></g>
  </svg>`;
}

export function createHotpotIntroScene(host) {
  let disposed=false,lastTime=0,layout,svg,rig,hands,steamPaths,bubbles,tail,shadow,vocabulary;
  function build(next) {
    layout=next;host.innerHTML=createHotpotIntroArtwork(layout);svg=host.querySelector('svg');
    vocabulary=svg.querySelector('[data-intro-vocabulary]');
    rig=svg.querySelector('[data-intro-pot-rig]');hands=[...svg.querySelectorAll('[data-intro-hand]')];
    steamPaths=[...rig.querySelectorAll('.activity-steam')];bubbles=[...rig.querySelectorAll('.activity-bubble')].map(el=>({el,r:Number(el.getAttribute('r'))}));
    tail=svg.querySelector('[data-intro-yu] path');shadow=rig.querySelector('ellipse');
  }
  function render(seconds=0) {
    if(disposed||!svg)return;
    const pose=hotpotIntroPose(seconds,layout);lastTime=pose.t;
    vocabulary?.setAttribute("opacity",String(pose.vocabularyOpacity));
    rig.setAttribute('transform',`translate(${pose.pot.dx} ${pose.pot.dy}) rotate(${pose.pot.angle} ${layout.pot.x} ${layout.pot.y})`);
    hands.forEach((el,i)=>{const h=pose.hands[i],x=Number(el.dataset.baseX),y=Number(el.dataset.baseY);el.setAttribute('transform',`translate(${h.dx} ${h.dy}) rotate(${h.angle} ${x} ${y})`);});
    steamPaths.forEach((el,i)=>{const s=pose.steam[i];el.setAttribute('transform',`translate(0 ${s.dy}) scale(1 ${s.scale})`);el.setAttribute('opacity',String(s.opacity));});
    bubbles.forEach(({el,r},i)=>{el.setAttribute('r',String(r*pose.bubbles[i].r));el.setAttribute('opacity',String(pose.bubbles[i].opacity));});
    tail?.setAttribute('transform',`rotate(${pose.yuTail} 19 36)`);
    shadow?.setAttribute('transform',`translate(${-pose.pot.dx/layout.pot.scale} ${-pose.pot.dy/layout.pot.scale})`);
  }
  function resize() {
    if(disposed)return;
    const bounds=host.getBoundingClientRect(),next=getHotpotIntroLayout(Math.max(1,bounds.width)/Math.max(1,bounds.height));
    if(!layout||next.portrait!==layout.portrait)build(next);
    render(lastTime);
  }
  function destroy(){if(disposed)return;disposed=true;svg?.remove();}
  resize();return {render,resize,destroy};
}
