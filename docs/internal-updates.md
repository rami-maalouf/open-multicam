# Internal over-the-air updates

OpenMulticam can receive over-the-air updates in internal TestFlight builds only. The App Store build keeps updates off. Every update runs on a cloud simulator in Expo Simulators before it reaches a tester.

## Why the App Store build has no updates

The privacy policy says there is no app-operated server, and Release 1 is local only. An update check is a network request at launch. `app.json` sets `updates.enabled: false`, and only the two profiles below turn it on.

## How it works

- `app.config.ts` turns updates on only when `OPENMULTICAM_OTA=1`.
- Three build profiles in `eas.json` set that flag:

  | Profile | Channel | Build | Who runs it |
  | --- | --- | --- | --- |
  | `internal-ota` | `internal` | release, App Store signing, TestFlight | internal testers |
  | `internal-ota-device` | `internal` | release, ad hoc signing, install link | registered devices, without TestFlight |
  | `verify-simulator` | `verify` | release, iOS simulator | Expo Simulators |

- `.eas/workflows/verify-update.yml` publishes an update to `verify`.
- `.eas/workflows/ship-update.yml` republishes the latest `verify` update group to `internal`. It does not bundle again, so testers get the same files that ran on the simulator.
- The app waits up to 5 seconds at launch for a new update, so a new update shows on the first cold launch. On a slow network it shows on the next launch.
- Internal builds use their own version, `OTA_APP_VERSION` in `app.config.ts` (1.1.0), not the App Store version in `app.json`. Apple closes a version for new builds once it is approved, so the two must not share one. If Apple rejects an upload with "The train version is closed", raise `OTA_APP_VERSION` and make both builds again.
- `runtimeVersion` uses the `appVersion` policy, so it follows `OTA_APP_VERSION`. An update reaches only builds with the same version.
- An update changes JavaScript and assets only. A change to `modules/` or to a config plugin needs new builds.
- The simulator has no cameras. Check changes on screens that do not need a live camera, or give the session a camera feed in Expo Simulators.

`tests/features/internal-ota-config.test.ts` checks that updates stay off without the flag and that only these two profiles set it.

## Make the builds

```bash
eas build --profile internal-ota --platform ios --auto-submit-with-profile internal-ota
eas build --profile verify-simulator --platform ios
```

The `internal-ota` build goes to TestFlight. It can go to the internal group ("Team (Expo)") and to the external group ("External Testers", which needs Beta App Review). Never select an `internal-ota` build for an App Store version: it checks for updates at launch.

External testers are told in "What to Test" that the beta checks Expo's update service at launch. The request sends the platform, the runtime version, the IDs of the running and embedded updates, a random install ID (`EAS-Client-ID`) and, after a crash, the error text. It sends no recordings, personal information or location. Keep that text accurate when you change how updates work.

To install the same build without TestFlight, make the ad hoc copy. It gets the same updates, because it has the same channel and version. It installs only on devices in its provisioning profile (`eas device:create` registers a new one), and it replaces an App Store or TestFlight install on that device:

```bash
eas build --profile internal-ota-device --platform ios
```

## Ship a change

1. Push the change to GitHub.
2. Run `verify-update.yml` at that commit.
3. Start the latest `verify-simulator` build in Expo Simulators. The app loads the new update at launch. Check the change.
4. Run `ship-update.yml`.

```bash
eas workflow:run verify-update.yml
# step 3: the expo mcp `simulator_start` tool with the verify-simulator build id
eas workflow:run ship-update.yml
```

An agent with the Expo MCP server does every step with `workflow_run` (`fileName`, and `gitRef` for the branch or commit), `simulator_start` (`buildId`), `automation_take_screenshot` and `automation_tap`. `workflow_run` needs the Expo project connected to the GitHub repository.

## Roll back

Run `verify-update.yml` at the commit you want testers to have, check it on the simulator, then run `ship-update.yml`.

## Prepare a fix PR from chat

Give the coding agent access to this repository with permission to write contents and pull requests. Connect the Expo project to the same repository. The GitHub connection in Expo lets EAS fetch a commit. The coding agent uses its own GitHub access to push a branch and open the PR.

For the PR step, use a coding session with GitHub write access, such as Codex with this repository authorized. Before filming, create a branch and a draft PR from the same account and client you plan to show. A successful local push only verifies the local Git login.

For a JavaScript-only fix, use this prompt:

> Reproduce the bug on the verify-simulator build in Expo Simulators and capture the gesture. Make the fix on a new branch and open a draft PR against main. Run verify-update.yml at the PR head SHA. Cold-launch the simulator build, confirm it loaded that update, and repeat the gesture. Put the before and after evidence, tested SHA and EAS run link on the PR. When the visual check and PR validation both pass at that SHA, mark it ready for review. Leave merging and shipping to me.
