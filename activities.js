/**
 * Small, original animated scenes for the lesson cards.
 * SVG artwork stays editable here; motion and colours live in activities.css.
 * No photographs, third-party characters, network requests or canvas lifecycle.
 */
let sceneNumber = 0;

const escapeAttribute = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

export function lantern(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><g class="activity-lantern"><path d="M0-35V0" stroke="#9d6a47" stroke-width="3"/><ellipse cy="26" rx="23" ry="28" fill="#cb664a"/><path d="M-12 4Q-20 27-12 49M0 0V53M12 4Q20 27 12 49" stroke="#e79966" stroke-width="3" fill="none"/><path d="M-13 0H13M-13 53H13" stroke="#e3ba69" stroke-width="6"/><path d="M0 56V73M-4 65V76M4 65V76" stroke="#c76b45" stroke-width="3"/></g></g>`;
}

export function miniYu(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="48" rx="23" ry="5" fill="#284b3c" opacity=".12"/><path d="M19 36Q44 24 37 9" stroke="#888f85" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M-19 43Q-23 2 0 1Q24 4 19 43Z" fill="#aab0a5"/><ellipse cy="28" rx="11" ry="16" fill="#e4e5d8"/><path d="M-25-12-22-36-7-25M25-12 22-36 7-25" fill="#969d93"/><path d="M-21-17-20-29-12-22M21-17 20-29 12-22" fill="#d5a0a0"/><ellipse cy="-8" rx="27" ry="24" fill="#aeb5a9"/><path d="M-10-28-6-18 0-25 6-18 10-28M-25-10-15-7M25-10 15-7" fill="none" stroke="#5f6b62" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="-11" cy="-7" rx="5" ry="6" fill="#abbb72"/><ellipse cx="11" cy="-7" rx="5" ry="6" fill="#abbb72"/><path d="M-11-10V-4M11-10V-4" stroke="#304438" stroke-width="2.5" stroke-linecap="round"/><ellipse cy="5" rx="14" ry="9" fill="#eef0e4"/><path d="m-4 1 4 4 4-4Z" fill="#c98c91"/><path d="M0 5V8M0 8Q-5 12-8 7M0 8Q5 12 8 7" stroke="#5e6b62" stroke-width="1.4" fill="none"/><path d="M-17 15Q0 21 17 15" stroke="#d6638b" stroke-width="5" fill="none"/><circle cy="21" r="4" fill="#ecc572"/></g>`;
}

export function sceneBackground(kind = "restaurant") {
  return `<rect width="600" height="200" rx="20" fill="${kind === "night" ? "#d9e5dc" : "#edf0dd"}"/>
    <path d="M0 121Q60 85 124 110T260 96T392 108T600 88V200H0Z" fill="#cfddc8"/>
    <path d="M0 147Q105 112 210 144T404 129T600 139V200H0Z" fill="#b8ceb7" opacity=".6"/>
    <g fill="#8da897" opacity=".38"><path d="M64 104V70H104V104M72 70V58H97V70M78 58V42H90V58M477 116V82H518V116M484 82V69H511V82"/><path d="m56 72 28-15 29 15Zm414 12 27-16 29 16Z"/></g>
    <path d="M0 170H600" stroke="#c7c9aa" stroke-width="3"/>
    ${kind === "restaurant" ? `<path d="M23 0V160M577 0V160M23 14H577" stroke="#b18b68" stroke-width="10"/><path d="M30 18H570" stroke="#d2b181" stroke-width="6"/>${lantern(80, 28, 0.65)}${lantern(520, 28, 0.65)}` : ""}`;
}

export function steam(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="#fffdf2" stroke-width="4" stroke-linecap="round"><path class="activity-steam steam-one" d="M-17 0Q-27-12-17-24T-17-47"/><path class="activity-steam steam-two" d="M1 0Q12-12 1-24T1-47"/><path class="activity-steam steam-three" d="M20 0Q10-12 20-24T20-47"/></g>`;
}

export function vegetables(x, y, scale = 1, classes = "") {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><g class="${classes}"><path d="M-17 9Q-37-8-22-20Q-12-28-4-17Q3-34 17-23Q35-19 24-4Q35 10 17 15Z" fill="#70985f"/><path d="M-4 21 1-3M1 10-16-6M0 5 15-11" stroke="#b4c984" stroke-width="4" stroke-linecap="round"/><path d="m25 15 18-15 5 7-17 18Z" fill="#e79759"/><circle cx="-26" cy="16" r="8" fill="#f4dfac"/></g></g>`;
}

export function pot(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="49" rx="99" ry="11" fill="#4f5b42" opacity=".13"/><path d="M-75 12H-90Q-107 12-100 31Q-95 41-74 34M75 12H90Q107 12 100 31Q95 41 74 34" fill="none" stroke="#b67c4f" stroke-width="9"/><path d="M-80 5Q-77 54 0 54Q77 54 80 5Z" fill="#be7d4f"/><path d="M-69 17Q-59 43 0 43Q59 43 69 17" fill="none" stroke="#d79b61" stroke-width="5"/><ellipse rx="81" ry="27" fill="#edbc79"/><ellipse rx="70" ry="20" fill="#c96c48"/><path d="M0-19Q26-8 0 0T0 20" stroke="#e5b878" stroke-width="5" fill="none"/><path d="M-35-8Q-54 3-32 9M33-7 48 3M10 6 27 12" stroke="#f0c482" stroke-width="5" stroke-linecap="round" fill="none"/><circle class="activity-bubble bubble-one" cx="-43" cy="1" r="4" fill="#f8d99c"/><circle class="activity-bubble bubble-two" cx="37" cy="-8" r="3" fill="#f8d99c"/><circle class="activity-bubble bubble-three" cx="13" cy="8" r="3" fill="#f8d99c"/>${steam(0, -18, 0.9)}</g>`;
}

function waterGlass(x, y, full = false) {
  return `<g transform="translate(${x} ${y})"><ellipse cy="44" rx="30" ry="5" fill="#44675e" opacity=".15"/><path d="m-25-14 5 53Q0 48 20 39L25-14" fill="#f3faf2" stroke="#87aaa4" stroke-width="3"/><g class="activity-glass-water ${full ? "is-filled" : ""}"><path d="m-22-1 3 39Q0 46 19 38L22-1Z" fill="#a5d4cc"/><ellipse cy="-1" rx="22" ry="5" fill="#cae8db"/></g><ellipse cy="-14" rx="25" ry="6" fill="#f3faf2" fill-opacity=".5" stroke="#87aaa4" stroke-width="3"/><path d="M-15-6-12 30" stroke="white" stroke-width="3" opacity=".8" stroke-linecap="round"/></g>`;
}

function jug(x, y) {
  return `<g transform="translate(${x} ${y})"><g class="activity-jug"><path d="M-5-25H30L36-14 22-8 21 30Q-3 43-25 27L-21-17Z" fill="#dcebe0" stroke="#84a79b" stroke-width="3"/><path d="M-22-13Q-53-14-42 14Q-37 24-24 21" fill="none" stroke="#84a79b" stroke-width="7"/><path d="M-19 6H20L19 27Q-3 36-21 25Z" fill="#a4cfc7"/></g></g>`;
}

function successSparkles() {
  return `<g class="activity-sparkles" fill="#daa44f"><path d="m170 44 4 9 10 4-10 4-4 10-4-10-10-4 10-4ZM423 29l3 7 8 3-8 3-3 8-3-8-8-3 8-3ZM454 119l3 7 8 3-8 3-3 8-3-8-8-3 8-3Z"/><circle cx="190" cy="114" r="4"/><circle cx="401" cy="65" r="3"/></g>`;
}

function hotpotScene(stepIndex, step = {}) {
  const order = step.sceneOrder || { drink: "water", vegetables: true };
  const isDrink = stepIndex === 2;
  const isWater = isDrink && order.drink === "water";
  const isComplete = stepIndex >= 3;
  return {
    label:
      stepIndex === 0
        ? "A welcoming Hongyadong restaurant with Yu and a hotpot."
        : isDrink
          ? `Order ${order.drink}; the matching drink is poured into its cup or glass.`
          : `Your order: ${order.vegetables ? "vegetables and " : ""}${order.drink}.`,
    kind: `hotpot hotpot-step-${stepIndex}${isWater ? " scene-water" : ""}`,
    art: `${sceneBackground()}<ellipse cx="300" cy="181" rx="232" ry="11" fill="#9da985" opacity=".25"/><path d="M79 149H521L543 177H57Z" fill="#d8b782"/><path d="M57 177H543V191H57Z" fill="#c69d69"/>${pot(294, 128, 0.83)}${miniYu(118, 114, 0.7)}
      ${stepIndex === 0 ? `<g transform="translate(455 94)"><path d="M-23 37Q-25-5 0-5T23 37Z" fill="#527f6d"/><circle cy="-18" r="21" fill="#d6a379"/><path d="M-22-20Q-23-48 2-44Q26-41 22-17L14-28Q-6-17-19-22" fill="#51483b"/><path d="M-6-18H-3M7-18H10" stroke="#51483b" stroke-width="3" stroke-linecap="round"/><path d="M-3-6Q3-2 8-8" stroke="#9c634e" stroke-width="2" fill="none"/><g class="activity-wave"><path d="M-18 7-34-5-39-22" stroke="#d6a379" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M-40-24-43-31M-38-25-37-33M-36-24-31-30" stroke="#d6a379" stroke-width="4" stroke-linecap="round"/></g></g>` : ""}
      ${!isDrink && stepIndex > 0 && order.vegetables ? `<ellipse cx="438" cy="155" rx="58" ry="17" fill="#faf2d9" stroke="#cdb989" stroke-width="3"/>${vegetables(437, 143, 0.8)}${vegetables(297, 63, 0.6, "activity-falling-veg")}` : ""}
      ${isWater ? `${jug(399, 76)}<path class="activity-pour-stream" d="M425 79Q449 84 454 127" fill="none" stroke="#95c9c4" stroke-width="7" stroke-linecap="round"/>${waterGlass(454, 128)}` : ""}
      ${isDrink && !isWater ? `${teapot(399, 76)}<path class="activity-tea-stream" d="M475 70Q490 87 489 118" fill="none" stroke="#c2a65f" stroke-width="6"/>${teaCup(490, 132)}` : ""}${isComplete ? (order.drink === "water" ? waterGlass(195, 132, true) : teaCup(195, 132, true)) : ""}${successSparkles()}`,
  };
}

function teapot(x, y) {
  return `<g transform="translate(${x} ${y})"><g class="activity-teapot"><path d="M-47 0Q-75-14-73 12Q-69 36-48 20" stroke="#638c72" stroke-width="11" fill="none"/><path d="M38 1 65-14 76-10 54 24 38 27" fill="#7ca17e"/><ellipse cy="20" rx="50" ry="34" fill="#7fa381"/><ellipse cy="0" rx="40" ry="10" fill="#b7c7a0"/><path d="M-35-4Q0-35 35-4Z" fill="#759873"/><ellipse cy="-17" rx="10" ry="6" fill="#506f53"/><path d="M-28 17Q-31 30-13 39" fill="none" stroke="#b7c7a0" stroke-width="5" stroke-linecap="round"/></g></g>`;
}

function teaCup(x, y, filled = false) {
  return `<g class="activity-tea-cup" transform="translate(${x} ${y})"><ellipse cy="36" rx="39" ry="7" fill="#eff0d9" stroke="#a6b493" stroke-width="2"/><path d="M25 3Q45 0 42 16Q37 23 24 17" fill="none" stroke="#8fa689" stroke-width="5"/><path d="M-28 2Q-25 32 0 32T28 2Z" fill="#e8ebd1" stroke="#8fa689" stroke-width="2"/><ellipse cy="2" rx="28" ry="8" fill="#f9f5dc" stroke="#8fa689" stroke-width="2"/><ellipse class="activity-tea-liquid ${filled ? "is-filled" : ""}" cy="3" rx="23" ry="6" fill="#c3a361"/>${steam(0, -5, 0.45)}</g>`;
}

function cafeWaterScene(stepIndex) {
  return {
    label:
      stepIndex === 1
        ? "Your glass of water is served; thank the server."
        : "A water jug and glass. Choosing water fills the glass.",
    kind: `cafe cafe-step-${stepIndex} scene-water`,
    art: `${sceneBackground("cafe")}<path d="M70 154H530L552 183H48Z" fill="#c6b18a"/><path d="M48 183H552V195H48Z" fill="#b5a17c"/>${jug(235, 100)}<path class="activity-pour-stream" d="M261 92Q345 101 376 118" stroke="#95c9c4" stroke-width="7" fill="none"/><g class="activity-water-cup">${waterGlass(376, 132, stepIndex === 1)}</g>${miniYu(115, 119, 0.65)}${successSparkles()}`,
  };
}

function cafeScene(stepIndex, step = {}) {
  if (step.sceneOrder?.drink === "water") return cafeWaterScene(stepIndex);
  return {
    label:
      stepIndex === 1
        ? "A freshly poured cup of tea slides towards you when you thank the server."
        : "A green ceramic teapot and tea cup. A correct order pours warm tea into the cup.",
    kind: `cafe cafe-step-${stepIndex}`,
    art: `${sceneBackground("cafe")}<path d="M70 154H530L552 183H48Z" fill="#c6b18a"/><path d="M48 183H552V195H48Z" fill="#b5a17c"/>
      <g stroke="#75957c" fill="none" stroke-width="4"><path d="M77 158V18M94 158 100 50"/><path d="M77 43Q43 22 43 48Q65 54 77 43M77 75Q111 53 114 73Q96 90 77 75M98 102Q124 80 131 100Q116 114 98 102" fill="#8da783" stroke="none"/></g>
      ${teapot(235, 105)}<path class="activity-tea-stream" d="M308 98Q345 101 367 126" stroke="#c2a65f" stroke-width="6" stroke-linecap="round" fill="none"/>
      <g class="activity-tea-cup"><ellipse cx="376" cy="166" rx="63" ry="11" fill="#eff0d9" stroke="#a6b493" stroke-width="3"/><path d="M414 123Q447 120 438 143Q433 153 412 147" fill="none" stroke="#8fa689" stroke-width="8"/><path d="M333 125Q338 164 375 164T417 125Z" fill="#e8ebd1" stroke="#8fa689" stroke-width="3"/><ellipse cx="375" cy="125" rx="42" ry="12" fill="#f9f5dc" stroke="#8fa689" stroke-width="3"/><ellipse class="activity-tea-liquid ${stepIndex === 1 ? "is-filled" : ""}" cx="375" cy="127" rx="35" ry="8" fill="#c3a361"/>${steam(375, 112, 0.7)}</g>
      <g transform="translate(491 145) rotate(-22)"><path d="M-20 0Q0-28 20 0Q0 25-20 0" fill="#779768"/><path d="M-17 0H20" stroke="#b4c98b" stroke-width="2"/></g>${successSparkles()}`,
  };
}

function fan(x, y) {
  return `<g transform="translate(${x} ${y})"><g class="activity-fan"><path d="M0 61-86-8Q-44-70 32-55Q72-44 89-8Z" fill="#f2dba4" stroke="#c19a61" stroke-width="3"/><path d="M0 61-86-8M0 61-59-38M0 61-28-55M0 61 7-59M0 61 40-51M0 61 69-31M0 61 89-8" stroke="#bd9b67" stroke-width="2"/><path d="M-55-12Q-18-47 20-15T62-15" fill="none" stroke="#74957c" stroke-width="11" opacity=".6"/><path d="M0 62 5 77" stroke="#99754e" stroke-width="7" stroke-linecap="round"/><circle cy="60" r="4" fill="#bc6d4c"/></g></g>`;
}

function marketScene(stepIndex, step = {}) {
  const order = step.sceneMarket || {};
  const stage =
    order.stage ||
    [
      "ask-price",
      "recognise-price",
      "choose-approach",
      "agree-price",
      "pay",
      "receive",
    ][stepIndex] ||
    "receive";
  const price = order.price === 10 ? 10 : 12;
  const declined = order.declined === true;
  const paid = order.paid === true && !declined;
  const received = paid && order.received === true;
  const offered = stage === "receive" && paid;
  const paymentChoices = stage === "pay" && !paid && !declined;
  const concealed = ["ask-price", "recognise-price", "pay"].includes(stage);
  const money = (amount, x, y, scale = 1) =>
    `<g data-currency-total="${amount}" transform="translate(${x} ${y}) scale(${scale})"><g transform="translate(${amount === 20 ? -12 : 0} 0)"><rect x="-27" y="-10" width="54" height="25" rx="3" fill="#a6c5a1" stroke="#739878" stroke-width="2"/><circle cy="2" r="9" fill="#d8e4bb"/><text y="7" text-anchor="middle" font-size="14" font-weight="800" fill="#41664b">10</text></g>${amount === 20 ? '<g transform="translate(13 7)"><rect x="-27" y="-10" width="54" height="25" rx="3" fill="#a6c5a1" stroke="#739878" stroke-width="2"/><circle cy="2" r="9" fill="#d8e4bb"/><text y="7" text-anchor="middle" font-size="14" font-weight="800" fill="#41664b">10</text></g>' : amount === 12 ? '<g fill="#e6bd66" stroke="#bd944c" stroke-width="2"><circle cx="-10" cy="22" r="10"/><circle cx="12" cy="22" r="10"/></g><g fill="#795820" font-size="12" text-anchor="middle" font-weight="800"><text x="-10" y="26">1</text><text x="12" y="26">1</text></g>' : ""}</g>`;
  const fanX = received ? 435 : offered ? 330 : 230;
  const label = declined
    ? "The fan stays with the seller. No money is paid and no item is taken."
    : offered
      ? received
        ? `Your fan is in your hand after paying ${price} yuan.`
        : `The seller hands over the fan after receiving ${price} yuan.`
      : paymentChoices
        ? "Choose a payment: A has one ten-yuan note, B has a ten-yuan note and two one-yuan coins, C has two ten-yuan notes."
        : stage === "recognise-price"
          ? "Listen to the seller and choose a price. The tag is covered."
          : stage === "ask-price"
            ? "A folding fan on the counter. Ask its price."
            : `The same folding fan is offered at ${price} yuan.`;
  return {
    label,
    kind: `market market-step-${stepIndex}`,
    art: `${sceneBackground("market")}<path d="M67 0V163M533 0V163" stroke="#b18b68" stroke-width="8"/><path d="M55 0H545L558 31H42Z" fill="#cf7956"/><path d="M42 31Q63 50 84 31Q105 50 126 31Q147 50 168 31Q189 50 210 31Q231 50 252 31Q273 50 294 31Q315 50 336 31Q357 50 378 31Q399 50 420 31Q441 50 462 31Q483 50 504 31Q531 50 558 31" fill="#e2a177"/>
      <path d="M69 161H531L551 181H49Z" fill="#d7b889"/><path d="M49 181H551V198H49Z" fill="#b78d63"/>
      ${offered ? `<path d="M125 168Q210 168 ${received ? 270 : 333} 165" fill="none" stroke="#d7a47a" stroke-width="18" stroke-linecap="round"/><path d="M555 183Q495 183 ${received ? 440 : 410} 168" fill="none" stroke="#bd805d" stroke-width="18" stroke-linecap="round"/>` : ""}${fan(fanX, 88)}
      ${offered ? money(price, 175, 166, 0.7) : `<path d="M420 49V60" stroke="#99754e" stroke-width="3"/><rect x="378" y="58" width="84" height="49" rx="9" fill="#fff5d9" stroke="#c5a16a" stroke-width="3"/><text class="activity-price-question" x="420" y="92" text-anchor="middle" font-size="29" fill="#765631" font-weight="800">${concealed ? "?" : `¥${price}`}</text><text class="activity-price-answer" x="420" y="92" text-anchor="middle" font-size="29" fill="#42755c" font-weight="800">${stage === "ask-price" ? "?" : `¥${price}`}</text>`}
      ${paymentChoices ? `<g class="market-payment-choices">${[10, 12, 20].map((amount, i) => `<text x="${350 + i * 79}" y="131" text-anchor="middle" font-size="12" font-weight="800" fill="#465b46">${"ABC"[i]}</text>${money(amount, 350 + i * 79, 149, 0.8)}`).join("")}</g>` : paid && !offered ? money(price, 420, 158, 0.9) : ""}${successSparkles()}`,
  };
}

function gateway(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-53 43V-22H53V43" stroke="#ab6e4d" stroke-width="13" fill="#ddac79"/><rect x="-22" y="8" width="44" height="35" fill="#6e8066"/><path d="m-79-23 79-30 79 30-8 13H-71Z" fill="#426d61"/><path d="M-80-24Q-68-14-53-25M80-24Q68-14 53-25" stroke="#426d61" stroke-width="7" fill="none"/><path d="M-47-8H47M-35-24 0-39 35-24" stroke="#e1c18c" stroke-width="4" fill="none"/><path d="M-45 45H45M-53 52H53M-60 59H60" stroke="#b6b69a" stroke-width="7"/></g>`;
}

function directionsScene(stepIndex) {
  const direction = stepIndex === 1 ? "left" : "right";
  return {
    label:
      stepIndex === 0
        ? "A path from Yu to a Chinese gateway at Hongyadong."
        : "Yu stands where two stone paths meet, with a matching gateway at each end.",
    kind: `directions directions-step-${stepIndex} direction-${direction}`,
    art: `${sceneBackground("route")}<path d="M300 203V133Q300 117 279 117H133M300 143V133Q300 117 321 117H474" fill="none" stroke="#c7bd98" stroke-width="37" stroke-linecap="round"/><path d="M300 202V136Q300 118 279 118H133M300 138V136Q300 118 321 118H474" fill="none" stroke="#eee4bd" stroke-width="28" stroke-linecap="round"/><path d="M286 185H314M286 164H314M268 104V132M241 104V132M214 104V132M187 104V132M160 104V132M332 104V132M359 104V132M386 104V132M413 104V132M440 104V132" stroke="#c5bda0" stroke-width="2"/>
      ${stepIndex === 0 ? gateway(475, 58, 0.65) : `${gateway(130, 58, 0.65)}${gateway(475, 58, 0.65)}`}${miniYu(299, 153, 0.63)}
      <path class="activity-route-line" d="${direction === "left" ? "M300 177V136Q300 117 278 117H143" : "M300 177V136Q300 117 322 117H463"}" stroke="#478268" stroke-width="5" stroke-dasharray="7 7" stroke-linecap="round" fill="none"/>
      <g class="activity-route-arrow"><path d="${direction === "left" ? "m161 103-19 14 19 14" : "m445 103 19 14-19 14"}" stroke="#478268" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>
      <g class="activity-route-dot"><circle cx="300" cy="176" r="9" fill="#d98155" stroke="#fff8df" stroke-width="4"/></g>
      <g transform="translate(302 61)"><path d="M0-17V42" stroke="#a7855b" stroke-width="6"/><path d="m-5-12-39 0-10 10 10 10H-5M5 11H42L52 21 42 31H5" fill="#d9b884" stroke="#a7855b" stroke-width="2"/></g>${successSparkles()}`,
  };
}

function cultureScene(stepIndex, step = {}) {
  // Each answer changes this same terrace. Subsequent steps retain the setup;
  // the speaking practice shows the completed evening rather than resetting it.
  const stage = step.type === "speak" ? 4 : Math.min(stepIndex, 4);
  const evening = stage >= 2;
  const sky = evening ? "#536c82" : "#cedbd2";
  const moon = evening ? '<circle cx="547" cy="29" r="11" fill="#f6edca"/><g fill="#f8efd5"><circle cx="61" cy="26" r="1.3"/><circle cx="177" cy="22" r="1.1"/><circle cx="445" cy="32" r="1.2"/></g>' : "";
  const descriptions = [
    "Yu and a friend wait beside an empty dinner table on a river terrace.",
    "Dinner is on the table. Two wooden sticks wait on a tray beside the empty place setting.",
    "The table is set. A red paper shade waits below an empty hook above the table.",
    "The terrace is lit and dinner is ready. Your friend waits to be invited to the table.",
    "Yu and your friend share dinner under a warm light beside the river.",
  ];
  const friend = (x, y, seated = false) =>
    `<g data-story-object="friend-${seated ? "seated" : "waiting"}" transform="translate(${x} ${y})"><ellipse cy="48" rx="23" ry="5" fill="#3e5b51" opacity=".15"/><path d="M-17 24V${seated ? 38 : 47}M17 24V${seated ? 38 : 47}" stroke="#647365" stroke-width="10" stroke-linecap="round"/><path d="M-24 28Q-27-12 0-12Q28-12 24 28Z" fill="#d1936d"/><path d="M-19-7-29 16M19-7 29 16" stroke="#ddb494" stroke-width="9" stroke-linecap="round"/><path d="M-16-21Q-22-45 0-45Q25-43 19-18Z" fill="#474e47"/><ellipse cy="-24" rx="18" ry="21" fill="#e3b995"/><path d="M-18-29Q-19-48 4-44Q21-40 19-27L5-33-4-27-16-30Z" fill="#474e47"/><path d="M-9-23H-7M7-23H9" stroke="#454e44" stroke-width="2.7" stroke-linecap="round"/><path d="M-5-13Q0-8 6-14" stroke="#a76e58" stroke-width="1.8" fill="none"/></g>`;
  const bowl = (x, y) =>
    `<g transform="translate(${x} ${y})"><ellipse cy="12" rx="21" ry="4" fill="#627e6a" opacity=".13"/><path d="M-20 0Q-16 14 0 14T20 0Z" fill="#e8ebd4" stroke="#7f9983" stroke-width="2"/><ellipse rx="20" ry="5" fill="#fcf4db" stroke="#7f9983" stroke-width="2"/></g>`;
  const sticks = (x, y, rotation = -12) =>
    `<g data-story-object="chopsticks" transform="translate(${x} ${y}) rotate(${rotation})"><path d="M-15-2H17M-15 4H17" stroke="#986b46" stroke-width="3" stroke-linecap="round"/><path d="M-15-2H-7M-15 4H-7" stroke="#d3ad75" stroke-width="3" stroke-linecap="round"/></g>`;
  const dinner = `<g data-story-object="dinner">${pot(305, 135, 0.63)}<ellipse cx="363" cy="151" rx="25" ry="8" fill="#f7edd1"/>${vegetables(363, 142, 0.38)}</g>`;
  const setPlace = `<g data-story-object="set-place">${sticks(244, 166)}${sticks(379, 165, 14)}</g>`;
  const hangingLight = `<g data-story-object="hung-light"><ellipse cx="306" cy="143" rx="158" ry="46" fill="#f7d88a" opacity=".18"/><circle cx="307" cy="48" r="39" fill="#f6d484" opacity=".22"/>${lantern(307, 29, 0.62)}</g>`;
  const waitingLight = `<g data-story-object="waiting-light"><path d="M70 161H115V177H70Z" fill="#b89971"/>${lantern(92, 114, 0.58)}</g>`;
  const reveal = (when, before, after) =>
    stage === when
      ? `<g class="culture-story-before">${before}</g><g class="culture-story-after">${after}</g>`
      : stage > when
        ? after
        : before;
  const people = reveal(3, friend(478, 114), friend(412, 114, true));
  return {
    label: descriptions[stage],
    kind: `culture culture-step-${stepIndex} culture-story-stage-${stage}`,
    art: `<g data-story-stage="${stage}"><rect width="600" height="200" rx="20" fill="${sky}"/>${moon}<path d="M0 85 64 45 125 86 199 52 275 91 355 57 430 87 513 44 600 82V135H0Z" fill="#a5b9aa" opacity=".62"/><path d="M0 103Q103 88 209 103T412 99T600 94V153H0Z" fill="#9abeb2"/><g stroke="#c5dbca" stroke-width="2" opacity=".7"><path d="M25 118H111M157 125H233M351 116H426M467 132H558"/></g><path d="M0 149H600V200H0Z" fill="#d6d5b8"/><path d="M0 143H600M0 134H600M36 134V155M112 134V155M188 134V155M264 134V155M340 134V155M416 134V155M492 134V155M568 134V155" stroke="#a7b59c" stroke-width="4"/><path d="M396 152V17H307V24" stroke="#a37f59" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M303 22Q307 31 311 22" stroke="#a37f59" stroke-width="2" fill="none"/>
      ${reveal(2, waitingLight, hangingLight)}${people}${miniYu(155, 123, 0.67)}<path d="M224 163V190M390 163V190" stroke="#9d805a" stroke-width="10"/><ellipse cx="308" cy="164" rx="111" ry="21" fill="#bd9567"/><ellipse cx="308" cy="157" rx="111" ry="21" fill="#e0bd87"/>${bowl(238, 151)}${bowl(383, 151)}${reveal(0, `<ellipse data-story-object="empty-table" cx="306" cy="146" rx="48" ry="16" fill="none" stroke="#b69c74" stroke-width="2" stroke-dasharray="5 5"/>`, dinner)}${reveal(1, `<g data-story-object="waiting-place"><ellipse cx="222" cy="182" rx="29" ry="8" fill="#eddcba" stroke="#bda67f" stroke-width="1.5"/>${sticks(222, 180, -4)}</g>`, setPlace)}${successSparkles()}</g>`,
  };
}

/** Render once per lesson step. Link activities.css from the document head. */
export function activityScene(lessonId, stepIndex = 0, step = {}) {
  const builders = {
    hotpot: hotpotScene,
    cafe: cafeScene,
    market: marketScene,
    gate: directionsScene,
    culture: cultureScene,
  };
  const builder = builders[lessonId];
  if (!builder) return "";
  const scene = builder(Math.max(0, Number(stepIndex) || 0), step);
  const titleId = `activity-scene-title-${++sceneNumber}`;
  return `<div class="activity-scene ${scene.kind}" data-activity="${escapeAttribute(lessonId)}" data-step="${Number(stepIndex) || 0}"><svg viewBox="0 0 600 200" role="img" aria-labelledby="${titleId}" focusable="false"><title id="${titleId}">${escapeAttribute(scene.label)}</title>${scene.art}</svg><span class="activity-result-mark" aria-hidden="true">✓</span></div>`;
}

/** Call on the lesson container after an answer, before rendering the next step. */
export function setActivityOutcome(rootElement, correct, step = {}) {
  const scene = rootElement?.matches?.(".activity-scene")
    ? rootElement
    : rootElement?.querySelector?.(".activity-scene");
  if (!scene) return;
  scene.classList.remove("activity-success", "activity-retry");
  // Restart the one-shot visual response when a player retries the same step.
  void scene.offsetWidth;
  scene.classList.add(correct ? "activity-success" : "activity-retry");
  scene.dataset.outcome = correct ? "correct" : "retry";
}
