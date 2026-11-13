import { createThemeIntroAudioFactory } from "./theme-intro-audio.js?v=1.28";
export const HOTPOT_AUDIO_DURATION = 5;
export const createHotpotIntroAudio = createThemeIntroAudioFactory(
  new URL("./audio/hotpot-introduction.wav?v=1.27", import.meta.url),
  { duration: HOTPOT_AUDIO_DURATION, volume: .50 },
);
