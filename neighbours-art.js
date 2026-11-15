/**
 * Original, editable artwork for Chongqing's neighbours.
 * Deliberately uses the same flat, rounded shapes and colours as activities.js.
 * No embedded fonts, raster assets, network requests or platform emoji.
 */
import { lantern, miniYu, pot, steam, vegetables } from './activities.js?v=1.26';

const PEOPLE = Object.freeze({
  xiaohe: { name: 'Xiaohe', skin: '#dfb18c', hair: '#4b5145', coat: '#829b77', trim: '#e9e8d1', bg: '#e6ead6' },
  grandma: { name: 'Grandma Chen', skin: '#d8ad91', hair: '#b9beb0', coat: '#8d9b8f', trim: '#c8d6af', bg: '#e8e6d7' },
  lee: { name: 'Uncle Lee', skin: '#cfa07d', hair: '#50564c', coat: '#c5a06b', trim: '#f1e5c7', bg: '#eee5d2' },
  alan: { name: 'Alan', skin: '#e4b995', hair: '#424f45', coat: '#638e81', trim: '#eae6cf', bg: '#dde9df' },
});
const validId = (id) => Object.hasOwn(PEOPLE, id) ? id : 'xiaohe';
const safePose = (pose) => ['welcome', 'listen', 'recap'].includes(pose) ? pose : 'welcome';

function figure(id, pose = 'welcome') {
  id = validId(id);
  pose = safePose(pose);
  const p = PEOPLE[id];
  const isGrandma = id === 'grandma', isLee = id === 'lee';
  const headWidth = isLee ? 30 : isGrandma ? 28 : id === 'alan' ? 25 : 27;
  const bodyWidth = isLee ? 32 : isGrandma ? 30 : 26;
  const sleeve = pose === 'welcome'
    ? '<path d="M57 102Q43 99 37 82"/>'
    : pose === 'listen'
      ? '<path d="M57 102Q44 101 46 85"/>'
      : '<path d="M57 102 47 115"/>';
  // Simple rounded palms match the miniature 3D figures. Keep the silhouette
  // continuous: separated finger strokes looked like three-pronged paws.
  const hand = pose === 'welcome'
    ? `<path d="M37 82 34 73"/><ellipse cx="33" cy="68" rx="7" ry="8" transform="rotate(-12 33 68)" fill="${p.skin}" stroke="none"/>`
    : pose === 'listen'
      ? `<path d="M46 85 48 81"/><ellipse cx="48" cy="77" rx="6.5" ry="7.5" fill="${p.skin}" stroke="none"/>`
      : `<path d="M47 115 55 119"/><ellipse cx="61" cy="120" rx="7.5" ry="6" fill="${p.skin}" stroke="none"/>`;
  const hairBack = isGrandma
    ? `<circle cx="81" cy="24" r="18" fill="${p.hair}"/><path d="M50 61Q46 28 77 28Q113 28 110 65L102 79H57Z" fill="${p.hair}"/>`
    : id === 'xiaohe'
      ? `<path d="M48 72V48Q49 23 79 24Q111 23 111 51V76L101 86H58Z" fill="${p.hair}"/><circle cx="103" cy="31" r="10" fill="${p.hair}"/>`
      : `<path d="M${80-headWidth-2} 60Q45 23 79 23Q114 22 111 60Z" fill="${p.hair}"/>`;
  const fringe = isGrandma
    ? `<path d="M52 53Q60 29 81 34Q101 34 107 52Q94 47 82 37Q67 49 52 53Z" fill="${p.hair}"/><path d="M62 38Q74 30 86 33" stroke="#d7d9cb" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : id === 'alan'
      ? `<path d="M54 50Q50 24 77 24Q108 22 108 52L94 42 75 49 81 39 56 53Z" fill="${p.hair}"/>`
      : id === 'xiaohe'
        ? `<path d="M52 52Q50 29 79 29Q108 29 107 54L97 47 89 38Q77 52 52 52Z" fill="${p.hair}"/>`
        : `<path d="M50 50Q51 26 80 27Q109 28 110 53L98 45 77 40 59 49Z" fill="${p.hair}"/><path d="M51 51 54 62M109 51 106 62" stroke="#99a08f" stroke-width="5"/>`;
  const details = isGrandma
    ? '<g fill="none" stroke="#7a8778" stroke-width="2"><ellipse cx="68" cy="62" rx="10" ry="8"/><ellipse cx="92" cy="62" rx="10" ry="8"/><path d="M78 61H82M57 60 51 58M103 60 109 58"/></g><path d="M57 74 61 75M99 75 103 74" fill="none" stroke="#b78c75" stroke-width="1.4" stroke-linecap="round"/>'
    : isLee
      ? `<path d="M69 76Q74 70 80 74Q87 70 92 76Q85 79 80 77Q74 80 69 76Z" fill="${p.hair}"/>`
      : '';
  const costume = id === 'xiaohe'
    ? `<path d="M66 92V106H94V92" fill="none" stroke="#dce0c4" stroke-width="5"/><path d="M60 106H100L104 137H56Z" fill="#c5d2b1"/><path d="M69 116H91V127Q80 133 69 127Z" fill="#98ad89"/><path d="M69 116H91" stroke="#e3e6d0" stroke-width="2"/>`
    : isGrandma
      ? '<path d="M63 92 80 102 98 92 93 104 81 112 67 106Z" fill="#c8d6af"/><path d="M80 111V138" stroke="#74877a" stroke-width="2"/><circle cx="86" cy="117" r="2" fill="#e6dfbc"/><circle cx="86" cy="129" r="2" fill="#e6dfbc"/>'
      : isLee
        ? '<path d="M66 91 80 98 94 91 90 110 80 104 70 110Z" fill="#e8d9b7"/><path d="M80 105V138" stroke="#ad8a57" stroke-width="2"/><path d="M90 116H104V126H90Z" fill="#b58e5c"/><circle cx="85" cy="118" r="1.8" fill="#f1e5c7"/>'
        : '<path d="M68 92 80 101 93 92 86 112H73Z" fill="#eee8d1"/><path d="M102 96 60 131" fill="none" stroke="#c2a377" stroke-width="7"/><rect x="50" y="123" width="25" height="22" rx="5" fill="#b79a72"/><path d="M52 125H73V131H52Z" fill="#d0b383"/>';
  return `<g class="neighbour-figure neighbour-${id} pose-${pose}" data-resident-art="${id}">
    <ellipse cx="80" cy="149" rx="34" ry="6" fill="#54715a" opacity=".13"/>
    <path d="M67 131V144M93 131V144" fill="none" stroke="#697564" stroke-width="12" stroke-linecap="round"/>
    <path d="M61 146H73M88 146H102" fill="none" stroke="#475d51" stroke-width="7" stroke-linecap="round"/>
    <path d="M${80-bodyWidth} 135Q${46-isLee*3} 93 66 91H94Q${114+isLee*3} 93 ${80+bodyWidth} 135Q80 144 ${80-bodyWidth} 135Z" fill="${p.coat}"/>
    <g fill="none" stroke="${p.coat}" stroke-width="14" stroke-linecap="round">${sleeve}<path d="M103 103 111 120"/></g>
    <g fill="none" stroke="${p.skin}" stroke-width="10" stroke-linecap="round">${hand}<path d="M111 120 108 123"/><ellipse cx="105" cy="126" rx="6.5" ry="6.5" fill="${p.skin}" stroke="none"/></g>
    ${costume}<path d="M72 80H88V94Q80 100 72 94Z" fill="${p.skin}"/>
    ${hairBack}<circle cx="${80-headWidth}" cy="62" r="7" fill="${p.skin}"/><circle cx="${80+headWidth}" cy="62" r="7" fill="${p.skin}"/>
    <ellipse cx="80" cy="61" rx="${headWidth}" ry="31" fill="${p.skin}"/>${fringe}
    <ellipse cx="62" cy="73" rx="6" ry="3" fill="#cb8f79" opacity=".35"/><ellipse cx="98" cy="73" rx="6" ry="3" fill="#cb8f79" opacity=".35"/>
    <g fill="#475346"><ellipse cx="68" cy="62" rx="2.7" ry="3.3"/><ellipse cx="92" cy="62" rx="2.7" ry="3.3"/></g>
    <path d="M63 54Q67 52 72 54M88 54Q92 52 97 54" fill="none" stroke="${isGrandma ? '#9da794' : p.hair}" stroke-width="2" stroke-linecap="round"/>
    <path d="M80 66 78 71H82" fill="none" stroke="#bc8d70" stroke-width="1.8" stroke-linecap="round"/>
    ${details}<path d="M73 ${isLee ? 82 : 79}Q80 ${isLee ? 88 : 85} 88 ${isLee ? 81 : 78}" fill="none" stroke="#a97560" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}

export function residentPortrait(id, { pose = 'welcome' } = {}) {
  id = validId(id);
  return `<svg class="neighbour-portrait" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${PEOPLE[id].name}"><circle cx="80" cy="81" r="75" fill="${PEOPLE[id].bg}"/>${figure(id, pose)}</svg>`;
}

function cup(x, y, scale = 1, water = false) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="43" rx="45" ry="7" fill="#526e5a" opacity=".12"/>${water
    ? '<path d="M-27-17-22 35Q0 47 22 35L27-17Z" fill="#e5f1e7" stroke="#86a89d" stroke-width="3"/><path d="M-23-2-20 32Q0 41 20 32L23-2Z" fill="#a4cfc7"/><ellipse cy="-17" rx="27" ry="7" fill="#f4f7e9" stroke="#86a89d" stroke-width="3"/><path d="M-16-7-13 29" stroke="#fffbed" stroke-width="3" stroke-linecap="round"/>'
    : `<ellipse cy="40" rx="42" ry="8" fill="#f7efd9" stroke="#b0bd9b" stroke-width="2"/><path d="M28 0Q50-6 46 15Q43 26 28 20" fill="none" stroke="#8fa587" stroke-width="7"/><path d="M-31 0Q-28 37 0 37T31 0" fill="#e7ebd2" stroke="#8fa587" stroke-width="3"/><ellipse rx="31" ry="9" fill="#f9f4dc" stroke="#8fa587" stroke-width="3"/><ellipse rx="25" ry="6" fill="#c1a367"/>${steam(0, -10, .58)}`}</g>`;
}
function teaPot(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-43 4Q-71-11-67 17Q-62 38-42 27" fill="none" stroke="#6e9478" stroke-width="9"/><path d="M39 4 66-10 77-5 53 30 37 29" fill="#7e9f7b"/><ellipse cy="20" rx="48" ry="34" fill="#7e9f7b"/><ellipse rx="35" ry="9" fill="#c3d0a6"/><path d="M-30-4Q0-31 30-4Z" fill="#73906b"/><ellipse cy="-15" rx="9" ry="5" fill="#52765d"/><path d="M-28 18Q-27 32-12 36" fill="none" stroke="#bbcca3" stroke-width="5" stroke-linecap="round"/></g>`;
}
function currency() {
  return `<g data-neighbour-object="currency"><g transform="translate(405 141) rotate(-8)"><rect x="-88" y="-32" width="146" height="70" rx="6" fill="#acbf99" stroke="#809973" stroke-width="3"/><rect x="-79" y="-24" width="128" height="53" rx="3" fill="none" stroke="#d6dfbd" stroke-width="2"/><circle cx="-41" cy="2" r="17" fill="#d4dfbb"/><path d="M-48-5-41 2-34-5M-41 2V13M-50 3H-32M-50 8H-32" fill="none" stroke="#7b9976" stroke-width="2.5"/><path d="M-10 14 7-6 18 5 30-13 42 14Z" fill="#819d7b"/><path d="M-9-11H15M-9-18H31" stroke="#d6dfbd" stroke-width="3"/></g><g transform="translate(452 178) rotate(7)"><rect x="-74" y="-28" width="145" height="62" rx="6" fill="#b9a3a0" stroke="#9d8984" stroke-width="3"/><rect x="-65" y="-20" width="127" height="46" rx="3" fill="none" stroke="#e3d1c1" stroke-width="2"/><path d="M-21 16V-2H25V16M-31-3-1-16 35-3ZM-11 16V4H13V16" fill="#937e7a"/><circle cx="-49" cy="2" r="10" fill="#e3d1c1"/></g>${[[-47,0],[-10,-6],[24,4]].map(([x,y])=>`<g transform="translate(${467+x} ${202+y})"><ellipse rx="18" ry="8" fill="#b9934d"/><ellipse cy="-4" rx="18" ry="8" fill="#e7c36e"/><ellipse cy="-4" rx="13" ry="5" fill="none" stroke="#c5a154" stroke-width="1.8"/></g>`).join('')}</g>`;
}
function route(visual) {
  return `<g data-neighbour-object="route"><path d="M425 233V153H286M425 153H568" fill="none" stroke="#c8be9b" stroke-width="29" stroke-linejoin="round" stroke-linecap="round"/><path d="M425 233V153H286M425 153H568" fill="none" stroke="#eee3bf" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/><path d="M425 164V77" stroke="#a78863" stroke-width="7"/><path d="m418 84-58 0-12 11 12 11H418M432 111H487L500 122 487 133H432" fill="#d7b77e" stroke="#ae8c5f" stroke-width="2"/>${visual === 'left' ? '<path d="M418 153H309m12-10-14 10 14 10" fill="none" stroke="#638e78" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' : visual === 'right' ? '<path d="M435 153H551m-12-10 14 10-14 10" fill="none" stroke="#638e78" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' : '<circle cx="425" cy="201" r="10" fill="#cd8b66" stroke="#fff3d4" stroke-width="4"/>'}</g>`;
}

/** Decorative scene: text is kept in the accessible HTML above/below the art. */
export function neighbourVignette(residentId, visual = 'welcome') {
  const id = validId(residentId);
  const aliases = { food:'hotpot', drink:'water', money:'yuan', directions:'where', invitation:'together', lanterns:'lantern', greeting:'welcome' };
  visual = aliases[visual] || visual;
  const evening = ['lantern', 'together'].includes(visual);
  const dining = ['hotpot', 'water', 'vegetables', 'tea', 'cup', 'yuan', 'price', 'goodbye', 'chopsticks'].includes(visual);
  let objects = '';
  if (visual === 'hotpot') objects = pot(422, 155, .86);
  else if (visual === 'vegetables') objects = `<ellipse cx="421" cy="177" rx="105" ry="25" fill="#fbf2db" stroke="#cdbb8f" stroke-width="3"/>${vegetables(414, 154, 1.55)}`;
  else if (visual === 'water') objects = cup(440, 143, 1.4, true);
  else if (visual === 'tea') objects = `${teaPot(369, 145, .9)}${cup(493, 163, .95)}`;
  else if (visual === 'cup') objects = cup(429, 147, 1.35);
  else if (['yuan', 'price'].includes(visual)) objects = currency();
  else if (visual === 'chopsticks') objects = `<ellipse cx="427" cy="185" rx="105" ry="20" fill="#efe8cd" stroke="#c9b58d" stroke-width="3"/><path d="M360 147Q365 180 397 180T434 147Z" fill="#e4e8d0" stroke="#8b9c80" stroke-width="3"/><ellipse cx="397" cy="147" rx="37" ry="10" fill="#fcf5dd" stroke="#8b9c80" stroke-width="3"/><path d="M452 181 486 101M466 185 502 106" stroke="#9c744e" stroke-width="7" stroke-linecap="round"/><path d="M481 113 486 101M497 118 502 106" stroke="#c5a171" stroke-width="7" stroke-linecap="round"/>`;
  else if (visual === 'goodbye') objects = '';
  else if (['where', 'left', 'right'].includes(visual)) objects = route(visual);
  else if (visual === 'lantern') objects = `<path d="M487 221V39H343" fill="none" stroke="#aa8962" stroke-width="8"/><ellipse cx="389" cy="140" rx="82" ry="66" fill="#f4d184" opacity=".15"/>${lantern(389, 73, 1.4)}`;
  else if (visual === 'together') objects = `<path d="M288 181H572L589 202H271Z" fill="#d8b782"/><path d="M289 200V234M571 200V234" stroke="#a98963" stroke-width="8"/>${pot(422, 161, .57)}${miniYu(301, 153, .66)}<g transform="translate(510 98) scale(.8)">${figure(id === 'alan' ? 'xiaohe' : 'alan', 'recap')}</g>${lantern(429, 22, .6)}`;
  else objects = `${teaPot(388, 156, .8)}${cup(489, 172, .8)}`;
  const descriptions = { hotpot:'a bubbling hotpot', water:'a glass of water', vegetables:'a plate of vegetables', tea:'a teapot and cup', cup:'one cup of tea', yuan:'yuan notes and coins', price:'money on a market counter', where:'a fork in the path', left:'a path leading left', right:'a path leading right', lantern:'a glowing lantern by the river', together:'friends sharing a riverside meal', welcome:'a welcoming tea table', goodbye:'a wave goodbye; no purchase or payment', chopsticks:'a pair of chopsticks beside a bowl' };
  return `<svg class="neighbour-vignette" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" role="img" aria-label="${PEOPLE[id].name} with ${descriptions[visual] || descriptions.welcome}">
    <rect width="640" height="240" rx="22" fill="${evening ? '#637b87' : '#edf0dd'}"/>
    ${evening ? '<circle cx="573" cy="34" r="13" fill="#f5e9bf"/><g fill="#f9f1d5"><circle cx="43" cy="32" r="1.5"/><circle cx="302" cy="26" r="1.5"/><circle cx="504" cy="43" r="1.5"/></g>' : '<path d="M303 36Q301 26 312 25Q319 9 332 23Q346 19 348 31Q359 34 353 39H309Z" fill="#fbfaed" opacity=".8"/>'}
    <path d="M0 115 70 68 128 113 203 65 283 120 366 79 444 117 548 67 640 116V196H0Z" fill="${evening ? '#94afa2' : '#cfddc8'}"/>
    <path d="M0 149Q96 127 177 148T368 144T640 138V205H0Z" fill="${evening ? '#a6c5b2' : '#b8ceb7'}"/>
    <path d="M0 171Q151 165 292 174T640 166V215H0Z" fill="#b5d2c2"/>
    <path d="M236 187H294M526 181H604M172 176H211" stroke="#d9e8d1" stroke-width="2" stroke-linecap="round" opacity=".6"/>
    <path d="M0 211H640V240H0Z" fill="#d6cdae"/><path d="M0 211H640" stroke="#e6dcc0" stroke-width="4"/>
    <g transform="translate(40 54) scale(1.12)">${figure(id, ['welcome', 'goodbye'].includes(visual) ? 'welcome' : 'recap')}</g>
    ${dining ? '<path d="M271 185H575L594 205H251Z" fill="#d8b782"/><path d="M251 205H594V216H251Z" fill="#c29d70"/><path d="M275 215V240M572 215V240" stroke="#ab8c63" stroke-width="8"/>' : ''}
    ${objects}
  </svg>`;
}
