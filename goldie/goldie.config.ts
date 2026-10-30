import { resolve } from "node:path";

import type { GoldieConfig } from "goldie";

// store screenshots and the app preview, captured on the simulator with the
// simulated cameras. the steps around a capture:
//   1. build the release simulator app:
//      xcodebuild -workspace ios/OpenMulticam.xcworkspace -scheme OpenMulticam \
//        -configuration Release -sdk iphonesimulator -derivedDataPath ios/build build
//   2. point an "iPhone 17 Pro Max" simulator at two feeds:
//      bun scripts/simulator-cameras.mjs set --back <video> --front <video> --device <udid>
//      every flow launches the app again and the feeds play from their start,
//      so the screenshots show the first seconds of each video and the preview
//      the first 30. --back-start and --front-start skip to a better moment,
//      and --back-end and --front-end keep the loop inside it.
//   3. after `goldie capture`: goldie 0.5.0 pins the status bar again every
//      200 ms while it records the preview, and iOS animates the first 1.5 s
//      of each clip (a 9:37 clock, icons that jump) and once showed the real
//      clock. each preview flow starts idle, so trim that part of
//      out/raw/<device>/preview-*.mp4, and any later glitch, before
//      `goldie preview`.
// goldie picks the newest iOS runtime that has an "iPhone 17 Pro Max". an expo
// sdk 57 app built with the iOS 27 sdk stops at launch on iOS 27, so that
// simulator has to run iOS 26 until the app moves to the scene life cycle.
const APP_ROOT = resolve(import.meta.dirname, "..");

// the hero carries a large sticker; every other tile repeats it as a badge
const FREE_BADGE = {
  kind: "badge",
  text: { "en-US": "Free & open source" },
  position: "top-right",
  background: "#4FC6D1",
  color: "#062326",
} as const;

const config: GoldieConfig = {
  appRoot: APP_ROOT,
  appPath: `${APP_ROOT}/ios/build/Build/Products/Release-iphonesimulator/OpenMulticam.app`,
  bundleId: "com.ramimaalouf.openmulticam",

  devices: ["iphone-6.9"],
  locales: ["en-US"],
  appearance: "dark",

  frame: { variant: "17-pro-orange" },

  theme: {
    background:
      "linear-gradient(165deg, #0E4A50 0%, #0A2427 46%, #080D0F 100%)",
    headlineColor: "#FFFFFF",
    subheadColor: "#9ED8DD",
    fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif',
    copyHeightRatio: 0.24,
    deviceWidthRatio: 0.84,
    template: "editorial",
    layout: "classic",
  },

  store: {
    name: "OpenMulticam",
    subtitle: { "en-US": "Record two cameras together" },
    developer: "Rami Maalouf",
    category: "Photo & Video",
    rating: 5,
    ratingCount: "New",
    ageRating: "4+",
    price: "Free",
    description: {
      "en-US":
        "Capture two perspectives with one iPhone. OpenMulticam records from two supported cameras at the same time, so you can capture a conversation, a demonstration, or both sides of a moment.\n\nRecord separate camera files, picture-in-picture, or a split view. Review takes in the local library, rename them, and export to Photos or share them.\n\nNo account, advertising, or analytics. Every camera feature is free.",
    },
  },

  scenes: [
    {
      kind: "screenshot",
      id: "pip",
      flow: "store-01-pip",
      headline: { "en-US": "Film both sides at once" },
      subhead: { "en-US": "Like iPhone 17 Dual Capture, on older iPhones too." },
      // the panorama is two tiles wide, so x past 1 lands on its right tile
      decorations: [
        {
          kind: "image",
          src: "art/free-open-source.png",
          x: 1.06,
          y: 0.035,
          width: 0.88,
          rotate: -3,
        },
      ],
    },
    {
      kind: "screenshot",
      id: "recording",
      flow: "store-02-recording",
      decorations: [FREE_BADGE],
      headline: { "en-US": "One take. Two angles." },
      subhead: { "en-US": "Picture in picture, saved as a single video." },
    },
    {
      kind: "screenshot",
      id: "cameras",
      flow: "store-03-cameras",
      decorations: [FREE_BADGE],
      headline: { "en-US": "Pair any two cameras" },
      subhead: {
        "en-US":
          "0.5×, 1×, 3× or selfie.\nPicture in picture, split, or two files.",
      },
    },
    {
      kind: "screenshot",
      id: "take",
      flow: "store-04-take",
      decorations: [FREE_BADGE],
      headline: { "en-US": "Share it the moment you stop" },
      subhead: { "en-US": "Save to Photos or send it anywhere." },
    },
    {
      kind: "screenshot",
      id: "library",
      flow: "store-05-library",
      decorations: [FREE_BADGE],
      headline: { "en-US": "All on your iPhone.\nNo login." },
      subhead: {
        "en-US": "Free and open source.\nNo account, no cloud, no ads.",
      },
    },
    {
      kind: "preview",
      id: "preview",
      segments: [
        { id: "open", flow: "store-preview-01-open" },
        { id: "modes", flow: "store-preview-02-modes" },
        { id: "record", flow: "store-preview-03-record" },
        { id: "take", flow: "store-preview-04-take", holdSeconds: 1 },
      ],
    },
  ],
};

export default config;
