import { iconMarkup, setIcon } from "./ui-icons.js?v=1.12";
import { createArrivalScene } from "./arrival-scene.js?v=1.11";
import { ARRIVAL_DURATION, ARRIVAL_TIME_SCALE, ARRIVAL_STILL_TIME, getArrivalPhase } from "./arrival-timeline.js?v=1.10";

let activeArrival = null;

// A self-contained presentation: never changes the player's progress or world clock.
// The same controller serves a new traveller and the journal's replay button.
export function playArrival({ profile, soundscape, onMusicChange = () => {} } = {}) {
  if (activeArrival) return activeArrival;
  let resolveArrival;
  activeArrival = new Promise((resolve) => { resolveArrival = resolve; });
  const result = activeArrival;
  const app = document.getElementById("app");
  const previousInert = app?.inert;
  const focusBefore = document.activeElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const overlay = document.createElement("section");
  overlay.className = "arrival-screen";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "arrival-title");
  overlay.dataset.phase = "flight";
  overlay.innerHTML = `
    <canvas class="arrival-canvas" aria-label="A flight from the UK through sunset, followed by Chongqing’s Liziba monorail passing through a building."></canvas>
    <div class="arrival-vignette" aria-hidden="true"></div>
    <div class="arrival-top"><span class="arrival-brand"><span>东</span> TRIP TO THE EAST</span>
      <div class="arrival-actions"><button class="arrival-music" aria-label="Turn arrival music off" type="button">${iconMarkup("music")}</button><button class="arrival-skip" type="button">Skip <span aria-hidden="true">${iconMarkup("arrow-up-right")}</span></button></div>
    </div>
    <div class="arrival-caption"><div class="arrival-route">UK <span aria-hidden="true">${iconMarkup("arrow-right")}</span> CHONGQING</div>
      <h1 id="arrival-title" lang="zh">下一站，重庆</h1><p class="arrival-subtitle">Next stop, Chongqing</p>
    </div>
    <div class="arrival-bottom"><span class="arrival-place">云端之旅 · ABOVE THE CLOUDS</span><span class="arrival-duration" aria-hidden="true">01 / 02</span></div>
    <div class="arrival-progress" aria-hidden="true"><span></span></div>`;
  document.body.append(overlay);
  document.body.classList.add("arriving");
  if (app) app.inert = true;
  const skip = overlay.querySelector(".arrival-skip");
  const musicButton = overlay.querySelector(".arrival-music");
  const title = overlay.querySelector("h1");
  const subtitle = overlay.querySelector(".arrival-subtitle");
  const place = overlay.querySelector(".arrival-place");
  const progress = overlay.querySelector(".arrival-progress span");
  let scene, raf, finished = false, elapsed = 0, lastFrame = null, lastPhase;

  function updateMusicButton() {
    const enabled = soundscape?.getState().enabled !== false;
    setIcon(musicButton, enabled ? "music" : "music-off");
    musicButton.setAttribute("aria-pressed", String(enabled));
    musicButton.setAttribute("aria-label", enabled ? "Turn arrival music off" : "Turn arrival music on");
  }
  musicButton.onclick = () => {
    const enabled = !soundscape?.getState().enabled;
    soundscape?.setEnabled(enabled);
    onMusicChange(enabled);
    updateMusicButton();
  };
  updateMusicButton();

  function finish(reason = "complete") {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("resize", resize);
    scene?.destroy();
    overlay.remove();
    document.body.classList.remove("arriving");
    if (app) app.inert = previousInert;
    soundscape?.finishArrival();
    activeArrival = null;
    if (focusBefore?.isConnected && !focusBefore.closest("[hidden]")) focusBefore.focus({ preventScroll: true });
    resolveArrival({ reason });
  }
  function onKey(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish("skip");
    } else if (event.key === "Tab") {
      event.preventDefault();
      (document.activeElement === skip ? musicButton : skip).focus();
    } else if (/^(Arrow|[wasd]$)/i.test(event.key)) {
      // Keep the traveller still while the arrival is in front of the game.
      event.stopImmediatePropagation();
    }
  }
  function onPageHide() { finish("pagehide"); }
  function resize() { scene?.resize(); }
  function visibility() {
    // Match the soundtrack's pause: hidden time never skips the train reveal.
    lastFrame = null;
  }
  function draw(time) {
    if (finished) return;
    if (!document.hidden) {
      if (lastFrame !== null) elapsed += Math.max(0, (time - lastFrame) / 1000);
      lastFrame = time;
      const phase = reduced ? "arrival" : getArrivalPhase(elapsed);
      overlay.dataset.phase = phase;
      overlay.dataset.night = String(reduced || elapsed > 2.0 * ARRIVAL_TIME_SCALE);
      overlay.style.opacity = reduced ? "1" : String(Math.min(1, Math.max(0, (ARRIVAL_DURATION - elapsed) / (0.35 * ARRIVAL_TIME_SCALE))));
      if (phase !== lastPhase) {
        const city = phase !== "flight";
        title.textContent = city ? "山城，你好！" : "下一站，重庆";
        subtitle.textContent = city ? "Hello, Chongqing!" : "Next stop, Chongqing";
        place.textContent = city ? "李子坝 · LIZIBA" : "云端之旅 · ABOVE THE CLOUDS";
        overlay.querySelector(".arrival-duration").textContent = city ? "02 / 02" : "01 / 02";
        lastPhase = phase;
      }
      scene?.render(reduced ? ARRIVAL_STILL_TIME : Math.min(elapsed, ARRIVAL_DURATION));
      progress.style.transform = `scaleX(${Math.min(elapsed / ARRIVAL_DURATION, 1)})`;
      if (elapsed >= ARRIVAL_DURATION) { finish(); return; }
    }
    raf = requestAnimationFrame(draw);
  }
  skip.onclick = () => finish("skip");
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("resize", resize);
  try {
    scene = createArrivalScene(overlay.querySelector("canvas"), { profile });
    scene.render(reduced ? ARRIVAL_STILL_TIME : 0);
  } catch (error) {
    console.warn("Arrival uses the illustrated fallback:", error);
    overlay.classList.add("arrival-fallback");
    overlay.querySelector("canvas").hidden = true;
    const postcard = document.createElement("div");
    postcard.className = "arrival-postcard";
    postcard.setAttribute("aria-hidden", "true");
    postcard.innerHTML = `<svg viewBox="0 0 600 300"><path fill="#9db5a6" d="M0 250 100 90 180 170 310 25 480 235 550 110 600 250Z"/><path fill="#b4d0c5" d="M0 260Q160 225 310 265T600 250V300H0Z"/><path fill="#d5b797" d="M210 95H350V258H210Z"/><path fill="#f6eaca" d="M220 105H340V250H220Z"/><path stroke="#9e795c" stroke-width="10" d="M240 105V250M270 105V250M300 105V250M330 105V250M220 130H340M220 160H340M220 190H340"/><path stroke="#e3d2ae" stroke-width="13" d="M75 245H520"/><rect x="98" y="211" width="115" height="25" rx="8" fill="#5d9489"/><path stroke="#e8f0db" stroke-width="10" stroke-dasharray="16 7" d="M110 220H200"/><path fill="#fcf8e9" d="m90 55 105 12 40-25 17 5-24 28 27 9-5 8-30-3-25 30-16-4 15-29-76-14-16 6-8-5 11-10Z"/></svg>`;
    overlay.prepend(postcard);
  }
  // This call stays within the original Start/Replay click gesture.
  soundscape?.startArrival({ getElapsed: () => elapsed });
  skip.focus({ preventScroll: true });
  raf = requestAnimationFrame(draw);
  return result;
}
