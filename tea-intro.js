import { playThemeIntro } from "./hotpot-intro.js?v=1.32";
import { createTeaIntroScene } from "./tea-intro-scene.js?v=1.28";
import { createTeaIntroAudio } from "./tea-intro-audio.js?v=1.28";

const teaFallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420" role="img" aria-label="A warm cup of tea on a wooden tray">
  <rect width="640" height="420" rx="24" fill="#edf0dd"/>
  <ellipse cx="320" cy="324" rx="260" ry="50" fill="#c69d69"/>
  <ellipse cx="320" cy="308" rx="145" ry="30" fill="#faf2d9" stroke="#91a78e" stroke-width="5"/>
  <path d="M430 226Q505 190 490 250Q478 280 437 267M190 220Q205 340 320 325Q425 330 450 220Z" fill="#eef0dc" stroke="#7d9c89" stroke-width="7"/>
  <ellipse cx="320" cy="220" rx="129" ry="31" fill="#bd9b59" stroke="#7d9c89" stroke-width="6"/>
  <path d="M293 180Q273 160 293 143M343 176Q363 155 343 140" fill="none" stroke="#fffdf2" stroke-width="6" stroke-linecap="round"/>
  <g text-anchor="middle" fill="#35574c"><text x="320" y="48" font-family="sans-serif" font-size="22">chá</text><text x="320" y="99" font-family="sans-serif" font-size="46">茶</text><text x="320" y="126" font-family="sans-serif" font-size="20">tea</text></g>
</svg>`;

export function playTeaIntro(options = {}) {
  return playThemeIntro({
    ...options, theme: "tea", sceneFactory: createTeaIntroScene,
    audioFactory: createTeaIntroAudio, dialogLabel: "Tea brewing animation",
    sceneDescription: "Yu watches tea leaves infuse, then a hand gently pours golden tea from a jade teapot into a cup. Soft steam rises.",
    soundLabel: "tea", fallbackMarkup: teaFallback,
  });
}
