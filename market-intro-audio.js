import { createThemeIntroAudioFactory } from "./theme-intro-audio.js?v=1.28";

export const MARKET_AUDIO_DURATION = 5;
export const createMarketIntroAudio = createThemeIntroAudioFactory(
  new URL("./audio/market-introduction.wav?v=1.30", import.meta.url),
  { duration: MARKET_AUDIO_DURATION, volume: .50 },
);
