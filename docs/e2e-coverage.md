# Native end-to-end coverage

This layer replaces source-text-only simulator checks with tester-army/e2e0.17.0, @e2e-dev/mobile0.9.2 and native XCTest. Use Node26.5.0, Bun1.3.14, Xcode, an installed iOS simulator runtime and ffmpeg.

## Run

Create a new owned simulator through the receipt-writing script. Config, installation, fixture, permission and Photos access refuse devices without matching creation receipts. A matching name alone is insufficient.

```sh
bun install --frozen-lockfile
export OPENMULTICAM_SIMULATOR_UDID="$(bun scripts/create-e2e-simulator.ts)"
bunx expo prebuild --platform ios --no-install
(cd ios && pod install)
bun run build:e2e:sim
bun run typecheck:e2e
bun run test:e2e:sim --repeat-each 2 --video off
```

The app bundle identifier, source digest and bundled JavaScript digest are checked before installation. Release builds bundle their JavaScript. Synthetic1080x1920 videos and manifests are validated against the production schema before injection. Cleanup removes only two owned UUID directories. Never clear personal app data or Photos storage.

## Foundation scope

The17native tests cover unsupported camera/disabled record, empty library/camera return, Settings/privacy/support navigation, separate camera and microphone denial with permission-independent navigation, missing takes, single/discrete/PiP/split grouping and detail, actual playback/pause and distinct front-track rendering, rename persistence, delete cancellation/confirmation, native share-sheet open/cancel, denied Photos Add access, light/dark landscape and Reduce Motion navigation. Fixtures prove downstream native library and playback behavior, not physical recording. No purchases or external messages occur.

Native link traits, permission-action accessibility, deep-link return, corrupt-take isolation, largest text and successful Photos export are known product regressions addressed by subsequent separate fix layers. Their tests are introduced with their fixes. Physical UI acceptance tests follow the permission-control fix; this foundation does not advertise a runnable physical acceptance suite. The isolated hardware builder compiles com.ramimaalouf.openmulticam.e2e without installing/recording, keeps its receipt outside the signed app and verifies codesign --verify --deep --strict.

Preserve separate red/green output directories. Reports include report.json, junit.xml, summary.md, accessibility trees and screenshots. CI creates a fresh simulator with its own receipt and deletes only that generated device. A complete repeat and independent review are required before publication.
