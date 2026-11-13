import { createThemeIntroAudioFactory } from "./theme-intro-audio.js?v=1.28";

export const WAYFINDING_AUDIO_DURATION = 8;
export const createWayfindingIntroAudio = createThemeIntroAudioFactory(
  new URL("./audio/wayfinding-introduction.wav?v=1.33", import.meta.url),
  { duration: WAYFINDING_AUDIO_DURATION, volume: .50 }
);
