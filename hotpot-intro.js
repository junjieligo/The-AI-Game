import { createHotpotIntroScene } from "./hotpot-intro-scene.js?v=1.26";
import { createHotpotIntroAudio } from "./hotpot-intro-audio.js?v=1.28";
import { iconMarkup, setIcon } from "./ui-icons.js?v=1.15";

export const HOTPOT_INTRO_DURATION = 5;
export const HOTPOT_INTRO_FADE = Object.freeze({ in: .45, out: .55 });
const smooth = n => { n = Math.max(0, Math.min(1, n)); return n * n * (3 - 2 * n); };
// Both fades use the same visible-time clock as serving and sound. Hidden tabs
// pause the transition; no timeout can finish it behind the player's back.
export function hotpotIntroOpacity(seconds, duration = HOTPOT_INTRO_DURATION) {
  return smooth(seconds / HOTPOT_INTRO_FADE.in) *
    smooth((duration - seconds) / HOTPOT_INTRO_FADE.out);
}
let activeIntro = null;

// One visual prologue per visit, before the lesson dialog. No lesson state is
// changed here; the caller decides whether to continue after complete/skip.
export function playHotpotIntro({
  soundscape, onEffectsChange = () => {},
  sceneFactory = createHotpotIntroScene, audioFactory = createHotpotIntroAudio,
  theme = "hotpot", dialogLabel = "Hotpot serving animation",
  sceneDescription = "Yu watches as hands gently serve a hotpot among vegetables, beef balls, pork belly and fish. The broth bubbles and soft steam rises.",
  soundLabel = "cooking", fallbackMarkup = null, duration = HOTPOT_INTRO_DURATION,
} = {}) {
  if (activeIntro) return activeIntro;
  duration = Number.isFinite(duration) && duration > 0 ? duration : HOTPOT_INTRO_DURATION;
  const stillFrame = Math.max(0, duration - .3);
  let resolve;
  activeIntro = new Promise(done => { resolve = done; });
  const result = activeIntro;
  const app = document.getElementById("app");
  const previousInert = app?.inert;
  const previousOverflow = document.body.style.overflow;
  const previousFocus = document.activeElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const overlay = document.createElement("section");
  overlay.className = "hotpot-intro";
  overlay.style.opacity = "0";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", dialogLabel);
  overlay.dataset.theme = theme;
  overlay.innerHTML = `<div class="hotpot-intro-canvas" role="img" aria-label="Animated introduction"></div>
    <div class="hotpot-intro-shade" aria-hidden="true"></div>
    <div class="hotpot-intro-actions"><button class="hotpot-intro-sound" type="button" aria-label="Turn cooking sounds off">${iconMarkup("sound")}</button><button class="hotpot-intro-skip" type="button">Skip ${iconMarkup("arrow-right")}</button></div>
    <div class="hotpot-intro-progress" aria-hidden="true"><span></span></div>`;
  document.body.append(overlay);
  document.body.classList.add("in-hotpot-intro");
  document.body.style.overflow = "hidden";
  if (app) app.inert = true;
  const sceneHost = overlay.querySelector(".hotpot-intro-canvas");
  sceneHost.setAttribute("aria-label", sceneDescription);
  const skip = overlay.querySelector(".hotpot-intro-skip");
  const soundButton = overlay.querySelector(".hotpot-intro-sound");
  const progress = overlay.querySelector(".hotpot-intro-progress span");
  let scene, audio, raf, elapsed = 0, lastFrame = null, finished = false;
  let effectsEnabled = soundscape?.getState().effects !== false;

  function updateSoundButton() {
    setIcon(soundButton, effectsEnabled ? "sound" : "sound-off");
    soundButton.setAttribute("aria-label", effectsEnabled ? `Turn ${soundLabel} sounds off` : `Turn ${soundLabel} sounds on`);
    soundButton.setAttribute("aria-pressed", String(effectsEnabled));
  }
  function finish(reason = "complete") {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pagehide", onPageHide);
    audio?.destroy();
    scene?.destroy();
    soundscape?.setThemeIntroDucked?.(false);
    overlay.remove();
    document.body.classList.remove("in-hotpot-intro");
    document.body.style.overflow = previousOverflow;
    if (app) app.inert = previousInert;
    if (reason !== "pagehide" && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    activeIntro = null;
    resolve({ reason });
  }
  function onKey(event) {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopImmediatePropagation(); finish("skip");
    } else if (event.key === "Tab") {
      event.preventDefault(); event.stopImmediatePropagation();
      (document.activeElement === skip ? soundButton : skip).focus();
    } else if (/^(Arrow|[wasd]$)/i.test(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }
  function onVisibility() {
    lastFrame = null;
    if (document.hidden) audio?.pause();
    else audio?.resume();
  }
  function resize() { scene?.resize(); }
  function onPageHide() { finish("pagehide"); }
  function draw(now) {
    if (finished) return;
    if (!document.hidden) {
      if (lastFrame !== null) elapsed += Math.max(0, (now - lastFrame) / 1000);
      lastFrame = now;
      scene?.render(reducedMotion ? stillFrame : Math.min(duration, elapsed));
      overlay.style.opacity = String(hotpotIntroOpacity(elapsed, duration));
      progress.style.transform = `scaleX(${Math.min(1, elapsed / duration)})`;
      overlay.dataset.elapsed = elapsed.toFixed(2);
      if (elapsed >= duration) { finish(); return; }
    }
    raf = requestAnimationFrame(draw);
  }
  skip.onclick = () => finish("skip");
  soundButton.onclick = () => {
    effectsEnabled = !effectsEnabled;
    soundscape?.setEffects(effectsEnabled);
    soundscape?.unlock();
    audio?.setEnabled(effectsEnabled);
    onEffectsChange(effectsEnabled);
    updateSoundButton();
  };
  updateSoundButton();
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("resize", resize);
  window.addEventListener("pagehide", onPageHide);
  try {
    scene = sceneFactory(sceneHost);
    scene.render(reducedMotion ? stillFrame : 0);
  } catch (error) {
    console.warn(`${dialogLabel} uses its illustrated fallback:`, error);
    sceneHost.hidden = true;
    const fallback = document.createElement("div");
    fallback.className = "hotpot-intro-fallback";
    fallback.innerHTML = fallbackMarkup || `<svg viewBox="0 0 640 420" role="img" aria-label="A steaming chilli hotpot surrounded by vegetables, mushrooms and tofu"><ellipse cx="320" cy="280" rx="290" ry="115" fill="#b89065"/><ellipse cx="320" cy="215" rx="146" ry="85" fill="#ad7345"/><path d="M174 215v48c0 92 292 92 292 0v-48" fill="#b77946"/><ellipse cx="320" cy="215" rx="135" ry="76" fill="#cb6542"/><path d="M260 151v128m120-128v128m-176-87h232m-236 44h240" stroke="#e2b978" stroke-width="7"/><g fill="#f3efd7" stroke="#88a590" stroke-width="4"><ellipse cx="95" cy="245" rx="56" ry="27"/><ellipse cx="540" cy="245" rx="56" ry="27"/><ellipse cx="185" cy="350" rx="63" ry="30"/><ellipse cx="455" cy="350" rx="63" ry="30"/></g><g fill="#84a174"><ellipse cx="95" cy="231" rx="29" ry="15"/><ellipse cx="186" cy="338" rx="32" ry="15"/></g><g fill="#d4b394"><ellipse cx="528" cy="232" rx="15" ry="10"/><ellipse cx="551" cy="236" rx="14" ry="9"/></g><path d="M426 329h25v23h-25zm32 3h25v23h-25z" fill="#f8df9f"/><path d="M270 117c-28-25 28-40 0-65m50 65c-28-25 28-40 0-65m50 65c-28-25 28-40 0-65" fill="none" stroke="#fff9e8" stroke-width="9" stroke-linecap="round"/></svg>`;
    overlay.prepend(fallback);
  }
  // Effects are optional: missing/blocked audio never delays the visual introduction.
  try {
    audio = audioFactory({
      getContext: () => soundscape?.getAudioContext?.(),
      getElapsed: () => elapsed,
      enabled: effectsEnabled,
    });
    const started = audio.start();
    started?.catch?.(() => {});
  } catch {}
  soundscape?.setThemeIntroDucked?.(true);
  skip.focus({ preventScroll: true });
  raf = requestAnimationFrame(draw);
  return result;
}

// Shared lifecycle gives each building one visible-time clock with its own duration.
export const playThemeIntro = playHotpotIntro;
