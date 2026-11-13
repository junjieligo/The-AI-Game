import { createThemeIntroAudioFactory } from "./theme-intro-audio.js?v=1.28";
export const TEA_AUDIO_DURATION = 5;
export const createTeaIntroAudio = createThemeIntroAudioFactory(
  new URL("./audio/tea-introduction.wav?v=1.28", import.meta.url),
  { duration: TEA_AUDIO_DURATION, volume: .50 },
);
