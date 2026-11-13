// Original, editable riverside illustration. All motion follows the presenter's
// visible-time clock, including the sky, lanterns, reflections and vocabulary.
export const LANTERN_TIMELINE = Object.freeze({
  duration: 5, sunsetStart: .45, nightAt: 3.65,
  lights: Object.freeze([1.3, 2.1, 2.9]), lightFade: .65,
  wordStart: 2, wordEnd: 3.2,
});
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = n => { n = clamp(n); return n * n * (3 - 2 * n); };
const mix = (a, b, u) => {
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  return `#${rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * u).toString(16).padStart(2, '0')).join('')}`;
};
const PALETTE = Object.freeze({
  sky: ['#edf0dd', '#c6a59b', '#263f4d'],
  farHill: ['#cbd9c5', '#b6b8aa', '#546f75'],
  nearHill: ['#b5cbb7', '#8faaa0', '#446963'],
  shore: ['#c7cfad', '#a9b69e', '#6b8b79'],
  stone: ['#e1dcc2', '#cabfa4', '#9da58c'],
  river: ['#a8c9bd', '#91b5ab', '#416d70'],
  wave: ['#bfd9ca', '#adc7b5', '#6c9690'],
  wall: ['#e0cf9d', '#c6af88', '#a79b7c'],
  wood: ['#b18b68', '#a27861', '#856e59'],
  roof: ['#4f8170', '#4a7467', '#345b50'],
  trim: ['#b8c7a1', '#a9b194', '#869a7f'],
});
let illustrationId = 0;

export function getLanternIntroLayout(aspect = 1.5) {
  const portrait = aspect < .8, width = portrait ? 640 : 1000, height = portrait ? 900 : 660;
  const string = { left: 45, right: width - 45, y: portrait ? 265 : 165, sag: portrait ? 100 : 110 };
  const lanterns = [.2, .5, .8].map((fraction, i) => {
    const x = width * fraction, u = (x - string.left) / (string.right - string.left);
    const scale = portrait ? [1.2, 1.6, 1.2][i] : [1.35, 1.75, 1.35][i];
    const anchorY = string.y + 4 * string.sag * u * (1 - u);
    return { x, y: anchorY + 35 * scale, anchorY, scale };
  });
  return { portrait, width, height, string, lanterns,
    vocabulary: { x: width / 2, y: portrait ? 172 : 102 },
    bank: portrait ? 674 : 506, rail: portrait ? 630 : 465,
    hills: { far: portrait ? 390 : 300, near: portrait ? 520 : 380 },
    moon: { x: width * .84, y: portrait ? 108 : 79, r: portrait ? 24 : 22 },
    sun: { x: width * .12, y: portrait ? 140 : 110, r: 25 },
    building: { x: width * .09, y: portrait ? 615 : 459, scale: portrait ? .94 : 1.05 },
    pavilion: { x: width * .83, y: portrait ? 610 : 457, scale: portrait ? .78 : .88 },
  };
}

export function lanternIntroPose(seconds = 0, layout = getLanternIntroLayout()) {
  const T = LANTERN_TIMELINE, t = clamp(Number.isFinite(seconds) ? seconds : 0, 0, T.duration);
  const night = ease((t - T.sunsetStart) / (T.nightAt - T.sunsetStart));
  // Two smooth colour stages retain the warm dusk between cream day and blue night.
  const colours = Object.fromEntries(Object.entries(PALETTE).map(([key, [day, dusk, dark]]) =>
    [key, night < .46 ? mix(day, dusk, ease(night / .46)) : mix(dusk, dark, ease((night - .46) / .54))]));
  const lanterns = layout.lanterns.map((l, i) => ({
    ...l, light: ease((t - T.lights[i]) / T.lightFade),
    sway: Math.sin(t * .9 + i * .8) * 1.15,
    reflectionX: l.x + Math.sin(t * .75 + i) * 3,
    reflectionScale: .95 + .05 * Math.sin(t * .9 + i),
  }));
  return { t, night, colours, lanterns,
    sunOpacity: 1 - ease((t - .4) / 1.6), sunDrop: 95 * ease((t - .4) / 1.8),
    moonOpacity: ease((t - 2.35) / 1.2), starsOpacity: ease((t - 2.55) / 1.1),
    vocabularyOpacity: ease((t - T.wordStart) / (T.wordEnd - T.wordStart)),
    windowGlow: ease((t - 1.65) / 1.5),
    waveOffsets: [Math.sin(t * .5) * 12, Math.sin(t * .4 + 1) * 9],
  };
}

function buildingArt(l, colours, windowGlow) {
  const b = l.building, tone = (name) => `data-lantern-tone="${name}" fill="${colours[name]}"`;
  return `<g transform="translate(${b.x} ${b.y}) scale(${b.scale})">
    <path d="M3 4V39M54 4V39M111 4V39M163 4V39" stroke="${colours.wood}" data-lantern-stroke="wood" stroke-width="9"/>
    <path d="M0-124H166V5H0Z" ${tone('wall')}/><path d="M-9-71H175V-60H-9ZM-9-7H175V5H-9Z" fill="#af7053"/>
    <path d="M6-126V3M57-126V3M109-126V3M160-126V3" stroke="#ad7055" stroke-width="7"/>
    <g fill="#e7d5a2" stroke="#8d7252" stroke-width="2">${[-108, -45].map(y => [13, 66, 117].map(x => `<rect x="${x}" y="${y}" width="34" height="26" rx="1"/>`).join('')).join('')}</g>
    <g data-lantern-windows opacity="${windowGlow}" fill="#f2d18a">${[-108, -45].map(y => [13, 66, 117].map(x => `<rect x="${x + 2}" y="${y + 2}" width="30" height="22" rx="1"/>`).join('')).join('')}</g>
    <path d="M-14-125Q17-127 27-145H138Q151-127 181-125L173-114H-7Z" ${tone('roof')}/>
    <path d="M-14-125Q17-127 27-145H138Q151-127 181-125M-7-115H173" fill="none" data-lantern-stroke="trim" stroke="${colours.trim}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-12-62H177M-7-54H171M-7 0H171" fill="none" data-lantern-stroke="trim" stroke="${colours.trim}" stroke-width="3"/>
  </g>`;
}

function pavilionArt(l, colours) {
  const b = l.pavilion;
  return `<g transform="translate(${b.x} ${b.y}) scale(${b.scale})">
   <path d="M-51 0V-80M51 0V-80" stroke="#ac7156" stroke-width="10"/><path d="M-63 1H63V11H-63Z" data-lantern-tone="stone" fill="${colours.stone}"/>
   <path d="M-78-86Q-38-93 0-119Q38-93 78-86L69-72H-69Z" data-lantern-tone="roof" fill="${colours.roof}"/>
   <path d="M-78-86Q-38-93 0-119Q38-93 78-86M-69-72H69" fill="none" data-lantern-stroke="trim" stroke="${colours.trim}" stroke-width="4" stroke-linejoin="round"/>
   <path d="M-48-11H48M-29-11V-35M0-11V-35M29-11V-35M-48-35H48" fill="none" stroke="#a57d5e" stroke-width="4"/>
  </g>`;
}

function lanternArt(l, i, light, id) {
  // The ellipse, ribs, gold caps and three tassels derive from activities.js.
  return `<g data-lantern-rig="${i}" transform="translate(${l.x} ${l.anchorY}) rotate(${l.sway}) scale(${l.scale}) translate(0 35)">
    <ellipse data-lantern-halo="${i}" cy="26" rx="57" ry="68" fill="url(#${id}-glow)" opacity="${light * .75}"/>
    <path d="M0-35V0" stroke="#9d7958" stroke-width="2.5"/>
    <ellipse cy="26" rx="23" ry="28" fill="#bb684f"/>
    <ellipse data-lantern-light="${i}" cy="26" rx="23" ry="28" fill="#e99a5f" opacity="${light}"/>
    <ellipse data-lantern-core="${i}" cy="26" rx="12" ry="25" fill="#f6c87e" opacity="${light * .65}"/>
    <path d="M-12 4Q-20 27-12 49M0 0V53M12 4Q20 27 12 49" stroke="#e7a473" stroke-width="2.5" fill="none"/>
    <path d="M-13 0H13M-13 53H13" stroke="#dabc7c" stroke-width="5"/>
    <path d="M0 56V73M-4 65V76M4 65V76" stroke="#bd7355" stroke-width="2.5"/>
   </g>`;
}

function reflections(l, p) {
  return p.lanterns.map((lantern, i) => `<g data-lantern-reflection="${i}" opacity="${lantern.light * .31}" transform="translate(${lantern.reflectionX} ${l.bank + 29}) scale(${lantern.reflectionScale} 1)" fill="#efd296">
    ${[0, 15, 32, 52, 76].map((y, j) => `<ellipse cx="${[-4, 2, -1, 5, 0][j]}" cy="${y}" rx="${[15, 24, 20, 30, 18][j]}" ry="${[2.4, 3, 3, 3.5, 2.8][j]}" opacity="${1 - j * .12}"/>`).join('')}
  </g>`).join('');
}

export function createLanternIntroArtwork(layout = getLanternIntroLayout(), id = 'lantern-intro', seconds = 0) {
  const l = layout, { width: w, height: h, string: s, bank, rail } = l, p = lanternIntroPose(seconds, l), c = p.colours;
  const stars = [[.07,.09,1.7],[.18,.2,1.5],[.3,.08,1.8],[.39,.22,1.2],[.56,.08,1.4],[.66,.2,1.7],[.73,.07,1.1],[.92,.22,1.5],[.92,.08,1.8],[.07,.31,1.1]];
  const near = l.hills.near, far = l.hills.far, v = l.vocabulary;
  return `<svg class="lantern-theme-art" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" data-lantern-layout="${l.portrait ? 'portrait' : 'landscape'}">
   <style>.lantern-theme-art *{animation:none!important;transition:none!important}.lantern-theme-art{display:block;max-width:100%;max-height:100%;overflow:hidden}.lantern-theme-art text{letter-spacing:0;text-anchor:middle}</style>
   <defs><clipPath id="${id}-bounds"><rect width="${w}" height="${h}" rx="24"/></clipPath><clipPath id="${id}-water"><path d="M0 ${bank}Q${w * .3} ${bank - 17} ${w * .6} ${bank + 3}T${w} ${bank - 8}V${h}H0Z"/></clipPath><radialGradient id="${id}-glow"><stop offset="0" stop-color="#ffdb8b" stop-opacity=".64"/><stop offset=".55" stop-color="#f1ca80" stop-opacity=".23"/><stop offset="1" stop-color="#f1ca80" stop-opacity="0"/></radialGradient></defs>
   <g clip-path="url(#${id}-bounds)">
   <rect width="${w}" height="${h}" data-lantern-tone="sky" fill="${c.sky}"/>
   <circle data-lantern-sun cx="${l.sun.x}" cy="${l.sun.y + p.sunDrop}" r="${l.sun.r}" fill="#e7ca83" opacity="${p.sunOpacity}"/>
   <circle data-lantern-moon cx="${l.moon.x}" cy="${l.moon.y}" r="${l.moon.r}" fill="#f6e8bd" opacity="${p.moonOpacity}"/>
   <g data-lantern-stars opacity="${p.starsOpacity}" fill="#f7edcc">${stars.map(([x,y,r])=>`<circle cx="${x*w}" cy="${y*(l.portrait?640:480)}" r="${r}"/>`).join('')}</g>
   <path d="M0 ${far + 35}Q${w*.13} ${far-85} ${w*.23} ${far+2}T${w*.48} ${far-5}T${w*.76} ${far+13}T${w} ${far-15}V${bank}H0Z" data-lantern-tone="farHill" fill="${c.farHill}"/>
   <path d="M0 ${near+14}Q${w*.16} ${near-51} ${w*.34} ${near+4}T${w*.69} ${near-4}T${w} ${near+11}V${bank+25}H0Z" data-lantern-tone="nearHill" fill="${c.nearHill}"/>
   <path d="M0 ${rail-15}Q${w*.3} ${rail-44} ${w*.61} ${rail-12}T${w} ${rail-25}V${bank+30}H0Z" data-lantern-tone="shore" fill="${c.shore}"/>
   ${buildingArt(l,c,p.windowGlow)}${pavilionArt(l,c)}
   <path d="M0 ${rail+15}Q${w*.37} ${rail+2} ${w} ${rail+16}V${bank+25}H0Z" data-lantern-tone="stone" fill="${c.stone}"/>
   <path d="M26 ${rail+4}H${w-26}M26 ${rail-12}H${w-26}${Array.from({length:l.portrait?9:13},(_,i)=>{const x=26+i*(w-52)/(l.portrait?8:12);return`M${x} ${rail-21}V${rail+20}`}).join('')}" fill="none" data-lantern-stroke="wood" stroke="${c.wood}" stroke-width="4" stroke-linecap="round"/>
   <path d="M${s.left} ${s.y-27}V${rail+12}M${s.right} ${s.y-27}V${rail+12}" fill="none" data-lantern-stroke="wood" stroke="${c.wood}" stroke-width="10" stroke-linecap="round"/>
   <path d="M${s.left} ${s.y}Q${w/2} ${s.y+s.sag*2} ${s.right} ${s.y}" fill="none" stroke="#a68661" stroke-width="3.5"/>
   <g clip-path="url(#${id}-water)"><rect x="0" y="${bank-20}" width="${w}" height="${h-bank+20}" data-lantern-tone="river" fill="${c.river}"/>
   <path data-lantern-wave="0" d="M-30 ${bank+43}Q${w*.15} ${bank+20} ${w*.38} ${bank+49}T${w+30} ${bank+39}V${h}H-30Z" data-lantern-tone="wave" fill="${c.wave}" opacity=".24" transform="translate(${p.waveOffsets[0]} 0)"/>
   <path data-lantern-wave="1" d="M-30 ${bank+104}Q${w*.25} ${bank+82} ${w*.52} ${bank+111}T${w+30} ${bank+101}V${h}H-30Z" data-lantern-tone="wave" fill="${c.wave}" opacity=".28" transform="translate(${p.waveOffsets[1]} 0)"/>
   ${reflections(l,p)}</g>
   ${p.lanterns.map((lantern,i)=>lanternArt(lantern,i,lantern.light,id)).join('')}
   <g data-lantern-vocabulary transform="translate(${v.x} ${v.y})" opacity="${p.vocabularyOpacity}" fill="#fff0ce" text-anchor="middle" font-weight="800">
    <text x="-31" y="-33" lang="zh-Latn" font-family="var(--sans),sans-serif" font-size="24">dēng</text><text x="31" y="-33" lang="zh-Latn" font-family="var(--sans),sans-serif" font-size="24">long</text>
    <text x="-31" y="20" lang="zh-Hans" font-family="var(--chinese),sans-serif" font-size="53">灯</text><text x="31" y="20" lang="zh-Hans" font-family="var(--chinese),sans-serif" font-size="53">笼</text>
    <text x="0" y="52" lang="en" font-family="var(--sans),sans-serif" font-size="23" font-weight="650">lantern</text>
   </g></g></svg>`;
}

export function createLanternIntroScene(host) {
  let layout, svg, refs, lastTime = 0, disposed = false;
  function build(next) {
    layout = next; host.innerHTML = createLanternIntroArtwork(layout, `lantern-scene-${++illustrationId}`, lastTime);
    svg = host.querySelector('svg');
    const one = name => svg.querySelector(`[data-lantern-${name}]`), all = name => [...svg.querySelectorAll(`[data-lantern-${name}]`)];
    refs = { tones: all('tone'), strokes: all('stroke'), rigs: all('rig'), halos: all('halo'), lights: all('light'), cores: all('core'), reflections: all('reflection'), waves: all('wave'), windows: one('windows'), sun: one('sun'), moon: one('moon'), stars: one('stars'), vocabulary: one('vocabulary') };
  }
  function render(seconds = 0) {
    if (disposed || !svg) return;
    const p = lanternIntroPose(seconds, layout); lastTime = p.t;
    for (const element of refs.tones) element.setAttribute('fill', p.colours[element.getAttribute('data-lantern-tone')]);
    for (const element of refs.strokes) element.setAttribute('stroke', p.colours[element.getAttribute('data-lantern-stroke')]);
    refs.sun.setAttribute('cy', String(layout.sun.y + p.sunDrop)); refs.sun.setAttribute('opacity', String(p.sunOpacity));
    refs.moon.setAttribute('opacity', String(p.moonOpacity)); refs.stars.setAttribute('opacity', String(p.starsOpacity));
    refs.windows.setAttribute('opacity', String(p.windowGlow)); refs.vocabulary.setAttribute('opacity', String(p.vocabularyOpacity));
    p.lanterns.forEach((l, i) => {
      refs.rigs[i].setAttribute('transform', `translate(${l.x} ${l.anchorY}) rotate(${l.sway}) scale(${l.scale}) translate(0 35)`);
      refs.halos[i].setAttribute('opacity', String(l.light * .75)); refs.lights[i].setAttribute('opacity', String(l.light)); refs.cores[i].setAttribute('opacity', String(l.light * .65));
      refs.reflections[i].setAttribute('opacity', String(l.light * .31)); refs.reflections[i].setAttribute('transform', `translate(${l.reflectionX} ${layout.bank + 29}) scale(${l.reflectionScale} 1)`);
    });
    refs.waves.forEach((wave, i) => wave.setAttribute('transform', `translate(${p.waveOffsets[i]} 0)`));
  }
  function resize() {
    if (disposed) return;
    const r = host.getBoundingClientRect(), next = getLanternIntroLayout(Math.max(1, r.width) / Math.max(1, r.height));
    if (!layout || layout.portrait !== next.portrait) build(next);
    render(lastTime);
  }
  function destroy() { if (disposed) return; disposed = true; svg?.remove(); }
  resize(); return { render, resize, destroy };
}
