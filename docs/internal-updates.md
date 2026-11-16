# Internal over-the-air updates

OpenMulticam can receive over-the-air updates in internal TestFlight builds only. The App Store build keeps updates off. Every update runs on a cloud simulator in Expo Simulators before it reaches a tester.

## Why the App Store build has no updates

The privacy policy says there is no app-operated server, and Release 1 is local only. An update check is a network request at launch. `app.json` sets `updates.enabled: false`, and only the two profiles below turn it on.

## How it works

- `app.config.ts` turns updates on only when `OPENMULTICAM_OTA=1`.
- Two build profiles in `eas.json` set that flag:

  | Profile | Channel | Build | Who runs it |
  | --- | --- | --- | --- |
  | `internal-ota` | `internal` | release, App Store signing, TestFlight | internal testers |
  | `verify-simulator` | `verify` | release, iOS simulator | Expo Simulators |

- `.eas/workflows/verify-update.yml` publishes an update to `verify`.
- `.eas/workflows/ship-update.yml` republishes the latest `verify` update group to `internal`. It does not bundle again, so testers get the same files that ran on the simulator.
- The app waits up to 5 seconds at launch for a new update, so a new update shows on the first cold launch. On a slow network it shows on the next launch.
- `runtimeVersion` uses the `appVersion` policy. An update reaches only builds with the same app version, so make both builds again after a version change.
- An update changes JavaScript and assets only. A change to `modules/` or to a config plugin needs new builds.
- The simulator has no cameras. Check changes on screens that do not need a live camera, or give the session a camera feed in Expo Simulators.

`tests/features/internal-ota-config.test.ts` checks that updates stay off without the flag and that only these two profiles set it.

## Make the builds

```bash
eas build --profile internal-ota --platform ios --auto-submit-with-profile internal-ota
eas build --profile verify-simulator --platform ios
```

The `internal-ota` build goes to TestFlight. Add it to the internal testing group only. Never select an `internal-ota` build for an App Store version: it checks for updates at launch.

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
