# performance and stress benchmarks

the benchmark harness measures real application logic without opening a camera, changing application data, or modifying production behavior. it establishes repeatable baseline/candidate evidence before an optimization is attempted.

these are **host microbenchmarks**, not ios app performance tests. javascript runs in bun, not hermes. native code runs as an optimized macos executable, not an ios capture session. they cannot establish launch time, react rendering, native bridge performance, camera throughput, frame drops, memory pressure, audio synchronization, or thermal behavior.

## workloads

| workload | work per batch | correctness evidence |
| --- | --- | --- |
| manifest-decode | decode a synthetic library containing all four modes and all five manifest outcomes | every decoded value equals its original manifest |
| library-labels | render names/dates and durations for named and unnamed takes | named labels and durations checked; every output hashed for cross-revision comparison |
| camera-selection-churn | resolve and swap supported pairs across pip, split, and discrete modes | exact camera identity, ordering, and configuration preserved |
| swift-state-lifecycle | configure, prepare, start, complete or interrupt, reject an illegal terminal action, and tear down repeatedly | accepted/rejected transitions and final states checked every cycle |
| swift-composition-geometry | alternate portrait/landscape split layouts and all pip corners | panes cover the canvas without overlap, insets remain in bounds, and every coordinate contributes to the result checksum |

the default is 10,000 operations per batch, two warmups, and seven measured repetitions. one additional untimed characterization batch establishes the expected result before warmups. the stress command raises the batch size to 100,000. manifest fixtures cover staging, ready, recoverable, interrupted, and corrupt outcomes; no actual video bytes or personal footage are involved.

javascript correctness checks and output hashing run after each timed interval. swift state and geometry checks remain inside its timed interval and are enabled in the `-O` build. timings therefore include native invariant-check overhead. compilation, fixture generation, report serialization, and process startup are outside the reported intervals. allocation and runtime garbage collection during a javascript workload are included.

## run a pair

use macos with xcode command-line tools and the repository's bun dependencies:

```sh
bun install --frozen-lockfile
bun run benchmark run --out .artifacts/benchmarks/before.json
# make one isolated change to the implementation, keeping the harness unchanged.
bun run benchmark run --out .artifacts/benchmarks/after.json
bun run benchmark compare .artifacts/benchmarks/before.json .artifacts/benchmarks/after.json --out .artifacts/benchmarks/comparison.json
```

run the unchanged app twice first to measure the harness's noise. that is a sanity check, not a performance improvement. run paired measurements serially on the same idle machine, with the same power/thermal conditions and no builds, tests, simulators, or unrelated heavy jobs running. alternate baseline and candidate runs when evaluating a proposed change. retain all samples rather than selecting the fastest run.

for a larger workload:

```sh
bun run benchmark:stress --out .artifacts/benchmarks/stress-before.json
bun run benchmark:stress --out .artifacts/benchmarks/stress-after.json
bun run benchmark compare .artifacts/benchmarks/stress-before.json .artifacts/benchmarks/stress-after.json
```

for a quick harness check:

```sh
bun run benchmark run --iterations 1000 --warmups 1 --repetitions 3 --out .artifacts/benchmarks/smoke.json
```

reports are written exclusively: choose a new filename for each run. the temporary native executable is removed after execution, including on failure. reports stay under the existing ignored `.artifacts/` directory. do not commit simulator evidence or personal media.

## what a comparison means

reports retain every raw duration in milliseconds per batch, result checksums, the app commit, measured source hash, exact installed expo/react-native versions, harness and fixture hashes, cpu model/count, os, architecture, bun and swift versions, locale/timezone, build mode, and workload settings.

the source hash identifies the measured implementation even with uncommitted changes; the commit alone does not. dependencies may deliberately change across a comparison, so their versions are recorded rather than required to match. neither workload executes react-native's renderer or expo's runtime: dependency upgrades need separate on-device evidence.

comparison refuses mismatched harnesses, fixtures, hardware/runtime metadata, workload settings, missing or duplicate workloads, incomplete/nonpositive samples, and changed result checksums. keep the harness identical on both revisions. if it must change, rerun both revisions with the new harness. median and nearest-rank p95 differences are descriptive, not statistical significance tests or automatic regression thresholds. with seven repetitions p95 is the maximum; collect more repetitions before making tail-latency claims.

## physical-device performance remains a separate gate

the existing `test:e2e:device` command explicitly reports that its signed device harness is unavailable. this change does not disguise it as completed or replace it with host timings. the acceptance criteria in `SPEC.md` still require release builds on the oldest supported a12-class iphone, a mid-generation pro, and a current pro, with supported camera pairs and microphones.

before accepting an optimization to capture or upstream react-native/expo, collect matched before/after release-device evidence:

1. record app and dependency revisions, iphone model/os, camera pair, mode, frame rate, resolution, codec, microphone, ambient temperature, power state, and device thermal state.
2. measure 20 cold launches through first live preview; retain all samples and require p95 at most one second on the oldest device.
3. record for 30 minutes at 1080p30 in a 20-24 degree celsius environment. use instruments to record cpu, resident memory, and thermal behavior; retain the recording timestamps/frame metadata needed to measure video and audio drift.
4. verify no continuous run of more than three dropped preview frames, a/b and audio drift within one encoded frame, peak resident memory at most 350 mb, and no monotonic memory growth greater than five percent after minute five. no critical thermal/system-pressure shutdown.
5. measure stop-to-playable-library latency for 30-second and 30-minute takes, requiring at most two and five seconds respectively, excluding thumbnail generation. relaunch and verify every expected file is playable.
6. exercise interruption, backgrounding, camera swap, pip changes, and recovery with the same scenarios on both revisions. attach evidence and any failures to the optimization pr.

these checks need an implemented signed device harness and observed physical runs. a simulator with synthetic feeds cannot qualify these gates.

## verification of this harness

`tests/benchmark-report.test.ts` covers result preservation, incompatible provenance, missing workloads, invalid samples, and descriptive statistics. the fixture-provenance test was observed failing before its validation was added. the cli smoke run compiles and executes the unchanged native sources with `swiftc -O`, and checks all five workloads. no speedup is claimed by this infrastructure change.
