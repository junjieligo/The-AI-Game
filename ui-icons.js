// Decorative UI artwork uses paths, never font glyphs. This prevents iPadOS
// from substituting colour emoji and keeps the existing CSS palette in control.
const drawings = {
  'arrow-up-right': '<path d="M5 19 19 5M7 5h12v12"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
  'arrow-up': '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  move: '<path d="M3 12h18M7 8l-4 4 4 4m10-8 4 4-4 4"/>',
  play: '<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
  hotpot: '<path d="M5 15c-2 1-3 2-3 3 0 3 20 3 20 0 0-1-1-2-3-3M7 13c4-4-3-5 1-10m4 10c4-4-3-5 1-10m4 10c4-4-3-5 1-10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>',
  music: '<path d="M9 17V5l11-2v12M9 9l11-2"/><ellipse cx="6" cy="17" rx="3" ry="2"/><ellipse cx="17" cy="15" rx="3" ry="2"/>',
  'music-off': '<path d="M9 17V5l11-2v12M9 9l11-2M3 3l18 18"/><ellipse cx="6" cy="17" rx="3" ry="2"/><ellipse cx="17" cy="15" rx="3" ry="2"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4ZM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  'sound-off': '<path d="M4 9h4l5-4v14l-5-4H4ZM17 9l5 6m0-6-5 6"/>',
  sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6h5"/>',
  home: '<path d="m3 11 9-8 9 8M6 9v12h12V9"/>',
  'rotate-left': '<path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/>',
  'rotate-right': '<path d="M20 10a8 8 0 1 0-2 8m0-14v6h-6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};

export function iconMarkup(name) {
  if (!Object.hasOwn(drawings, name)) throw new Error(`Unknown UI icon: ${name}`);
  return `<svg class="ui-icon" data-icon="${name}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawings[name]}</svg>`;
}

export function setIcon(element, name) {
  // In particular, the quarter-second game clock should not redraw its icon.
  if (element.dataset.renderedIcon === name) return;
  element.innerHTML = iconMarkup(name);
  element.dataset.renderedIcon = name;
}

export function mountUiIcons(root = document) {
  root.querySelectorAll('[data-ui-icon]').forEach(element => setIcon(element, element.dataset.uiIcon));
}
