import { playThemeIntro } from "./hotpot-intro.js?v=1.32";
import { createLanternIntroScene, createLanternIntroArtwork, getLanternIntroLayout } from "./lantern-intro-scene.js?v=1.37";
import { createLanternIntroAudio } from "./lantern-intro-audio.js?v=1.37";

const lanternFallback = createLanternIntroArtwork(getLanternIntroLayout(), "lantern-fallback", 4.2)
  .replace('aria-hidden="true"', 'role="img" aria-label="Glowing lanterns beside the river at night, with 灯笼, dēng long and lantern"');

export function playLanternIntro(options = {}) {
  return playThemeIntro({
    ...options,
    theme: "lantern",
    duration: 5,
    sceneFactory: createLanternIntroScene,
    audioFactory: createLanternIntroAudio,
    dialogLabel: "Riverside lantern introduction animation",
    sceneDescription: "Daylight gently fades through dusk into night beside the river. Red lanterns light up one by one, with warm reflections on the water, a moon and stars. 灯笼 slowly appears with dēng long and lantern.",
    soundLabel: "riverside",
    fallbackMarkup: lanternFallback,
  });
}
