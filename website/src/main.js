// the page's own script: reveal the words, run the layout switch, then load the 3d frames once
// the page has painted.

requestAnimationFrame(() => document.body.classList.add("ready"));
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

// the bar turns to frosted glass once the page has moved
const bar = document.querySelector(".bar");
const onScroll = () => bar?.classList.toggle("scrolled", scrollY > 24);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// the route's line ends at its last dot (the stacked layout on a phone)
const route = document.querySelector(".route");
const lastDot = route?.querySelector("li:last-child .dot");
function measureRoute() {
  if (!route || !lastDot) return;
  const y = lastDot.getBoundingClientRect().top - route.getBoundingClientRect().top + lastDot.offsetHeight / 2;
  route.style.setProperty("--last-dot", `${y}px`);
}
new ResizeObserver(measureRoute).observe(route ?? document.body);

// sections fade in as they come into view
const seen = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("seen");
      seen.unobserve(e.target);
    }
  },
  { rootMargin: "0px 0px -12% 0px" },
);
for (const el of document.querySelectorAll(".observe")) seen.observe(el);

// the three layouts the app records, in the app's order, and what each one gives you
const CAPTIONS = {
  pip: "One video. The second camera sits in a corner.",
  split: "One video. Each camera fills half.",
  two: "Two separate files, recorded in sync.",
};
const ORDER = ["pip", "split", "two"];
const HOLD = 4200;
const HOLD_AFTER_CHOICE = 9000;

const hero = document.querySelector(".hero");
const modes = document.querySelector(".modes");
const buttons = [...(modes?.querySelectorAll("button") ?? [])];
const caption = document.querySelector(".caption");
let scene = null;
let current = null;
let timer = 0;

function show(mode, hold) {
  clearTimeout(timer);
  if (mode !== current) {
    current = mode;
    scene?.setMode(mode);
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    if (caption) {
      caption.classList.add("swap");
      setTimeout(() => {
        caption.textContent = CAPTIONS[mode];
        caption.classList.remove("swap");
      }, 180);
    }
  }
  // the thin line under the active layout fills while it holds, then the next one comes
  if (still || !scene) return;
  modes.style.setProperty("--hold", `${hold}ms`);
  modes.classList.remove("timed");
  void modes.offsetWidth;
  modes.classList.add("timed");
  timer = setTimeout(() => show(ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length], HOLD), hold);
}

for (const b of buttons) b.addEventListener("click", () => show(b.dataset.mode, HOLD_AFTER_CHOICE));

// the 3d frames are the heaviest part, so they load after the first paint and never block the words
const canvas = document.getElementById("frames");
const slot = document.querySelector(".frame-slot");

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function fallBack() {
  hero?.classList.add("stage-off");
}

function start() {
  if (!canvas || !slot || !webglAvailable()) return fallBack();
  import("./scene.js")
    .then(({ startScene }) => startScene(canvas, slot))
    .then((controller) => {
      scene = controller;
      canvas.classList.add("live");
      // the frames arrive as the icon draws them: two files, one behind the other
      show("two", still ? 0 : 3200);
    })
    .catch(fallBack);
}

const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 120));
if (document.readyState === "complete") idle(start);
else addEventListener("load", () => idle(start), { once: true });
