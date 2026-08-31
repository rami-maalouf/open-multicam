# Implementation Plan: OpenMulticam Release 1

Status: Phase 2 draft - awaiting human approval

Approved specification: `SPEC.md`

Date: 2026-08-31

## Overview

Build OpenMulticam as an iPhone-first Expo application whose React Native shell surrounds a native Swift multicamera engine. Release 1 delivers a dependable 1080p H.264 workflow at supported 24, 25, or 30 fps: permissions, validated camera selection, single, discrete, PiP, and split recording, focus and exposure, audio, durable local storage, playback, export, and recovery.

Implementation proceeds risk-first and vertically. The first usable product slice records one synthetic or single-camera take, persists a manifest, lists it, and plays it back. Multicamera modes are added only after the native session, writer, synchronization, and lifecycle risks pass explicit device checkpoints.

This Phase 2 document defines architecture, dependency order, work packages, checkpoints, and verification. It does not authorize implementation. Phase 3 will decompose every approved work package into focused tasks touching no more than approximately five files each.

## Approved inputs

- Product name: OpenMulticam
- Repository: `/Users/rami/Documents/code/react-native/open-multicam`
- Starter source: `/Users/rami/Documents/life-os/expo/content/videos/build-expo-with-claude-code/habit-tracker`
- Release platform: iPhone
- Minimum OS: iOS 18.6
- Release format: 1080p H.264 at supported 24, 25, or 30 fps
- Later releases: advanced iPhone capture, then Android core
- Privacy: local-only, no account, network service, telemetry, or monetization

## System boundaries

### React Native and Expo own

- Expo Router navigation and route lifecycle
- Permission education and denied-state recovery
- Camera and mode configuration surfaces outside frame-sensitive gestures
- Recording library, metadata details, playback, settings, and export orchestration
- Rebuildable SQLite catalog
- Semantic theme, accessibility contracts, and non-capture UI motion
- Typed JavaScript facade over the native module

### The local Swift Expo module owns

- Camera and microphone discovery
- Supported multicamera pair and format resolution
- `AVCaptureMultiCamSession` configuration and lifecycle
- Native preview and capture controls
- Focus and exposure mapping
- PiP direct manipulation and composite geometry
- Audio metering
- Session-clock synchronization
- AVAssetWriter pipelines, track validation, and finalization
- Hardware cost, pressure, dropped-frame, interruption, and route-change observation
- Staging, atomic manifest creation, and interrupted-take recovery primitives

### The boundary never permits

- Video or audio sample buffers crossing the React Native bridge
- Per-frame JavaScript callbacks
- UI code writing media files directly
- Native capture code writing SQLite directly
- A successful take state before every expected asset passes native validation

## System invariants

1. One native state machine is authoritative for capture lifecycle.
2. One capture-session clock is authoritative for every output timestamp.
3. Media files plus a versioned sidecar manifest are durable truth.
4. SQLite is a rebuildable index, not the only record of a take.
5. Capture configuration is immutable while recording except for approved focus and exposure changes.
6. Every capture resource has an explicit owner and deterministic teardown path.
7. Every unavailable option has a typed reason and safe fallback.
8. Simulator synthetic mode and production camera mode use the same writer, manifest, catalog, and playback contracts.
9. Debug-only synthetic capabilities cannot be enabled in release builds.
10. Release 1 code does not expose Release 1.1 or Android controls.

## Dependency graph

```text
approved specification
  -> selective starter migration and clean build
      -> typed capture, manifest, and error contracts
          -> local Expo module shell and synthetic source
              -> session lifecycle and capability resolver
                  -> writer architecture decision
                      -> single-camera vertical slice
                      -> discrete multicamera slice
                      -> Metal compositor
                          -> PiP slice
                          -> split slice
              -> staging and recovery primitives
                  -> manifest catalog
                      -> library and playback
                          -> export and deletion
      -> native foundation and route shell
          -> permissions and settings
          -> camera picker and capture configuration

all vertical slices
  -> interruption and pressure hardening
      -> accessibility and visual QA
          -> physical-device matrix and release certification
```

The writer architecture and composite spike are hard gates. Work that depends on them does not proceed because a mock looked convincing.

## Architecture decisions

### AD-01: Selective migration, not repository cloning

Implementation copies only an explicit allowlist from the starter. It never copies `.git`, `.env*`, `node_modules`, generated native folders, build artifacts, private screenshots, old EAS identity, or product-specific source. App configuration is rewritten before the first build.

### AD-02: Continuous Native Generation

Generated `ios/` and `android/` directories remain ignored and disposable. Native behavior lives in app configuration, config plugins where needed, and `modules/multicam-capture`. Generated projects are never hand-edited.

### AD-03: Local Expo module and native capture surface

The module exports typed functions, state events, and a native `CaptureSurfaceView`. Direct capture interactions remain native so recording feedback, PiP motion, focus reticles, meters, and preview are independent of JavaScript load.

### AD-04: Writer choice is decided by evidence

The plan does not preselect paired `AVCaptureMovieFileOutput` or synchronized `AVCaptureVideoDataOutput` plus AVAssetWriter. A bounded spike measures synchronization, audio duplication, compositing compatibility, recovery, and finalization. The decision is recorded in `docs/architecture/0001-writer-architecture.md` before production capture work.

### AD-05: Unified output contracts

Regardless of writer implementation, single, discrete, PiP, and split modes produce one versioned `RecordingSetManifest` contract. The library never infers grouping from filenames.

### AD-06: Synthetic input is a first-class test seam

Debug builds can feed two deterministic video streams and audio into the same state machine and output pipeline. This enables simulator E2E and repeatable failure injection without pretending to replace device acceptance.

### AD-07: Files first, catalog second

Each take moves through `staging/<id>` to `recordings/<id>` only after validation and atomic manifest write. SQLite indexes completed and recoverable manifests. Catalog loss is repaired by scanning manifests.

### AD-08: iOS 18.6 baseline with conditional newer APIs

The core works without iOS 26-only launch or storage APIs. Availability-gated optimizations may be adopted only after the baseline path passes on an A12 iPhone.

### AD-09: Original product design

Reference-app flows inform requirements, not pixels. OpenMulticam uses its own information hierarchy, theme, copy, icons, and capture-control geometry.

## Implementation phases and work packages

Work packages define plan-level outcomes. Phase 3 will split them into small implementation tasks with exact files, acceptance criteria, and verification commands.

## Phase 0: Safe foundation

### WP-0.1: Selectively migrate the Expo foundation

Copy and adapt only package tooling, strict TypeScript configuration, lint and test configuration, semantic theme, foundation components, accessibility, haptics, and the generic render helper. Create original placeholder assets and a minimal routes-only shell. Rewrite app name, slug, scheme, iPhone-only orientation support, permission descriptions, deployment target, and EAS configuration without creating or linking an EAS project.

Exit evidence:

- No forbidden starter path or identity exists in the new repository.
- The starter repository remains byte-for-byte untouched by the migration operation.
- `bun install`, lint, type-check, tests, Expo Doctor, and a clean iOS development build succeed.
- The app opens to an original OpenMulticam placeholder screen.

### WP-0.2: Establish validation and generated-project discipline

Create the approved package scripts, coverage policy, generated-native cleanup rules, simulator synthetic-test entry point, device-test entry point, and a development-only foundation preview. Document which commands create disposable native output.

Exit evidence:

- `bun run validate` has one documented meaning and fails on any constituent failure.
- Generated native directories, media, evidence, and secrets remain ignored.
- Foundation controls pass light, dark, large text, and Reduce Motion checks.

### Checkpoint A: Foundation approval

- Clean checkout installs and builds.
- Secret and identity scan passes.
- Minimal app launches in a development client.
- Human reviews the original visual foundation before capture UI work.

## Phase 1: Retire native feasibility risks

### WP-1.1: Freeze cross-boundary contracts and module lifecycle

Define capture states, typed errors, capability types, capture requests, manifests, recovery reports, and event cadence in TypeScript and Swift. Scaffold the local Expo module and prove mount, unmount, reload, background, and foreground lifecycle with a synthetic source.

Exit evidence:

- TypeScript and Swift fixtures encode and decode the same contracts.
- Illegal state transitions fail deterministically.
- Repeated native-view mount and unmount leaves no active capture resource.

### WP-1.2: Prove capability discovery and dual preview

Enumerate cameras, exact supported multicamera sets, 1080p multicamera formats, frame rates, stabilization support, and cost. Bring up single preview first, then validated dual preview. Produce a sanitized device-capability report.

Exit evidence:

- Unsupported pairings cannot be selected through the native API.
- A12, mid-generation Pro, and current Pro reports are captured when hardware is available.
- Backgrounding, remounting, and media-services reset do not leak a session.

### WP-1.3: Decide and prove the discrete writer architecture

Prototype candidate writer graphs using deterministic and real inputs. Measure shared start time, A/B drift, duplicated AAC audio, dropped samples, stop behavior, validation, and failure recovery. Record the chosen design and rejected alternative in the writer architecture decision.

Exit evidence:

- Two 1080p H.264 files validate and remain within one frame of start and end drift.
- One AAC timeline is correctly associated with both outputs.
- Writer failure never reports a complete take.
- `docs/architecture/0001-writer-architecture.md` is approved.

### Checkpoint B: Discrete capture feasibility

- Real device capability and preview evidence exists.
- Writer decision is based on measurements, not preference.
- A 10-minute discrete test is playable, synchronized, and recoverable.
- Human approves the native writer decision before product capture work.

### WP-1.4: Prove the Metal composite path

Use the selected writer architecture to render two deterministic streams through one Metal compositor. Prove preview and encoded output share normalized geometry, aspect-fill cropping, orientation, swapping, PiP visibility, and split layout.

Exit evidence:

- Pixel fixtures prove preview/output layout agreement.
- PiP changes are timestamped in native time.
- Portrait and landscape files validate at the specified output dimensions.

### WP-1.5: Prove long-record storage and finalization

Exercise bounded pixel buffers, writer backpressure, free-space preflight, staging, atomic manifests, asset validation, and finalization with short deterministic tests and a 30-minute real-device run.

Exit evidence:

- Peak memory and finalization meet specification thresholds.
- Low-space and interrupted writes produce typed recoverable outcomes.
- A force quit during staging is classified correctly on relaunch.

### Checkpoint C: Native architecture gate

- Discrete and composite pipelines share the approved contracts.
- Thirty-minute default capture meets memory, drift, and finalization targets on available target hardware.
- No Phase 2 product slice starts until failures here update the specification and plan.

## Phase 2: First end-to-end product slice

### WP-2.1: Deliver permissions through live single-camera preview

Build first-launch education, camera and microphone permission requests, denial recovery, route lifecycle, and a single-camera native preview inside the real Expo Router shell.

Exit evidence:

- Fresh grant, denial, restricted, and Settings-return flows work end-to-end.
- Library and settings remain accessible without camera permission.
- Preview launch, background cover, and teardown satisfy the lifecycle contract.

### WP-2.2: Record, persist, list, and play one single-camera take

Connect native record and stop controls to staging, validation, manifest creation, SQLite indexing, one library row, detail metadata, and `expo-video` playback.

Exit evidence:

- A user can complete the first full record-to-playback loop.
- Relaunch preserves the take through manifest and catalog rebuild paths.
- A failed validation never creates a ready library row.

### WP-2.3: Close the single-camera failure paths

Handle user stop, background stop, audio-route change, low storage, runtime error, force quit, retry, and permanent delete for the single-camera slice.

Exit evidence:

- Every terminal capture state has a visible and accessible outcome.
- Delete confirmation permanently removes the take and refreshes the catalog.
- Recovery fixtures cover playable partial, unplayable partial, and missing manifest.

### Checkpoint D: First complete user journey

- Permission to record to playback works on simulator synthetic mode and real iPhone.
- Error recovery does not require a developer reload.
- Automated E2E reproduces the primary journey.

## Phase 3: Multicamera product slices

### WP-3.1: Deliver the validated camera picker

Present original live camera choices, A/B roles, supported pairs, recommended pair, 24/25/30 compatibility, and typed unavailable reasons. Persist only a valid prior selection.

Exit evidence:

- The UI cannot construct a pair rejected by the native resolver.
- Changing the pair reconfigures without stale preview or leaked devices.
- Single-camera fallback is clear and non-erroring.

### WP-3.2: Deliver discrete mode end-to-end

Connect the approved paired writer to the capture surface, grouped manifest, library card, synchronized playback, export, and failure handling.

Exit evidence:

- One action creates one recording set with two validated A/B clips.
- A/B swap changes preview priority without changing file identity.
- Paired filenames, metadata, playback, and export remain grouped.

### Checkpoint E: Discrete mode approval

- Device tests pass for every offered A/B pair at each supported Release 1 frame rate.
- A/B synchronization and audio thresholds pass.
- Human reviews capture, library, playback, and export as one journey.

### WP-3.3: Deliver PiP composite mode end-to-end

Add native PiP drag, anchor snap, resize, swap, hide, restore, normalized persistence, and composite output that matches preview.

Exit evidence:

- Direct manipulation remains responsive under JavaScript load.
- Preview and encoded geometry agree in portrait and landscape.
- VoiceOver actions provide non-gesture alternatives.

### WP-3.4: Deliver split composite mode end-to-end

Add portrait and landscape split geometry, aspect-fill policy, A/B side swap, output validation, library metadata, playback, and export.

Exit evidence:

- Preview and file cropping match deterministic pixel fixtures.
- Swap does not rebuild or interrupt the active session.
- Both orientations pass physical-device review.

### Checkpoint F: Composite mode approval

- PiP and split pass synthetic pixel tests and real-device capture.
- Composite performance stays inside pressure and memory budgets.
- All three multicamera modes share one manifest and catalog model.

### WP-3.5: Deliver focus, exposure, and core audio feedback

Add per-camera selection, normalized focus/exposure point, lock states, native reticles, active audio-route display, AAC metadata, level meter, clipping state, and route-change stop behavior.

Exit evidence:

- Each camera retains independent focus/exposure state during recording.
- Audio meter never crosses the bridge per frame.
- Route changes finalize safely with a visible reason.

### Checkpoint G: Capture surface complete

- Every Release 1 capture control works during real recording.
- Accessibility actions and touch targets pass.
- No Release 1.1 control is exposed.

## Phase 4: Complete library and export

### WP-4.1: Complete catalog, recovery scan, and library states

Build newest-first virtualized listing, manifest migrations, catalog rebuild, thumbnails, grouped statuses, multi-selection, empty, loading, partial, interrupted, and corrupt states.

Exit evidence:

- Deleting SQLite and relaunching rebuilds the same visible library.
- Large fixture libraries remain responsive.
- Thumbnail failure never hides a playable take.

### WP-4.2: Complete recording detail and playback

Build metadata detail, warnings, native controls, full screen, AirPlay where supported, single/composite playback, synchronized discrete A/B playback, selectable primary, and side-by-side inspection.

Exit evidence:

- Discrete players remain within the approved playback sync tolerance.
- Playback resources release on navigation and backgrounding.
- Accessibility and large text pass on metadata surfaces.

### WP-4.3: Complete rename, permanent delete, sharing, and Photos export

Build validated rename, destructive deletion, one/both clip selection, native share, add-only Photos permission, batch progress, partial retry, and stale temporary-export cleanup.

Exit evidence:

- Export preserves original `.mov` files without re-encoding.
- Partial batch failure retries failed files only.
- Permanent delete removes clips, manifest, thumbnails, and catalog row after confirmation.

### Checkpoint H: Local media workflow complete

- Record, organize, inspect, export, and delete work for every mode.
- Photos denial does not block share or internal playback.
- Library remains correct after relaunch and catalog rebuild.

## Phase 5: Hardening and human-quality pass

### WP-5.1: Complete interruption and recovery hardening

Cover backgrounding, phone/audio interruption, route disconnect, media-services reset, native runtime error, writer failure, process death, and launch recovery across all modes.

Exit evidence:

- Failure injection maps every native condition to a stable user outcome.
- Every playable partial remains discoverable.
- No resource remains active after any terminal path.

### WP-5.2: Complete pressure, storage, and sustained-performance hardening

Enforce hardware-cost budgets, observe system pressure and thermal state, reduce preview diagnostics, handle backpressure, stop safely at critical thresholds, and present actionable warnings.

Exit evidence:

- Unsupported or unsustainable configurations never start.
- Thirty-minute stress passes the specification on the oldest supported test device.
- Memory has no prohibited monotonic growth.

### WP-5.3: Complete accessibility, native feel, and visual QA

Audit VoiceOver, focus order, actions, Dynamic Type, Reduce Motion, Increase Contrast, light/dark appearance, safe areas, orientation, touch targets, materials, haptics, and original visual identity on every screen and state.

Exit evidence:

- Automated accessibility assertions pass.
- Human visual review finds no clipping, stale frames, unreadable controls, or inconsistent materials.
- Motion is native or UI-thread driven and verified in a release build.

### Checkpoint I: Release candidate quality

- Full simulator suite, native suite, and real-device E2E pass.
- Every FR-01 through FR-15 requirement has linked evidence.
- Human accepts capture feel and visual quality before certification.

## Phase 6: Certification and handoff

### WP-6.1: Prove clean-checkout validation

Run installation, lint, type-check, coverage, native tests, synthetic E2E, Expo Doctor, iOS generation, development build, and production build from a clean checkout.

Exit evidence:

- `bun run validate` passes without ignored failures.
- No generated native files or captured media enter Git.
- Dependency and configuration diagnostics are clean.

### WP-6.2: Complete the physical-device matrix

Execute all offered camera pairs, modes, orientations, frame rates, permissions, audio routes, interruption cases, exports, and 30-minute stress on the required iPhone classes.

Exit evidence:

- `docs/device-matrix.md` records device, OS, pair, format, result, and known limitations.
- Runtime UI exposes only combinations proven by capability checks.
- Any A12 failure updates minimum-OS or device-support decisions through the spec gate.

### WP-6.3: Complete privacy and release documentation

Verify permission descriptions, no-network behavior, no telemetry, local storage disclosure, export behavior, acknowledgements, support diagnostics, and release runbook. Confirm the final bundle identifier and new EAS identity before signing work.

Exit evidence:

- Network inspection shows no unexpected traffic.
- Release documentation matches actual behavior.
- Production build is ready for separate store-submission planning.

### Checkpoint J: Release 1 complete

- Specification success criteria all pass.
- Final human device and visual review passes.
- Release 1 is ready for store-submission planning.
- Release 1.1 and Android remain separate unstarted milestones.

## Verification strategy by layer

| Layer | Primary verification | Cannot substitute |
| --- | --- | --- |
| TypeScript contracts and core | Jest with strict coverage | Device behavior |
| React Native screens | Testing Library plus synthetic E2E | Real native controls |
| Swift state and geometry | XCTest plus deterministic fixtures | Physical camera support |
| Writers and manifests | Synthetic sample buffers plus asset inspection | Long device recording |
| Navigation and lifecycle | Simulator E2E plus native event assertions | Background behavior on device |
| Capture feel and pressure | Release build on physical iPhone | Expo Go or simulator |
| Export | Controlled Photos/share device tests | Mock success responses |

## Standing definition of done

Every Phase 3 implementation task must satisfy all applicable items before its commit:

- Acceptance criteria and verification commands pass.
- The closest end-user E2E path passes before lower-level tests are treated as sufficient.
- Lint, type-check, affected JavaScript tests, and affected native tests pass.
- New behavior has success, failure, accessibility, and lifecycle coverage proportional to risk.
- Physical-device evidence exists for camera, microphone, pressure, gesture-feel, or export behavior that cannot be proven in simulator.
- No test, performance threshold, or visual baseline is weakened to obtain a pass.
- No secrets, media, private paths, generated native files, or unrelated starter content enter Git.
- Documentation, specification, architecture decision, and device matrix are updated when behavior or evidence changes.
- The worktree is reviewed for unrelated changes.
- One lowercase conventional commit records the completed task with no co-author line.

## Risks and mitigations

| Risk | Impact | Mitigation and gate |
| --- | --- | --- |
| Two 1080p streams exceed A12 budget | High | Capability report and 30-minute A12 gate before product breadth; raise device floor only through spec update |
| Writer choice cannot satisfy discrete and composite modes | High | Compare candidate graphs early and approve an architecture decision before Phase 2 |
| Audio duplication drifts between discrete files | High | Shared session clock, synthetic fixtures, 10-minute gate, and 30-minute certification |
| Metal preview differs from encoded output | High | Shared geometry model and deterministic pixel fixtures before PiP UI |
| Long recordings fail or finalize slowly | High | Staging, bounded buffers, asset validation, interruption tests, and long-record gate |
| Native view survives route or reload incorrectly | High | Explicit lifecycle ownership and repeated mount/background failure injection |
| Simulator success hides device-specific failures | High | Physical checkpoints B, C, E, F, G, I, and J |
| Starter identity or secret leaks into new app | High | Explicit allowlist, forbidden-file scan, new config, and source repository integrity check |
| SQLite loss hides media | Medium | Versioned sidecar manifests and rebuildable catalog |
| Photos permission blocks unrelated workflows | Medium | Request add-only access at export time and keep share/library independent |
| JavaScript load harms capture interaction | Medium | Native surface for frame-sensitive controls and no per-frame bridge traffic |
| Advanced or Android scope leaks into Release 1 | Medium | Compile-time and UI scope checks; separate roadmap milestones |

## Parallelization policy

Default execution is sequential because the native contracts and writer choice sit on the critical path. If the human explicitly authorizes parallel agent work later:

- Safe after contracts freeze: manifest fixtures, React Native library states, accessibility tests, and documentation.
- Safe after writer approval: PiP pixel fixtures and catalog rebuild tests.
- Must remain sequential: app identity migration, capture state machine, session graph, writer architecture, schema migrations, and shared native contracts.
- Any concurrent worker must own explicit files, avoid reverting other work, and make no architecture or dependency change without approval.

## Phase 3 task-breakdown rules

After this plan is approved, `tasks/todo.md` will be expanded into executable tasks that:

- Complete in one focused session.
- Touch no more than approximately five files. Larger work packages split by vertical behavior.
- Name exact acceptance criteria, verification commands, dependencies, and likely files.
- Add a checkpoint after every two or three tasks.
- Begin with an end-user reproduction or synthetic E2E failure before bug-fix implementation.
- End with one verified conventional commit.

## Open decisions at implementation checkpoints

These do not block plan approval:

- Final Apple bundle identifier and EAS project id at WP-6.3. Recommended bundle identifier: `com.ramimaalouf.openmulticam`.
- Exact connected iPhone inventory for checkpoints B through J.
- Final App Store signing and submission strategy, which is outside Release 1 implementation scope.

## Phase 2 approval gate

Human approval of this plan authorizes Phase 3 task decomposition only. It does not authorize starter migration or implementation. After `tasks/todo.md` is expanded and approved, implementation may begin from WP-0.1.
