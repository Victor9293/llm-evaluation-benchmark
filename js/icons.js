// Simple 16×16 stroke icons drawn for this project.

const PATHS = {
  home: '<path d="M2 7.5 8 2l6 5.5"/><path d="M3.5 6.5V14h9V6.5"/>',
  beaker: '<path d="M6 2h4"/><path d="M6.5 2v4.2L3 13a1 1 0 0 0 .9 1.5h8.2A1 1 0 0 0 13 13L9.5 6.2V2"/><path d="M4.6 10h6.8"/>',
  pencil: '<path d="m10.5 2.5 3 3L6 13H3v-3z"/><path d="m9 4 3 3"/>',
  graph: '<path d="M2 2v12h12"/><path d="M5 11V8M8 11V5M11 11V7"/>',
  book: '<path d="M2 3h4a2 2 0 0 1 2 2v9a1.5 1.5 0 0 0-1.5-1.5H2z"/><path d="M14 3h-4a2 2 0 0 0-2 2v9a1.5 1.5 0 0 1 1.5-1.5H14z"/>',
  info: '<circle cx="8" cy="8" r="6.25"/><path d="M8 7.5V11M8 5h.01"/>',
  check: '<path d="m3 8.5 3 3 7-7"/>',
  x: '<path d="m4 4 8 8M12 4l-8 8"/>',
  checkCircle: '<circle cx="8" cy="8" r="6.25"/><path d="m5.5 8.2 1.8 1.8 3.4-3.6"/>',
  xCircle: '<circle cx="8" cy="8" r="6.25"/><path d="m6 6 4 4M10 6l-4 4"/>',
  dot: '<circle cx="8" cy="8" r="6.25"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3 10.5V4a1 1 0 0 1 1-1h6.5"/>',
  sun: '<circle cx="8" cy="8" r="2.75"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/>',
  moon: '<path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z"/>',
  auto: '<circle cx="8" cy="8" r="6.25"/><path d="M8 1.75v12.5" /><path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor"/>',
  download: '<path d="M8 2v8"/><path d="M4.5 6.5 8 10l3.5-3.5"/><path d="M2.5 13.5h11"/>',
  upload: '<path d="M8 10V2"/><path d="M4.5 5.5 8 2l3.5 3.5"/><path d="M2.5 13.5h11"/>',
  trash: '<path d="M2.5 4h11"/><path d="M6 4V2.5h4V4"/><path d="m4 4 .7 9.5h6.6L12 4"/>',
  search: '<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/>',
  code: '<path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5"/>',
  arrowLeft: '<path d="M13 8H3M7 4 3 8l4 4"/>',
  arrowRight: '<path d="M3 8h10M9 4l4 4-4 4"/>',
  law: '<path d="M8 2v12M4 14h8M3 4h10"/><path d="m3 4-2 5a2 2 0 0 0 4 0zM13 4l-2 5a2 2 0 0 0 4 0z"/>',
  shield: '<path d="M8 1.75 2.75 3.5v4c0 3.2 2.2 5.6 5.25 6.75 3.05-1.15 5.25-3.55 5.25-6.75v-4z"/>',
  globe: '<circle cx="8" cy="8" r="6.25"/><path d="M1.75 8h12.5M8 1.75c1.8 2 2.6 4 2.6 6.25S9.8 12.25 8 14.25C6.2 12.25 5.4 10.25 5.4 8S6.2 3.75 8 1.75z"/>',
  list: '<path d="M5.5 4h8M5.5 8h8M5.5 12h8"/><path d="M2.5 4h.01M2.5 8h.01M2.5 12h.01"/>',
  clock: '<circle cx="8" cy="8" r="6.25"/><path d="M8 4.5V8l2.5 1.5"/>',
  person: '<circle cx="8" cy="5" r="2.75"/><path d="M2.75 14a5.25 5.25 0 0 1 10.5 0"/>',
  tag: '<path d="M2 2h5.5L14 8.5 8.5 14 2 7.5z"/><circle cx="5" cy="5" r=".75"/>',
};

export function iconSvg(name, size = 16) {
  const body = PATHS[name] ?? PATHS.dot;
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Returns an inline <span> containing the icon, safe to append. */
export function icon(name, size = 16) {
  const span = document.createElement('span');
  span.className = 'icon-wrap';
  span.innerHTML = iconSvg(name, size);
  return span;
}
