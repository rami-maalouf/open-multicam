# Spec: OpenMulticam

Product name: OpenMulticam

Repository path: `/Users/rami/Documents/code/react-native/open-multicam`

Status: Phase 1 revised - awaiting final human approval

Date: 2026-08-31

## Resolved product decisions

1. The product name is OpenMulticam. The repository folder and Expo slug are `open-multicam`, and the URL scheme is `openmulticam`. The final Apple bundle identifier is confirmed when the new EAS project is created.
2. Release 1 ships for iPhone only.
3. Android remains a planned product target after the iPhone core is complete. Release 1 preserves platform-neutral contracts but contains no shipping Android capture implementation.
4. Release 1 delivers the dependable DoubleTake-style core. Advanced capture and monitoring features are planned separately and do not block the core release.
5. The deployment target remains iOS 18.6. Newer camera-performance APIs are enabled conditionally when available.
6. Release 1 records 1080p H.264 video at supported broadcast frame rates of 24, 25, or 30 fps.
7. Internal deletion is permanent after an explicit destructive confirmation. There is no Recently Deleted area.
8. The app is private and local-first. Release 1 has no account, backend, cloud sync, advertising, telemetry, subscription, paywall, or donation flow.
9. DoubleTake is a capability and quality reference. OpenMulticam uses original branding, visual design, copy, and assets.
10. React Native and Expo own the application shell. A local Swift Expo module owns all frame-sensitive capture, preview, focus, exposure, compositing, audio metering, and file-writing work.
11. This phase produces the specification only. Starter migration, planning, task breakdown, and implementation wait for final human approval.

## Objective

Build an original, professional multicamera video app that lets a creator see, configure, and record two compatible iPhone cameras at the same time without sacrificing reliability or native feel.

The primary user is a solo creator, interviewer, educator, traveler, performer, or small production team that wants two synchronized perspectives from one device. Success means the user can open the app, understand exactly which camera combinations the device supports, begin recording quickly, trust that both perspectives remain synchronized, and export playable files without losing a take.

### Product promise

- Open to a live camera preview immediately.
- Select any camera pair that the current device can actually run together.
- Record two clean synchronized files, one live picture-in-picture composite, or one 50/50 split composite.
- Control focus and exposure for each camera independently.
- See recording health, audio levels, storage, thermal pressure, and failures while they are actionable.
- Keep every take in an internal library and export one or many files through native system surfaces.
- Degrade honestly on unsupported hardware instead of showing controls that cannot work.

### What makes this product distinct

The reference app proves the multicamera workflow. This product should improve the trust layer around that workflow:

- Device-derived capabilities instead of a static device list.
- A native capture state machine that does not depend on the JavaScript thread.
- Explicit preflight for camera compatibility, hardware cost, storage, microphone route, and writer readiness.
- Atomic recording sets, interrupted-take recovery, and actionable failure states.
- Sustainable quality selection instead of promising one resolution for all devices.
- Modern native navigation, settings controls, accessibility, and device-adaptive materials.

## Reference findings

The current DoubleTake listing and Filmic product page establish these reference capabilities:

- Two-camera simultaneous capture.
- A camera visualization or lens-picker view.
- Front and rear shot/reverse-shot capture.
- Two rear focal lengths at once when supported.
- Discrete dual-file recording.
- Movable, expandable, hideable picture-in-picture preview and composite recording.
- 50/50 split-screen composite recording.
- Independent focus and exposure selection and lock.
- Selectable 24, 25, and 30 fps.
- H.264 `.mov` output, an internal library, and batch export.
- iPad-specific audio gain and microphone pickup controls on compatible hardware.

Apple's platform contracts refine the implementation:

- `AVCaptureMultiCamSession` is the native API for simultaneous camera inputs.
- `supportedMultiCamDeviceSets` is the source of truth for compatible camera combinations.
- Each selected format must report `isMultiCamSupported`.
- `hardwareCost` above 1.0 cannot run. `systemPressureCost` above 1.0 is not sustainable.
- Preview, session configuration, writers, and recording must run off the main thread.
- The app must monitor interruptions, audio route changes, system pressure, and runtime errors.

The reference app's 1080p statement is treated as its product contract, not as a permanent universal AVFoundation limit. This app negotiates real formats at runtime and verifies them on hardware.

### Minimum OS rationale

iOS 18 supports the A12-based iPhone XS, XS Max, and XR, while iOS 26 begins with iPhone 11 and supported iPhone SE models. The newer launch and storage APIs needed by this architecture can be guarded with runtime availability checks. Keeping iOS 18.6 therefore preserves three relevant multicamera-capable phones without forcing a separate capture architecture. The minimum should be raised only if physical-device testing proves that the A12 path cannot meet the Release 1 reliability or performance thresholds.

## Scope

### Release 1 scope

1. Permission and device-capability onboarding.
2. Fast single-camera preview followed by validated dual-camera readiness.
3. Visual camera picker with compatible A/B lens selection.
4. Discrete, PiP composite, split composite, and single-camera fallback modes.
5. Portrait 9:16 and landscape 16:9 recording.
6. Sustainable 1080p H.264 recording at supported 24, 25, or 30 fps.
7. Per-camera focus, exposure, exposure lock, and focus lock.
8. Native record controls, timer, dropped-frame indicator, storage estimate, audio meter, and thermal warning.
9. Automatic use and display of the active built-in or connected microphone route.
10. Internal recording library with grouped takes, playback, details, rename, permanent delete, share, Photos export, and batch export.
11. Crash and interruption recovery for files that reached a playable state.
12. Light and dark appearance, VoiceOver, Dynamic Type outside the viewfinder, Reduce Motion, Increase Contrast, and minimum touch targets.
13. Development builds, unit tests, integration tests, simulator flows with synthetic capture, and physical-device acceptance.

### Product roadmap after Release 1

#### Release 1.1: Advanced iPhone capture

- Highest sustainable device-reported multicamera resolution through a `Max` quality option.
- 60 fps when both selected cameras, output mode, writer throughput, and measured hardware budget support it.
- HEVC output after downstream playback and export compatibility tests pass.
- Per-camera pinch zoom, exposure bias, and white-balance controls.
- RGB histogram and zebra exposure warning rendered natively and disabled first under pressure.
- Manual audio input selection, gain, and supported pickup-pattern controls.
- Additional professional stabilization choices.
- iOS 26 or newer performance APIs, including deferred output initialization and deterministic professional video storage, when available at build and runtime.

#### Release 2: Android core

- Reproduce the validated Release 1 core on Android devices that expose reliable concurrent-camera support.
- Preserve the shared recording-set, manifest, library, playback, export, and typed error contracts.
- Derive camera-pair compatibility from the running Android device rather than promising universal two-camera support.
- Research and approve the current Android camera architecture before implementation planning begins.

#### Later product considerations

- Optional donations may be considered after the capture product is stable. They do not influence Release 1 architecture or scope.
- iPad support requires a separate product decision and acceptance matrix.

### Explicitly out of scope for Release 1

- Copying DoubleTake's name, icon, visual identity, screenshots, text, or proprietary layout.
- iPad support.
- Android multicamera recording or a Google Play release. Android is planned for Release 2.
- Web capture.
- Three or more simultaneous recorded cameras.
- Remote cameras, network streaming, NDI, RTMP, or live broadcasting.
- On-device timeline editing, trimming, color grading, LUTs, transitions, captions, or audio mixing.
- ProRes, Apple Log, Dolby Vision, spatial video, Cinematic mode, depth capture, or RAW video.
- Background camera recording.
- Cloud backup, collaboration, accounts, analytics, ads, subscriptions, or purchases.
- Lock Screen capture, Camera Control integration, widgets, Live Activities, or Apple Watch.
- Max quality, HEVC, 60 fps, manual zoom, exposure bias, white-balance control, histogram, zebra, manual audio routing, input gain, or pickup-pattern controls. These belong to Release 1.1.
- Guaranteed 4K multicamera capture. A future `Max` mode is capability-derived and must never be marketed as 4K until the supported device matrix proves it.

## Product invariants

1. JavaScript never receives or processes video frames.
2. JavaScript stalls cannot stop preview, move capture timestamps, desynchronize files, or delay writer finalization.
3. A camera pair is selectable only if it appears in the device's supported multicamera sets and has a sustainable common configuration.
4. A take is shown as successful only after every expected output has finalized and passed a readable-track check.
5. Discrete A and B files use the same session clock and have no more than one frame of start or end drift.
6. The app never silently changes encoded resolution, aspect ratio, codec, or camera identity during a take.
7. Orientation and output dimensions are fixed when recording starts. Interface controls may rotate, but the file format does not change mid-take.
8. The app never deletes an internal recording without an explicit destructive confirmation.
9. Media files and a sidecar manifest are durable truth. SQLite is a rebuildable catalog and never the only record that a take exists.
10. Camera and microphone resources are active only while the capture surface is visible or a take is being finalized.
11. All capture configuration is validated before recording. Unsupported combinations return a typed reason and a safe recommended alternative.
12. No captured media or metadata leaves the device unless the user invokes export or sharing.

## Functional requirements

### FR-01: First launch and permissions

- Explain why camera and microphone access are required before requesting them.
- Request camera and microphone permissions separately and only in direct response to user intent.
- Request add-only Photos access at first Photos export, not during onboarding.
- Show a useful single screen for denied or restricted permission, including a native Settings deep link.
- Let the user inspect the library and settings even when camera or microphone permission is denied.
- Do not claim the device supports multicamera until native capability discovery completes.

### FR-02: Capability discovery

- Enumerate front, wide, ultra-wide, telephoto, and other video devices exposed by AVFoundation.
- Return stable camera descriptors with native unique id, position, device type, display label, field of view, zoom range, focus support, exposure support, torch support, stabilization support, and supported formats.
- Return exact supported multicamera device sets rather than constructing pairs heuristically.
- For each pair, calculate valid common 1080p H.264 configurations at 24, 25, and 30 fps plus estimated hardware cost.
- Preserve raw capability data behind the native boundary for later roadmap work, but do not expose unapproved advanced options in Release 1.
- Mark options as `recommended`, `available`, `high pressure`, or `unavailable` with a user-readable reason.
- Cache labels and prior choices, but re-query capabilities every launch and after a media-services reset.

### FR-03: Camera picker

- Present all available lenses in an original visual grid.
- Keep the currently selected A and B feeds live.
- Clearly mark camera A, camera B, unsupported pairings, and the recommended pair.
- Tapping an unselected camera replaces the active A or B slot according to the current selection target.
- Never let A and B reference the same physical camera input.
- Preserve the last valid pair per device model and fall back to the device's recommended pair when it is no longer valid.
- Show a concise reason when a pair cannot run, such as incompatible pair, unsupported format, or hardware budget exceeded.

### FR-04: Capture surface

- Fill the screen with a native preview surface and keep React Native out of the frame path.
- Display both selected feeds in the layout of the current mode.
- Expose native record, stop, A/B selection, focus/exposure, camera-picker, library, and settings controls.
- Hide or disable controls that are not ready until the session reports a running preview and prepared writers.
- Keep the record control visible while delayed writer preparation completes and honor a press once ready.
- Cover stale preview frames immediately when entering the background and reveal the view only after live frames resume.
- Keep the screen awake while previewing or recording.

### FR-05: Capture modes

#### Discrete

- Record camera A and camera B into two synchronized `.mov` files.
- Duplicate the selected audio stream into both files using the same timeline.
- Let the user swap which preview is primary without changing file roles.
- PiP movement or hiding affects preview only and never alters either clean file.

#### PiP composite

- Record one `.mov` file matching the live composite.
- Let the user drag the inset, snap it to safe anchors, change between compact and expanded sizes, swap A/B, and temporarily hide or restore it.
- Apply layout changes to the recorded composite at the same native presentation timestamp used by preview.
- Persist inset position and size as normalized coordinates so portrait and landscape presets remain deterministic.

#### Split composite

- Record one `.mov` file containing both feeds with equal visual weight.
- Use a vertical division for landscape output and a horizontal division for portrait output unless the user explicitly swaps layout.
- Let the user swap A/B sides without rebuilding the session.
- Define aspect-fill cropping visibly and identically in preview and output.

#### Single-camera fallback

- Record one camera when multicamera is unavailable or the user chooses a single feed.
- Preserve the same library, export, focus, exposure, audio, and reliability behaviors.
- Explain that the current device or selected configuration cannot run two cameras without presenting the state as an error.

### FR-06: Recording configuration

- Release 1 records 1920 by 1080 H.264 with enough headroom to sustain the selected mode.
- Offer 24, 25, and 30 fps only when the selected pair supports the chosen rate.
- If a selected pair cannot sustain the Release 1 format, mark the pair unavailable and recommend another pair or single-camera mode. Do not silently lower resolution.
- Apply one tested stabilization policy automatically when both selected formats and connections support it. Manual stabilization selection belongs to Release 1.1.
- Show an estimated recording-time range from current free storage and the selected bitrate.
- Persist the last valid mode, camera pair, and frame rate per device. Fall back visibly if a later session cannot sustain them.

### FR-07: Focus and exposure

- Tapping a preview selects its camera and sets focus and exposure points in that camera's normalized sensor coordinates.
- A second intentional lock action locks focus and exposure. The reticle clearly distinguishes scanning, locked, and unavailable states.
- Camera A and B retain independent point-of-interest and lock state.
- Focus and exposure changes continue during recording without rebuilding the session.
- Manual zoom, exposure bias, and white-balance controls belong to Release 1.1.

### FR-08: Audio

- Record one continuous AAC audio source per take.
- Display the active route, channel count, sample rate, and a native meter with clipping indication.
- Use the current system-selected built-in or connected microphone input without providing manual route selection.
- If the route changes before recording, revalidate and show the new route.
- If the route changes during recording, finalize the current take safely and explain why recording stopped unless seamless continuity is proven on the device matrix.
- Manual route selection, gain, and pickup-pattern controls belong to Release 1.1.

### FR-09: Recording lifecycle

- Use explicit native states: `idle`, `configuring`, `previewing`, `preparing`, `ready`, `starting`, `recording`, `stopping`, `finalizing`, `interrupted`, and `failed`.
- Reject illegal state transitions with typed native errors.
- Preflight permissions, camera pair, format, writer readiness, free storage, microphone route, and hardware cost.
- Begin all expected writers from one master presentation timestamp.
- Show visible recording state, elapsed time, output mode, free-space warning, and dropped-frame warning.
- Stop on user request, critical storage, critical system pressure, backgrounding, unrecoverable audio loss, media-services reset, or writer failure.
- Finalize every viable output, validate its tracks, write the sidecar manifest, then atomically move the recording set from staging to the library.
- A failed take remains inspectable when at least one playable asset exists.

### FR-10: Sustainable performance and pressure handling

- Reject any preflight configuration whose hardware cost is above 1.0.
- Release 1 configurations target hardware cost at or below 0.80.
- Observe hardware cost, system pressure cost, thermal state, dropped sample buffers, writer backpressure, and free storage.
- Under rising pressure, first reduce preview-only diagnostics and visual work, then lower allowed frame rate if the active format supports it.
- Never change encoded dimensions or codec mid-take.
- At critical pressure, stop and finalize rather than risking corrupt output.
- Report the pressure source and the action taken in the manifest and user-facing take details.

### FR-11: Internal library

- Show recording sets newest first using a virtualized list.
- Group the two discrete files as one take with A/B badges and a shared timestamp, duration, and mode.
- Display thumbnail, name, date, duration, mode, cameras, resolution, fps, codec, size, and status.
- Support single selection, multi-selection, rename, share, Photos export, and delete.
- Generate thumbnails after finalization without delaying take durability.
- Rebuild the SQLite catalog from sidecar manifests if the database is missing or corrupt.
- Scan staging on launch and recover or classify interrupted takes before presenting the library.

### FR-12: Playback and details

- Use `expo-video` for local playback outside the capture surface.
- For discrete takes, provide synchronized A/B playback with selectable primary feed and a side-by-side inspection mode.
- Show native playback controls, scrubbing, mute, AirPlay where supported, and full-screen playback.
- Keep take metadata and warnings accessible below the player.
- Never autoplay multiple list thumbnails.

### FR-13: Export and sharing

- Export one clip, both discrete clips, or multiple recording sets.
- Use the native share sheet for file sharing.
- Use add-only Photos permission for Camera Roll export.
- Preserve `.mov` files without re-encoding.
- Keep paired discrete filenames sortable and obviously related.
- Show per-file progress and a final result summary for batch operations.
- Treat partial batch failure as a recoverable result with retry for failed files only.
- Remove temporary export bundles after completion or on the next launch.

### FR-14: Settings and diagnostics

- Use native grouped controls for default mode, default pair, frame rate, automatic audio-route behavior, and haptics.
- Include current device capability diagnostics and an exportable text report with no captured media or private file paths.
- Include storage used by the internal library and a direct library-management action.
- Include permission state, app version, privacy statement, acknowledgements, and support information.
- Do not add analytics toggles because Release 1 has no analytics.

### FR-15: Accessibility and interaction quality

- All controls have VoiceOver labels, roles, values, hints where useful, and logical focus order.
- Record state is conveyed visually, through text, and through one appropriate haptic. Color is never the only indicator.
- Capture controls meet a 44 by 44 point minimum on iOS.
- Settings and library text support Dynamic Type without clipping at accessibility sizes.
- Reduce Motion removes PiP flourish and nonessential translation while preserving direct manipulation and state feedback.
- The PiP has non-gesture accessibility actions for move, resize, swap, hide, and restore.
- Haptics occur once per committed user action and never per frame or meter update.

## Data model

### RecordingSet

| Field | Contract |
| --- | --- |
| id | UUID generated before preflight |
| name | Optional trimmed user label, maximum 120 code points |
| mode | `single`, `discrete`, `pip`, or `split` |
| status | `staging`, `recording`, `finalizing`, `ready`, `interrupted`, `partial`, or `failed` |
| createdAtUtc | UTC epoch milliseconds |
| startedAtPts | Native capture-session presentation timestamp |
| durationMs | Final validated duration |
| orientation | `portrait` or `landscape` fixed at start |
| aspectRatio | `9:16` or `16:9` |
| frameRate | Validated numeric frame rate |
| codec | `h264` in Release 1 |
| cameraAId, cameraBId | Stable AVFoundation unique ids, B nullable in single mode |
| audioRoute | Sanitized route and channel metadata |
| warnings | Typed pressure, interruption, frame-drop, or recovery records |
| manifestVersion | Integer used for forward migration |

### Clip

| Field | Contract |
| --- | --- |
| id | UUID |
| recordingSetId | Parent RecordingSet id |
| role | `single`, `cameraA`, `cameraB`, or `composite` |
| relativePath | Path inside the recording-set directory only |
| width, height | Encoded pixel dimensions |
| durationMs | Track-derived duration |
| fileSizeBytes | Final filesystem size |
| videoTrackCount | Exactly 1 for Release 1 |
| audioTrackCount | Exactly 1 unless microphone permission was intentionally absent |
| playable | Result of native asset inspection |

### CapturePreset

| Field | Contract |
| --- | --- |
| profile | `core1080p` in Release 1 |
| width, height | 1920 by 1080, rotated for portrait output |
| frameRate | Supported 24, 25, or 30 |
| codec | `h264` |
| bitrate | Device-tested integer bits per second |
| stabilization | Automatically selected tested AVFoundation mode |

Each recording-set directory contains the clips, thumbnails, and a versioned `manifest.json`. The manifest is written through a temporary file and atomic rename. SQLite indexes manifests for fast queries and can be rebuilt.

## System architecture

### Boundaries

```text
Expo Router application shell
  -> React Native screens and native @expo/ui controls
  -> capture facade and library use cases
  -> local Swift Expo module
       -> capture actor and state machine
       -> AVCaptureMultiCamSession
       -> native preview and direct-manipulation controls
       -> Metal compositor and native diagnostics
       -> synchronized AVAssetWriter pipeline
       -> file finalization and native asset inspection
  -> recording catalog
       -> sidecar manifests and media files
       -> rebuildable expo-sqlite index
  -> expo-video playback
  -> native sharing and Photos export
```

### Native capture module responsibilities

- Own one capture service actor and one serial session executor.
- Export capability discovery, configuration, lifecycle, and coarse state events.
- Export a native `CaptureSurfaceView` that owns preview layers, Metal rendering, record control, PiP gestures, focus reticles, and audio meters.
- Keep session setup, `startRunning`, `stopRunning`, frame processing, and writer calls off the main thread.
- Synchronize video and audio sample buffers on the capture-session clock.
- Use separate asset writers for separate files and one composited writer for PiP or split output.
- Use a bounded pixel-buffer pool and explicit backpressure handling.
- Emit state changes and low-frequency diagnostics to JavaScript. Never emit frames or per-frame UI updates.
- Inject synthetic sample sources in test builds so writer, compositor, and recovery behavior can be tested without cameras.

### React Native responsibilities

- Navigation, onboarding, permissions education, library, details, playback, settings, export orchestration, and error explanations.
- Persist user preferences and the rebuildable recording catalog.
- Render short settings forms with `@expo/ui` native controls.
- Render the large library with `FlatList` because `@expo/ui` lists are not virtualized.
- Keep capture route files thin and keep all non-route logic outside `src/app`.
- Never poll the capture engine per frame.

### Public TypeScript interface style

```ts
export type CaptureState =
  | { kind: 'idle' }
  | { kind: 'previewing'; preset: ResolvedCapturePreset }
  | { kind: 'recording'; recordingSetId: string; startedAtMs: number }
  | { kind: 'finalizing'; recordingSetId: string }
  | { kind: 'failed'; error: CaptureError };

export interface CaptureEngine {
  discoverCapabilities(): Promise<DeviceCapabilities>;
  configure(request: CaptureRequest): Promise<CaptureResult<ResolvedCapturePreset>>;
  startRecording(): Promise<CaptureResult<{ recordingSetId: string }>>;
  stopRecording(): Promise<CaptureResult<RecordingSetManifest>>;
  recoverStaging(): Promise<CaptureResult<RecoveryReport>>;
}
```

The Swift boundary mirrors these typed states. Expected failures return stable error codes and user-safe messages. Native exceptions, file paths, and framework error objects do not cross directly into UI code.

## Tech stack

### Reused baseline

- Expo SDK `~57.0.18`
- React `19.2.3`
- React Native `0.86.3`
- TypeScript `~6.0.3` in strict mode
- Expo Router `~57.0.17`
- `@expo/ui ~57.0.14`
- React Native Reanimated 4 and worklets for non-capture UI motion only
- Jest, `jest-expo`, and Testing Library
- Bun for package management and scripts
- EAS development, preview, simulator, and production profiles with a new project identity

### Added or retained Expo modules

- `expo-dev-client` because a local native capture module cannot run in Expo Go.
- `expo-file-system` for library and export orchestration outside the native writer.
- `expo-sqlite` for the rebuildable catalog.
- `expo-video` for playback.
- `expo-media-library` for add-only Photos export.
- `expo-sharing` for the native share sheet.
- `expo-haptics`, `expo-image`, `expo-keep-awake`, `expo-screen-orientation`, `expo-splash-screen`, and `expo-updates`.
- `expo-glass-effect` and `expo-blur` only where native materials remain readable over preview.

### Native frameworks

- Expo Modules API with a local Swift module.
- AVFoundation and AVFAudio.
- Metal and MetalKit for composite rendering.
- Core Media and Core Video for timestamped sample buffers and pixel-buffer pools.
- AVAssetWriter and AVAssetReader for writing and validation.
- Photos only through add-only export behavior.

`expo-camera` is intentionally not used. It does not own this product's simultaneous multicamera graph, synchronization, compositing, pressure policy, or atomic file lifecycle.

## Commands

The approved implementation will expose these package scripts. Exact dependency versions are resolved through the Expo SDK, never through raw package additions.

```bash
bun install
bunx expo install --fix
bun run start
bun run ios
bun run lint
bun run typecheck
bun run test
bun run test:coverage
bun run test:native
bun run test:e2e:sim
bun run test:e2e:device
bun run validate
bunx expo-doctor
bunx eas-cli build --profile development --platform ios
bunx eas-cli build --profile production --platform ios
```

Intended script behavior:

- `start`: start Expo for the development client.
- `ios`: generate native files when needed and run the iOS development build.
- `test:native`: generate the disposable iOS project and run the multicamera module's XCTest suite on a named simulator.
- `test:e2e:sim`: run permission, navigation, library, synthetic capture, playback, export, and recovery flows.
- `test:e2e:device`: run the physical-device capture acceptance flow. This cannot be replaced by simulator evidence.
- `validate`: lint, type-check, JavaScript coverage, native tests, Expo Doctor, and iOS export/build validation.

## Project structure

```text
open-multicam/
  assets/                         app-owned icons and launch artwork
  docs/
    architecture/                approved decisions and capture diagrams
    device-matrix.md             physical-device capability and stress results
    recovery.md                  file lifecycle and interruption behavior
  e2e/
    simulator/                   synthetic capture and non-camera flows
    device/                      real camera, microphone, and export flows
  modules/
    multicam-capture/
      expo-module.config.json
      index.ts                    typed JavaScript boundary
      ios/
        CaptureModule.swift
        CaptureSurfaceView.swift
        CaptureService.swift
        CaptureStateMachine.swift
        CapabilityResolver.swift
        SessionGraph.swift
        Writers/
        Compositor/
        Storage/
        Diagnostics/
  src/
    app/                          Expo Router route files only
      _layout.tsx
      index.tsx                   capture route
      camera-picker.tsx
      capture-settings.tsx
      library/
        _layout.tsx
        index.tsx
        [recordingSetId].tsx
      settings.tsx
    components/                   genuinely reused React Native UI
    screens/
      capture/
      camera-picker/
      library/
      recording-detail/
      settings/
    core/
      capture/                    platform-neutral state and capability types
      library/                    recording-set use cases and manifest schema
      results/                    typed result and error contracts
    platform/
      capture/                    native module adapter
      database/                   SQLite catalog adapter
      export/                     sharing and Photos adapters
    foundation/
      accessibility/
      haptics/
    theme/                        one semantic token source
    testing/                      mocks, fixtures, and synthetic manifests
  tests/
    capture/
    library/
    features/
    recovery/
  app.json
  eas.json
  eslint.config.js
  jest.config.js
  package.json
  tsconfig.json
  SPEC.md
```

## Starter migration contract

The starter is copied selectively. A broad filesystem copy is prohibited because it contains generated builds, dependencies, private environment files, an existing EAS project id, unrelated product specifications, and product-specific agent configuration.

### Reuse and adapt

- Bun, TypeScript, ESLint, Jest, and Expo Router configuration.
- Expo SDK 57 dependency alignment.
- `src/theme` semantic tokens, after changing product colors and removing unused values.
- `AppText`, `Icon`, adaptive material, accessibility, reduced-motion, and haptics foundations after camera-surface review.
- The generic test render helper and only the mocks still required.
- EAS profile shapes, with every project id, update URL, bundle identifier, scheme, name, slug, entitlement, and credential reference replaced.
- The `.gitignore` rules for generated native directories, local environments, artifacts, and coverage.

### Delete or rewrite

- Every habit-tracker route, feature, domain model, analytics formula, calendar rule, reminder, widget, sync adapter, notification adapter, data transfer flow, persistence schema, and product test.
- Ripples product specifications, capability map, task plans, runbooks, checkpoints, screenshots, and Android-readiness document.
- Habit-tracker icons, splash artwork, bundle identifiers, app groups, CloudKit containers, widget configuration, EAS project id, updates URL, and scheme.
- Product-specific Jest mocks and lint boundaries.
- Starter `src/app/_layout.tsx` and `src/app/index.tsx`; their patterns may inform the rewrite, but their product dependencies do not survive.

### Never copy

- `.git/`
- `.env` or any `.env*` file
- `node_modules/`
- `.expo/`
- generated `ios/` or `android/`
- `.artifacts/`, `coverage/`, local screenshots, or simulator evidence
- editor, MCP, agent, and model-specific configuration that is not deliberately rewritten for this repository
- the starter's existing EAS project identity or credentials

Implementation begins from an explicit allowlist and initializes a fresh Git repository. The starter repository remains unchanged.

## Code style

- TypeScript strict mode with explicit public types and discriminated unions.
- Kebab-case file names and PascalCase component/type names.
- Route files only translate route state and render screen bodies.
- Platform behavior sits behind interfaces and `.ios.ts` or native-module boundaries.
- Comments are lowercase and explain why, never restate what the code does.
- Repeated visual values come from one theme entry point.
- Native controls are not wrapped merely to restyle them.
- Capture state transitions are centralized. No screen owns an ad hoc recording boolean.
- No force unwraps in Swift capture and storage code. Expected failure uses typed results.
- Swift concurrency owns isolation. AVFoundation calls do not occur from arbitrary queues.
- No secrets, absolute private paths, or raw native error objects appear in logs.

## Testing strategy

### JavaScript and React Native

- Jest and Testing Library cover capability presentation, typed errors, library grouping, manifests, catalog rebuild, recovery decisions, settings, navigation, permission states, export results, and accessibility semantics.
- Global JavaScript coverage target is at least 90 percent for lines, statements, functions, and branches.
- Capture state reducers, manifest migrations, recovery rules, and export result handling require 100 percent branch coverage.
- UI tests assert behavior and accessibility output, not component implementation details.

### Swift unit and integration tests

- XCTest covers capability filtering, supported-pair selection, format negotiation, hardware-budget policy, state transitions, normalized focus/exposure mapping, PiP geometry, filenames, manifests, recovery, and typed error mapping.
- Synthetic `CMSampleBuffer` fixtures test writer start/stop, shared timestamps, two-writer synchronization, audio duplication, composite geometry, interruption finalization, and backpressure.
- Every created asset is reopened with AVAssetReader or AVAsset inspection and validated for expected tracks, dimensions, duration, frame rate, and playability.
- Native deterministic logic targets at least 90 percent line coverage and 100 percent coverage of the capture state machine.

### Simulator end-to-end

- The local module exposes a debug-only synthetic source with two deterministic videos and audio.
- Automated flows cover onboarding, permission alternatives, configuration, each mode, recording, finalization, playback, batch selection, export simulation, delete confirmation, recovery, and database rebuild.
- Synthetic mode is excluded from release builds and cannot be activated through a production deep link.

### Physical-device acceptance

At minimum, test:

- An iPhone XS or XR as the oldest supported A12-class iPhone.
- A mid-generation three-camera Pro iPhone.
- A current-generation Pro iPhone.
- Built-in microphone and one supported external microphone.

For every device, record all supported A/B pairs in discrete, PiP, and split modes at 1080p H.264 and every supported Release 1 frame rate of 24, 25, and 30 fps.

Required device scenarios:

- Fresh permission grant, denial, and Settings recovery.
- Portrait and landscape capture.
- Focus, exposure, lock, swap, PiP drag, resize, hide, and restore during recording.
- Backgrounding, phone or audio interruption, route disconnect, low storage, media-services reset, and system-pressure escalation.
- Thirty-minute sustained default capture in a 20 to 24 degree Celsius environment.
- Export to Photos, Files through share, and multi-file batch export.
- Force quit during staging and finalization followed by launch recovery.

### Performance acceptance

- On the oldest supported device in a release build, cold launch to first live preview is at most 1.0 second at p95 across 20 launches.
- Record-button visual feedback appears within one display frame.
- The native preview sustains the requested frame rate with no continuous run of more than three dropped frames during the 30-minute default stress test.
- Discrete A/B files begin and end within one encoded frame of each other and remain within one frame of drift after 30 minutes.
- Audio stays within one frame of its associated video at the beginning and end of the stress recording.
- Peak resident memory for 1080p30 dual capture on the oldest device is at most 350 MB with no monotonic growth greater than 5 percent after the first five minutes.
- Default stress capture does not reach critical thermal or system-pressure shutdown in the stated environment.
- Stopping a take presents a finalizing state immediately and a playable library item within 2 seconds for a 30-second take and within 5 seconds for a 30-minute take, excluding thumbnail generation.
- No successful take is corrupt, missing an expected clip, or absent after relaunch.

## Boundaries

### Always do

- Validate selected cameras, formats, pressure budget, writer readiness, audio route, and storage before recording.
- Run capture and writer work natively and off the main thread.
- Keep sidecar manifests versioned and migrations backward-readable.
- Reproduce bugs through the closest end-user E2E flow before fixing them.
- Test capture changes on physical hardware before calling them complete.
- Run lint, type-check, JavaScript tests, native tests, Expo Doctor, and build validation before every task commit.
- Use conventional lowercase commit messages with no co-author lines.
- Preserve unrelated user changes.

### Ask first

- Change the iOS deployment target, begin Android implementation, or change the approved release order.
- Add any dependency outside the approved stack.
- Add remote services, telemetry, analytics, accounts, purchases, subscriptions, or network access.
- Change output codecs, file containers, manifest schema compatibility, or deletion behavior.
- Add a third simultaneous camera, ProRes, Log, HDR, spatial video, streaming, or editing.
- Change EAS project identity, signing, entitlements, CI, or App Store configuration.
- Reduce a performance threshold or supported-device requirement.

### Never do

- Copy DoubleTake branding, assets, text, or proprietary interface details.
- Copy the starter's `.env`, credentials, EAS identity, generated native projects, Git history, dependencies, or private artifacts.
- Pass video frames through the React Native bridge.
- Perform capture session or writer work on the main thread.
- Offer an unsupported camera pair or quality preset.
- Silently drop one discrete output and report success.
- Update a visual baseline or test expectation merely to make a failure pass.
- Remove, skip, or weaken a failing test without approval.
- Commit secrets, captured user media, simulator evidence, generated native folders, or auto-generated changelogs.

## Success criteria

Phase 1 is approved when the human confirms this revised specification as the source of truth for planning.

Release 1 is complete when:

1. Every functional requirement FR-01 through FR-15 has automated or device evidence.
2. The app records validated discrete, PiP, and split outputs for every pair it presents as supported.
3. All expected files remain synchronized, playable, recoverable, and exportable.
4. Unsupported hardware receives an honest single-camera experience.
5. The 30-minute physical-device stress and performance thresholds pass on the oldest supported device.
6. Permission denial, interruption, low storage, pressure, force quit, and writer failure preserve a clear and recoverable user outcome.
7. VoiceOver, large text, Reduce Motion, light/dark appearance, and touch-target audits pass.
8. `bun run validate` and production iOS build validation pass from a clean checkout.
9. The starter source repository is unchanged and the new repository contains none of its secrets, generated files, or product identity.
10. A human completes final visual and capture-quality review on physical iPhone hardware.

## Risks and required spikes before implementation planning

1. **Device format matrix:** enumerate actual 1080p H.264 multicamera formats, combinations, frame rates, and costs on available A12, mid-generation, and current hardware. Record higher-format findings for Release 1.1 without expanding Release 1.
2. **Writer architecture:** compare paired `AVCaptureMovieFileOutput` against synchronized `AVCaptureVideoDataOutput` plus AVAssetWriter. The chosen design must satisfy dual-file synchronization, live composite, and recovery without maintaining two unrelated pipelines.
3. **Composite fidelity:** prove one Metal compositor can render preview and writer output from the same geometry and timestamps at sustainable 1080p30.
4. **Audio duplication:** prove one audio source can be written to both discrete files with the required drift bound and safe route-change behavior.
5. **Expo native-view lifecycle:** prove navigation, backgrounding, fast refresh, development-client reload, and native view remounts cannot leave the camera or microphone active.
6. **Long-record finalization:** prove the chosen container and writer configuration finalize a 30-minute take within the performance target and recover predictably after interruption.

No product feature implementation begins until these spikes are converted into approved plan tasks. Spike findings update this spec before downstream implementation.

## Remaining approval gate

The discovery questions are resolved. The human must now approve this revised Phase 1 specification before the workflow advances to technical planning. Approval authorizes creation of `tasks/plan.md` and `tasks/todo.md`. Selective starter migration and feature implementation remain blocked until the later Plan and Tasks gates are also approved.

## Sources

- [DoubleTake App Store listing](https://apps.apple.com/us/app/doubletake-multicam-video/id1478041592)
- [Filmic DoubleTake product page](https://www.filmicpro.com/products/doubletake/)
- [Apple AVCaptureMultiCamSession](https://developer.apple.com/documentation/avfoundation/avcapturemulticamsession)
- [Apple supportedMultiCamDeviceSets](https://developer.apple.com/documentation/avfoundation/avcapturedevice/discoverysession/supportedmulticamdevicesets)
- [Apple isMultiCamSupported format contract](https://developer.apple.com/documentation/avfoundation/avcapturedevice/format/ismulticamsupported)
- [Apple hardwareCost](https://developer.apple.com/documentation/avfoundation/avcapturemulticamsession/hardwarecost)
- [Apple systemPressureCost](https://developer.apple.com/documentation/avfoundation/avcapturemulticamsession/systempressurecost)
- [Apple AVMultiCamPiP sample](https://developer.apple.com/documentation/avfoundation/avmulticampip-capturing-from-multiple-cameras)
- [Apple responsive camera guidance](https://developer.apple.com/documentation/avfoundation/building-a-responsive-camera-app-that-launches-quickly)
- [Apple iOS 18 compatible iPhone models](https://support.apple.com/en-us/104985)
- [Apple iOS 26 compatible iPhone models](https://support.apple.com/en-ie/guide/iphone/iphe3fa5df43/ios)
- [Expo SDK 57 UI](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)
- [Expo SDK 57 Video](https://docs.expo.dev/versions/v57.0.0/sdk/video/)
- [Expo SDK 57 Media Library](https://docs.expo.dev/versions/v57.0.0/sdk/media-library/)
- [Expo Modules API](https://docs.expo.dev/modules/get-started/)
