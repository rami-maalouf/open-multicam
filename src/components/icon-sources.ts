const paths = {
  "camera.fill": '<path d="M3 6h5l2-3h4l2 3h5v15H3z"/><circle cx="12" cy="13" r="4"/>',
  "rectangle.stack": '<path d="M3 8h18v13H3zM5 5h14M7 2h10"/>',
  "photo.on.rectangle": '<path d="M3 6h18v15H3zM6 3h15M3 17l6-6 5 5 3-3 4 4"/><circle cx="16" cy="10" r="1"/>',
  "gearshape": '<path d="m9 3-1 3-3 1 1 3-3 2 3 2-1 3 3 1 1 3h6l1-3 3-1-1-3 3-2-3-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
  "chevron.right": '<path d="m9 5 7 7-7 7"/>',
  "chevron.up.chevron.down": '<path d="m8 8 4-4 4 4M8 16l4 4 4-4"/>',
  "rectangle.inset.filled": '<path d="M2 4h20v16H2zM13 12h7v6h-7z"/>',
  "rectangle.split.1x2": '<path d="M2 3h20v18H2zM2 12h20"/>',
  "rectangle.split.1x2.fill": '<path d="M2 3h20v18H2zM2 12h20"/>',
  "rectangle.split.2x1": '<path d="M2 3h20v18H2zM12 3v18"/>',
  "rectangle.split.2x1.fill": '<path d="M2 3h20v18H2zM12 3v18"/>',
  "video.fill": '<path d="M2 6h13v12H2zM15 10l7-4v12l-7-4"/>',
  "square.on.square": '<path d="M8 8h13v13H8zM4 16H2V2h14v2"/>',
  "xmark.circle.fill": '<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8M8 16l8-8"/>',
  "exclamationmark.triangle": '<path d="m12 3 10 18H2zM12 9v5M12 17v1"/>',
  "pencil": '<path d="m15 3 6 6L8 22H2v-6zM12 6l6 6"/>',
  "square.and.arrow.up": '<path d="M6 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9 10l6-5M9 13l6 5"/>',
  "photo.badge.arrow.down": '<path d="M3 3h14v6M3 3v18h18v-5M3 17l6-6 5 5M18 7v8m-3-3 3 3 3-3"/>',
  "trash": '<path d="M3 5h18M9 5V2h6v3M5 5l1 17h12l1-17M10 9v9M14 9v9"/>',
  "heart.fill": '<path d="M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6z"/>',
  "sun.max.fill": '<circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2"/>',
  "moon.fill": '<path d="M20 16A9 9 0 0 1 8 4a9 9 0 1 0 12 12Z"/>',
  "viewfinder": '<path d="M2 8V2h6M16 2h6v6M22 16v6h-6M8 22H2v-6"/><circle cx="12" cy="12" r="3"/>',
  "pause.fill": '<path d="M7 4v16M17 4v16"/>',
  "play.fill": '<path d="m6 3 15 9-15 9z"/>',
  "circle.fill": '<circle cx="12" cy="12" r="8" fill="black"/>',
} as const satisfies Record<string, string>;

// every icon the app draws must have an android glyph, so a missing one fails typecheck
export type IconName = keyof typeof paths;

export const iconNames = Object.keys(paths) as readonly IconName[];

export function androidIconSource(name: IconName): string {
  const drawing = paths[name];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawing}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
