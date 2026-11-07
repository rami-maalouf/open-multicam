// the openmulticam mark: a cartoon prism in 3d glasses. white light goes in, and two beams come
// out, aqua and record red: two views from one device, as the glasses' two lenses are.
//
//   bun assets/brand/prism.mjs
//
// writes the svg sources next to this file, then renders the pngs the app and the website use
// with macOs `sips`, and flattens the app icons to opaque rgb with ffmpeg.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const assets = join(here, "..");
const website = join(assets, "..", "website", "src", "img");

const INK = "#0c2329";
const AQUA = "#3fe0ec";
const RED = "#ff4a5e";
const GLASS = "#bff6f9";
const GLASS_SHADE = "#7fdde6";

// a polygon with round corners
function rounded(pts, r) {
  let d = "";
  pts.forEach((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const toward = (to) => {
      const l = Math.hypot(to[0] - p[0], to[1] - p[1]);
      return [p[0] + ((to[0] - p[0]) / l) * r, p[1] + ((to[1] - p[1]) / l) * r];
    };
    const s = toward(a);
    const e = toward(b);
    d += `${i ? "L" : "M"}${s[0].toFixed(1)},${s[1].toFixed(1)} Q${p[0]},${p[1]} ${e[0].toFixed(1)},${e[1].toFixed(1)} `;
  });
  return `${d}Z`;
}

// a beam: a dark outline under a coloured core, with a thin shine along its top
function beam([x1, y1], [x2, y2], color) {
  const d = `M${x1},${y1} L${x2},${y2}`;
  return [
    `<path d="${d}" stroke="${INK}" stroke-width="108" stroke-linecap="round"/>`,
    `<path d="${d}" stroke="${color}" stroke-width="64" stroke-linecap="round"/>`,
    `<path d="${d}" transform="translate(0 -11.5)" stroke="#fff" stroke-opacity="0.35" stroke-width="14" stroke-linecap="round"/>`,
  ].join("");
}

function sparkle(x, y, s) {
  const k = s * 0.22;
  return `<path d="M${x},${y - s} Q${x + k},${y - k} ${x + s},${y} Q${x + k},${y + k} ${x},${y + s} Q${x - k},${y + k} ${x - s},${y} Q${x - k},${y - k} ${x},${y - s}Z" fill="#fff"/>`;
}

// the prism, its two facets, its shine, and the face in 3d glasses, in a 1024 square
function prism() {
  const top = [512, 236];
  const left = [268, 690];
  const right = [756, 690];
  const tri = rounded([top, right, left], 70);
  const edge = (a, b) => `<path d="M512,${a} L512,${b}" stroke="${INK}" stroke-width="14" stroke-linecap="round" opacity="0.5"/>`;
  return `
    <clipPath id="tri"><path d="${tri}"/></clipPath>
    <path d="${tri}" fill="${GLASS}"/>
    <g clip-path="url(#tri)">
      <path d="M512,196 L512,740 L800,740 L800,196Z" fill="${GLASS_SHADE}"/>
      <path d="M362,596 L466,402" stroke="#fff" stroke-opacity="0.8" stroke-width="24" stroke-linecap="round"/>
      <circle cx="338" cy="644" r="13" fill="#fff" fill-opacity="0.8"/>
    </g>
    ${edge(288, 486)}${edge(676, 682)}
    <path d="${tri}" fill="none" stroke="${INK}" stroke-width="30" stroke-linejoin="round"/>
    <path d="M396,520 L626,520" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
    <path d="M404,522 L496,522 Q500,586 452,590 Q406,588 404,522Z" fill="${AQUA}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M528,522 L620,522 Q618,588 572,590 Q524,586 528,522Z" fill="${RED}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <path d="M424,534 L446,534" stroke="#fff" stroke-opacity="0.8" stroke-width="10" stroke-linecap="round"/>
    <path d="M548,534 L570,534" stroke="#fff" stroke-opacity="0.8" stroke-width="10" stroke-linecap="round"/>
    <path d="M480,628 Q520,646 552,614" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/>`;
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="none">${body}</svg>\n`;

// the app icon: the art scaled up so the beams run off the edges, on a dark teal studio
const icon = svg(`
  <defs>
    <radialGradient id="bg" cx="0.42" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#17414b"/><stop offset="0.6" stop-color="#0b2329"/><stop offset="1" stop-color="#06151a"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="translate(512 530) scale(1.27) translate(-512 -478)">
    ${beam([-120, 641], [420, 516], "#ffffff")}
    ${beam([600, 500], [1160, 210], AQUA)}
    ${beam([600, 500], [1160, 784], RED)}
    ${prism()}
  </g>
  ${sparkle(214, 236, 40)}${sparkle(300, 150, 20)}${sparkle(800, 880, 26)}`);

// the launch mark: the whole art with round beam ends, on transparency, for light and dark
const splash = svg(`
  <g transform="translate(512 512) scale(0.9) translate(-512 -478)">
    ${beam([92, 592], [420, 516], "#ffffff")}
    ${beam([600, 500], [928, 330], AQUA)}
    ${beam([600, 500], [928, 664], RED)}
    ${prism()}
  </g>`);

// the wide mark for small places, like the website's bar: the launch art, cropped tight
const mark = `<svg xmlns="http://www.w3.org/2000/svg" width="944" height="520" viewBox="38 200 944 520" fill="none">
    ${beam([92, 592], [420, 516], "#ffffff")}
    ${beam([600, 500], [928, 330], AQUA)}
    ${beam([600, 500], [928, 664], RED)}
    ${prism()}
</svg>
`;

writeFileSync(join(here, "icon.svg"), icon);
writeFileSync(join(here, "splash.svg"), splash);

const sips = (...args) => execFileSync("sips", args, { stdio: "ignore" });
const png = (from, to, size) => sips("-s", "format", "png", ...(size ? ["-Z", String(size)] : []), from, "--out", to);

// the app icons must be opaque: flatten the render to rgb
const tmp = join(here, ".render.png");
png(join(here, "icon.svg"), tmp);
for (const name of ["icon.png", "icon-dark.png"]) {
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", tmp, "-pix_fmt", "rgb24", join(assets, name)]);
}
png(join(here, "splash.svg"), join(assets, "splash-icon.png"));

// the website's cuts of the icon
mkdirSync(website, { recursive: true });
writeFileSync(join(website, "mark.svg"), mark);
png(join(assets, "icon.png"), join(website, "icon-180.png"), 180);
png(join(assets, "icon.png"), join(website, "icon-64.png"), 64);
execFileSync("rm", ["-f", tmp]);
console.log("wrote assets/icon.png, assets/icon-dark.png, assets/splash-icon.png and the website icons and mark");
