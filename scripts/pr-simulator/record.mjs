import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pullRequest, scenario } from "./scenario.mjs";

const [side, archive, destination] = process.argv.slice(2);
const plan = scenario(pullRequest().body);
const app = "com.ramimaalouf.openmulticam";
const video = join(process.env.RUNNER_TEMP, side + ".mp4");
const prefix = resolve(destination, side);
function run(program, ...args) {
  return execFileSync(program, args.map(String), { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 16 * 1024 * 1024 });
}
const eas = (...args) => run("eas", ...args);
const drive = (...args) => eas("simulator:exec", "bunx", "agent-device@latest", ...args);
const control = (...args) => eas("simulator:control", ...args, "--keep-alive");

function currentNodes() {
  const tree = JSON.parse(drive("snapshot", "-i", "--json"));
  return Object.values(tree.data?.nodes ?? tree.nodes ?? []);
}

async function find(label) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const matches = currentNodes().filter(node => node.label === label && node.hittable !== false && node.rect);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) throw new Error("ambiguous control: " + label);
    await delay(700);
  }
  throw new Error("missing control: " + label);
}

let id;
let stillSeconds;
try {
  eas("simulator:start", "-p", "ios", "--device", "iPhone 17 Pro", "--type", "agent-device",
    "--name", "PR " + pullRequest().number + " " + side, "--max-duration-minutes", "15", "--non-interactive");
  id = readFileSync(".env.eas-simulator", "utf8").match(/^EAS_SIMULATOR_SESSION_ID=['"]?([\w-]+)/m)?.[1];
  if (!id) throw new Error("missing simulator session id");
  drive("install", app, archive, "--platform", "ios");
  if (plan.camera) {
    control("permissions.set", "grant", "camera", app);
    control("permissions.set", "grant", "microphone", app);
  }
  drive("open", app, "--platform", "ios");
  if (plan.camera) {
    control("app.stop", app);
    control("camera.inject", app, "off", "placeholder");
    let ready = false;
    for (let attempt = 0; attempt < 20 && !ready; attempt++) {
      const nodes = currentNodes();
      ready = nodes.some(node => node.label?.includes("Native state previewing"));
      const onboarding = nodes.find(node => node.label === "Continue" && node.hittable);
      if (onboarding) drive("press", "@" + onboarding.ref);
      if (!ready) await delay(750);
    }
    if (!ready) throw new Error("simulated camera did not reach previewing");
  }

  // resolve each control again after navigation changes the accessibility tree.
  drive("record", "start", video, "--scope", "device", "--hide-touches");
  const started = Date.now();
  for (const step of plan.steps) {
    const { x, y, width, height } = (await find(step.label)).rect;
    const center = Math.round(x + width / 2);
    const touchY = Math.round(y + height * (step.startY ?? 0.5));
    const start = Date.now();
    if (step.action === "pan") drive("gesture", "pan", center, touchY, step.dx, step.dy, step.durationMs);
    else drive("press", center, touchY);
    stillSeconds ??= ((start + Date.now()) / 2 - started) / 1000;
  }
  drive("record", "stop");
} finally {
  if (!id && existsSync(".env.eas-simulator")) id = readFileSync(".env.eas-simulator", "utf8").match(/^EAS_SIMULATOR_SESSION_ID=['"]?([\w-]+)/m)?.[1];
  if (id) eas("simulator:stop", "--id", id, "--non-interactive");
}

let recording;
for (let attempt = 0; attempt < 20 && !recording; attempt++) {
  const { artifacts } = JSON.parse(eas("simulator:get", "--id", id, "--json"));
  recording = artifacts?.find(item => item.filename === side + ".mp4")?.downloadUrl;
  if (!recording) await delay(3000);
}
if (!recording || new URL(recording).origin !== "https://expo.dev") throw new Error("missing recording artifact");
if (!existsSync(video)) run("curl", "-fsSL", "--retry", "2", recording, "-o", video);
const duration = Number(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video));
if (!(duration > 0)) throw new Error("empty recording");
const still = Math.min(stillSeconds, Math.max(0, duration - 0.15));
run("scripts/pr-simulator-media.sh", video, Math.max(0, still - 3), still, prefix);
writeFileSync(prefix + ".json", JSON.stringify({ recording, session: id }));
