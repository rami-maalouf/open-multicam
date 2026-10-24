import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// the simulator has no cameras, so a simulator build of the app replays a
// video or an image from the mac as each camera. this script prepares those
// feeds and points a simulator at them through its global defaults, which
// survive the app being reinstalled.

const usage = `usage:
  bun scripts/simulator-cameras.mjs set --back <video|image> --front <video|image>
    [--back-start <seconds>] [--front-start <seconds>] [--device <udid>]
  bun scripts/simulator-cameras.mjs clear [--device <udid>]
  bun scripts/simulator-cameras.mjs status [--device <udid>]

without --device, every booted iOS simulator is used. relaunch the app after set or clear.
a feed plays from its start each time the app launches, so a store screenshot
shows the first seconds of each video: --back-start and --front-start skip to a
better moment.`;

const feedKeys = {
  back: "OpenMulticamSimulatedBackCamera",
  front: "OpenMulticamSimulatedFrontCamera",
};

// big enough that the 1x and 3x lenses can crop into the frame and stay sharp
const feedWidth = 1440;
const feedHeight = 2560;
const imageExtensions = new Set([".heic", ".jpeg", ".jpg", ".png"]);

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const feedDirectory = join(repositoryRoot, ".artifacts", "simulator-cameras");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

function parseArguments(argv) {
  const [command, ...rest] = argv;
  const options = {};

  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];

    if (!flag?.startsWith("--") || value === undefined) {
      throw new Error(usage);
    }

    options[flag.slice(2)] = value;
  }

  return { command, options };
}

function iosSimulators() {
  const { devices } = JSON.parse(
    run("xcrun", ["simctl", "list", "devices", "--json"]),
  );

  return Object.entries(devices)
    .filter(([runtime]) => runtime.includes("iOS"))
    .flatMap(([, list]) => list);
}

function targetDevices(requestedUdid) {
  const simulators = iosSimulators();

  if (requestedUdid) {
    const device = simulators.find((entry) => entry.udid === requestedUdid);

    if (!device) {
      throw new Error(`no iOS simulator has the udid ${requestedUdid}`);
    }

    return [device];
  }

  const booted = simulators.filter((entry) => entry.state === "Booted");

  if (booted.length === 0) {
    throw new Error("no iOS simulator is booted; boot one or pass --device");
  }

  return booted;
}

// a booted simulator caches its defaults in cfprefsd, so it has to be asked
// to change them; a shut down one only has the plist on disk
function globalPreferencesPath(device) {
  return join(
    homedir(),
    "Library/Developer/CoreSimulator/Devices",
    device.udid,
    "data/Library/Preferences/.GlobalPreferences.plist",
  );
}

function writeFeed(device, key, path) {
  if (device.state === "Booted") {
    run("xcrun", ["simctl", "spawn", device.udid, "defaults", "write", "-g", key, path]);
    return;
  }

  const plist = globalPreferencesPath(device);
  if (!existsSync(plist)) {
    mkdirSync(dirname(plist), { recursive: true });
    run("plutil", ["-create", "xml1", plist]);
  }
  run("plutil", ["-replace", key, "-string", path, plist]);
}

function clearFeed(device, key) {
  if (device.state === "Booted") {
    spawnSync("xcrun", ["simctl", "spawn", device.udid, "defaults", "delete", "-g", key]);
    return;
  }

  const plist = globalPreferencesPath(device);
  if (existsSync(plist)) {
    spawnSync("plutil", ["-remove", key, plist]);
  }
}

function readFeed(device, key) {
  const result = device.state === "Booted"
    ? spawnSync(
        "xcrun",
        ["simctl", "spawn", device.udid, "defaults", "read", "-g", key],
        { encoding: "utf8" },
      )
    : spawnSync(
        "plutil",
        ["-extract", key, "raw", "-o", "-", globalPreferencesPath(device)],
        { encoding: "utf8" },
      );

  return result.status === 0 ? result.stdout.trim() : undefined;
}

// every video becomes the same portrait clip: filled to the feed size, 30 fps,
// and silent, so the app decodes them all the same way
function prepareFeed(role, source, start = "0") {
  const input = resolve(source);
  const startSeconds = Number(start);

  if (!Number.isFinite(startSeconds) || startSeconds < 0) {
    throw new Error(`the ${role} start ${start} is not a number of seconds`);
  }

  if (!existsSync(input)) {
    throw new Error(`the ${role} feed ${input} does not exist`);
  }

  mkdirSync(feedDirectory, { recursive: true });
  const extension = extname(input).toLowerCase();

  if (imageExtensions.has(extension)) {
    const output = join(feedDirectory, `${role}${extension}`);
    copyFileSync(input, output);
    return output;
  }

  const output = join(feedDirectory, `${role}.mp4`);
  run("ffmpeg", [
    "-v", "error",
    "-y",
    "-ss", String(startSeconds),
    "-i", input,
    "-vf",
    `scale=${feedWidth}:${feedHeight}:force_original_aspect_ratio=increase,` +
      `crop=${feedWidth}:${feedHeight},fps=30,format=yuv420p`,
    "-an",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-movflags", "+faststart",
    output,
  ]);
  return output;
}

function main() {
  const { command, options } = parseArguments(process.argv.slice(2));

  if (command === "set") {
    if (!options.back || !options.front) {
      throw new Error(usage);
    }

    const feeds = {
      back: prepareFeed("back", options.back, options["back-start"]),
      front: prepareFeed("front", options.front, options["front-start"]),
    };

    for (const device of targetDevices(options.device)) {
      writeFeed(device, feedKeys.back, feeds.back);
      writeFeed(device, feedKeys.front, feeds.front);
      console.log(`${device.name} (${device.udid}): back ${feeds.back}, front ${feeds.front}`);
    }
    return;
  }

  if (command === "clear") {
    for (const device of targetDevices(options.device)) {
      clearFeed(device, feedKeys.back);
      clearFeed(device, feedKeys.front);
      console.log(`${device.name} (${device.udid}): simulated cameras cleared`);
    }
    return;
  }

  if (command === "status") {
    for (const device of targetDevices(options.device)) {
      const back = readFeed(device, feedKeys.back) ?? "not set";
      const front = readFeed(device, feedKeys.front) ?? "not set";
      console.log(`${device.name} (${device.udid}): back ${back}, front ${front}`);
    }
    return;
  }

  throw new Error(usage);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
