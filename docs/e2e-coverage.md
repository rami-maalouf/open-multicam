# Native end-to-end coverage

[tester-army/e2e](https://github.com/tester-army/e2e) is pinned to `e2e` 0.17.0 and `@e2e-dev/mobile` 0.9.2. Tests drive installed iOS Release apps through XCTest accessibility without model calls. Node 26.5.0, Bun 1.3.14, Xcode, an installed iOS simulator runtime and ffmpeg are required. The former Jest source-text simulator runner has been removed.

## Repeatable local and CI runs

```sh
bun install --frozen-lockfile
export OPENMULTICAM_SIMULATOR_UDID="$(bun scripts/create-e2e-simulator.ts)"
bunx expo prebuild --platform ios --no-install
(cd ios && pod install)
bun run build:e2e:sim
bun run typecheck:e2e
bun run test:e2e:list
bun run test:e2e:sim --repeat-each 2 --video off
```

The creator records ownership in ignored `.artifacts/simulator-ownership`. Config, app installation, fixtures, permissions and Photos access require a matching creation receipt and exact device metadata. A matching simulator name alone never authorizes access. CI creates its own simulator and always deletes only that generated device. Missing requirements fail explicitly.

`OPENMULTICAM_E2E_APP_PATH` selects another simulator build. Its bundle identifier, runtime source digest and bundled JavaScript digest must match before installation. Release builds bundle JavaScript, preventing stale Metro sessions. Fixtures contain schema-validated manifests and measured 1080x1920 videos with distinct front/back content. Cleanup removes only the explicitly owned fixture UUIDs, retaining unrelated takes and Photos assets. No live purchases or external messages occur.

## Observed coverage

The final complete repeat at source `4743d8e1a43f1a84576ca871fdbf7103e1bc3018` passed **62/62 executions, 31/31 unique tests on both runs**, with no retries, failures or skipped tests. Run `01a10f30-4475-7072-b0a4-7664eff684c7`, `.artifacts/e2e-review-full-repeat/report.json`, took 984.06 seconds on the dedicated iOS 26.5 simulator. Evidence includes screenshots, accessibility observations, video-frame comparisons and native Photos media inspection. Synthetic library footage proves playback/storage behavior; it does not prove physical capture.

| Shipped flow | Executable test | Observed result |
| --- | --- | --- |
| Unsupported simulator camera, disabled Record, empty Library and return | `navigation.e2e.ts` | passed twice |
| Settings, privacy, support explanation and policy navigation | `navigation.e2e.ts`, `link-accessibility.e2e.ts` | passed twice, including native link traits; no donation purchase |
| Camera and microphone denial with independent Library/Settings access | `navigation.e2e.ts` | passed twice for each denial |
| Camera/microphone native grant prompts; accessible Continue/Open Settings | `permission-accessibility.e2e.ts` | passed twice |
| Camera denial, actual Settings foreground, OS grant and app recovery | `permission-accessibility.e2e.ts` | passed twice; cold iOS 26.5 Settings opens its root instead of the app pane, so physical app-pane destination remains unverified |
| Missing take, direct policy/take return and normal history back | `navigation.e2e.ts`, `deep-link-recovery.e2e.ts` | passed twice |
| Single/discrete/PiP/split take grouping and clip detail | `library.e2e.ts` | passed twice through real native storage |
| Video playback/pause and discrete front-track selection | `library.e2e.ts` | passed twice: changing video-only pixel crops, three stable paused samples, distinct front content |
| Rename persistence, cancel delete, confirmed delete | `library.e2e.ts` | passed twice |
| Corrupt manifest isolation and unreadable direct detail recovery | `library-corruption.e2e.ts`, `corrupt-detail.e2e.ts` | passed twice; corrupt files retained |
| Share-sheet presentation and cancellation | `system-surfaces.e2e.ts` | passed twice; no external send |
| Photos Add denial with take retention | `system-surfaces.e2e.ts` | passed twice |
| Synthetic Photos export and successful/partial two-clip retry | `photos-export.e2e.ts`, `photos-retry.e2e.ts` | passed twice; actual Photos DCIM assets inspected with ffprobe and color proof, no duplicate completed clip |
| Light/dark and landscape Library | `system-surfaces.e2e.ts` | passed twice |
| Largest Dynamic Type, increased contrast and scrollable permission actions | `large-text.e2e.ts` | passed twice; screenshots show readable content and reachable controls |
| Reduce Motion navigation with cold native Settings setup | `reduce-motion.e2e.ts` | passed twice; prior OS setting restored |
| Physical camera discovery, compatible pair/style picker and preview | `e2e/hardware/capture.e2e.ts` | prepared, not executed; signed isolated artifact ready |
| Real single/discrete/PiP/split recording, stop/finalize and owned-take cleanup | `e2e/hardware/capture.e2e.ts` | prepared, not executed; requires safe framing and physical approval |
| Per-app Settings destination after physical camera denial | `e2e/hardware/permission-recovery.e2e.ts` | prepared, not executed |
| Independent focus/exposure, zoom, PiP corner/swap, camera/audio interruptions | physical acceptance observations | unverified; simulator fixture passes provide no optical or microphone proof |
| Purchase/restore and StoreKit approval states | existing StoreKit harness | not part of this mobile suite; no live purchase; documented iOS 26.5 StoreKit runtime limitation remains |

Full source validation passed 18 suites and 175 tests, 90.21% branch coverage, repository/lint/TypeScript gates and Expo doctor 21/21. Exact log: `.artifacts/source-review-fixes-validate.log`. Native capture boundary/state-model/PiP XCTest passed with 100% state-model line/region coverage in `.artifacts/native-source-review-tests.log`. Independent review and run receipts are retained separately in ignored artifacts.

## Regression history

User-facing native failures were preserved before each product repair: missing native link traits (`e2e-link-red`), grouped permission controls/direct-link return/corrupt Library (`e2e-regressions-red`), clipped largest text and obsolete Photos export API (`e2e-system-third`), endless unreadable detail loading (`baseline-repro/.artifacts/e2e-corrupt-detail-red`), and duplicated first Photos clip after partial retry (`e2e-photos-retry-count-red`). The last red run observed three real Photos assets after retry instead of two. Final green regressions and repeat reports retain the corresponding screenshots/media proofs. Earlier harness-only failures and interrupted runs are not counted as product evidence or current pass results.

## Isolated physical acceptance

The prepared project uses bundle `com.ramimaalouf.openmulticam.e2e`, scheme `OpenMulticamE2E` and URL scheme `openmulticam-e2e`. It cannot replace the production bundle. Configured team `3V2UU7RRK9` needs a developer identity, provisioning for the explicitly selected paired device, Developer Mode and an unlocked/trusted phone.

```sh
OPENMULTICAM_E2E_DEVICE_UDID='<paired-device-udid>' bun run build:e2e:device
```

The build does not install or record. The latest artifact compiled and signed successfully; actual `codesign --verify --deep --strict` passed. Its receipt is adjacent to the signed `.app`, never inside it. The builder and pre-install config independently verify signatures, isolated identity, source/JavaScript digests and selected-device provenance. Metro was also exercised against the generated isolated source. Local build logs and sanitized signature proof are `.artifacts/hardware-review-build.log` and `.artifacts/hardware-signature-verification.json`.

After explicit safe-framing approval, use the exact unique paired device name and UDID:

```sh
OPENMULTICAM_HARDWARE_RECORDING_APPROVED=1 OPENMULTICAM_E2E_DEVICE_UDID='<paired-device-udid>' OPENMULTICAM_E2E_DEVICE_NAME='<paired device name>' bun run test:e2e:device --video off
```

This prepared suite requires an empty isolated library, records only new three-second harness takes, verifies their manifest/media, and deletes only those new takes. It performs no physical Photos export or external sharing. Physical permission routing, optics, live multicamera layouts, focus/exposure and interruption behavior remain unverified until actual device observations. Do not treat a signed build as device acceptance.
