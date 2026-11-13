import { playThemeIntro } from "./hotpot-intro.js?v=1.32";
import { createMarketIntroScene, createMarketIntroArtwork, getMarketIntroLayout } from "./market-intro-scene.js?v=1.30";
import { createMarketIntroAudio } from "./market-intro-audio.js?v=1.30";

const marketFallback = createMarketIntroArtwork(getMarketIntroLayout(), 'market-fallback', 4.3)
  .replace('aria-hidden="true"', 'role="img" aria-label="A yuan moneybag, three coins and distinct Chinese banknotes"');

export function playMarketIntro(options = {}) {
  return playThemeIntro({
    ...options,
    theme: "market",
    sceneFactory: createMarketIntroScene,
    audioFactory: createMarketIntroAudio,
    dialogLabel: "Market yuan introduction animation",
    sceneDescription: "At a riverside market, a yuan moneybag tips and three coins gently fall beside distinct Chinese banknotes as Yu watches.",
    soundLabel: "market",
    fallbackMarkup: marketFallback,
  });
}
