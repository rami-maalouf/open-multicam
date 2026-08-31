# OpenMulticam Release 1 Executable Task List

Status: T011 in progress

Approved inputs: `SPEC.md` and `tasks/plan.md`

Date: 2026-08-31

## Workflow gates

- [x] Phase 1 specification approved
- [x] Phase 2 implementation plan approved
- [x] Phase 3 executable task breakdown approved
- [x] Phase 4 implementation authorized

Human approval of this file authorizes implementation beginning at T001. Until then, no starter migration, dependency installation, generation, or application code change is permitted.

## Execution contract

- Execute tasks in numeric order unless a dependency explicitly permits otherwise and the human authorizes parallel work.
- Before every task commit, run the task's focused verification plus `bun run validate` once that script exists.
- For tasks before `bun run validate` exists, run every available constituent command listed by the task.
- A camera, microphone, Photos, pressure, thermal, interruption, or sustained-performance claim requires physical-device evidence.
- If implementation needs more than five files, changes an approved architecture decision, or exposes a missing dependency, stop and split or revise the task before coding.
- Begin every bug fix with the closest failing end-user E2E or native integration reproduction.
- Preserve unrelated user work, never weaken a test to get a pass, and finish each task with exactly one lowercase conventional commit without a co-author line.

## Phase 0: Safe foundation

### T001: Establish the selective migration baseline

**Outcome:** Bring over only the approved Expo dependency and tooling foundation while preserving a fresh OpenMulticam repository identity.

**Acceptance criteria:**
- [x] Dependencies align with Expo SDK 57 and strict TypeScript without habit-tracker product packages.
- [x] Ignore rules exclude environments, generated native projects, media, evidence, coverage, and build artifacts.
- [x] A recorded allowlist proves the starter was read-only and no forbidden source was copied.

**Verification:**
- [x] Run `bun install` and `bunx expo install --check`.
- [x] Run `git status --short` in the starter and confirm it is unchanged.

**Dependencies:** None

**Files likely touched:** `.gitignore`, `package.json`, `bun.lock`, `tsconfig.json`, `docs/migration-allowlist.md`

**Estimated scope:** Medium, 5 files

**Commit:** `chore: establish openmulticam expo foundation`

### T002: Replace every product and build identity

**Outcome:** Configure an original iPhone-only OpenMulticam application without linking EAS or signing credentials.

**Acceptance criteria:**
- [x] Name, slug, scheme, iOS deployment target, orientation support, and permission descriptions match the approved specification.
- [x] No starter bundle identifier, update URL, project id, app group, CloudKit container, or credential remains.
- [x] Placeholder launch artwork and iconography are original OpenMulticam assets.

**Verification:**
- [x] Run `bunx expo config --type public` and inspect the resolved iOS configuration.
- [x] Run the documented forbidden-identity search from `docs/migration-allowlist.md`.

**Dependencies:** T001

**Files likely touched:** `app.json`, `eas.json`, `assets/icon.png`, `assets/splash-icon.png`, `docs/migration-allowlist.md`

**Estimated scope:** Medium, 5 files

**Commit:** `chore: configure openmulticam app identity`

#### Verification checkpoint 0A: Migration safety

- [x] T001 and T002 focused checks pass.
- [x] The source starter has no worktree change.
- [x] Human-only signing and EAS decisions remain untouched.

### T003: Establish test and validation commands

**Outcome:** Make every approved JavaScript, native, simulator, device, and repository validation command explicit and fail-closed.

**Acceptance criteria:**
- [x] Package scripts expose all commands listed in the specification and forward scenario arguments.
- [x] JavaScript coverage enforces 90 percent globally and supports stricter per-domain thresholds later.
- [x] Repository validation rejects generated native folders, captured media, secrets, and forbidden starter identity.

**Verification:**
- [x] Run `bun run lint`, `bun run typecheck`, and `bun run test:coverage`.
- [x] Intentionally exercise the repository checker with a temporary ignored fixture and confirm it reports the violation before the fixture is removed.

**Dependencies:** T002

**Files likely touched:** `package.json`, `jest.config.js`, `tests/setup.ts`, `scripts/check-repository.mjs`, `.gitignore`

**Estimated scope:** Medium, 5 files

**Commit:** `test: establish openmulticam validation commands`

### T004: Build the original semantic theme foundation

**Outcome:** Create one semantic color, type, spacing, radius, material, and motion source for the app shell.

**Acceptance criteria:**
- [x] Tokens support light, dark, increased contrast, and camera-preview readability without copied product styling.
- [x] `AppText` and `Icon` consume semantic roles and preserve Dynamic Type.
- [x] Foundation tests assert role selection rather than raw implementation details.

**Verification:**
- [x] Run `bun run test -- foundation-theme` and `bun run typecheck`.
- [x] Review token output in light and dark appearances.

**Dependencies:** T003

**Files likely touched:** `src/theme/index.ts`, `src/theme/tokens.ts`, `src/components/app-text.tsx`, `src/components/icon.tsx`, `tests/features/foundation-theme.test.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add openmulticam semantic theme`

#### Verification checkpoint 0B: Tooling and theme

- [x] T003 and T004 focused tests pass.
- [x] `bun run validate` has one documented fail-closed meaning.
- [x] Theme roles remain readable over both solid surfaces and live-preview placeholders.

### T005: Add accessibility, haptics, and adaptive material foundations

**Outcome:** Provide small shared helpers for accessibility preferences, approved haptics, and native-feeling preview overlays.

**Acceptance criteria:**
- [x] Reduce Motion and Increase Contrast are observable without screen-owned duplication.
- [x] Haptic calls map semantic events to supported native feedback and degrade safely.
- [x] Adaptive material preserves contrast and does not wrap native controls solely for restyling.

**Verification:**
- [x] Run `bun run test -- foundation-behavior` and `bun run typecheck`.
- [x] Manually inspect large text, Reduce Motion, and Increase Contrast in the development client.

**Dependencies:** T004

**Files likely touched:** `src/foundation/accessibility/preferences.tsx`, `src/foundation/haptics/haptics.ts`, `src/components/adaptive-material.tsx`, `src/testing/render.tsx`, `tests/features/foundation-behavior.test.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add native interaction foundations`

### T006: Deliver the minimal routes-only application shell

**Outcome:** Launch an original capture-first Expo Router shell with reachable Library and Settings placeholders.

**Acceptance criteria:**
- [x] Route files contain navigation translation only and render dedicated screen bodies.
- [x] Capture, Library, and Settings remain reachable with correct accessibility titles and safe areas.
- [x] No habit-tracker route, model, copy, or asset survives.

**Verification:**
- [x] Run `bun run typecheck` and `bunx expo-doctor`.
- [x] Run `bun run ios` and manually navigate all three destinations in a development client.

**Dependencies:** T005

**Files likely touched:** `src/app/_layout.tsx`, `src/app/index.tsx`, `src/app/library/index.tsx`, `src/app/settings.tsx`, `src/screens/shell/app-shell-screens.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add openmulticam route shell`

### T007A: Add fail-closed E2E scenario runners

**Outcome:** Route named simulator and device scenarios through explicit Bun entry points without letting an unavailable scenario pass.

**Acceptance criteria:**
- [x] Package commands forward scenario arguments to Bun-owned runners instead of unsupported Jest flags.
- [x] The simulator runner executes only a known scenario test and rejects missing or unknown scenarios.
- [x] The device runner rejects every scenario until a physical-device harness is implemented.

**Verification:**
- [x] Run `bun run test:e2e:sim -- --scenario unavailable` and confirm an actionable nonzero exit.
- [x] Run `bun run test:e2e:device -- --scenario unavailable` and confirm the runner exits nonzero with an actionable message.

**Dependencies:** T006

**Files likely touched:** `package.json`, `e2e/simulator/runner.ts`, `e2e/simulator/foundation-preview.test.ts`, `e2e/device/runner.ts`

**Estimated scope:** Small, 4 files

**Commit:** `test: add e2e scenario runners`

### T007B: Add the development foundation preview

**Outcome:** Make semantic foundation states reviewable while keeping synthetic controls out of release behavior.

**Acceptance criteria:**
- [x] A development-only screen renders semantic controls across appearance and text-size states.
- [x] The foundation-preview simulator scenario verifies the reachable review surface.
- [x] The development screen and synthetic switches redirect away from release behavior.

**Verification:**
- [x] Run `bun run test -- release-surface` and `bun run typecheck`.
- [x] Run `bun run test:e2e:sim -- --scenario foundation-preview`.

**Dependencies:** T007A

**Files likely touched:** `src/app/dev-foundation.tsx`, `src/screens/settings/foundation-preview-screen.tsx`, `tests/features/release-surface.test.tsx`

**Estimated scope:** Medium, 3 files

**Commit:** `test: add foundation review harness`

#### Checkpoint A: Foundation approval

- [x] T005 through T007B and `bun run validate` pass from a clean checkout.
- [x] Secret, identity, and forbidden-file scans pass.
- [x] A development client launches the original shell on an iPhone simulator.
- [x] Human approves the visual foundation before native capture UI work.

## Phase 1: Retire native feasibility risks

### T008: Freeze TypeScript capture and result contracts

**Outcome:** Define platform-neutral capture states, capability results, requests, error codes, and event cadence before native implementation.

**Acceptance criteria:**
- [x] Public states and failures use exhaustive discriminated unions with no raw native error leakage.
- [x] Requests cannot represent an unsupported mode, frame-rate, or output combination without validation.
- [x] Contract tests cover every terminal state and error code.

**Verification:**
- [x] Run `bun run test -- capture-contracts` and `bun run typecheck`.

**Dependencies:** Checkpoint A

**Files likely touched:** `src/core/results/result.ts`, `src/core/capture/types.ts`, `src/core/capture/contracts.ts`, `src/core/capture/errors.ts`, `tests/capture/capture-contracts.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: define capture boundary contracts`

### T009: Freeze the versioned recording manifest contract

**Outcome:** Define one durable manifest shared by single, discrete, PiP, and split recordings.

**Acceptance criteria:**
- [x] Manifest and clip schemas represent staging, ready, recoverable, interrupted, and corrupt outcomes.
- [x] Schema versioning rejects unknown future versions without hiding files.
- [x] Fixture tests cover all Release 1 modes and expected A/B identity.

**Verification:**
- [x] Run `bun run test -- recording-manifest` and `bun run typecheck`.

**Dependencies:** T008

**Files likely touched:** `src/core/library/manifest.ts`, `src/core/library/manifest-schema.ts`, `src/testing/recording-fixtures.ts`, `tests/library/recording-manifest.test.ts`

**Estimated scope:** Medium, 4 files

**Commit:** `feat: define recording manifest contract`

#### Verification checkpoint 1A: JavaScript contracts

- [x] T008 and T009 tests pass with exhaustive type checking.
- [x] Contract fixtures cover every Release 1 output shape.
- [x] No frame or sample-buffer type exists in the JavaScript boundary.

### T010A: Scaffold the local Expo capture boundary

**Outcome:** Establish the typed Expo Modules boundary and native view registration without real camera ownership.

**Acceptance criteria:**
- [x] The module exposes typed capability, lifecycle, and command surfaces matching T008 and T009.
- [x] The native surface is registered for iOS development clients.
- [x] Unsupported simulator calls return stable typed results.

**Verification:**
- [x] Run `bun run typecheck` and the focused capture-boundary tests.

**Dependencies:** T009

**Files likely touched:** `modules/multicam-capture/expo-module.config.json`, `modules/multicam-capture/index.ts`, `modules/multicam-capture/ios/MulticamCapture.podspec`, `modules/multicam-capture/ios/CaptureModule.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: scaffold multicam capture module`

### T010B: Add an executable native test harness

**Outcome:** Make Swift module tests runnable from the repository validation contract.

**Acceptance criteria:**
- [x] `bun run test:native` executes XCTest cases instead of returning the repository placeholder failure.
- [x] Tests prove the simulator's stable unsupported results and the module's bounded lifecycle state.
- [x] Native test failures produce a nonzero exit status and readable diagnostics.

**Verification:**
- [x] Run `bun run test:native` and deliberately prove the runner detects one temporary failing assertion before restoring it.

**Dependencies:** T010A

**Files likely touched:** `modules/multicam-capture/ios/MulticamCapture.podspec`, `modules/multicam-capture/ios/Tests/CaptureModuleTests.swift`, `scripts/run-native-tests.mjs`, `scripts/check-repository.mjs`

**Estimated scope:** Medium, 4 files

**Commit:** `test: add native module test harness`

### T010C: Mount and verify the native capture surface

**Outcome:** Replace the JavaScript placeholder with the registered native surface and its bounded state events.

**Acceptance criteria:**
- [x] The native surface mounts in the iOS development client without owning camera resources.
- [x] Mount and app lifecycle changes publish only the documented state payloads.
- [x] The simulator communicates that multicamera capture is unavailable without crashing or leaking framework errors.

**Verification:**
- [x] Run focused surface tests, `bun run typecheck`, `bun run test:native`, and `bun run ios`.

**Dependencies:** T010B

**Files likely touched:** `modules/multicam-capture/index.ts`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `src/screens/shell/app-shell-screens.tsx`, `tests/features/capture-surface.test.tsx`

**Estimated scope:** Medium, 4 files

**Commit:** `feat: mount multicam capture surface`

### T011: Implement and prove the native capture state machine

**Outcome:** Make one Swift state machine authoritative for idle, preparing, previewing, recording, finalizing, completed, interrupted, recoverable, and failed states.

**Acceptance criteria:**
- [x] Illegal transitions fail deterministically and never partially mutate capture state.
- [x] Terminal paths require explicit teardown and cannot report completion before asset validation.
- [x] State-machine tests reach complete measurable coverage: Swift emitted no branch counters, so the gate requires 100 percent executable-region and line coverage.

**Verification:**
- [x] Run `bun run test:native` and inspect the state-machine coverage report.

**Dependencies:** T010C

**Files likely touched:** `modules/multicam-capture/ios/CaptureStateMachine.swift`, `modules/multicam-capture/ios/CaptureModels.swift`, `modules/multicam-capture/ios/Tests/CaptureStateMachineTests.swift`

**Estimated scope:** Medium, 3 files

**Commit:** `feat: add authoritative capture state machine`

#### Verification checkpoint 1B: Native boundary and state

- [x] T010A, T010B, T010C, and T011 native tests pass.
- [x] Module events round-trip through TypeScript without raw file paths or framework errors.
- [x] An illegal transition cannot activate a capture resource.

### T012: Add deterministic synthetic media input

**Outcome:** Feed two labeled video streams and one audio timeline into production-shaped native contracts in debug builds.

**Acceptance criteria:**
- [ ] Synthetic samples have deterministic content, timestamps, orientation, and audio markers.
- [ ] Failure injection can simulate dropped samples, writer failure, route change, interruption, and low storage.
- [ ] Release builds cannot enable synthetic mode through API, route, or deep link.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test -- release-surface`.

**Dependencies:** T011

**Files likely touched:** `modules/multicam-capture/ios/Synthetic/SyntheticSource.swift`, `modules/multicam-capture/ios/Synthetic/SyntheticScenario.swift`, `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/Tests/SyntheticSourceTests.swift`, `tests/features/release-surface.test.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `test: add deterministic capture source`

### T013: Prove native view and service lifecycle ownership

**Outcome:** Guarantee that mount, unmount, background, foreground, fast refresh, and reload cannot orphan capture resources.

**Acceptance criteria:**
- [ ] The service has one explicit owner and idempotent teardown.
- [ ] Repeated mount and unmount cycles leave no active session, writer, timer, or observer.
- [ ] Background cover and foreground restoration follow the state contract.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:sim -- --scenario capture-lifecycle`.

**Dependencies:** T012

**Files likely touched:** `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/Diagnostics/ResourceTracker.swift`, `modules/multicam-capture/ios/Tests/CaptureLifecycleTests.swift`, `e2e/simulator/capture-lifecycle.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `fix: enforce capture resource ownership`

#### Verification checkpoint 1C: Synthetic lifecycle

- [ ] T012 and T013 pass repeated lifecycle and failure-injection runs.
- [ ] Release-surface tests prove synthetic input is debug-only.
- [ ] No per-frame event crosses the JavaScript bridge.

### T014: Implement capability and format resolution

**Outcome:** Enumerate real cameras, exact multicamera sets, 1080p formats, 24/25/30 support, stabilization, and hardware cost as typed capabilities.

**Acceptance criteria:**
- [ ] Unsupported pairs and formats are rejected with stable reasons.
- [ ] Recommended pairs are derived from available hardware, never hard-coded by marketing device name.
- [ ] A safe single-camera fallback is always represented when any camera is usable.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test -- capability-contracts`.

**Dependencies:** T013

**Files likely touched:** `modules/multicam-capture/ios/CapabilityResolver.swift`, `modules/multicam-capture/ios/CapabilityModels.swift`, `modules/multicam-capture/ios/Tests/CapabilityResolverTests.swift`, `src/core/capture/capability-policy.ts`, `tests/capture/capability-contracts.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: resolve supported camera capabilities`

### T015: Bring up validated single and dual preview graphs

**Outcome:** Configure `AVCaptureMultiCamSession` only from resolved capabilities and display native single or dual preview.

**Acceptance criteria:**
- [ ] Session graph creation is isolated from the main thread and rolls back atomically on failure.
- [ ] Dual preview starts only for a resolver-approved pair and shares one session clock.
- [ ] Reconfiguration, backgrounding, and media-services reset cannot leak inputs or connections.

**Verification:**
- [ ] Run `bun run test:native`.
- [ ] Run `bun run test:e2e:device -- --scenario capability-preview` on each available test iPhone.

**Dependencies:** T014

**Files likely touched:** `modules/multicam-capture/ios/SessionGraph.swift`, `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/Tests/SessionGraphTests.swift`, `e2e/device/capability-preview.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add validated multicamera preview`

### T016: Record sanitized device capability evidence

**Outcome:** Produce comparable capability reports for the oldest, mid-generation Pro, and current Pro classes when hardware is available.

**Acceptance criteria:**
- [ ] Reports record OS, camera types, supported pairs, formats, rates, stabilization, and measured cost without personal identifiers.
- [ ] Missing hardware is marked pending rather than inferred.
- [ ] Any contradiction with the iOS 18.6 baseline is escalated through the specification gate.

**Verification:**
- [ ] Run `bun run test:e2e:device -- --scenario capability-report`.
- [ ] Validate `docs/device-matrix.md` against `docs/device-matrix.schema.json`.

**Dependencies:** T015

**Files likely touched:** `modules/multicam-capture/ios/Diagnostics/CapabilityReporter.swift`, `modules/multicam-capture/ios/Tests/CapabilityReporterTests.swift`, `e2e/device/capability-report.test.ts`, `docs/device-matrix.md`, `docs/device-matrix.schema.json`

**Estimated scope:** Medium, 5 files

**Commit:** `docs: record multicamera capability evidence`

#### Verification checkpoint 1D: Capability and preview

- [ ] T014 through T016 automated checks pass.
- [ ] At least one real iPhone proves single and supported dual preview.
- [ ] Unavailable device classes remain explicit pending evidence.

### T017: Define writer candidates and asset fixtures

**Outcome:** Create one writer protocol and deterministic assets that can compare movie-output and synchronized sample-buffer designs fairly.

**Acceptance criteria:**
- [ ] Both candidates receive identical timestamped video and audio inputs.
- [ ] Fixtures encode measurable start, end, drift, dropped-sample, and failure markers.
- [ ] Candidate output is isolated from production manifests until a decision is approved.

**Verification:**
- [ ] Run `bun run test:native` and inspect generated test assets outside Git.

**Dependencies:** T016

**Files likely touched:** `modules/multicam-capture/ios/Writers/WriterCandidate.swift`, `modules/multicam-capture/ios/Writers/WriterFixtures.swift`, `modules/multicam-capture/ios/Tests/WriterFixtureTests.swift`, `modules/multicam-capture/ios/Tests/WriterCandidateContractTests.swift`

**Estimated scope:** Medium, 4 files

**Commit:** `test: define comparable writer candidates`

### T018: Prototype the two discrete writer graphs

**Outcome:** Implement bounded prototypes for paired movie output and synchronized data output plus AVAssetWriter.

**Acceptance criteria:**
- [ ] Each candidate writes two 1080p H.264 `.mov` files with one aligned AAC timeline.
- [ ] Stop, cancellation, input starvation, and writer failure return comparable typed results.
- [ ] Prototype resources are bounded and deterministic under synthetic load.

**Verification:**
- [ ] Run `bun run test:native` with both writer candidates enabled in tests.

**Dependencies:** T017

**Files likely touched:** `modules/multicam-capture/ios/Writers/MovieOutputCandidate.swift`, `modules/multicam-capture/ios/Writers/AssetWriterCandidate.swift`, `modules/multicam-capture/ios/Writers/WriterBenchmark.swift`, `modules/multicam-capture/ios/Tests/WriterBenchmarkTests.swift`, `modules/multicam-capture/ios/Tests/WriterFailureTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: prototype discrete writer graphs`

#### Verification checkpoint 1E: Writer prototypes

- [ ] T017 and T018 native suites pass for both candidates.
- [ ] Neither candidate reports completion after a missing or corrupt output.
- [ ] Benchmark output contains enough evidence to make the architecture decision.

### T019: Measure synchronization, audio, and asset validity

**Outcome:** Reopen every candidate output and calculate exact track, duration, drift, frame-rate, playability, and audio-alignment results.

**Acceptance criteria:**
- [ ] Asset inspection validates expected video and AAC tracks, dimensions, duration, and frame rate.
- [ ] A/B and audio drift are reported in frames from one session-clock origin.
- [ ] Ten-minute physical recordings identify any finalization or thermal divergence between candidates.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario writer-benchmark`.

**Dependencies:** T018

**Files likely touched:** `modules/multicam-capture/ios/Writers/AssetValidator.swift`, `modules/multicam-capture/ios/Diagnostics/WriterMetrics.swift`, `modules/multicam-capture/ios/Tests/AssetValidatorTests.swift`, `e2e/device/writer-benchmark.test.ts`, `docs/writer-benchmark.md`

**Estimated scope:** Medium, 5 files

**Commit:** `test: measure multicamera writer behavior`

### T020: Approve and codify the writer architecture

**Outcome:** Select the simplest candidate that satisfies synchronization, compositing, recovery, and performance requirements, then remove the rejected runtime path.

**Acceptance criteria:**
- [ ] The decision record contains measured results, selected architecture, rejected alternative, and consequences.
- [ ] Production writer interfaces expose one selected implementation with stable typed failures.
- [ ] The approved implementation passes synthetic and ten-minute physical output validation.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario discrete-ten-minute`.
- [ ] Human approves `docs/architecture/0001-writer-architecture.md` before T021.

**Dependencies:** T019

**Files likely touched:** `docs/architecture/0001-writer-architecture.md`, `modules/multicam-capture/ios/Writers/RecordingWriter.swift`, `modules/multicam-capture/ios/Writers/SelectedWriter.swift`, `modules/multicam-capture/ios/Tests/SelectedWriterTests.swift`, `docs/writer-benchmark.md`

**Estimated scope:** Medium, 5 files

**Commit:** `docs: approve multicamera writer architecture`

#### Checkpoint B: Discrete capture feasibility

- [ ] T019 and T020 meet the one-frame synchronization and audio thresholds.
- [ ] A real ten-minute discrete take is playable and recoverable.
- [ ] Human approves the writer decision before composite or product capture work.

### T021: Define shared composite geometry and pixel fixtures

**Outcome:** Make preview and encoded output consume the same normalized PiP and split geometry rules.

**Acceptance criteria:**
- [ ] Geometry covers aspect-fill cropping, orientation, source swap, PiP anchors, visibility, and split positions.
- [ ] Golden pixel fixtures use original synthetic imagery and measurable boundaries.
- [ ] Geometry calculation is deterministic and independent of UIKit view size.

**Verification:**
- [ ] Run `bun run test:native` for geometry and pixel-fixture suites.

**Dependencies:** Checkpoint B

**Files likely touched:** `modules/multicam-capture/ios/Compositor/CompositeGeometry.swift`, `modules/multicam-capture/ios/Compositor/CompositeLayout.swift`, `modules/multicam-capture/ios/Tests/CompositeGeometryTests.swift`, `modules/multicam-capture/ios/Tests/CompositePixelFixtures.swift`

**Estimated scope:** Medium, 4 files

**Commit:** `feat: define shared composite geometry`

### T022: Prove the Metal compositor and pixel-buffer pool

**Outcome:** Render deterministic dual inputs to bounded 1080p Metal output suitable for both preview and the approved writer.

**Acceptance criteria:**
- [ ] Output matches T021 fixtures in portrait and landscape for PiP and split.
- [ ] Pixel buffers are pooled and show no prohibited monotonic memory growth.
- [ ] Backpressure and missing-input cases produce deterministic typed outcomes.

**Verification:**
- [ ] Run `bun run test:native` and inspect memory metrics from the compositor stress fixture.

**Dependencies:** T021

**Files likely touched:** `modules/multicam-capture/ios/Compositor/MetalCompositor.swift`, `modules/multicam-capture/ios/Compositor/PixelBufferPool.swift`, `modules/multicam-capture/ios/Compositor/Shaders.metal`, `modules/multicam-capture/ios/Tests/MetalCompositorTests.swift`, `modules/multicam-capture/ios/Tests/CompositorStressTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add bounded metal compositor`

### T023: Connect composite preview to the selected writer

**Outcome:** Prove one timestamped composite path produces matching native preview and encoded files.

**Acceptance criteria:**
- [ ] Preview and writer consume the same layout events and session timestamps.
- [ ] PiP changes recorded during a take appear at the same geometry and time in playback.
- [ ] Portrait and landscape assets validate at specified 1080p dimensions.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario composite-proof`.

**Dependencies:** T022

**Files likely touched:** `modules/multicam-capture/ios/Compositor/CompositePipeline.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/Writers/SelectedWriter.swift`, `modules/multicam-capture/ios/Tests/CompositePipelineTests.swift`, `e2e/device/composite-proof.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: connect composite preview and writer`

#### Verification checkpoint 1F: Composite path

- [ ] T021 through T023 pixel, asset, and device checks pass.
- [ ] Preview and encoded output agree for PiP and split layouts.
- [ ] Composite input never crosses the JavaScript bridge.

### T024: Implement staging, atomic manifests, and recovery classification

**Outcome:** Move every take through explicit staging, validation, atomic manifest creation, and final placement.

**Acceptance criteria:**
- [ ] A ready take exists only after every expected asset validates and the sidecar manifest is atomically durable.
- [ ] Launch scan classifies playable partial, unplayable partial, missing manifest, and corrupt manifest outcomes.
- [ ] Recovery is idempotent across repeated launches.

**Verification:**
- [ ] Run `bun run test:native` with force-quit and malformed-staging fixtures.

**Dependencies:** T023

**Files likely touched:** `modules/multicam-capture/ios/Storage/RecordingStore.swift`, `modules/multicam-capture/ios/Storage/ManifestStore.swift`, `modules/multicam-capture/ios/Storage/RecoveryScanner.swift`, `modules/multicam-capture/ios/Tests/RecordingStoreTests.swift`, `modules/multicam-capture/ios/Tests/RecoveryScannerTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add atomic recording storage`

### T025: Enforce storage preflight, bounded writing, and finalization

**Outcome:** Prevent unsafe starts and control memory, backpressure, low-space, and stop finalization.

**Acceptance criteria:**
- [ ] Recording cannot start without sufficient space, ready writers, valid audio route, and sustainable configuration.
- [ ] Sample backpressure is bounded and visible in native diagnostics without unbounded queues.
- [ ] Finalization meets short-take targets and returns recoverable outcomes on interruption.

**Verification:**
- [ ] Run `bun run test:native` with low-space, backpressure, and interrupted-finalization fixtures.

**Dependencies:** T024

**Files likely touched:** `modules/multicam-capture/ios/Storage/StoragePreflight.swift`, `modules/multicam-capture/ios/Writers/WriterBackpressure.swift`, `modules/multicam-capture/ios/Writers/SelectedWriter.swift`, `modules/multicam-capture/ios/Tests/StoragePreflightTests.swift`, `modules/multicam-capture/ios/Tests/FinalizationTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: harden writer storage lifecycle`

### T026: Prove thirty-minute native architecture stability

**Outcome:** Exercise the approved discrete and composite pipelines on target hardware before product UI breadth.

**Acceptance criteria:**
- [ ] Thirty-minute default capture meets memory, drift, audio, dropped-frame, pressure, and finalization thresholds.
- [ ] Force quit during staging and finalization produces the expected recovery classification.
- [ ] Evidence records environment, device class, OS, configuration, and measured results.

**Verification:**
- [ ] Run `bun run test:e2e:device -- --scenario native-thirty-minute` on the oldest available target iPhone.
- [ ] Run `bun run test:native` after the device session.

**Dependencies:** T025

**Files likely touched:** `e2e/device/native-thirty-minute.test.ts`, `e2e/device/force-quit-recovery.test.ts`, `docs/device-matrix.md`, `docs/recovery.md`, `docs/performance-baseline.md`

**Estimated scope:** Medium, 5 files

**Commit:** `test: prove native capture stability`

#### Checkpoint C: Native architecture gate

- [ ] T024 through T026 and full validation pass.
- [ ] Discrete and composite modes share contracts, writer behavior, storage, and recovery.
- [ ] Thirty-minute evidence meets the approved thresholds on available target hardware.
- [ ] Any failed architectural assumption updates `SPEC.md` and `tasks/plan.md` before Phase 2.

## Phase 2: First end-to-end product slice

### T027: Model camera and microphone permission outcomes

**Outcome:** Represent undetermined, granted, denied, restricted, and Settings-return permission states without coupling screens to platform APIs.

**Acceptance criteria:**
- [ ] Camera and microphone requests occur only after user education and only when needed.
- [ ] Denied and restricted states expose stable recovery actions while Library and Settings remain usable.
- [ ] Permission adapters return typed results and never treat partial grants as full capture readiness.

**Verification:**
- [ ] Run `bun run test -- permission-policy` and `bun run typecheck`.

**Dependencies:** Checkpoint C

**Files likely touched:** `src/core/capture/permission-policy.ts`, `src/platform/permissions/capture-permissions.ts`, `src/core/capture/errors.ts`, `tests/capture/permission-policy.test.ts`

**Estimated scope:** Medium, 4 files

**Commit:** `feat: model capture permission outcomes`

### T028: Deliver permission education and denied-state recovery

**Outcome:** Build the first-launch and blocked-permission surfaces around the real app shell.

**Acceptance criteria:**
- [ ] Education explains camera, microphone, local storage, and no-cloud behavior before system prompts.
- [ ] Denial, restriction, partial grant, and Settings return each show the correct accessible action.
- [ ] Users can navigate to Library and Settings without granting capture access.

**Verification:**
- [ ] Run `bun run test -- permission-screen` and `bun run test:e2e:sim -- --scenario permissions`.

**Dependencies:** T027

**Files likely touched:** `src/screens/capture/permission-screen.tsx`, `src/screens/capture/capture-screen.tsx`, `src/components/permission-action.tsx`, `tests/features/permission-screen.test.tsx`, `e2e/simulator/permissions.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add capture permission journey`

#### Verification checkpoint 2A: Permission journey

- [ ] T027 and T028 pass fresh, denied, restricted, and Settings-return scenarios.
- [ ] Library and Settings remain reachable under every permission state.
- [ ] Copy accurately describes local-only behavior.

### T029: Put live single-camera preview in the capture route

**Outcome:** Connect the React Native capture screen to the native surface for permission-gated single-camera preview.

**Acceptance criteria:**
- [ ] Preview starts only while the capture route is active and fully authorized.
- [ ] Backgrounding covers preview immediately and deterministic teardown occurs on route exit.
- [ ] Loading, unavailable, interrupted, and retry states are accessible and do not show stale frames.

**Verification:**
- [ ] Run `bun run test -- single-preview` and `bun run test:e2e:sim -- --scenario single-preview`.
- [ ] Run `bun run test:e2e:device -- --scenario single-preview-lifecycle`.

**Dependencies:** T028

**Files likely touched:** `src/platform/capture/capture-client.ts`, `src/components/capture-surface.tsx`, `src/screens/capture/capture-screen.tsx`, `tests/features/single-preview.test.tsx`, `e2e/device/single-preview-lifecycle.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: deliver single camera preview`

### T030: Create the rebuildable SQLite catalog

**Outcome:** Index versioned manifests in SQLite while keeping media files and manifests as durable truth.

**Acceptance criteria:**
- [ ] Catalog rows represent recording set identity, mode, timestamps, status, clips, and thumbnail references.
- [ ] Schema creation and migration are transactional and idempotent.
- [ ] Deleting the database and scanning fixtures reconstructs the same catalog ordering and status.

**Verification:**
- [ ] Run `bun run test -- recording-catalog` and `bun run typecheck`.

**Dependencies:** T029

**Files likely touched:** `src/platform/database/catalog.ts`, `src/platform/database/schema.ts`, `src/platform/database/migrations.ts`, `src/core/library/catalog.ts`, `tests/library/recording-catalog.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add rebuildable recording catalog`

#### Verification checkpoint 2B: Preview and catalog foundation

- [ ] T029 and T030 focused checks pass.
- [ ] Route transitions release native preview resources.
- [ ] Catalog deletion and rebuild preserve fixture results.

### T031: Add native single-camera record and stop controls

**Outcome:** Drive the approved writer, state machine, storage, and one-frame visual feedback from the native capture surface.

**Acceptance criteria:**
- [ ] Record starts only after native preflight and stop transitions immediately to finalizing.
- [ ] Visual and haptic record feedback appears within one display frame without waiting for JavaScript.
- [ ] A successful single-camera take contains one validated H.264 clip and AAC audio in one ready manifest.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario single-record-native`.

**Dependencies:** T030

**Files likely touched:** `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/index.ts`, `src/platform/capture/capture-client.ts`, `modules/multicam-capture/ios/Tests/SingleRecordingTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add native single camera recording`

### T032: Persist and index completed single-camera takes

**Outcome:** Import native completion and recovery reports into the manifest-backed catalog exactly once.

**Acceptance criteria:**
- [ ] Ready native manifests create or update one catalog row idempotently.
- [ ] Failed validation never creates a ready row and remains recoverable when appropriate.
- [ ] Relaunch reconciliation restores takes missed during JavaScript suspension or process exit.

**Verification:**
- [ ] Run `bun run test -- recording-import` and `bun run test:e2e:sim -- --scenario record-persist-relaunch`.

**Dependencies:** T031

**Files likely touched:** `src/core/library/import-recordings.ts`, `src/core/library/recording-repository.ts`, `src/platform/database/catalog.ts`, `tests/library/recording-import.test.ts`, `e2e/simulator/record-persist-relaunch.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: persist completed recordings`

### T033: List and play the first recording

**Outcome:** Complete the first user journey from capture through newest-first Library, recording detail, and native playback.

**Acceptance criteria:**
- [ ] A completed take appears once with mode, duration, date, thumbnail state, and readiness.
- [ ] Selecting it opens metadata and playable `expo-video` controls without exposing private paths.
- [ ] Playback releases resources on navigation and backgrounding.

**Verification:**
- [ ] Run `bun run test -- first-recording-playback` and `bun run test:e2e:sim -- --scenario record-to-playback`.

**Dependencies:** T032

**Files likely touched:** `src/screens/library/library-screen.tsx`, `src/screens/recording-detail/recording-detail-screen.tsx`, `src/app/library/[recordingSetId].tsx`, `tests/features/first-recording-playback.test.tsx`, `e2e/simulator/record-to-playback.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: complete first recording playback flow`

#### Verification checkpoint 2C: First successful vertical slice

- [ ] T031 through T033 pass synthetic and physical single-camera recording.
- [ ] Relaunch retains the ready take and playback remains valid.
- [ ] No successful state exists before native asset validation.

### T034: Normalize native interruption and runtime failures

**Outcome:** Map backgrounding, audio route change, media-services reset, writer failure, and runtime errors to deterministic capture outcomes.

**Acceptance criteria:**
- [ ] Each interruption either finalizes a valid take or leaves an explicit recoverable or failed result.
- [ ] Native observers and writers tear down exactly once on every terminal path.
- [ ] User-safe error codes preserve diagnostics without exposing framework objects.

**Verification:**
- [ ] Run `bun run test:native` with all interruption and runtime failure scenarios.

**Dependencies:** T033

**Files likely touched:** `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/Diagnostics/InterruptionMonitor.swift`, `modules/multicam-capture/ios/Diagnostics/ErrorMapper.swift`, `modules/multicam-capture/ios/Tests/InterruptionTests.swift`, `modules/multicam-capture/ios/Tests/ErrorMappingTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `fix: normalize capture interruption outcomes`

#### Verification checkpoint 2D: Successful and interrupted capture

- [ ] T033 and T034 verification passes without developer reload.
- [ ] Every terminal state has one resource teardown and one visible outcome.
- [ ] Playable interrupted output remains discoverable.

### T035: Reconcile recoverable takes on launch

**Outcome:** Convert native recovery classifications into accessible Library states and explicit user actions.

**Acceptance criteria:**
- [ ] Playable partial, unplayable partial, missing manifest, and corrupt manifest each map to a stable catalog state.
- [ ] Retry and discard actions are idempotent across relaunch.
- [ ] A recovery failure never hides original files or marks a take ready.

**Verification:**
- [ ] Run `bun run test -- recovery-reconciliation` and `bun run test:e2e:sim -- --scenario launch-recovery`.

**Dependencies:** T034

**Files likely touched:** `src/core/library/reconcile-recovery.ts`, `src/core/library/recovery-policy.ts`, `src/screens/library/recovery-card.tsx`, `tests/recovery/recovery-reconciliation.test.ts`, `e2e/simulator/launch-recovery.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: reconcile interrupted recordings`

### T036: Complete retry and permanent-delete failure paths

**Outcome:** Let users retry recoverable actions or permanently delete a recording set after explicit destructive confirmation.

**Acceptance criteria:**
- [ ] Delete confirmation names the take and clearly states that deletion cannot be undone.
- [ ] Deletion removes clips, manifest, thumbnail, staging residue, and catalog row as one observable operation.
- [ ] Partial deletion failure remains visible and retryable without creating a phantom ready row.

**Verification:**
- [ ] Run `bun run test -- recording-delete` and `bun run test:e2e:sim -- --scenario recovery-delete`.

**Dependencies:** T035

**Files likely touched:** `src/core/library/delete-recording.ts`, `src/platform/database/catalog.ts`, `src/screens/recording-detail/delete-recording-action.tsx`, `tests/library/recording-delete.test.ts`, `e2e/simulator/recovery-delete.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add permanent recording deletion`

#### Checkpoint D: First complete user journey

- [ ] T035 and T036 plus `bun run validate` pass.
- [ ] Permission to record to relaunch to playback works in synthetic mode and on a real iPhone.
- [ ] Low storage, interruption, force quit, retry, and permanent delete have clear outcomes.
- [ ] Human reviews the first complete user journey before multicamera product breadth.

## Phase 3: Multicamera product slices

### T037: Define valid camera-pair and capture-preset selection

**Outcome:** Convert native capabilities into a platform-neutral selection state for A/B cameras, mode, orientation, and 24/25/30 fps.

**Acceptance criteria:**
- [ ] Selection can contain only a resolver-approved pair and mutually supported Release 1 preset.
- [ ] Recommended pair, unavailable reasons, and single-camera fallback are deterministic.
- [ ] Persisted selections are revalidated against current capabilities before use.

**Verification:**
- [ ] Run `bun run test -- camera-selection` and `bun run typecheck`.

**Dependencies:** Checkpoint D

**Files likely touched:** `src/core/capture/camera-selection.ts`, `src/core/capture/capture-preset.ts`, `src/core/capture/capability-policy.ts`, `src/testing/capability-fixtures.ts`, `tests/capture/camera-selection.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: define valid camera selection`

### T038: Build the camera picker and capture settings surfaces

**Outcome:** Present original live camera choices, A/B roles, modes, orientations, frame rates, recommendations, and honest unavailable states.

**Acceptance criteria:**
- [ ] The UI cannot construct or save a pairing rejected by T037.
- [ ] Every disabled choice exposes an accessible reason and a safe alternative.
- [ ] Camera identity, A/B role, selected mode, and current preset remain clear at large text sizes.

**Verification:**
- [ ] Run `bun run test -- camera-picker` and `bun run test:e2e:sim -- --scenario camera-picker`.

**Dependencies:** T037

**Files likely touched:** `src/screens/camera-picker/camera-picker-screen.tsx`, `src/screens/capture/capture-settings-screen.tsx`, `src/app/camera-picker.tsx`, `src/app/capture-settings.tsx`, `tests/features/camera-picker.test.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add validated camera picker`

### T039: Reconfigure preview from a persisted valid selection

**Outcome:** Apply selection changes to the native graph without stale frames, leaked devices, or invalid persistence.

**Acceptance criteria:**
- [ ] Pair changes stop and replace the graph atomically while preserving an accessible configuring state.
- [ ] Only a selection still valid on relaunch is restored.
- [ ] Unsupported or changed hardware falls back safely without an error loop.

**Verification:**
- [ ] Run `bun run test -- camera-reconfiguration`.
- [ ] Run `bun run test:e2e:device -- --scenario camera-reconfiguration`.

**Dependencies:** T038

**Files likely touched:** `src/platform/capture/capture-client.ts`, `src/core/capture/selection-store.ts`, `src/screens/capture/capture-screen.tsx`, `tests/capture/camera-reconfiguration.test.ts`, `e2e/device/camera-reconfiguration.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: apply validated camera selections`

#### Verification checkpoint 3A: Camera selection

- [ ] T037 through T039 pass capability, accessibility, persistence, and physical reconfiguration checks.
- [ ] The UI never offers an unsupported pair or frame rate.
- [ ] Single-camera fallback is clear and non-erroring.

### T040: Connect discrete mode to the native capture surface

**Outcome:** Start, display, swap preview priority, and stop two-file recording through the approved writer.

**Acceptance criteria:**
- [ ] One record action creates one native recording session with stable A/B file identity.
- [ ] Preview-priority swap does not rebuild the session or exchange file identity.
- [ ] Failure of either required output prevents a ready result.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario discrete-capture`.

**Dependencies:** T039

**Files likely touched:** `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/Writers/SelectedWriter.swift`, `modules/multicam-capture/ios/Tests/DiscreteCaptureTests.swift`, `e2e/device/discrete-capture.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: deliver native discrete capture`

### T041: Group discrete clips through manifest and catalog

**Outcome:** Treat A/B outputs as one recording set across import, Library status, metadata, and deletion.

**Acceptance criteria:**
- [ ] One discrete manifest contains two validated clips with stable A/B roles and synchronized timing metadata.
- [ ] Library renders one grouped row and never exposes orphaned clip rows.
- [ ] Recovery and deletion operate on the complete recording set.

**Verification:**
- [ ] Run `bun run test -- discrete-recording-set` and `bun run test:e2e:sim -- --scenario discrete-library`.

**Dependencies:** T040

**Files likely touched:** `src/core/library/import-recordings.ts`, `src/core/library/recording-repository.ts`, `src/screens/library/recording-card.tsx`, `tests/library/discrete-recording-set.test.ts`, `e2e/simulator/discrete-library.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: group discrete recording clips`

#### Verification checkpoint 3B: Discrete capture and storage

- [ ] T040 and T041 pass real-device recording and grouped-library checks.
- [ ] A/B files remain within the approved synchronization tolerance.
- [ ] No partial discrete output is reported ready.

### T042: Add synchronized discrete playback

**Outcome:** Play A/B clips together with selectable primary and side-by-side inspection.

**Acceptance criteria:**
- [ ] Both players share one play, pause, seek, and resynchronization policy.
- [ ] Primary selection changes presentation without changing clip identity.
- [ ] Drift beyond tolerance is corrected visibly but without destructive file changes.

**Verification:**
- [ ] Run `bun run test -- discrete-playback` and `bun run test:e2e:sim -- --scenario discrete-playback`.

**Dependencies:** T041

**Files likely touched:** `src/core/library/synchronized-playback.ts`, `src/screens/recording-detail/discrete-player.tsx`, `src/screens/recording-detail/recording-detail-screen.tsx`, `tests/features/discrete-playback.test.tsx`, `e2e/simulator/discrete-playback.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add synchronized discrete playback`

### T043: Add discrete clip selection to sharing

**Outcome:** Allow one or both original discrete files to enter native sharing without re-encoding or losing group context.

**Acceptance criteria:**
- [ ] Users can select A, B, or both and see filenames and progress before sharing.
- [ ] Temporary share preparation preserves original `.mov` bytes and cleans stale copies.
- [ ] Share cancellation and per-file failure leave the internal recording untouched.

**Verification:**
- [ ] Run `bun run test -- discrete-sharing` and `bun run test:e2e:device -- --scenario discrete-sharing`.

**Dependencies:** T042

**Files likely touched:** `src/platform/export/share-recordings.ts`, `src/core/library/export-selection.ts`, `src/screens/recording-detail/share-recording-action.tsx`, `tests/features/discrete-sharing.test.tsx`, `e2e/device/discrete-sharing.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: share selected discrete clips`

#### Checkpoint E: Discrete mode approval

- [ ] T042 and T043 plus `bun run validate` pass.
- [ ] Every offered A/B pair and supported frame rate passes physical capture evidence.
- [ ] Capture, grouping, playback, sharing, recovery, and deletion behave as one journey.
- [ ] Human approves discrete mode before PiP work.

### T044: Implement native PiP direct manipulation

**Outcome:** Add native drag, anchor snap, resize, hide, restore, and source swap using normalized composite geometry.

**Acceptance criteria:**
- [ ] Gestures remain responsive under artificial JavaScript load and never wait on bridge events.
- [ ] PiP remains within safe bounds in portrait and landscape and persists normalized state.
- [ ] Swap and hide do not rebuild or interrupt the capture session.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario pip-gestures`.

**Dependencies:** Checkpoint E

**Files likely touched:** `modules/multicam-capture/ios/Compositor/PiPInteraction.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/Compositor/CompositeGeometry.swift`, `modules/multicam-capture/ios/Tests/PiPInteractionTests.swift`, `e2e/device/pip-gestures.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add native pip manipulation`

### T045: Add accessible PiP controls and persistence

**Outcome:** Provide non-gesture alternatives and keep normalized PiP settings across valid sessions.

**Acceptance criteria:**
- [ ] VoiceOver actions can move, resize, swap, hide, and restore PiP with state announcements.
- [ ] Keyboard or switch-control activation reaches equivalent outcomes where iOS exposes it.
- [ ] Persisted geometry is clamped and revalidated after orientation or safe-area changes.

**Verification:**
- [ ] Run `bun run test -- pip-accessibility` and manually audit VoiceOver on a device.

**Dependencies:** T044

**Files likely touched:** `modules/multicam-capture/ios/CaptureSurfaceAccessibility.swift`, `src/core/capture/pip-preferences.ts`, `src/screens/capture/pip-controls.tsx`, `tests/features/pip-accessibility.test.tsx`, `e2e/device/pip-accessibility.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: make pip controls accessible`

#### Verification checkpoint 3C: PiP interaction

- [ ] T044 and T045 gesture, persistence, and VoiceOver checks pass.
- [ ] Direct manipulation remains native and smooth under JavaScript load.
- [ ] All PiP actions preserve active-session identity.

### T046: Persist PiP composition into encoded output

**Outcome:** Write preview-matching PiP geometry changes into one composite recording and its manifest.

**Acceptance criteria:**
- [ ] Encoded output matches preview geometry and timing for drag, resize, swap, hide, and restore.
- [ ] Manifest records composite mode, orientation, source roles, and final normalized layout.
- [ ] Writer interruption follows the same atomic storage and recovery policy as discrete mode.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:sim -- --scenario pip-pixel-output`.

**Dependencies:** T045

**Files likely touched:** `modules/multicam-capture/ios/Compositor/CompositePipeline.swift`, `modules/multicam-capture/ios/Writers/SelectedWriter.swift`, `src/core/library/manifest.ts`, `modules/multicam-capture/ios/Tests/PiPOutputTests.swift`, `e2e/simulator/pip-pixel-output.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: record pip composite output`

### T047: Complete the PiP product journey

**Outcome:** Connect PiP capture to Library metadata, playback, sharing, deletion, recovery, and physical performance evidence.

**Acceptance criteria:**
- [ ] PiP takes use the unified recording set model and display correct layout metadata.
- [ ] Playback and exported file match the validated composite asset without re-encoding.
- [ ] Portrait and landscape device runs stay within memory and pressure budgets.

**Verification:**
- [ ] Run `bun run test -- pip-recording` and `bun run test:e2e:device -- --scenario pip-journey`.

**Dependencies:** T046

**Files likely touched:** `src/screens/library/recording-card.tsx`, `src/screens/recording-detail/recording-detail-screen.tsx`, `src/core/library/export-selection.ts`, `tests/features/pip-recording.test.tsx`, `e2e/device/pip-journey.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: complete pip recording journey`

#### Verification checkpoint 3D: PiP output

- [ ] T046 and T047 automated, pixel, and real-device checks pass.
- [ ] Preview and file agree across every supported PiP action.
- [ ] PiP recovery and export preserve one unified recording set.

### T048: Implement native split composition and swap

**Outcome:** Render stable portrait and landscape split layouts with aspect-fill cropping and native A/B side swap.

**Acceptance criteria:**
- [ ] Split geometry matches deterministic fixtures in both orientations.
- [ ] Side swap changes layout without rebuilding or interrupting the session.
- [ ] Preview and writer consume the same geometry and timestamps.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:sim -- --scenario split-pixel-output`.

**Dependencies:** T047

**Files likely touched:** `modules/multicam-capture/ios/Compositor/SplitInteraction.swift`, `modules/multicam-capture/ios/Compositor/CompositePipeline.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/Tests/SplitInteractionTests.swift`, `e2e/simulator/split-pixel-output.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add native split composition`

### T049: Complete the split product journey

**Outcome:** Connect split recording to the unified manifest, Library, playback, sharing, deletion, recovery, and device review.

**Acceptance criteria:**
- [ ] Split takes persist mode, orientation, A/B placement, and asset metadata correctly.
- [ ] Playback and exported output match preview cropping in portrait and landscape.
- [ ] Recovery, sharing, and permanent deletion behave consistently with PiP and discrete modes.

**Verification:**
- [ ] Run `bun run test -- split-recording` and `bun run test:e2e:device -- --scenario split-journey`.

**Dependencies:** T048

**Files likely touched:** `src/core/library/import-recordings.ts`, `src/screens/library/recording-card.tsx`, `src/screens/recording-detail/recording-detail-screen.tsx`, `tests/features/split-recording.test.tsx`, `e2e/device/split-journey.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: complete split recording journey`

#### Checkpoint F: Composite mode approval

- [ ] T048 and T049 plus full validation pass.
- [ ] PiP and split pass synthetic pixel fixtures and real-device capture.
- [ ] Composite performance remains within approved pressure and memory budgets.
- [ ] All capture modes use one manifest and catalog model.

### T050: Implement independent native focus and exposure state

**Outcome:** Map normalized points to each selected camera and preserve independent auto, locked, and adjusting state.

**Acceptance criteria:**
- [ ] Focus and exposure coordinates map correctly through orientation, aspect-fill crop, PiP, and split layouts.
- [ ] Each camera retains independent state during recording and source selection changes.
- [ ] Unsupported lock or adjustment returns a typed reason without destabilizing capture.

**Verification:**
- [ ] Run `bun run test:native` for focus, exposure, and geometry mapping suites.

**Dependencies:** Checkpoint F

**Files likely touched:** `modules/multicam-capture/ios/FocusExposureController.swift`, `modules/multicam-capture/ios/FocusExposureModels.swift`, `modules/multicam-capture/ios/Compositor/CompositeGeometry.swift`, `modules/multicam-capture/ios/Tests/FocusExposureTests.swift`, `modules/multicam-capture/ios/Tests/FocusExposureGeometryTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add per-camera focus and exposure`

### T051: Add native focus and exposure interactions

**Outcome:** Deliver camera selection, tap point, lock controls, and native reticles that remain responsive while recording.

**Acceptance criteria:**
- [ ] Users can target A or B, place focus/exposure, and toggle locks with immediate native feedback.
- [ ] Reticles and lock state stay legible, non-obstructive, and accurate over every layout.
- [ ] VoiceOver actions provide equivalent controls and announcements.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario focus-exposure`.

**Dependencies:** T050

**Files likely touched:** `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/CaptureSurfaceAccessibility.swift`, `modules/multicam-capture/ios/FocusReticleView.swift`, `modules/multicam-capture/ios/Tests/FocusReticleTests.swift`, `e2e/device/focus-exposure.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add native focus exposure controls`

#### Verification checkpoint 3E: Focus and exposure

- [ ] T050 and T051 automated and physical checks pass.
- [ ] Both cameras preserve independent state throughout recording.
- [ ] Direct manipulation stays native and accessible.

### T052: Implement native audio routing and metering

**Outcome:** Capture one approved audio route, duplicate aligned AAC where required, and expose bounded level and clipping events.

**Acceptance criteria:**
- [ ] Active input route and AAC configuration are recorded in manifest metadata.
- [ ] Meter rendering and clipping detection remain native with bounded bridge event cadence.
- [ ] Route disconnect finalizes safely with a stable interruption reason.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario audio-route-meter`.

**Dependencies:** T051

**Files likely touched:** `modules/multicam-capture/ios/Audio/AudioController.swift`, `modules/multicam-capture/ios/Audio/AudioMeter.swift`, `modules/multicam-capture/ios/CaptureSurfaceView.swift`, `modules/multicam-capture/ios/Tests/AudioControllerTests.swift`, `e2e/device/audio-route-meter.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add native audio feedback`

### T053: Surface core audio status and route-change outcomes

**Outcome:** Show route name, level, clipping, missing-audio, and stopped-for-route-change states without per-frame React updates.

**Acceptance criteria:**
- [ ] Capture UI exposes readable route and clipping status with accessible announcements.
- [ ] Normal level motion is native and does not cause React render churn.
- [ ] Route-change finalization leads to a playable or explicitly recoverable Library outcome.

**Verification:**
- [ ] Run `bun run test -- audio-status` and `bun run test:e2e:device -- --scenario audio-route-change`.

**Dependencies:** T052

**Files likely touched:** `src/components/audio-status.tsx`, `src/screens/capture/capture-screen.tsx`, `src/core/capture/audio-status.ts`, `tests/features/audio-status.test.tsx`, `e2e/device/audio-route-change.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: surface capture audio status`

#### Checkpoint G: Capture surface complete

- [ ] T052 and T053 plus `bun run validate` pass.
- [ ] Every Release 1 capture control works during real recording.
- [ ] VoiceOver, touch targets, feedback timing, and route-change behavior pass device review.
- [ ] No Release 1.1 or Android control is exposed.

## Phase 4: Complete library and export

### T054: Add manifest migrations and full catalog rebuild

**Outcome:** Keep older supported manifests readable and rebuild the catalog from files after database loss or schema change.

**Acceptance criteria:**
- [ ] Every supported manifest version migrates forward without rewriting original media.
- [ ] Unknown future and malformed manifests remain visible as unsupported or corrupt records.
- [ ] Rebuild is deterministic, resumable, newest-first, and idempotent for large fixture libraries.

**Verification:**
- [ ] Run `bun run test -- manifest-migrations` and `bun run test:e2e:sim -- --scenario catalog-rebuild`.

**Dependencies:** Checkpoint G

**Files likely touched:** `src/core/library/manifest-migrations.ts`, `src/core/library/rebuild-catalog.ts`, `src/platform/database/migrations.ts`, `tests/library/manifest-migrations.test.ts`, `e2e/simulator/catalog-rebuild.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: rebuild catalog from manifests`

### T055: Generate thumbnails and virtualize the Library

**Outcome:** Show responsive newest-first recording cards without letting thumbnail work block playable media.

**Acceptance criteria:**
- [ ] Thumbnail generation is asynchronous, cached, orientation-correct, and safe to retry.
- [ ] The virtualized list remains responsive with the approved large fixture library.
- [ ] Missing or corrupt thumbnails show a stable fallback while playable takes remain accessible.

**Verification:**
- [ ] Run `bun run test:native`, `bun run test -- virtualized-library`, and `bun run test:e2e:sim -- --scenario large-library`.

**Dependencies:** T054

**Files likely touched:** `modules/multicam-capture/ios/Storage/ThumbnailGenerator.swift`, `modules/multicam-capture/ios/Tests/ThumbnailGeneratorTests.swift`, `src/screens/library/library-screen.tsx`, `src/screens/library/recording-card.tsx`, `tests/features/virtualized-library.test.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add responsive recording library`

### T056: Complete Library states and multi-selection

**Outcome:** Present empty, loading, ready, partial, interrupted, recoverable, corrupt, and selected states with accessible bulk actions.

**Acceptance criteria:**
- [ ] Every catalog status has distinct text, iconography, accessibility value, and allowed actions.
- [ ] Multi-selection preserves grouped recording-set identity and never selects individual hidden clips.
- [ ] Bulk delete and export previews accurately describe the affected files before confirmation.

**Verification:**
- [ ] Run `bun run test -- library-states` and `bun run test:e2e:sim -- --scenario library-selection`.

**Dependencies:** T055

**Files likely touched:** `src/core/library/library-selection.ts`, `src/screens/library/library-screen.tsx`, `src/screens/library/recording-card.tsx`, `tests/features/library-states.test.tsx`, `e2e/simulator/library-selection.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: complete recording library states`

#### Verification checkpoint 4A: Durable Library

- [ ] T054 through T056 migration, rebuild, large-list, and accessibility checks pass.
- [ ] Deleting SQLite and relaunching reconstructs the same visible Library.
- [ ] Thumbnail failure never hides playable media.

### T057: Complete recording metadata and warning details

**Outcome:** Show trustworthy per-set and per-clip information, recovery warnings, and mode-specific layout details.

**Acceptance criteria:**
- [ ] Detail includes mode, cameras, A/B roles, dimensions, fps, duration, audio route, file sizes, creation date, and status.
- [ ] Warnings explain interruption, partial recovery, corrupt assets, unsupported manifest, and missing files with allowed actions.
- [ ] Private absolute paths and raw native diagnostics never appear in user-visible content.

**Verification:**
- [ ] Run `bun run test -- recording-details` and `bun run typecheck`.

**Dependencies:** T056

**Files likely touched:** `src/core/library/recording-details.ts`, `src/screens/recording-detail/recording-detail-screen.tsx`, `src/screens/recording-detail/recording-warning.tsx`, `tests/features/recording-details.test.tsx`

**Estimated scope:** Medium, 4 files

**Commit:** `feat: complete recording metadata details`

### T058: Add full-screen playback and AirPlay where supported

**Outcome:** Complete native-feeling playback controls for single, composite, and discrete recordings.

**Acceptance criteria:**
- [ ] Full-screen enter, exit, rotation, scrub, play, pause, mute, and route controls preserve playback position.
- [ ] AirPlay appears only when supported and does not falsely imply synchronized dual-stream routing.
- [ ] Single and composite files use one player while discrete inspection retains synchronized controls.

**Verification:**
- [ ] Run `bun run test -- playback-controls` and `bun run test:e2e:device -- --scenario playback-routes`.

**Dependencies:** T057

**Files likely touched:** `src/screens/recording-detail/video-player.tsx`, `src/screens/recording-detail/discrete-player.tsx`, `src/screens/recording-detail/recording-detail-screen.tsx`, `tests/features/playback-controls.test.tsx`, `e2e/device/playback-routes.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: complete recording playback controls`

### T059: Harden playback lifecycle and accessibility

**Outcome:** Make playback release resources reliably and remain usable at accessibility text sizes and with VoiceOver.

**Acceptance criteria:**
- [ ] Navigation, backgrounding, route change, deletion, and screen replacement release every player resource.
- [ ] Controls have logical focus order, useful labels and values, and no clipped metadata at accessibility sizes.
- [ ] Discrete resynchronization stays within tolerance after seek, interruption, and foreground return.

**Verification:**
- [ ] Run `bun run test -- playback-lifecycle` and `bun run test:e2e:device -- --scenario playback-lifecycle`.

**Dependencies:** T058

**Files likely touched:** `src/core/library/playback-lifecycle.ts`, `src/screens/recording-detail/video-player.tsx`, `src/screens/recording-detail/discrete-player.tsx`, `tests/features/playback-lifecycle.test.tsx`, `e2e/device/playback-lifecycle.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `fix: harden recording playback lifecycle`

#### Verification checkpoint 4B: Recording detail and playback

- [ ] T057 through T059 metadata, control, lifecycle, and accessibility checks pass.
- [ ] Discrete playback remains within approved sync tolerance.
- [ ] Backgrounding and navigation leave no active playback resource.

### T060: Complete Settings and sanitized diagnostics

**Outcome:** Provide native grouped controls, capability information, storage totals, permissions, privacy, support, and an exportable text report.

**Acceptance criteria:**
- [ ] Default mode, valid default pair, frame rate, audio-route behavior, and haptics use native grouped controls and revalidate on capability change.
- [ ] Settings show storage used, permission state, app version, privacy statement, acknowledgements, support, and direct Library management.
- [ ] Exported diagnostics contain capabilities and bounded metrics but no media, private paths, identifiers, analytics, or secrets.

**Verification:**
- [ ] Run `bun run test -- settings-diagnostics` and `bun run test:e2e:device -- --scenario diagnostics-export`.

**Dependencies:** T059

**Files likely touched:** `src/core/capture/capture-preferences.ts`, `src/screens/settings/settings-screen.tsx`, `src/platform/capture/diagnostics-report.ts`, `tests/features/settings-diagnostics.test.tsx`, `e2e/device/diagnostics-export.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: complete settings and diagnostics`

### T061: Add validated recording-set rename

**Outcome:** Rename recording sets without renaming internal media identity or breaking grouped files.

**Acceptance criteria:**
- [ ] Names trim whitespace, enforce documented length and character rules, and reject empty input.
- [ ] Rename updates manifest and catalog atomically while preserving clip filenames and identifiers.
- [ ] Conflict or write failure leaves the prior name visible and retryable.

**Verification:**
- [ ] Run `bun run test -- recording-rename` and `bun run test:e2e:sim -- --scenario recording-rename`.

**Dependencies:** T060

**Files likely touched:** `src/core/library/rename-recording.ts`, `src/core/library/recording-repository.ts`, `src/screens/recording-detail/rename-recording-action.tsx`, `tests/library/recording-rename.test.ts`, `e2e/simulator/recording-rename.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add recording set rename`

#### Verification checkpoint 4C: Settings and rename

- [ ] T060 and T061 settings, privacy, diagnostics, and rename checks pass.
- [ ] Diagnostics are useful but contain no private file path or captured media.
- [ ] Rename preserves grouped recording identity.

### T062: Generalize native sharing and temporary-file cleanup

**Outcome:** Share any eligible single, composite, or selected discrete `.mov` without re-encoding and clean temporary exports reliably.

**Acceptance criteria:**
- [ ] Share preparation preserves original bytes, sortable related filenames, and requested clip selection.
- [ ] Completion, cancellation, failure, next launch, and age-based cleanup remove temporary bundles safely.
- [ ] Internal originals are never removed or mutated by sharing.

**Verification:**
- [ ] Run `bun run test -- recording-sharing` and `bun run test:e2e:device -- --scenario recording-sharing`.

**Dependencies:** T061

**Files likely touched:** `src/platform/export/share-recordings.ts`, `src/platform/export/temporary-exports.ts`, `src/core/library/export-selection.ts`, `tests/features/recording-sharing.test.tsx`, `e2e/device/recording-sharing.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: complete native recording sharing`

### T063: Add add-only Photos export

**Outcome:** Save selected original clips to Photos while requesting the narrowest permission only at export time.

**Acceptance criteria:**
- [ ] Add-only Photos permission is requested on demand and denial does not block sharing or internal playback.
- [ ] Export preserves original `.mov` media and returns one typed result per file.
- [ ] Limited, denied, cancelled, and unavailable states have accessible recovery guidance.

**Verification:**
- [ ] Run `bun run test -- photos-export` and `bun run test:e2e:device -- --scenario photos-export`.

**Dependencies:** T062

**Files likely touched:** `src/platform/export/photos-export.ts`, `src/core/library/export-results.ts`, `src/screens/recording-detail/photos-export-action.tsx`, `tests/features/photos-export.test.tsx`, `e2e/device/photos-export.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add photos recording export`

#### Verification checkpoint 4D: Single export operations

- [ ] T062 and T063 share and Photos checks pass on a physical iPhone.
- [ ] Export does not re-encode or mutate originals.
- [ ] Photos denial leaves all unrelated workflows intact.

### T064: Coordinate batch export, progress, and partial retry

**Outcome:** Export multiple recording sets with per-file progress, summary, cancellation, and failed-files-only retry.

**Acceptance criteria:**
- [ ] Batch operations flatten grouped selections deterministically without duplicate files.
- [ ] Progress and final summary distinguish success, cancellation, skipped, and failed results per file.
- [ ] Retry includes only failed files and preserves completed results.

**Verification:**
- [ ] Run `bun run test -- batch-export` and `bun run test:e2e:device -- --scenario batch-export-retry`.

**Dependencies:** T063

**Files likely touched:** `src/core/library/batch-export.ts`, `src/screens/library/batch-export-sheet.tsx`, `src/screens/library/library-screen.tsx`, `tests/features/batch-export.test.tsx`, `e2e/device/batch-export-retry.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: add recoverable batch export`

### T065: Prove complete local media management

**Outcome:** Exercise rename, grouped selection, share, Photos export, permanent delete, relaunch, and catalog rebuild across every mode.

**Acceptance criteria:**
- [ ] Each mode survives the complete local workflow without orphan files or phantom catalog rows.
- [ ] Permanent deletion removes clips, manifest, thumbnails, staging residue, and catalog state after confirmation.
- [ ] Export or deletion interruption returns a visible retryable result and preserves unaffected recordings.

**Verification:**
- [ ] Run `bun run test:e2e:sim -- --scenario local-media-workflow` and `bun run test:e2e:device -- --scenario local-media-workflow`.
- [ ] Run `bun run test -- recording-delete` after the E2E flows.

**Dependencies:** T064

**Files likely touched:** `src/core/library/delete-recording.ts`, `src/core/library/batch-export.ts`, `tests/library/recording-delete.test.ts`, `e2e/simulator/local-media-workflow.test.ts`, `e2e/device/local-media-workflow.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `test: prove local media management`

#### Checkpoint H: Local media workflow complete

- [ ] T064 and T065 plus `bun run validate` pass.
- [ ] Record, organize, inspect, export, recover, and delete work for every Release 1 mode.
- [ ] Relaunch and catalog rebuild preserve correct visible state.
- [ ] Human reviews all destructive and export flows on a physical iPhone.

## Phase 5: Hardening and human-quality pass

### T066: Extend deterministic failure injection across all modes

**Outcome:** Reproduce interruption, route loss, reset, writer failure, process death, corrupt staging, and catalog loss through user-shaped scenarios.

**Acceptance criteria:**
- [ ] Every failure can be triggered at preparing, recording, finalizing, and launch recovery where applicable.
- [ ] Synthetic scenarios use production state, storage, manifest, catalog, and UI contracts.
- [ ] No failure fixture or debug control is reachable in release builds.

**Verification:**
- [ ] Run `bun run test:native`, `bun run test:e2e:sim -- --scenario all-failures`, and `bun run test -- release-surface`.

**Dependencies:** Checkpoint H

**Files likely touched:** `modules/multicam-capture/ios/Synthetic/SyntheticScenario.swift`, `modules/multicam-capture/ios/Synthetic/FailureInjector.swift`, `e2e/simulator/all-failures.test.ts`, `tests/recovery/failure-scenarios.test.ts`, `tests/features/release-surface.test.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `test: cover capture failure scenarios`

### T067: Harden native interruption teardown and recovery output

**Outcome:** Guarantee one deterministic native outcome and zero leaked resources for every injected and real interruption.

**Acceptance criteria:**
- [ ] Background, phone or audio interruption, route disconnect, media reset, writer failure, and runtime error finalize or recover by policy.
- [ ] Session inputs, writers, observers, timers, buffers, and audio resources tear down exactly once.
- [ ] Playable partial assets retain honest metadata and unplayable assets remain explicitly classified.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario interruption-matrix`.

**Dependencies:** T066

**Files likely touched:** `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/Diagnostics/InterruptionMonitor.swift`, `modules/multicam-capture/ios/Storage/RecoveryScanner.swift`, `modules/multicam-capture/ios/Tests/InterruptionMatrixTests.swift`, `e2e/device/interruption-matrix.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `fix: harden capture interruption teardown`

### T068: Complete launch recovery and user outcomes for every mode

**Outcome:** Make all native recovery results discoverable, explainable, retryable, or deletable after process death.

**Acceptance criteria:**
- [ ] Launch reconciliation produces one stable Library state for each failure and mode combination.
- [ ] Retry, playback, export, and delete actions are limited to what recovered assets can actually support.
- [ ] Repeated process death during recovery cannot duplicate, hide, or falsely complete a recording.

**Verification:**
- [ ] Run `bun run test -- all-mode-recovery` and `bun run test:e2e:device -- --scenario process-death-recovery`.

**Dependencies:** T067

**Files likely touched:** `src/core/library/reconcile-recovery.ts`, `src/core/library/recovery-policy.ts`, `src/screens/library/recovery-card.tsx`, `tests/recovery/all-mode-recovery.test.ts`, `e2e/device/process-death-recovery.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `fix: complete all-mode launch recovery`

#### Verification checkpoint 5A: Interruption and recovery

- [ ] T066 through T068 failure, release-surface, native teardown, and device checks pass.
- [ ] Every playable partial remains discoverable.
- [ ] No terminal path retains a capture resource.

### T069: Enforce hardware-cost and pressure policy

**Outcome:** Reject unsustainable configurations before capture and react predictably to system pressure and thermal state.

**Acceptance criteria:**
- [ ] Resolver budgets include system pressure cost, hardware cost, format, stabilization, and active outputs.
- [ ] Serious pressure reduces nonessential preview diagnostics before critical pressure stops safely.
- [ ] Critical pressure and thermal outcomes are typed, visible, and never reported as success.

**Verification:**
- [ ] Run `bun run test:native` for budget, pressure, and thermal policy suites.

**Dependencies:** T068

**Files likely touched:** `modules/multicam-capture/ios/Diagnostics/PressureMonitor.swift`, `modules/multicam-capture/ios/CapabilityResolver.swift`, `modules/multicam-capture/ios/CaptureService.swift`, `modules/multicam-capture/ios/Tests/PressurePolicyTests.swift`, `modules/multicam-capture/ios/Tests/HardwareBudgetTests.swift`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: enforce capture pressure policy`

### T070: Surface actionable pressure, storage, and performance diagnostics

**Outcome:** Give users bounded warnings and sanitized diagnostics without turning internal meters into noisy React updates.

**Acceptance criteria:**
- [ ] Low storage, dropped frames, serious pressure, critical stop, and thermal warnings have distinct actions.
- [ ] Event cadence is bounded and normal per-frame metrics remain native.
- [ ] Diagnostic reports include aggregate measurements but no media, identifiers, or private paths.

**Verification:**
- [ ] Run `bun run test -- capture-diagnostics` and `bun run test:e2e:sim -- --scenario capture-warnings`.

**Dependencies:** T069

**Files likely touched:** `src/core/capture/diagnostics.ts`, `src/screens/capture/capture-warning.tsx`, `src/platform/capture/diagnostics-report.ts`, `tests/features/capture-diagnostics.test.tsx`, `e2e/simulator/capture-warnings.test.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `feat: surface capture health warnings`

#### Verification checkpoint 5B: Pressure behavior

- [ ] T069 and T070 policy, diagnostics, and warning checks pass.
- [ ] Unsustainable configurations cannot start.
- [ ] Serious and critical pressure produce different deterministic outcomes.

### T071: Build the launch, frame, memory, drift, and finalization harness

**Outcome:** Measure every approved performance threshold consistently in release builds.

**Acceptance criteria:**
- [ ] Harness records cold launch to preview, record feedback, dropped-frame runs, A/B drift, audio drift, peak memory, growth, pressure, and finalization.
- [ ] Results include device, OS, environment, mode, pair, preset, duration, and pass or fail threshold.
- [ ] Measurement overhead is documented and excluded from user-facing production behavior.

**Verification:**
- [ ] Run `bun run test:native` and `bun run test:e2e:device -- --scenario performance-smoke`.

**Dependencies:** T070

**Files likely touched:** `modules/multicam-capture/ios/Diagnostics/PerformanceMetrics.swift`, `modules/multicam-capture/ios/Tests/PerformanceMetricsTests.swift`, `e2e/device/performance-harness.ts`, `e2e/device/performance-smoke.test.ts`, `docs/performance-baseline.md`

**Estimated scope:** Medium, 5 files

**Commit:** `test: add capture performance harness`

### T072: Pass the sustained physical-device stress gate

**Outcome:** Prove 30-minute default capture and required short scenarios on the oldest supported device in a release build.

**Acceptance criteria:**
- [ ] All specification launch, feedback, frame, drift, audio, memory, pressure, and finalization thresholds pass.
- [ ] Test environment remains 20 to 24 degrees Celsius and evidence includes raw bounded metrics.
- [ ] Any threshold or A12-class failure returns through the specification gate rather than silently narrowing support.

**Verification:**
- [ ] Run `bun run test:e2e:device -- --scenario release-thirty-minute` on the oldest supported iPhone.
- [ ] Run `bun run validate` after the release-device session.

**Dependencies:** T071

**Files likely touched:** `e2e/device/release-thirty-minute.test.ts`, `docs/performance-baseline.md`, `docs/device-matrix.md`

**Estimated scope:** Medium, 3 files

**Commit:** `test: pass sustained capture stress gate`

#### Verification checkpoint 5C: Sustained performance

- [ ] T071 and T072 measurement and stress checks pass.
- [ ] Memory has no prohibited monotonic growth.
- [ ] Default stress does not reach critical thermal or pressure shutdown.
- [ ] Finalization and synchronization meet every approved threshold.

### T073: Complete automated accessibility and motion coverage

**Outcome:** Enforce semantics, focus order, Dynamic Type, contrast, Reduce Motion, haptic cadence, and minimum touch targets across every state.

**Acceptance criteria:**
- [ ] All interactive controls expose correct labels, roles, values, hints, and logical focus order.
- [ ] Record state is conveyed with text and semantics as well as color and one haptic.
- [ ] Accessibility-size layouts avoid clipping and Reduce Motion removes only nonessential movement.

**Verification:**
- [ ] Run `bun run test -- accessibility-audit` and `bun run test:e2e:sim -- --scenario accessibility-matrix`.

**Dependencies:** Checkpoint 5C

**Files likely touched:** `src/testing/accessibility-audit.ts`, `tests/features/accessibility-audit.test.tsx`, `e2e/simulator/accessibility-matrix.test.ts`, `src/foundation/accessibility/preferences.ts`, `src/foundation/haptics/haptics.ts`

**Estimated scope:** Medium, 5 files

**Commit:** `test: enforce app accessibility contract`

### T074: Finish native feel and original visual polish

**Outcome:** Refine capture, Library, detail, Settings, materials, safe areas, orientation, motion, and haptics into one coherent original product.

**Acceptance criteria:**
- [ ] Every screen and state has intentional hierarchy, spacing, materials, and feedback in light and dark appearance.
- [ ] Capture overlays remain readable without obscuring framing and show no stale preview or layout jump.
- [ ] Motion runs natively or on the UI thread and haptics occur once per committed action.

**Verification:**
- [ ] Run `bun run test -- visual-state-contracts` and inspect the development foundation matrix in a release build.
- [ ] Perform human pixel-level review of every screen and state on a physical iPhone.

**Dependencies:** T073

**Files likely touched:** `src/theme/tokens.ts`, `src/screens/capture/capture-screen.tsx`, `src/screens/library/library-screen.tsx`, `src/screens/recording-detail/recording-detail-screen.tsx`, `src/screens/settings/settings-screen.tsx`

**Estimated scope:** Medium, 5 files

**Commit:** `style: finish openmulticam visual system`

### T075: Record the human accessibility and visual device matrix

**Outcome:** Capture review evidence for VoiceOver, large text, contrast, motion, safe areas, orientation, and visual quality across required device classes.

**Acceptance criteria:**
- [ ] Matrix covers every route, empty and failure state, capture mode, orientation, and appearance.
- [ ] Review notes identify device, OS, accessibility settings, result, and resolved issue reference.
- [ ] No clipping, unreadable overlay, stale frame, inconsistent material, or inaccessible action remains open.

**Verification:**
- [ ] Run `bun run test:e2e:device -- --scenario accessibility-visual-matrix`.
- [ ] Human signs off `docs/accessibility-visual-matrix.md`.

**Dependencies:** T074

**Files likely touched:** `e2e/device/accessibility-visual-matrix.test.ts`, `docs/accessibility-visual-matrix.md`, `docs/device-matrix.md`

**Estimated scope:** Medium, 3 files

**Commit:** `docs: record accessibility visual review`

#### Checkpoint I: Release candidate quality

- [ ] T073 through T075 plus `bun run validate` pass.
- [ ] Every FR-01 through FR-15 row has linked automated or physical evidence.
- [ ] Human accepts capture feel, accessibility, and visual quality before certification.

## Phase 6: Certification and handoff

### T076: Make clean-checkout validation reproducible

**Outcome:** Run install, lint, types, coverage, native tests, synthetic E2E, Expo Doctor, generation, and iOS build from a clean temporary checkout.

**Acceptance criteria:**
- [ ] Validation starts without local caches, generated native projects, or untracked configuration.
- [ ] Every constituent failure returns a nonzero result and preserves readable logs outside Git.
- [ ] The runbook distinguishes simulator, physical-device, signing, and production-build prerequisites.

**Verification:**
- [ ] Run `bun run validate:clean` from the documented temporary checkout workflow.

**Dependencies:** Checkpoint I

**Files likely touched:** `package.json`, `scripts/validate-clean.mjs`, `scripts/check-repository.mjs`, `docs/validation-runbook.md`, `.gitignore`

**Estimated scope:** Medium, 5 files

**Commit:** `test: automate clean checkout validation`

### T077: Prove development and unsigned production build hygiene

**Outcome:** Generate disposable iOS projects, validate development and production configurations, and prove generated output never enters Git.

**Acceptance criteria:**
- [ ] Development build and the strongest locally permitted production validation complete from clean generation.
- [ ] Generated `ios/`, build products, logs, media, evidence, and credentials remain untracked.
- [ ] Dependency, config-plugin, entitlement, deployment-target, and Expo Doctor diagnostics are clean.

**Verification:**
- [ ] Run `bunx expo prebuild --clean --platform ios`, `bun run ios`, `bunx expo-doctor`, and the documented unsigned production validation.
- [ ] Run `bun run check:repository` after removing disposable native output.

**Dependencies:** T076

**Files likely touched:** `app.json`, `package.json`, `scripts/validate-ios-build.mjs`, `docs/validation-runbook.md`, `.gitignore`

**Estimated scope:** Medium, 5 files

**Commit:** `test: prove ios build hygiene`

#### Verification checkpoint 6A: Clean build

- [ ] T076 and T077 pass from a clean checkout.
- [ ] `bun run validate` has no ignored or allowed-to-fail stage.
- [ ] Git contains no generated native project, captured media, evidence, or secret.

### T078: Encode the complete physical-device matrix runner

**Outcome:** Make every supported pair, mode, orientation, frame rate, permission, audio, interruption, export, and stress scenario explicitly enumerable.

**Acceptance criteria:**
- [ ] Runner derives offered combinations from each device capability report and never invents unsupported cases.
- [ ] Required oldest, mid-generation Pro, current Pro, built-in mic, and external-mic coverage is visible as pass, fail, or pending.
- [ ] Results validate against a schema and link to bounded diagnostics without committing captured media.

**Verification:**
- [ ] Run `bun run test -- device-matrix-runner` and `bun run test:e2e:device -- --scenario matrix-dry-run`.

**Dependencies:** Checkpoint 6A

**Files likely touched:** `e2e/device/device-matrix.ts`, `e2e/device/device-matrix.test.ts`, `tests/features/device-matrix-runner.test.ts`, `docs/device-matrix.schema.json`, `docs/device-matrix.md`

**Estimated scope:** Medium, 5 files

**Commit:** `test: encode physical device matrix`

### T079: Certify the oldest supported iPhone class

**Outcome:** Run the complete Release 1 matrix on an iPhone XS or XR class device and record honest A12 support evidence.

**Acceptance criteria:**
- [ ] Every offered pair, 24/25/30 fps option, mode, orientation, permission, interruption, export, and stress scenario is recorded.
- [ ] The 30-minute release stress thresholds pass without silently reducing the advertised configuration.
- [ ] Any failure returns through the specification gate before support claims change.

**Verification:**
- [ ] Run `bun run test:e2e:device -- --scenario full-device-matrix --device-class a12`.
- [ ] Validate the A12 rows in `docs/device-matrix.md` and run `bun run validate`.

**Dependencies:** T078 and access to an iPhone XS or XR class device

**Files likely touched:** `docs/device-matrix.md`, `docs/performance-baseline.md`, `docs/recovery.md`, `e2e/device/full-device-matrix.test.ts`

**Estimated scope:** Medium, 4 files

**Commit:** `test: certify oldest supported iphone`

#### Verification checkpoint 6B: Oldest-device evidence

- [ ] T078 and T079 runner and A12-class checks pass.
- [ ] Required A12 rows contain no unresolved failure or mislabeled pending result.
- [ ] Any support-floor change has separate human-approved specification revision.

### T080: Certify the mid-generation Pro iPhone class

**Outcome:** Run the full matrix on a mid-generation three-camera Pro device and verify its offered pair diversity.

**Acceptance criteria:**
- [ ] Every pair and Release 1 frame rate offered by the device completes all capture modes and orientations.
- [ ] Permission, interruption, recovery, sharing, Photos, and built-in audio routes have evidence.
- [ ] Runtime capability output agrees with every executed matrix row.

**Verification:**
- [ ] Run `bun run test:e2e:device -- --scenario full-device-matrix --device-class mid-pro`.
- [ ] Validate the mid-generation Pro rows in `docs/device-matrix.md`.

**Dependencies:** Checkpoint 6B and access to a mid-generation three-camera Pro iPhone

**Files likely touched:** `docs/device-matrix.md`, `docs/performance-baseline.md`, `docs/recovery.md`, `e2e/device/full-device-matrix.test.ts`

**Estimated scope:** Medium, 4 files

**Commit:** `test: certify mid generation pro iphone`

### T081: Certify the current Pro iPhone and external audio

**Outcome:** Run the full matrix on a current Pro device with built-in and one supported external microphone.

**Acceptance criteria:**
- [ ] Every offered pair, frame rate, mode, and orientation has current-device evidence.
- [ ] Built-in and external audio routes cover metering, recording, route disconnect, recovery, playback, and export.
- [ ] Newer conditional APIs do not change baseline output contracts or expose Release 1.1 controls.

**Verification:**
- [ ] Run `bun run test:e2e:device -- --scenario full-device-matrix --device-class current-pro` for both audio routes.
- [ ] Validate the current Pro and external-audio rows in `docs/device-matrix.md`.

**Dependencies:** T080 and access to a current Pro iPhone plus supported external microphone

**Files likely touched:** `docs/device-matrix.md`, `docs/performance-baseline.md`, `docs/recovery.md`, `e2e/device/full-device-matrix.test.ts`

**Estimated scope:** Medium, 4 files

**Commit:** `test: certify current pro iphone audio`

#### Verification checkpoint 6C: Pro-device evidence

- [ ] T080 and T081 device and audio-route checks pass.
- [ ] All offered Pro camera combinations have complete evidence.
- [ ] External route loss always produces a safe finalization outcome.

### T082: Consolidate physical-device certification

**Outcome:** Close the matrix across required device classes without hiding missing, failed, or unsupported combinations.

**Acceptance criteria:**
- [ ] All required rows are pass or explicitly unsupported by runtime capability checks, with no required pending row.
- [ ] Performance, recovery, and capability reports agree across device classes.
- [ ] The consolidated report links every failure resolution and contains no captured media or private identifiers.

**Verification:**
- [ ] Run the documented matrix validator and `bun run validate`.
- [ ] Human reviews the completed `docs/device-matrix.md`.

**Dependencies:** T081

**Files likely touched:** `docs/device-matrix.md`, `docs/performance-baseline.md`, `docs/recovery.md`

**Estimated scope:** Medium, 3 files

**Commit:** `docs: consolidate device certification`

#### Verification checkpoint 6D: Device certification

- [ ] T082 consolidation and full validation pass.
- [ ] Oldest, mid-generation Pro, current Pro, built-in mic, and external-mic coverage is complete.
- [ ] Any support-floor change has a separately approved specification revision.

### T083: Complete privacy and no-network audit

**Outcome:** Prove Release 1 is local-only, has accurate permission disclosures, and emits no unexpected traffic or telemetry.

**Acceptance criteria:**
- [ ] Runtime network inspection shows no app-originated backend, analytics, advertising, or telemetry traffic.
- [ ] Permission descriptions, privacy statement, storage behavior, sharing, and Photos export match actual behavior.
- [ ] Diagnostic and support exports contain no captured media, private paths, device identifiers, or secrets.

**Verification:**
- [ ] Run `bun run test -- privacy-contract` and the documented release-build network inspection.
- [ ] Human reviews `docs/privacy-audit.md`.

**Dependencies:** Checkpoint 6D

**Files likely touched:** `tests/features/privacy-contract.test.ts`, `docs/privacy-audit.md`, `docs/release-runbook.md`, `app.json`

**Estimated scope:** Medium, 4 files

**Commit:** `docs: complete openmulticam privacy audit`

### T084: Finalize release documentation and approved identity

**Outcome:** Prepare Release 1 for separate store-submission planning without performing submission or unapproved signing work.

**Acceptance criteria:**
- [ ] Release runbook, support information, acknowledgements, known limitations, and recovery guidance match certified behavior.
- [ ] Human explicitly confirms the final bundle identifier and whether to create a new EAS project before any identity mutation.
- [ ] Release 1.1 and Android remain documented as separate unstarted milestones.

**Verification:**
- [ ] Run `bun run validate`, `bun run validate:clean`, and the approved production build validation.
- [ ] Human signs off `docs/release-runbook.md` and the final resolved app configuration.

**Dependencies:** T083 and explicit human approval for bundle or EAS identity changes

**Files likely touched:** `docs/release-runbook.md`, `docs/acknowledgements.md`, `docs/recovery.md`, `app.json`, `eas.json`

**Estimated scope:** Medium, 5 files

**Commit:** `docs: finalize release one handoff`

#### Checkpoint J: Release 1 complete

- [ ] T083 and T084 plus every clean, simulator, native, and physical-device validation pass.
- [ ] Every specification success criterion has linked evidence.
- [ ] Final human device, accessibility, visual, privacy, and release review passes.
- [ ] OpenMulticam Release 1 is ready for separate App Store submission planning.

## Work-package traceability

| Work package | Executable tasks |
| --- | --- |
| WP-0.1 Selective migration | T001-T002, T004-T006 |
| WP-0.2 Validation discipline | T003, T007A-T007B |
| WP-1.1 Contracts and lifecycle | T008-T013 |
| WP-1.2 Capabilities and dual preview | T014-T016 |
| WP-1.3 Writer architecture | T017-T020 |
| WP-1.4 Metal composite proof | T021-T023 |
| WP-1.5 Long-record storage | T024-T026 |
| WP-2.1 Permissions and preview | T027-T029 |
| WP-2.2 First complete recording | T030-T033 |
| WP-2.3 Single-camera failures | T034-T036 |
| WP-3.1 Camera picker | T037-T039 |
| WP-3.2 Discrete mode | T040-T043 |
| WP-3.3 PiP mode | T044-T047 |
| WP-3.4 Split mode | T048-T049 |
| WP-3.5 Focus, exposure, and audio | T050-T053 |
| WP-4.1 Catalog and Library | T054-T056 |
| WP-4.2 Details and playback | T057-T059 |
| WP-4.3 Rename, delete, and export | T061-T065 |
| WP-4.4 Settings and diagnostics | T060, T070, T083 |
| WP-5.1 Interruption and recovery | T066-T068 |
| WP-5.2 Pressure and performance | T069-T072 |
| WP-5.3 Accessibility and visual QA | T073-T075 |
| WP-6.1 Clean-checkout validation | T076-T077 |
| WP-6.2 Physical-device matrix | T078-T082 |
| WP-6.3 Privacy and release handoff | T083-T084 |

## Functional-requirement traceability

| Requirement | Primary tasks and checkpoints |
| --- | --- |
| FR-01 First launch and permissions | T027-T029, Checkpoint 2A |
| FR-02 Capability discovery | T014-T016, Checkpoint 1D |
| FR-03 Camera picker | T037-T039, Checkpoint 3A |
| FR-04 Capture surface | T029, T031, T044-T053, Checkpoint G |
| FR-05 Capture modes | T031, T040-T049, Checkpoints E and F |
| FR-06 Recording configuration | T037-T039, T060 |
| FR-07 Focus and exposure | T050-T051, Checkpoint 3E |
| FR-08 Audio | T019-T020, T052-T053 |
| FR-09 Recording lifecycle | T011-T013, T024-T026, T031-T036, T066-T068 |
| FR-10 Sustainable performance and pressure | T025-T026, T069-T072, Checkpoint 5C |
| FR-11 Internal Library | T030, T032-T036, T041, T054-T056 |
| FR-12 Playback and details | T033, T042, T057-T059 |
| FR-13 Export and sharing | T043, T062-T065, Checkpoint H |
| FR-14 Settings and diagnostics | T060, T070, T083 |
| FR-15 Accessibility and interaction quality | T004-T007B, T028, T038, T045, T051, T053, T073-T075 |

## Phase 3 approval record

- [x] Human confirmed that task outcomes, order, dependencies, verification, file scopes, commits, and checkpoints match the approved plan.
- [x] Human confirmed that T001 may begin and that default execution remains sequential.
