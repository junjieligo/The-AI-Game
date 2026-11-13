import { iconMarkup, setIcon, mountUiIcons } from "./ui-icons.js?v=1.15";
import { playArrival } from "./arrival.js?v=1.12";
import { playHotpotIntro } from "./hotpot-intro.js?v=1.32";
import { playTeaIntro } from "./tea-intro.js?v=1.32";
import { playMarketIntro } from "./market-intro.js?v=1.32";
import { playWayfindingIntro } from "./wayfinding-intro.js?v=1.36";
import { playLanternIntro } from "./lantern-intro.js?v=1.37";
import { helpForStep } from "./challenge-help.js?v=1.7";
import {
  normaliseMarketOrder,
  resolveMarketLesson,
  applyMarketChoice,
  marketRoute,
  marketResumeStep,
} from "./market.js?v=1.7";
import { withSpeakingPractice } from "./practice-content.js?v=1.7";
import { mountSpeakingPractice } from "./speaking-practice.js?v=1.7";
import {
  DRINKS,
  normaliseOrder,
  describeOrder,
  resolveOrderLesson,
} from "./orders.js?v=1.7";
import { getGuideLine } from "./guide-lines.js?v=1.7";
import { getGameTimeState } from "./game-time.js?v=1.7";
import { createWorld } from "./world.js?v=1.26";
import {
  LESSONS as BASE_LESSONS,
  PHRASES as BASE_PHRASES,
} from "./lessons.js?v=1.7";
import { createAvatarView, AVATAR_PRESETS } from "./avatar.js?v=1.7";
import { YU_PORTRAIT } from "./yu.js?v=1.16";
import { createVoicePlayer, roleFromSpeaker } from "./audio.js?v=1.7";
import { activityScene, setActivityOutcome } from "./activities.js?v=1.26";
import { createSoundscape } from "./soundscape.js?v=1.26";
import { createTaskTimer, formatElapsed } from "./task-timer.js?v=1.7";
let LESSONS = structuredClone(BASE_LESSONS),
  PHRASES = structuredClone(BASE_PHRASES);

const $ = (s) => document.querySelector(s);
mountUiIcons();
const KEY = "trip-to-the-east-v1";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const cat = YU_PORTRAIT;
let storageWorks = true;
let state = {
  completed: [],
  progress: {},
  orders: {},
  marketPurchase: {},
  marketVersion: 0,
  cultureVersion: 0,
  timings: {},
  sound: true,
  music: true,
  effects: true,
  pinyin: false,
  translations: true,
  attempts: 0,
  started: false,
  profile: null,
};
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved && typeof saved === "object") state = { ...state, ...saved };
} catch {
  storageWorks = false;
}
state.completed = Array.isArray(state.completed)
  ? state.completed.filter((id) => LESSONS.some((l) => l.id === id))
  : [];
state.progress =
  state.progress && typeof state.progress === "object" ? state.progress : {};
state.orders =
  state.orders &&
  typeof state.orders === "object" &&
  !Array.isArray(state.orders)
    ? state.orders
    : {};
// The expanded transaction replaces the old three-question market flow.
if (state.marketVersion !== 1) {
  delete state.progress.market;
  state.marketPurchase = {};
  state.marketVersion = 1;
}
state.marketPurchase = normaliseMarketOrder(state.marketPurchase);
// A new connected story replaces unrelated object questions. Restart only an
// unfinished culture position; preserve all stamps and other trail progress.
if (state.cultureVersion !== 1) {
  delete state.progress.culture;
  if (state.timings?.culture?.inProgress) {
    state.timings.culture = { ...state.timings.culture, elapsedMs: 0, inProgress: false };
  }
  state.cultureVersion = 1;
}
let world,
  activeLesson,
  currentStep = 0,
  answered = false,
  stepHelpRequested = null,
  nextStepOverride = null,
  selectedTokens = [],
  lastFocus,
  modalType,
  hotpotEntry = null;
const taskTimer = createTaskTimer({ saved: state.timings });
let timingContext = false;
let speakingPractice = null,
  practiceAudioBusy = false;
function clearSpeakingPractice() {
  speakingPractice?.destroy();
  speakingPractice = null;
  practiceAudioBusy = false;
  soundscape.setPracticeQuiet(false);
}
function taskTimerMarkup(id, complete = false) {
  const time = taskTimer.get(id);
  const elapsed = complete ? (time.lastMs ?? time.elapsedMs) : time.elapsedMs;
  return `<div class="task-timer ${complete ? "task-timer-complete" : ""}" data-task-timer data-timer-id="${esc(id)}" data-timer-result="${complete}" role="timer" aria-live="off"><span class="task-timer-icon" aria-hidden="true">${iconMarkup("clock")}</span><span class="task-timer-label">${complete ? "Total time" : "Time"}</span><time data-timer-value datetime="PT${Math.floor(elapsed / 1000)}S">${formatElapsed(elapsed)}</time></div>`;
}
function updateTaskTimers() {
  let trailTimer = $("#trail-timer");
  if (!trailTimer && $(".route-guide")) {
    trailTimer = document.createElement("div");
    trailTimer.id = "trail-timer";
    $(".route-guide").appendChild(trailTimer);
  }
  const active = taskTimer.get();
  if (trailTimer) {
    trailTimer.hidden =
      !timingContext ||
      !active.inProgress ||
      !!modalType ||
      document.body.classList.contains("creating");
    if (active.id && trailTimer.dataset.trail !== active.id) {
      trailTimer.dataset.trail = active.id;
      trailTimer.innerHTML = taskTimerMarkup(active.id);
    }
  }
  document.querySelectorAll("[data-task-timer]").forEach((element) => {
    const time = taskTimer.get(element.dataset.timerId);
    const complete = element.dataset.timerResult === "true";
    const elapsed = complete ? (time.lastMs ?? time.elapsedMs) : time.elapsedMs;
    const value = element.querySelector("[data-timer-value]");
    value.textContent = formatElapsed(elapsed);
    value.setAttribute("datetime", `PT${Math.floor(elapsed / 1000)}S`);
    element.dataset.state = complete
      ? "complete"
      : time.running
        ? "running"
        : "paused";
    element.title = complete
      ? "Total active time for this stop"
      : "Time on this stop · pauses when you leave";
  });
}
function startTaskTiming(id) {
  taskTimer.start(id);
  timingContext = true;
  if (document.hidden || document.body.classList.contains("creating"))
    taskTimer.pause();
  save();
  updateTaskTimers();
}
function pauseTaskTiming() {
  timingContext = false;
  taskTimer.pause();
  save();
  updateTaskTimers();
}
function save() {
  state.timings = taskTimer.snapshot();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    storageWorks = false;
  }
  if (!storageWorks)
    $(".save-indicator").textContent = "Progress is saved for this visit only";
}
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 3500);
}
function nextLesson() {
  return LESSONS.find((l) => !state.completed.includes(l.id)) || LESSONS[0];
}
function unlocked(id) {
  const idx = LESSONS.findIndex((l) => l.id === id);
  return idx === 0 || state.completed.includes(LESSONS[idx - 1].id);
}
const soundscape = createSoundscape({
  enabled: state.music !== false,
  effects: state.effects !== false,
  onNotice: toast,
  onChange: ({ enabled, playing, effects }) => {
    const b = $("#music-toggle");
    if (b) {
      b.setAttribute("aria-pressed", String(enabled));
      b.title = enabled ? "Music on" : "Music off";
      setIcon(b, enabled ? "music" : "music-off");
      b.dataset.playing = String(playing);
    }
    const e = $("#effects-toggle");
    if (e) e.setAttribute("aria-pressed", String(effects));
  },
});
document.addEventListener("pointerdown", () => soundscape.unlock(), {
  once: true,
});
document.addEventListener("keydown", () => soundscape.unlock(), { once: true });
document.addEventListener("click", (e) => {
  if (e.target.closest("button") && !e.target.closest("#effects-toggle"))
    soundscape.effect("click");
});
document.addEventListener("pointerover", (e) => {
  const b = e.target.closest("button");
  if (b && !b.contains(e.relatedTarget)) soundscape.effect("hover");
});
const voicePlayer = createVoicePlayer({
  onNotice: toast,
  onState: (role, playing) => {
    document.body.dataset.speaking = playing ? role : "";
    world?.setSpeaking?.(playing && role === "yu");
    const guideButton = $("#tip-listen");
    const yuSpeaking = playing && role === "yu";
    guideButton.dataset.playing = String(yuSpeaking);
    setIcon(guideButton, yuSpeaking ? "stop" : "play");
    guideButton.setAttribute(
      "aria-label",
      yuSpeaking ? "Stop Yu" : "Listen to Yu",
    );
    guideButton.title = yuSpeaking ? "Stop Yu" : "Listen to Yu";
    soundscape.setDucked(playing);
    if (modalType === "lesson")
      document
        .querySelectorAll("[data-flow]")
        .forEach((el) =>
          el.classList.toggle(
            "flow-current",
            el.dataset.flow ===
              (answered ? "continue" : playing ? "listen" : "choose"),
          ),
        );
  },
});
function speak(text, { role = "narrator", slow = false, manual = false } = {}) {
  if (practiceAudioBusy) return;
  if (!state.sound) {
    if (!manual) return;
    // An explicit Listen gesture enables pronunciation and plays immediately.
    state.sound = true;
    save();
    updateOverview();
    toast("Pronunciation audio on.");
  }
  return voicePlayer.play(text, { role, slow });
}
function listenButton(text, role = "narrator", withSlow = false) {
  const normal = `<button class="listen-button" data-speak="${esc(text)}" data-voice-role="${role}" aria-label="Hear ${esc(text)}" title="Listen in Mandarin">${iconMarkup("sound")}</button>`;
  return withSlow
    ? `<div class="speech-audio">${normal}<button class="listen-button listen-slow" data-speak="${esc(text)}" data-voice-role="${role}" data-slow="true" aria-label="Hear slowly: ${esc(text)}" title="Listen slowly">0.7×</button></div>`
    : normal;
}
function phraseRow(p) {
  return `<div class="phrase-row"><div><div class="chinese" lang="zh">${esc(p.zh)}</div><div class="pinyin ${state.pinyin ? "" : "hidden"}">${esc(p.py)}</div><div class="translation">${esc(p.en)}</div></div>${listenButton(p.zh)}</div>`;
}
function openModal(content, wide = false, type = "info") {
  clearSpeakingPractice();
  if (!$("#modal-root").children.length) lastFocus = document.activeElement;
  voicePlayer.stop();
  world?.stopWalking?.();
  modalType = type;
  if (
    (type === "intro" || type === "lesson" || type === "order-edit") &&
    activeLesson &&
    unlocked(activeLesson.id)
  )
    startTaskTiming(activeLesson.id);
  else pauseTaskTiming();
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="modal-close" aria-label="Close dialog">${iconMarkup("close")}</button>${content}</section></div>`;
  $("#modal-root .modal-close").onclick = closeModal;
  $("#modal-root .modal-backdrop").onclick = (e) => {
    if (e.target.classList.contains("modal-backdrop")) closeModal();
  };
  $("#modal-root .modal-close").focus();
  document.body.style.overflow = "hidden";
  $("#app").inert = true;
  bindAudio();
  updateTaskTimers();
}
function bindAudio() {
  document.querySelectorAll("[data-speak]").forEach(
    (b) =>
      (b.onclick = () =>
        speak(b.dataset.speak, {
          role: b.dataset.voiceRole,
          slow: b.dataset.slow === "true",
          manual: true,
        })),
  );
}
function closeModal() {
  clearSpeakingPractice();
  pauseTaskTiming();
  $("#modal-root").innerHTML = "";
  document.body.style.overflow = "";
  $("#app").inert = false;
  modalType = null;
  activeLesson = null;
  voicePlayer.stop();
  lastFocus?.focus();
  updateOverview();
}
function updateOverview() {
  const next = nextLesson(),
    idx = LESSONS.indexOf(next),
    all = state.completed.length === LESSONS.length;
  $("#stamp-count").textContent = `${state.completed.length} / 5`;
  $("#route-progress").textContent = `${state.completed.length} of 5`;
  $("#quest-kicker").textContent = all
    ? "CHAPTER COMPLETE"
    : `MISSION 0${idx + 1} · ${next.place.toUpperCase()}`;
  $("#quest-title").textContent = all ? "Chongqing complete" : next.title;
  $("#quest-description").textContent = all
    ? "Revisit a stop to practise."
    : next.description;
  $("#quest-goals").innerHTML = all
    ? "<span>5 stamps collected</span><span>Revisit any place to practise</span>"
    : {
        hotpot: ["Say hello", "Choose your order"],
        cafe: ["Order a drink", "Say please & thank you"],
        market: ["Ask or bargain", "Pay & collect your fan"],
        gate: ["Ask where", "Follow directions"],
        culture: ["Prepare a dinner together", "Invite your friend"],
      }[next.id]
        .map((t) => `<span>${t}</span>`)
        .join("");
  $("#start-mission").innerHTML =
    `${all ? "Open travel journal" : state.started ? "Continue adventure" : "Meet Yu & begin"} <span>${iconMarkup("arrow-up-right")}</span>`;
  $("#start-mission").onclick = () =>
    all ? openJournal() : selectPlace(next.id);
  const routeNames = [
    "Hot pot with Yu",
    "A little café stop",
    "At the market",
    "Find your way",
    "Stories & lanterns",
  ];
  $("#route-list").innerHTML = LESSONS.map(
    (l, i) =>
      `<button class="route-item ${state.completed.includes(l.id) ? "complete" : l.id === next.id ? "current" : ""}" data-route="${l.id}" aria-label="${routeNames[i]}${!unlocked(l.id) ? ", complete the previous mission first" : ""}"><span class="route-number">${state.completed.includes(l.id) ? iconMarkup("check") : i + 1}</span><span>${routeNames[i]}</span><span>${state.completed.includes(l.id) ? iconMarkup("sparkle") : l.id === next.id ? iconMarkup("arrow-up-right") : "·"}</span></button>`,
  ).join("");
  document
    .querySelectorAll("[data-route]")
    .forEach((b) => (b.onclick = () => selectPlace(b.dataset.route)));
  setIcon($("#sound-toggle"), state.sound ? "sound" : "sound-off");
  $("#sound-toggle").setAttribute(
    "aria-label",
    state.sound
      ? "Turn pronunciation audio off"
      : "Turn pronunciation audio on",
  );
  $("#sound-toggle").title = state.sound
    ? "Pronunciation audio on"
    : "Pronunciation audio off";
  world?.setVisited(state.completed);
  world?.setActive(next.id);
  const guide = getGuideLine(state.completed);
  $("#yu-tip-text").innerHTML =
    `<span class="yu-tip-chinese" lang="zh">${esc(guide.zh)}</span><span class="yu-tip-translation">${esc(guide.en)}</span>`;
  $("#tip-listen").dataset.cue = guide.id;
  if (!storageWorks)
    $(".save-indicator").textContent = "Progress is saved for this visit only";
}
function selectPlace(id) {
  if (!unlocked(id)) {
    openLessonIntro(id);
    return;
  }
  closeModal();
  startTaskTiming(id);
  world?.focusPlace(id);
  const place = LESSONS.find((l) => l.id === id);
  $("#route-instruction").textContent = `Follow the glowing path.`;
  const arrived = () => {
    $("#route-instruction").textContent = "You’ve arrived · Start the activity";
    openLessonIntro(id);
  };
  if (!world?.goToPlace?.(id, arrived)) arrived();
}
function resolvedLesson(id) {
  const base = LESSONS.find((lesson) => lesson.id === id);
  const resolved =
    id === "market"
      ? resolveMarketLesson(base, state.marketPurchase)
      : resolveOrderLesson(base, state.orders[id]);
  return withSpeakingPractice(resolved);
}
// Keep stored step indices stable while showing only the chosen branch.
function lessonProgressMarkup(lesson, index) {
  const route =
    lesson.id === "market" ? marketRoute(state.marketPurchase) : null;
  const indices = lesson.steps.flatMap((step, i) =>
    !route || route.includes(step.type === "speak" ? "practice" : step.id)
      ? [i]
      : [],
  );
  const position = Math.max(0, indices.indexOf(index));
  return `<div class="lesson-top"><div class="lesson-progress">${indices.map((_, i) => `<span class="${i < position ? "done" : i === position ? "now" : ""}"></span>`).join("")}</div><span class="lesson-counter">${position + 1} / ${indices.length}</span></div>`;
}

function openLessonIntro(id) {
  // Every building/card/trail entry passes here. Re-entrant clicks share one
  // prologue and one following dialog; other trails keep their existing flow.
  if (hotpotEntry) return hotpotEntry;
  const playIntro = id === "hotpot" ? playHotpotIntro : id === "cafe" ? playTeaIntro : id === "market" ? playMarketIntro : id === "gate" ? playWayfindingIntro : id === "culture" ? playLanternIntro : null;
  if (!playIntro || !unlocked(id)) return presentLessonIntro(id);
  closeModal();
  world?.stopWalking?.();
  hotpotEntry = playIntro({
    soundscape,
    onEffectsChange(enabled) { state.effects = enabled; save(); },
  }).then(({ reason }) => {
    if (reason === "complete" || reason === "skip") presentLessonIntro(id, true);
  }).finally(() => { hotpotEntry = null; });
  return hotpotEntry;
}

function presentLessonIntro(id, instant = false) {
  const lesson = resolvedLesson(id);
  if (!lesson) return;
  activeLesson = lesson;
  const available = unlocked(id),
    completed = state.completed.includes(id),
    resume =
      Object.hasOwn(state.progress, id) &&
      Number.isInteger(state.progress[id]) &&
      state.progress[id] >= 0 &&
      state.progress[id] < lesson.steps.length &&
      taskTimer.get(id).inProgress;
  if (available) startTaskTiming(id);
  openModal(
    `<div class="modal-eyebrow">CHONGQING · ${esc(lesson.place.toUpperCase())}</div><div class="welcome-header"><div class="yu-avatar">${cat}</div><div><div class="yu-tip-name">YU <span>YOUR LOCAL GUIDE</span></div><h2 id="modal-title">${esc(lesson.title)}</h2></div></div><p class="modal-intro">${id === "hotpot" && !state.started ? `I’m Yu. Let’s order something.` : esc(lesson.objective)}</p><div class="intro-phrases">${lesson.phrases.slice(0, 1).map(phraseRow).join("")}</div>${available ? taskTimerMarkup(id) : ""}<p class="muted-note">${available ? "Listen, reply, then say a sentence yourself." : "Finish the previous stop to unlock this one."}</p><div class="modal-footer"><span class="muted-note">${available ? `${id === "market" ? (resume ? marketRoute(state.marketPurchase).length : "Up to 7") : lesson.steps.length} activities` : "Follow your trail"}</span><button class="primary" id="begin-lesson">${!available ? "Back to your next stop" : resume ? (completed ? "Resume practice" : "Resume mission") : completed ? "Practise again" : "Let’s go"} <span>${iconMarkup("arrow-right")}</span></button></div>`,
    false,
    "intro",
  );
  if (instant) $("#modal-root .modal-backdrop")?.classList.add("hotpot-handoff");
  $("#begin-lesson").onclick = () => {
    if (!available) {
      openLessonIntro(nextLesson().id);
      return;
    }
    state.started = true;
    currentStep = resume
      ? Math.min(state.progress[id], lesson.steps.length - 1)
      : 0;
    activeLesson = lesson;
    if (!resume && id === "market") {
      state.marketPurchase = normaliseMarketOrder();
      taskTimer.start(id, { restart: true });
    }
    if (!resume && ["hotpot", "cafe"].includes(id))
      state.orders[id] = normaliseOrder(id);
    save();
    renderStep();
  };
}

function stampText(id) {
  return {
    hotpot: "火锅",
    cafe: "茶",
    market: "市集",
    gate: "问路",
    culture: "东游",
  }[id];
}
const HINTS = {
  hotpot: [
    "Start with 你好 (hello), then 我叫 (my name is).",
    "蔬菜 means vegetables. Use 我要…谢谢.",
    "水 means water. 一杯 means a glass.",
    "对 means yes, that is right.",
    "Start with 我要. Join food and water with 和. End with 谢谢.",
  ],
  cafe: [
    "茶 means tea. 一杯茶 is a cup of tea.",
    "Say 谢谢 to thank the server.",
    "Use 请 → 给 → 我 → 一杯茶 → ，谢谢。",
  ],
  market: [
    "多少钱 asks how much something costs.",
    "十二 is ten plus two: 12.",
    "Confirm the same price: 十二元 means twelve yuan.",
  ],
  gate: [
    "在哪里 asks where a place is.",
    "左 means left. Follow the left arrow.",
    "右 means right. Follow the right arrow.",
  ],
  culture: [
    "我们…吧 suggests something to do together.",
    "给你… offers something to your friend.",
    "上面 means above. Use the hook over the table.",
    "我们一起…吧 invites everyone to join in.",
  ],
};
function showStepHint() {
  const panel = $("#step-hint-text");
  panel.hidden = !panel.hidden;
  $("#step-hint").setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) {
    const step = activeLesson.steps[currentStep];
    if (step.challenge) revealStepHelp(true);
    if (step.type === "build") {
      const first = step.answer.find(
        (t) => !selectedTokens.some((i) => step.tokens[i] === t),
      );
      document
        .querySelectorAll("[data-token]")
        .forEach((b) =>
          b.classList.toggle(
            "hint-focus",
            step.tokens[Number(b.dataset.token)] === first,
          ),
        );
    } else $(".options")?.classList.add("hint-focus");
  }
}
function answerMarkup(option, index, help) {
  const letter = String.fromCharCode(65 + index);
  if (help.visualAnswers)
    return `<button class="answer-option direction-option" data-option="${index}" aria-label="${letter}: ${esc(option.visualLabel)}"><span class="option-letter">${letter}</span><span class="direction-arrow" aria-hidden="true">${iconMarkup({"←":"arrow-left", "→":"arrow-right", "↑":"arrow-up"}[option.visual])}</span></button>`;
  return `<button class="answer-option" data-option="${index}"><span class="option-letter">${letter}</span><div><div class="chinese" lang="zh">${esc(option.zh)}</div><div class="pinyin ${state.pinyin ? "" : "hidden"}">${esc(option.py)}</div><div class="translation ${help.english ? "" : "hidden"}">${esc(option.en)}</div></div></button>`;
}
function revealStepHelp(requested = stepHelpRequested) {
  stepHelpRequested = requested;
  const step = activeLesson?.steps[currentStep];
  const help = helpForStep(step, {
    translations: state.translations,
    requested,
    answered,
  });
  document
    .querySelectorAll("#modal-root .translation")
    .forEach((element) => element.classList.toggle("hidden", !help.english));
  if ($("#translation-toggle")) $("#translation-toggle").checked = help.english;
}

function renderStep() {
  activeLesson = resolvedLesson(activeLesson.id);
  if (activeLesson.id === "market")
    currentStep = marketResumeStep(currentStep, state.marketPurchase);
  const lesson = activeLesson,
    step = lesson.steps[currentStep];
  startTaskTiming(lesson.id);
  answered = false;
  stepHelpRequested = null;
  nextStepOverride = null;
  selectedTokens = [];
  state.progress[lesson.id] = currentStep;
  save();
  if (step.type === "speak") {
    renderSpeakingStep(lesson, step);
    return;
  }
  const help = helpForStep(step, { translations: state.translations });
  openModal(
    `<div class="modal-eyebrow">${esc(lesson.place.toUpperCase())} · MISSION 0${LESSONS.findIndex((l) => l.id === lesson.id) + 1}</div><h2 id="modal-title">${esc(lesson.title)}</h2>${taskTimerMarkup(lesson.id)}${lessonProgressMarkup(lesson, currentStep)}<div class="lesson-flow" aria-label="Activity steps"><span class="flow-current" data-flow="listen">1 · Listen</span><span data-flow="choose">2 · ${step.type === "build" ? "Build" : step.preference ? "Reply" : "Choose"}</span><span data-flow="continue">3 · Continue</span></div>${activityScene(lesson.id, currentStep, step)}${step.orderSummary ? `<div class="order-summary"><strong lang="zh">${esc(step.orderSummary.zh)}</strong><span class="translation ${help.english ? "" : "hidden"}">${esc(step.orderSummary.en)}</span></div>` : ""}<div class="speaker-bar"><span>${step.speaker?.startsWith("Yu") ? cat : "◡"}</span>${esc(step.speaker || "YU")}</div><div class="speech-card"><div class="chinese" lang="zh">${esc(step.zh)}</div><div class="pinyin ${state.pinyin ? "" : "hidden"}">${esc(step.py)}</div><div class="translation ${help.english ? "" : "hidden"}">${esc(step.en)}</div>${listenButton(step.zh, roleFromSpeaker(step.speaker), true)}</div><div class="display-toggles"><label><input type="checkbox" id="pinyin-toggle" ${state.pinyin ? "checked" : ""}> Pinyin</label><label><input type="checkbox" id="translation-toggle" ${help.english ? "checked" : ""}> ${help.label}</label></div><div class="step-guidance"><p class="step-prompt">${esc(step.prompt)}</p><button id="step-hint" class="hint-button" aria-label="Show a hint" aria-expanded="false" aria-controls="step-hint-text"><b>!</b> Hint</button></div><p id="step-hint-text" class="step-hint-text" hidden>${esc(step.hint || HINTS[lesson.id]?.[currentStep] || step.prompt)}</p><div id="step-interaction">${step.type === "build" ? `<div class="sentence-tray" id="sentence-tray" aria-label="Your sentence"></div><div class="token-bank">${step.tokens.map((t, i) => `<button class="token" data-token="${i}" lang="zh">${esc(t)}</button>`).join("")}</div><div class="build-actions"><button class="secondary" id="clear-sentence">Start again</button><button class="primary" id="check-sentence" disabled>Check sentence <span>${iconMarkup("check")}</span></button></div>` : `<div class="options">${step.options.map((o, i) => answerMarkup(o, i, help)).join("")}</div>`}</div><div id="feedback" class="feedback hidden" role="status" aria-live="polite"></div><div class="modal-footer"><span class="keyboard-hint">${step.type === "choice" ? `Tip: use ${step.options.length === 2 ? "1 or 2" : "1, 2 or 3"} to choose.` : "Tap a selected word to remove it."}</span><button class="primary hidden" id="next-step">${currentStep === lesson.steps.length - 1 ? "Collect your stamp" : "Keep going"} <span>${iconMarkup("arrow-right")}</span></button></div>`,
    false,
    "lesson",
  );
  $("#step-hint").onclick = showStepHint;
  $("#pinyin-toggle").onchange = (e) => {
    state.pinyin = e.target.checked;
    document
      .querySelectorAll("#modal-root .pinyin")
      .forEach((el) => el.classList.toggle("hidden", !state.pinyin));
    save();
  };
  $("#translation-toggle").onchange = (event) => {
    if (step.challenge) revealStepHelp(event.target.checked);
    else {
      state.translations = event.target.checked;
      revealStepHelp(false);
      save();
    }
  };
  if (step.type === "choice")
    document
      .querySelectorAll("[data-option]")
      .forEach(
        (b) => (b.onclick = () => chooseAnswer(Number(b.dataset.option))),
      );
  else {
    document.querySelectorAll("[data-token]").forEach(
      (b) =>
        (b.onclick = () => {
          selectedTokens.push(Number(b.dataset.token));
          updateTokens();
        }),
    );
    $("#clear-sentence").onclick = () => {
      if (answered) return;
      selectedTokens = [];
      updateTokens();
      $("#feedback").classList.add("hidden");
    };
    $("#check-sentence").onclick = checkSentence;
  }
  $("#next-step").onclick = () => {
    if (!answered) return;
    if (currentStep < lesson.steps.length - 1) {
      currentStep =
        nextStepOverride === "practice"
          ? lesson.steps.length - 1
          : nextStepOverride
            ? lesson.steps.findIndex(
                (candidate) => candidate.id === nextStepOverride,
              )
            : currentStep + 1;
      renderStep();
    } else completeLesson();
  };
}

function renderSpeakingStep(lesson, step) {
  openModal(
    `<div class="modal-eyebrow">${esc(lesson.place.toUpperCase())} · YOUR TURN</div>
    <h2 id="modal-title">Say it yourself</h2>${taskTimerMarkup(lesson.id)}
    ${lessonProgressMarkup(lesson, currentStep)}
    <div class="lesson-flow" aria-label="Practice steps"><span data-flow="listen">1 · Listen</span><span class="flow-current" data-flow="choose">2 · Say it</span><span data-flow="continue">3 · Stamp</span></div>
    ${activityScene(lesson.id, step.sceneIndex, step)}
    <div class="speech-card"><div class="chinese" lang="zh">${esc(step.zh)}</div><div class="pinyin ${state.pinyin ? "" : "hidden"}">${esc(step.py)}</div><div class="translation ${state.translations ? "" : "hidden"}">${esc(step.en)}</div>${listenButton(step.zh, "narrator", true)}</div>
    <div class="display-toggles"><label><input type="checkbox" id="pinyin-toggle" ${state.pinyin ? "checked" : ""}> Pinyin</label><label><input type="checkbox" id="translation-toggle" ${state.translations ? "checked" : ""}> English help</label></div>
    <div id="speaking-practice"></div>
    <div id="practice-achievement" class="feedback hidden" role="status">You said it! Your stamp is ready.</div>
    <div class="modal-footer"><span></span><button class="primary" id="practice-finish" disabled>Collect your stamp <span>${iconMarkup("arrow-right")}</span></button></div>`,
    false,
    "lesson",
  );
  $("#modal-root .modal").classList.add("practice-modal");
  const finish = $("#practice-finish"),
    achievement = $("#practice-achievement");
  $("#pinyin-toggle").onchange = (event) => {
    state.pinyin = event.target.checked;
    $("#modal-root .pinyin").classList.toggle("hidden", !state.pinyin);
    save();
  };
  $("#translation-toggle").onchange = (event) => {
    state.translations = event.target.checked;
    $("#modal-root .translation").classList.toggle(
      "hidden",
      !state.translations,
    );
    save();
  };
  speakingPractice = mountSpeakingPractice($("#speaking-practice"), {
    filename: `trip-to-the-east-${lesson.id}`,
    onBeforeRecord: () => voicePlayer.stop(),
    onState: (status) => {
      practiceAudioBusy = [
        "requesting",
        "recording",
        "stopping",
        "playing",
      ].includes(status);
      soundscape.setPracticeQuiet(practiceAudioBusy);
      document
        .querySelectorAll("#modal-root [data-speak]")
        .forEach((b) => (b.disabled = practiceAudioBusy));
    },
    onReady: (ready) => {
      answered = ready;
      finish.disabled = !ready;
      achievement.classList.toggle("hidden", !ready);
      document
        .querySelectorAll("[data-flow]")
        .forEach((el) =>
          el.classList.toggle(
            "flow-current",
            el.dataset.flow === (ready ? "continue" : "choose"),
          ),
        );
    },
  });
  finish.onclick = () => {
    if (answered) completeLesson();
  };
}

function feedback(message, correct) {
  setActivityOutcome(
    $("#modal-root"),
    correct,
    activeLesson?.steps[currentStep],
  );
  soundscape.effect(correct ? "success" : "retry");
  document
    .querySelectorAll("[data-flow]")
    .forEach((el) =>
      el.classList.toggle(
        "flow-current",
        el.dataset.flow === (correct ? "continue" : "choose"),
      ),
    );
  const el = $("#feedback");
  el.textContent = message;
  el.className = `feedback ${correct ? "" : "wrong"}`;
  if (correct) {
    answered = true;
    revealStepHelp();
    $("#next-step").classList.remove("hidden");
    $("#next-step").focus();
  }
}
function chooseAnswer(index) {
  if (!activeLesson) return;
  const step = activeLesson.steps[currentStep],
    option = step.options[index];
  if (!option || (answered && !step.preference)) return;
  if (step.preference) {
    answered = false;
    $("#next-step").classList.add("hidden");
  }
  if (option.action === "change-order") {
    showOrderEditor();
    speak(option.zh, { role: "traveller" });
    return;
  }
  let choiceCorrect = !!option.correct;
  if (option.marketChoice) {
    const outcome = applyMarketChoice(state.marketPurchase, step.id, option);
    choiceCorrect = outcome.acceptedChoice;
    if (choiceCorrect) {
      state.marketPurchase = outcome.order;
      nextStepOverride = outcome.nextStepId;
      activeLesson = resolvedLesson("market");
      const scene = $("#modal-root .activity-scene");
      if (scene)
        scene.outerHTML = activityScene(
          "market",
          currentStep,
          activeLesson.steps[currentStep],
        );
    }
  }
  if (option.drink) {
    state.orders[activeLesson.id] = {
      ...normaliseOrder(activeLesson.id, state.orders[activeLesson.id]),
      drink: option.drink,
    };
    activeLesson = resolvedLesson(activeLesson.id);
    const scene = $("#modal-root .activity-scene");
    if (scene)
      scene.outerHTML = activityScene(
        activeLesson.id,
        currentStep,
        activeLesson.steps[currentStep],
      );
  }
  state.attempts++;
  save();
  document
    .querySelectorAll("[data-option]")
    .forEach((el) => el.classList.remove("incorrect", "correct"));
  const button = document.querySelector(`[data-option="${index}"]`);
  button.classList.add(choiceCorrect ? "correct" : "incorrect");
  feedback(
    option.feedback ||
      (choiceCorrect ? step.success : "Have another listen, and try again."),
    choiceCorrect,
  );
  if (choiceCorrect) {
    document
      .querySelectorAll("[data-option]")
      .forEach((el) => (el.disabled = !step.preference));
    if (option.nextLabel)
      $("#next-step").innerHTML = `${esc(option.nextLabel)} <span>${iconMarkup("arrow-right")}</span>`;
    if (activeLesson.id === "market")
      $("#modal-root .lesson-top").outerHTML = lessonProgressMarkup(
        activeLesson,
        currentStep,
      );
    speak(option.zh, { role: "traveller" });
  }
}

function showOrderEditor() {
  const id = activeLesson.id;
  let draft = normaliseOrder(id, state.orders[id]);
  const draw = () => {
    openModal(
      `<div class="modal-eyebrow">YOUR ORDER</div><h2 id="modal-title">Change your order</h2>${taskTimerMarkup(id)}<div class="order-editor-drinks">${Object.entries(
        DRINKS,
      )
        .map(
          ([key, d]) =>
            `<button class="answer-option ${draft.drink === key ? "correct" : ""}" data-order-drink="${key}" aria-pressed="${draft.drink === key}"><div><strong lang="zh">一杯${d.zh}</strong><span class="translation">${d.en}</span></div></button>`,
        )
        .join(
          "",
        )}</div><label class="order-vegetables"><input id="order-vegetables" type="checkbox" ${draft.vegetables ? "checked" : ""}><span lang="zh">一份蔬菜</span><span>Vegetables</span></label><p class="muted-note">Uncheck vegetables for a drink only.</p><div class="modal-footer"><button class="secondary" id="cancel-order-edit">Keep my order</button><button class="primary" id="save-order-edit">Use this order ${iconMarkup("arrow-right")}</button></div>`,
      false,
      "order-edit",
    );
    document.querySelectorAll("[data-order-drink]").forEach(
      (b) =>
        (b.onclick = () => {
          draft.drink = b.dataset.orderDrink;
          draw();
        }),
    );
    $("#order-vegetables").onchange = (e) => {
      draft.vegetables = e.target.checked;
    };
    $("#cancel-order-edit").onclick = () => renderStep();
    $("#save-order-edit").onclick = () => {
      state.orders[id] = { ...draft };
      save();
      renderStep();
    };
  };
  draw();
}

function updateTokens() {
  const step = activeLesson.steps[currentStep];
  $("#sentence-tray").innerHTML = selectedTokens
    .map(
      (idx, i) =>
        `<button class="token" data-remove="${i}" lang="zh" aria-label="Remove ${esc(step.tokens[idx])}">${esc(step.tokens[idx])}</button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-token]")
    .forEach(
      (el) =>
        (el.disabled =
          selectedTokens.includes(Number(el.dataset.token)) || answered),
    );
  document.querySelectorAll("[data-remove]").forEach(
    (el) =>
      (el.onclick = () => {
        if (answered) return;
        selectedTokens.splice(Number(el.dataset.remove), 1);
        updateTokens();
      }),
  );
  $("#check-sentence").disabled = !selectedTokens.length || answered;
}
function checkSentence() {
  if (answered) return;
  const step = activeLesson.steps[currentStep];
  const result = selectedTokens.map((i) => step.tokens[i]);
  const resultText = result.join("");
  const correct =
    resultText === step.answer.join("") ||
    (step.alternatives || []).includes(resultText);
  state.attempts++;
  save();
  feedback(
    correct
      ? step.success
      : step.hint || "Put the words in order, then try again.",
    correct,
  );
  if (correct) {
    updateTokens();
    $("#clear-sentence").disabled = true;
    speak(result.join(""), { role: "traveller" });
  }
}
function completeLesson() {
  soundscape.effect("stamp");
  const lesson = activeLesson;
  taskTimer.complete(lesson.id);
  timingContext = false;
  const already = state.completed.includes(lesson.id);
  if (!already) state.completed.push(lesson.id);
  delete state.progress[lesson.id];
  save();
  updateOverview();
  const all = state.completed.length === LESSONS.length;
  openModal(
    `<div class="success-view"><div class="modal-eyebrow">${already ? "PRACTICE COMPLETE" : "MISSION COMPLETE"}</div><div class="success-stamp"><span>${stampText(lesson.id)}</span><small>CHONGQING</small></div><div class="reward-label">${already ? "STAMP REVISITED" : "STAMP COLLECTED"}</div><h2 id="modal-title">${esc(lesson.reward.title)}</h2><p class="modal-intro">${esc(lesson.reward.description)}</p>${taskTimerMarkup(lesson.id, true)}<div class="intro-phrases">${lesson.phrases.slice(-2).map(phraseRow).join("")}</div><p class="muted-note">${all ? "Chapter complete. Revisit a stop to practise." : `${state.completed.length} / 5 stamps`}</p><div class="modal-footer"><button class="secondary" id="reward-journal">View journal</button><button class="primary" id="return-world">${all ? "Explore Chongqing" : "Back to the city"} <span>${iconMarkup("arrow-up-right")}</span></button></div></div>`,
    false,
    "reward",
  );
  $("#return-world").onclick = closeModal;
  $("#reward-journal").onclick = openJournal;
}
function openPhrasebook() {
  openModal(
    `<div class="modal-eyebrow">词语本 · PHRASEBOOK</div><h2 id="modal-title">Phrasebook</h2><p class="modal-intro">Tap the speaker to listen.</p><input class="phrase-search" type="search" id="phrase-search" placeholder="Find a word in English, Chinese or pinyin…" aria-label="Search phrasebook"><div class="phrasebook-grid" id="phrasebook-grid"></div><p class="muted-note">Recorded Mandarin · device voice for new phrases and custom names.</p>`,
    true,
    "phrasebook",
  );
  function render(query = "") {
    const q = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const filtered = PHRASES.filter((p) =>
      `${p.zh} ${p.py} ${p.en}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q),
    );
    $("#phrasebook-grid").innerHTML = filtered.length
      ? filtered
          .map(
            (p) =>
              `<div class="phrasebook-card"><div class="phrasebook-tag">${esc(LESSONS.find((l) => l.id === p.lesson)?.place || "Travel essentials")}</div><div class="chinese" lang="zh">${esc(p.zh)}</div><div class="pinyin ${state.pinyin ? "" : "hidden"}">${esc(p.py)}</div><div class="translation">${esc(p.en)}</div>${listenButton(p.zh)}</div>`,
          )
          .join("")
      : '<p class="empty-results">No phrases found. Try “water”, “hello” or “多少钱”.</p>';
    bindAudio();
  }
  render();
  $("#phrase-search").oninput = (e) => render(e.target.value);
}
function openJournal() {
  const count = PHRASES.filter((p) =>
    state.completed.includes(p.lesson),
  ).length;
  openModal(
    `<div class="modal-eyebrow">旅行记 · JOURNAL</div><h2 id="modal-title">Your stamps</h2><p class="modal-intro">Complete a conversation. Collect a stamp.</p><div class="journal-grid">${LESSONS.map((l) => `<div class="journal-stamp ${state.completed.includes(l.id) ? "earned" : ""}"><span>${stampText(l.id)}</span><small>${state.completed.includes(l.id) ? "COLLECTED" : "TO DISCOVER"}</small></div>`).join("")}</div><div class="journal-stat"><div><strong>${state.completed.length}<small> / 5</small></strong><small>STAMPS COLLECTED</small></div><div><strong>${count}</strong><small>PHRASES PRACTISED</small></div><div><strong>1</strong><small>CITY TO EXPLORE</small></div></div><div class="intro-phrases"><div class="phrase-row"><div class="yu-avatar">${cat}</div><p class="modal-intro">${state.completed.length === 5 ? "“Well done! Try again without English help.”" : "“Ready for your next stop?”"}<br><small>— Yu</small></p></div></div><div class="modal-footer"><button class="reset-link" id="reset-progress">Start a fresh journey</button><button class="primary" id="journal-continue">${state.completed.length === 5 ? "Practise a conversation" : "Continue exploring"} <span>${iconMarkup("arrow-right")}</span></button></div><button class="journal-arrival" id="replay-arrival">${iconMarkup("arrow-up-right")} Replay the trip to Chongqing</button><p class="muted-note">${storageWorks ? "Progress is stored only in this browser on this device." : "Browser storage is unavailable. Progress lasts for this visit."}</p>`,
    true,
    "journal",
  );
  $("#replay-arrival").onclick = () => {
    closeModal();
    startArrivalTrip();
  };
  $("#journal-continue").onclick = () => openLessonIntro(nextLesson().id);
  $("#reset-progress").onclick = () => {
    openModal(
      `<div class="modal-eyebrow">A FRESH PAGE</div><h2 id="modal-title">Start your journey again?</h2><p class="modal-intro">This clears your stamps and mission progress on this device. Your phrasebook stays available.</p><div class="modal-footer"><button class="secondary" id="keep-progress">Keep my journey</button><button class="primary" id="confirm-reset">Start again <span>↻</span></button></div>`,
      false,
      "reset",
    );
    $("#keep-progress").onclick = openJournal;
    $("#confirm-reset").onclick = () => {
      taskTimer.reset();
      timingContext = false;
      state.completed = [];
      state.progress = {};
      state.orders = {};
      state.marketPurchase = normaliseMarketOrder();
      state.started = false;
      state.attempts = 0;
      save();
      closeModal();
      toast("A fresh page. Yu is ready when you are.");
    };
  };
}
$("#yu-tip-avatar").innerHTML = cat;
$("#phrasebook-nav").onclick = openPhrasebook;
$("#journal-nav").onclick = openJournal;
$("#passport-button").onclick = openJournal;
$("#explore-nav").onclick = () => {
  closeModal();
  world?.resetView();
};
$(".brand").onclick = (e) => {
  e.preventDefault();
  closeModal();
  world?.resetView();
};
$("#sound-toggle").onclick = () => {
  state.sound = !state.sound;
  if (!state.sound) voicePlayer.stop();
  save();
  updateOverview();
  toast(
    state.sound
      ? "Mandarin pronunciation audio is on."
      : "Mandarin pronunciation audio is off.",
  );
};
$("#tip-listen").onclick = () => {
  const voice = voicePlayer.getStatus();
  if (voice.speaking && voice.activeRole === "yu") {
    voicePlayer.stop();
    return;
  }
  speak(getGuideLine(state.completed).zh, { role: "yu", manual: true });
};
window.addEventListener("pagehide", () => {
  voicePlayer.stop();
  speakingPractice?.cancel();
});
$("#rotate-left").onclick = () => world?.rotate(-0.3);
$("#rotate-right").onclick = () => world?.rotate(0.3);
$("#reset-camera").onclick = () => world?.resetView();
$("#zoom-in").onclick = () => world?.zoom(0.12);
$("#zoom-out").onclick = () => world?.zoom(-0.12);
window.addEventListener("keydown", (e) => {
  if (!modalType) return;
  if (e.key === "Escape") {
    closeModal();
    return;
  }
  if (e.key === "Tab") {
    const focusable = [
      ...document.querySelectorAll(
        "#modal-root button:not(:disabled),#modal-root input:not(:disabled),#modal-root a[href],#modal-root audio[controls]",
      ),
    ].filter(
      (el) =>
        !el.closest("[hidden], .hidden, [inert]") &&
        el.getClientRects().length > 0,
    );
    if (!focusable.length) return;
    const first = focusable[0],
      last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  if (
    modalType === "lesson" &&
    activeLesson?.steps[currentStep]?.type === "choice" &&
    /^[1-3]$/.test(e.key) &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    chooseAnswer(Number(e.key) - 1);
  }
});
function hideLoading() {
  const el = $("#world-loading");
  if (!el) return;
  el.style.opacity = "0";
  setTimeout(() => el.remove(), 600);
}
try {
  world = createWorld($("#world"), {
    onSelect: openLessonIntro,
    onTravel: (id) => (unlocked(id) ? startTaskTiming(id) : pauseTaskTiming()),
    onReady: hideLoading,
  });
  setTimeout(hideLoading, 3500);
} catch (error) {
  console.error(error);
  hideLoading();
  const fallback = document.createElement("div");
  fallback.className = "webgl-fallback";
  fallback.innerHTML =
    "<h2>The city needs 3-D support</h2><p>Enable hardware acceleration or try a recent version of Safari, Chrome or Edge. You can still play every Mandarin mission using the adventure panel.</p>";
  $("#world-container").appendChild(fallback);
}
updateOverview();

const NAMES = {
  xiaoan: {
    zh: "宝玉",
    py: "Bǎoyù",
    en: "Baoyu",
    meaning: "Precious jade",
  },
  xiaolin: {
    zh: "小李",
    py: "Xiǎolǐ",
    en: "Xiao Li",
    meaning: "Little Li",
  },
  lele: { zh: "小白", py: "Xiǎobái", en: "Xiao Bai", meaning: "Little White" },
};
const DEFAULT_PROFILE = {
  name: "xiaoan",
  character: "xiaoan",
  customName: "",
  outfit: "terracotta",
  hair: "short",
  skin: "warm",
  hat: false,
};
let avatarView;
function cleanName(value) {
  return [
    ...String(value || "")
      .normalize("NFC")
      .replace(/[^\p{L}\p{M}\p{N} ·’'_-]/gu, "")
      .trim(),
  ]
    .slice(0, 20)
    .join("");
}
function profileName(profile) {
  const custom = cleanName(profile?.customName);
  return custom
    ? { zh: custom, py: custom, en: custom, meaning: "Your own name" }
    : NAMES[profile?.name] || NAMES.xiaoan;
}
function currentName() {
  return profileName(state.profile);
}
function personaliseContent() {
  const name = currentName();
  const convert = (v) =>
    typeof v === "string"
      ? v.replace(
          /宝玉|Bǎoyù|Baoyu/g,
          (token) => ({ 宝玉: name.zh, Bǎoyù: name.py, Baoyu: name.en })[token],
        )
      : Array.isArray(v)
        ? v.map(convert)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v).map(([k, value]) => [k, convert(value)]),
            )
          : v;
  LESSONS = convert(BASE_LESSONS);
  PHRASES = convert(BASE_PHRASES);
}
function showCreator() {
  closeModal();
  const editing = !!state.profile;
  let draft = { ...DEFAULT_PROFILE, ...state.profile };
  if (!NAMES[draft.name]) draft.name = "xiaoan";
  draft.character = state.profile?.character || draft.name;
  draft.customName = cleanName(draft.customName);
  world?.stopWalking?.();
  let creator = $("#character-creator");
  if (!creator) {
    creator = document.createElement("section");
    creator.id = "character-creator";
    document.body.appendChild(creator);
  }
  creator.hidden = false;
  document.body.classList.add("creating");
  $("#explore-screen").inert = true;
  creator.innerHTML = `<div class="creator-copy"><div class="eyebrow"><span class="tiny-line"></span> 东游记 · TRIP TO THE EAST</div><h1>Create your<br> <em>traveller.</em></h1><p>Explore Chongqing. Learn Mandarin with Yu.</p><div class="creator-chinese" lang="zh">你好，世界。</div><div class="creator-translation">Nǐ hǎo, shìjiè. · Hello, world.</div><div class="creator-companion"><div class="yu-avatar">${cat}</div><div><strong>Yu · Your guide</strong><p>Your first stop: hot pot.</p></div></div><div class="creator-destination"><span>01</span><div>FIRST DESTINATION<strong>重庆 · CHONGQING</strong></div><span>${iconMarkup("arrow-up-right")}</span></div></div><div class="avatar-stage"><div class="avatar-orbit orbit-one"></div><div class="avatar-orbit orbit-two"></div><span class="avatar-spark spark-a">${iconMarkup("sparkle")}</span><span class="avatar-spark spark-b">${iconMarkup("sparkle")}</span><div class="avatar-vertical" lang="zh">千里之行<br>始于足下</div><canvas id="avatar-canvas" aria-label="Live 3D preview of your traveller"></canvas><div class="avatar-nameplate"><span id="preview-name" lang="zh">${esc(profileName(draft).zh)}</span><small id="preview-pinyin">${draft.customName ? "" : NAMES[draft.name].py}</small></div><div class="avatar-note">A LITTLE TRAVELLER. A BIG ADVENTURE.</div></div><div class="creator-card"><div class="modal-eyebrow">旅人 · TRAVELLER</div><h2>Make it yours</h2><p class="creator-card-intro">A few little details, all your own.</p><fieldset class="custom-name-field"><legend>Your name</legend><input id="custom-name" type="text" maxlength="24" autocomplete="off" placeholder="Type your name (optional)" value="${esc(draft.customName)}" aria-label="Your own name"><small>Or keep a name below.</small></fieldset><fieldset><legend>Your character</legend><div class="nickname-options">${Object.entries(
    NAMES,
  )
    .map(
      ([id, n]) =>
        `<button type="button" class="nickname ${draft.name === id ? "selected" : ""}" data-profile-key="name" data-profile-value="${id}" aria-pressed="${draft.name === id}"><span lang="zh">${n.zh}</span><small>${n.py}</small></button>`,
    )
    .join(
      "",
    )}</div><small class="nickname-meaning" id="nickname-meaning">${AVATAR_PRESETS[draft.name].description}</small></fieldset><fieldset><legend>Your outfit <span>Made for wandering</span></legend><div class="colour-options">${[
    ["terracotta", "#bc6243", "Lantern orange"],
    ["jade", "#4c8471", "River jade"],
    ["plum", "#77657e", "Mountain plum"],
  ]
    .map(
      ([v, c, n]) =>
        `<button type="button" class="colour-choice ${draft.outfit === v ? "selected" : ""}" style="--swatch:${c}" data-profile-key="outfit" data-profile-value="${v}" aria-label="${n}" aria-pressed="${draft.outfit === v}"><span></span><small>${n}</small></button>`,
    )
    .join(
      "",
    )}</div></fieldset><fieldset><legend>Hair</legend><div class="segmented">${[
    ["short", "Short"],
    ["bob", "Bob"],
    ["bun", "Bun"],
  ]
    .map(
      ([v, n]) =>
        `<button type="button" class="${draft.hair === v ? "selected" : ""}" data-profile-key="hair" data-profile-value="${v}" aria-pressed="${draft.hair === v}">${n}</button>`,
    )
    .join(
      "",
    )}</div></fieldset><div class="creator-last-row"><fieldset><legend>Skin tone</legend><div class="skin-options">${[
    ["light", "#f6d4b2", "Light"],
    ["warm", "#d5a077", "Warm"],
    ["deep", "#8a5b40", "Deep"],
  ]
    .map(
      ([v, c, n]) =>
        `<button type="button" class="skin-choice ${draft.skin === v ? "selected" : ""}" style="--swatch:${c}" data-profile-key="skin" data-profile-value="${v}" aria-label="${n} skin tone" aria-pressed="${draft.skin === v}"></button>`,
    )
    .join(
      "",
    )}</div></fieldset><fieldset><legend>A finishing touch</legend><button class="hat-choice ${draft.hat ? "selected" : ""}" data-profile-key="hat" aria-pressed="${draft.hat}"><span>⌁</span> Travel hat <span class="hat-check">${iconMarkup(draft.hat ? "check" : "plus")}</span></button></fieldset></div><button class="primary creator-begin" id="begin-adventure">${editing ? "Save my traveller" : "Start exploring"} <span>${iconMarkup("arrow-right")}</span></button><p class="creator-footnote">${editing ? "Your progress is kept." : "No account needed."}</p>${editing ? '<button class="creator-cancel" id="creator-cancel">Keep my current look</button>' : ""}</div><div class="creator-bottom"><span>TRIP TO THE EAST <span lang="zh">东游记</span></span><span>A language is a place you can belong.</span><span>01 / CREATE YOUR TRAVELLER</span></div>`;
  try {
    avatarView = createAvatarView($("#avatar-canvas"), draft);
  } catch (e) {
    console.error(e);
    $("#avatar-canvas").insertAdjacentHTML(
      "afterend",
      `<div class="avatar-fallback">${cat}<p>Your traveller is ready.<br>3-D preview needs graphics support.</p></div>`,
    );
  }
  function refreshCreator() {
    creator.querySelectorAll("[data-profile-key]").forEach((b) => {
      const key = b.dataset.profileKey;
      const checked =
        key === "hat" ? draft.hat : b.dataset.profileValue === draft[key];
      b.classList.toggle("selected", checked);
      b.setAttribute("aria-pressed", String(checked));
    });
    $("#preview-name").textContent = profileName(draft).zh;
    $("#preview-pinyin").textContent = draft.customName
      ? ""
      : NAMES[draft.name].py;
    $("#nickname-meaning").textContent = AVATAR_PRESETS[draft.name].description;
    setIcon($(".hat-check"), draft.hat ? "check" : "plus");
    avatarView?.setAppearance(draft);
  }
  $("#custom-name").oninput = (e) => {
    draft.customName = cleanName(e.target.value);
    $("#preview-name").textContent = profileName(draft).zh;
    $("#preview-pinyin").textContent = draft.customName
      ? ""
      : NAMES[draft.name].py;
  };
  creator.querySelectorAll("[data-profile-key]").forEach(
    (button) =>
      (button.onclick = () => {
        const key = button.dataset.profileKey;
        draft[key] = key === "hat" ? !draft.hat : button.dataset.profileValue;
        if (key === "name") {
          draft.character = draft.name;
          const preset = AVATAR_PRESETS[draft.name];
          for (const property of ["outfit", "hair", "skin", "hat"])
            draft[property] = preset[property];
        }
        refreshCreator();
      }),
  );
  function finish({ focus = true } = {}) {
    avatarView?.destroy();
    avatarView = null;
    creator.hidden = true;
    creator.innerHTML = "";
    document.body.classList.remove("creating");
    $("#explore-screen").inert = false;
    world?.setAppearance?.(state.profile || DEFAULT_PROFILE);
    updateOverview();
    if (focus) $("#start-mission").focus();
  }
  $("#begin-adventure").onclick = () => {
    draft.customName = cleanName(draft.customName);
    state.profile = draft;
    save();
    personaliseContent();
    finish({ focus: editing });
    if (!editing) startArrivalTrip();
  };
  if (editing) $("#creator-cancel").onclick = finish;
}
async function startArrivalTrip() {
  voicePlayer.stop();
  world?.stopWalking?.();
  pauseTaskTiming();
  await playArrival({
    profile: state.profile || DEFAULT_PROFILE,
    soundscape,
    onMusicChange(enabled) { state.music = enabled; save(); },
  });
  $("#start-mission").focus({ preventScroll: true });
}
const travellerButton = document.createElement("button");
travellerButton.id = "traveller-button";
travellerButton.className = "icon-button traveller-toggle";
travellerButton.setAttribute("aria-label", "Edit your traveller");
travellerButton.title = "Edit your traveller";
travellerButton.textContent = "旅";
travellerButton.onclick = showCreator;
$(".header-right").prepend(travellerButton);
personaliseContent();
updateOverview();
world?.setAppearance?.(state.profile || DEFAULT_PROFILE);
if (!state.profile) showCreator();
$("#next-hint").onclick = () => selectPlace(nextLesson().id);
$("#music-toggle").onclick = () => {
  state.music = !soundscape.getState().enabled;
  soundscape.setEnabled(state.music);
  save();
};
$("#effects-toggle").onclick = () => {
  state.effects = !soundscape.getState().effects;
  soundscape.setEffects(state.effects);
  if (state.effects) soundscape.effect("click");
  save();
};
$("#music-toggle").setAttribute("aria-pressed", String(state.music !== false));
$("#effects-toggle").setAttribute(
  "aria-pressed",
  String(state.effects !== false),
);

setIcon($("#music-toggle"), state.music !== false ? "music" : "music-off");

// Persist active seconds without including hidden-tab, dialog, or offline time.
setInterval(() => {
  updateTaskTimers();
  if (taskTimer.get().running) save();
}, 1000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) taskTimer.pause();
  else if (timingContext) taskTimer.resume();
  save();
  updateTaskTimers();
});
window.addEventListener("pagehide", () => {
  taskTimer.pause();
  save();
});
window.addEventListener("pageshow", () => {
  if (timingContext && !document.hidden) taskTimer.resume();
  updateTaskTimers();
});

function updateGameClock() {
  const time = getGameTimeState();
  document.body.dataset.dayPhase = time.phase;
  const clock = document.getElementById("game-clock");
  clock.textContent = time.clockLabel;
  document.getElementById("game-day").textContent = `Day ${time.dayNumber}`;
  document.getElementById("game-phase").textContent = time.phaseLabel;
  setIcon(document.getElementById("game-phase-icon"), time.isDay ? "sun" : "moon");
  document.getElementById("game-time-display").title =
    "10-minute game day · 3 min day · 2 min dusk · 3 min night · 2 min dawn";
}
updateGameClock();
setInterval(updateGameClock, 250);
