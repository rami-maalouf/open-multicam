# Internal over-the-air updates

OpenMulticam can receive over-the-air updates in internal TestFlight builds only. The App Store build keeps updates off.

## Why the App Store build has no updates

The privacy policy says there is no app-operated server, and Release 1 is local only. An update check is a network request at launch. `app.json` sets `updates.enabled: false`, and every build profile except `internal-ota` keeps it off.

## How it works

- `app.config.ts` turns updates on only when `OPENMULTICAM_OTA=1`.
- The `internal-ota` build profile in `eas.json` sets that flag and the `internal` channel. It extends `production`, so the build is a release build signed for the App Store.
- `.eas/workflows/publish-update.yml` publishes an update to the `internal` channel with the same flag.
- The app waits up to 5 seconds at launch for a new update, so a new update shows on the first cold launch. On a slow network it shows on the next launch.
- `runtimeVersion` uses the `appVersion` policy. An update reaches only internal builds with the same app version.
- An update changes JavaScript and assets only. A change to `modules/` or to a config plugin needs a new build.

`tests/features/internal-ota-config.test.ts` checks that updates stay off without the flag and that only `internal-ota` sets it.

## Make an internal build

```bash
eas build --profile internal-ota --platform ios --auto-submit-with-profile internal-ota
```

The build goes to TestFlight. Add it to the internal testing group only. Never select an `internal-ota` build for an App Store version: it checks for updates at launch.

## Publish an update

```bash
eas workflow:run publish-update.yml
```

An agent with the Expo MCP server can run the same workflow with `workflow_run` (`fileName: publish-update.yml`, `gitRef`: the branch or commit to ship). Push the change to GitHub first, because the workflow runs from a git ref.

## Roll back

Run `publish-update.yml` again at the commit you want testers to have.
