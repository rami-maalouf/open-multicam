# Native end-to-end coverage

The simulator suite uses [tester-army/e2e](https://github.com/tester-army/e2e), pinned to `e2e` 0.17.0 and `@e2e-dev/mobile` 0.9.2. Tests drive the installed iOS app through XCTest accessibility; they do not use Jest, mocked native modules, or model calls. Node 26.5.0, Bun, Xcode, an iOS simulator runtime, and ffmpeg are required.

## Run

Create a dedicated simulator named `OpenMulticam-TesterArmy-<suffix>` and set `OPENMULTICAM_SIMULATOR_UDID` to its UDID. Never select a personal simulator. Fixtures refuse writes on any other simulator name, and only remove their two explicitly owned UUID directories. Tests retain all other app data and Photos data.

```sh
bun install --frozen-lockfile
bunx expo prebuild --platform ios --no-install
(cd ios && pod install)
bun run build:e2e:sim
bun run typecheck:e2e
bun run test:e2e:list
bun run test:e2e:sim
```

Set `OPENMULTICAM_E2E_APP_PATH` to use another simulator `.app` build. The suite installs that build without uninstalling the app. Release builds bundle JavaScript, avoiding stale Metro sessions. Tests use actual Swift library storage plus a generated playable video for single/discrete/PiP/split manifests. These fixtures verify downstream library and playback behavior, not capture or physical camera output. Telemetry is disabled in the scripts. Evidence is written to `.artifacts/e2e/report.json`, `junit.xml`, `summary.md`, and per-attempt screenshots. Preserve separate `--output` directories for red and green regression evidence.

The former `e2e/simulator` runner only checked source text with Jest. It has been removed, and `test:e2e:sim` now runs the actual native suite. `test:e2e:device` requires a signed isolated hardware build and explicit safe-framing approval. Its prepared acceptance tests have not been executed on physical hardware.

## Coverage matrix

| Flow | Test or evidence | Status and scope |
| --- | --- | --- |
| Simulator capture boundary and disabled record | navigation: unsupported camera | passed in the owned iOS 26.5 simulator |
| Empty library, return to capture | navigation: capture navigation | passed in the owned iOS 26.5 simulator |
| Settings, policy readability | navigation: settings privacy | passed in the owned iOS 26.5 simulator |
| Optional donation explanation, internal policy link | navigation: support | passed: readable content and functional text navigation; missing native link traits recorded separately; no purchase |
| Camera denial and permission-independent library/settings | navigation: camera denial | passed in the owned iOS 26.5 simulator |
| Microphone denial and permission-independent library/settings | navigation: microphone denial | passed in the owned iOS 26.5 simulator |
| Missing recording link | navigation: missing recording | passed in the owned iOS 26.5 simulator |
| Single/discrete/PiP/split library grouping, detail, playable clip controls | library: four modes | passed: rendered frame transitions and pause stability, schema-valid synthetic video, real native storage |
| Rename persistence, cancel delete, confirmed delete | library: rename/delete | passed in the owned iOS 26.5 simulator |
| Share sheet presentation/cancel | system-surfaces: share (prepared, unexecuted) | simulator-feasible; no external send authorized |
| Photos add permission and export | system-surfaces: Photos (prepared, unexecuted) | simulator-feasible with synthetic video and isolated Photos |
| Camera and mic grant prompts, Settings recovery | not yet covered | simulator camera source absent; test permission surfaces separately |
| Camera discovery, compatible pair/style picker, live preview readiness | physical acceptance required | no injected local camera source; paired iPhone requires isolated signed build |
| Real single fallback, discrete/PiP/split recording and finalization | physical acceptance required | fixtures do not verify capture |
| Independent focus/exposure, lens/torch, frame rate | physical acceptance required | hardware capability gates |
| PiP movement/swap/resize, split gesture/layout | physical acceptance required | real camera preview required |
| Audio route/meter, thermal/storage health, interruption/recovery | physical acceptance required | camera/audio and hardware stress required |
| Light/dark, larger text, reduce motion, contrast | not yet covered | simulator-feasible; dev foundation route excluded in Release |
| Purchase/restore/approval/refund | existing native StoreKit test harness | not part of mobile E2E; iOS 26.1 runtime required due documented 26.5 regression; no live purchase |
| Production telemetry off, diagnostics | existing Jest privacy checks | not native E2E proof |

## Hardware acceptance prerequisites

Use a distinct developer bundle and URL scheme so installing the harness cannot replace the personal production app. Obtain a signing team/provision for the paired device, enable Developer Mode, and unlock/trust it. Record only user-directed safe framing. Create and delete only new harness takes; avoid personal app data, live donations, external messages, and Photos export until explicitly included in the hardware run. Keep hardware results separate from simulator fixtures.

The combined baseline report is `.artifacts/e2e-foundation-complete/report.json` (11/12 passed). Its rename test initially swiped over AVKit and missed the lower actions; the corrected gesture passed in `.artifacts/e2e-rename/report.json`. A complete repeat and independent review are required before the stack is ready. The source-coverage repair layer raises the existing 90% branch threshold result from88.06% to90.03% with170 passing behavior tests across18 suites. Repository boundary, lint and TypeScript pass. Full validate still reports SDK57 patch dependency mismatches in Expo doctor; that dependency repair is a separate layer.

## Isolated physical acceptance commands

`bun run prepare:e2e:device` prepares an independent generated native project under `.artifacts/hardware-source`; its verified scheme is `OpenMulticamE2E`, bundle is `com.ramimaalouf.openmulticam.e2e`, and URL scheme is `openmulticam-e2e`. The configured Apple team is `3V2UU7RRK9`. Preparation does not install or record anything. The developer signing identity, matching device provisioning and Developer Mode must be available; the host must have sufficient free build space.

```sh
OPENMULTICAM_E2E_DEVICE_UDID=<paired-device-udid> bun run build:e2e:device
```

This command regenerates the isolated project, installs pods and builds/signs the isolated app without installing it. Build and signing outcomes are unverified until this command succeeds. Keep the successful simulator app and evidence. After a user confirms the phone is unlocked and framed safely, use its uniquely identified paired device name:

```sh
OPENMULTICAM_HARDWARE_RECORDING_APPROVED=1 OPENMULTICAM_E2E_DEVICE_NAME='<paired device name>' bun run test:e2e:device --video off
```

The prepared hardware suite first requires an empty isolated library, exercises preview and four supported capture formats, stops/finalizes each three-second take, and deletes only its newly created take. It performs no Photos export or external sharing. The permission/control accessibility regressions must pass before this acceptance suite can be considered ready. Physical capture, focus/exposure, PiP gestures, audio metering and interruption recovery remain unverified gates, regardless of simulator fixture results.
