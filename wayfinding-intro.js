import { playThemeIntro } from "./hotpot-intro.js?v=1.32";
import { createWayfindingIntroScene, createWayfindingIntroArtwork, getWayfindingIntroLayout } from "./wayfinding-intro-scene.js?v=1.36";
import { createWayfindingIntroAudio } from "./wayfinding-intro-audio.js?v=1.33";

const wayfindingFallback = createWayfindingIntroArtwork(getWayfindingIntroLayout(), "wayfinding-fallback", 7.3)
  .replace('aria-hidden="true"', 'role="img" aria-label="An empty green-roofed wooden boat on the foreground river, with where in the centre, left on the left and right on the right"');

export function playWayfindingIntro(options = {}) {
  return playThemeIntro({
    ...options,
    theme: "wayfinding",
    duration: 8,
    sceneFactory: createWayfindingIntroScene,
    audioFactory: createWayfindingIntroAudio,
    dialogLabel: "River left and right introduction animation",
    sceneDescription: "An empty covered wooden boat floats on the lower foreground river. It turns and glides left, then turns and glides right, with smooth overlapping waves along a curved riverbank. 哪里？ appears in the centre, then 左 on the left and 右 on the right, each with pinyin and English.",
    soundLabel: "wayfinding",
    fallbackMarkup: wayfindingFallback,
  });
}
