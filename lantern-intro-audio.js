import { createThemeIntroAudioFactory } from "./theme-intro-audio.js?v=1.28";

export const LANTERN_AUDIO_DURATION = 5;
export const createLanternIntroAudio = createThemeIntroAudioFactory(
  new URL("./audio/lantern-introduction.wav?v=1.37", import.meta.url),
  { duration: LANTERN_AUDIO_DURATION, volume: .50 }
);
