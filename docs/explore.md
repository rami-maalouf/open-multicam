# expo explore

the repository uses [expo explore](https://github.com/expo/explore) 0.23.0 for before-and-after screen reviews. it runs in deterministic mode on an iphone 17 pro, using the existing release-style `preview-simulator` eas profile. no model api key is required. the app's automatic appearance captures light and dark.

## coverage and app state

the configuration starts with a fresh simulator and an empty library. its setup opens the library and waits for `Your takes stay on this iPhone`, the label rendered after the native library query completes. it does not import personal footage, approve permissions, record, export media, or make a donation.

| route | captured state |
| --- | --- |
| `/` | initial camera-access or unavailable-camera state; no host-provided camera feed |
| `/library` | empty local library |
| `/settings` | native settings list |
| `/privacy` | privacy policy |
| `/support` | support and donation information; no purchase action |

two source routes are explicitly excluded:

- `/dev-foundation` redirects to capture in release builds, so it has no independent release screen.
- `/library/[recordingSetId]` needs an existing recording and media files. the app generates its id at recording time. the initial setup does not invent an id or claim that an unavailable-take screen tests playback.

explore also reports a source-analysis warning for the library's runtime-computed take link. this is expected until a real take is provisioned; the static map cannot infer the record id.

## first review

install with the lockfile and check the configuration:

```sh
bun install --frozen-lockfile
bunx @expo/explore@0.23.0 setup --check
bunx @expo/explore@0.23.0 doctor --json
```

keep the integration as a draft until the runtime and doctor blockers below are resolved and a real capture is inspected. merging the generated baseline workflow into `main` automatically starts a baseline on that push, so qualification must precede the merge. the review workflow deliberately runs the default branch's tools, so the integration pr cannot enable its own visual review. the repository already has an `EXPO_TOKEN` secret; its account needs eas simulator access and access to this app's eas project.

after committing and resolving the doctor limitation below, the following command runs a real capture and consumes eas build/simulator usage:

```sh
bunx @expo/explore@0.23.0 doctor --capture --yes
```

inspect the five captured screens in both appearances before calling the setup runtime-verified. after merging the qualified setup, inspect the automatically triggered **expo explore baseline** run (or rerun it manually), then open a non-draft, same-repository pr. only authorized authors receive credentialed capture. the generated workflows include `explore-compare.yml` for comparing any two refs with `scope: all`.

`report.preview.hosting: eas` enables the generated deployment job. it creates the `open-multicam-explore` eas hosting project on its first successful review. the expo token must have permission to create that project; use a robot user's token with that access. hosted report links contain an access token, so treat them as shared-file links. the github artifact remains available if hosting fails. this configuration does not deploy anything until a workflow or upload command runs.

## expanding to simulated cameras and takes

the simulated-camera implementation reads video/image paths from the simulator's global defaults. `scripts/simulator-cameras.mjs` configures an already-running local simulator. explore 0.23.0's `capture --simulator local` and `explore:binary --simulator local` create their own fresh simulators and remove them afterward; they cannot reuse the simulator prepared by that script. setting feeds on a different simulator will not enable camera coverage in ci.

the existing `.argent/flows/store-*` flows demonstrate real simulated-camera recording, camera selection, library population, and take playback. they remain the path for that coverage on a prepared simulator.

to extend this explore setup, first add a supported fixture-provisioning integration that copies synthetic feeds into each newly created capture simulator and sets its camera defaults before launch. next, record a take through the ui and navigate to its actual library row, or seed the native recording store with a stable synthetic take and supply that real id. verify the same setup on both compared revisions before removing the dynamic-route exclusion. explore's deterministic setup actions cannot write simulator defaults or seed native files today; that needs a controller hook or a separately reviewed simulator-only app fixture mechanism.

simulated camera screenshots do not measure real camera throughput, encoding pressure, thermal behavior, or hardware resource contention. those require the separate physical-device test/benchmark workflow.

## maintenance

when adding a route or changing a state prerequisite, update `.expo-explore/config.yaml` with the same pr. keep exclusions explicit and explain their missing fixture. do not add fake ids merely to silence doctor.

regenerate workflows with the chosen published release instead of editing their generated content:

```sh
bunx @expo/explore@0.23.0 setup --workflows
```

the generated workflows use bun for this app's frozen-lockfile install. their upstream tool-install steps use npm against explore's published shrinkwrap to preserve its tested dependency tree.

## integration evidence

on october 30, 2026, setup used the published 0.23.0 cli. the online doctor confirmed expo login, eas project access, simulator availability, the release-style ios simulator profile, sdk/router compatibility, and the existing github `EXPO_TOKEN` secret. the preview environment has no secret/file variables that prevent capture rebuilding.

the configuration is authored and statically checked. no paid capture, hosted deployment, or github visual-review workflow was run during authoring. the setup must be committed and merged into the default branch before ci can run; passing static checks does not establish runtime coverage.

`setup --check` and `source:verify --scope all` passed. the execution plan selects exactly five captures per revision and excludes the two routes listed above. `bun run check:repository` and `git diff --check` also passed; no production code or dependencies changed, so no new unit test was added for this configuration-only change.

**doctor limitation in 0.23.0:** doctor still reports `CAPTURE_PARAMETERS_MISSING` for the excluded take-detail route. its route-check implementation filters out redirects but does not filter `excluded` routes. the execution planner correctly marks this route excluded and omits it from both capture lists. do not invent an id to make doctor pass. this upstream inconsistency blocks the doctor capture preflight; use a release that fixes excluded-route checks before claiming a clean doctor result. the other current failures are the expected uncommitted setup files and workflows not yet on `main`.

## runtime qualification blocker

the unchanged sdk 57 application was built in release and launched successfully on ios 26.5, including the native empty-library readiness label. the same build crashes on ios 27 because it has not adopted the required scene lifecycle; the existing goldie configuration also records this limitation.

explore 0.23.0 exposes device name and pose, but no runtime version pin. its local simulator controller chooses the newest compatible installed runtime, which is ios 27 on the validation mac. a separately prepared ios 26.5 simulator does not solve this because explore creates its own simulator. the cloud runtime has not been observed. resolve application runtime compatibility or verify a supported capture environment before merging this setup; no unsupported runtime field is added to the yaml.

the support route loads storekit state asynchronously. inspect its first real capture for transient connecting versus settled donation states before interpreting screenshot differences as regressions. full repository validation passed (174 tests, one existing skip, types/lint, doctor 21/21), as did native xctest and ios export; these do not qualify explore capture or physical cameras.
