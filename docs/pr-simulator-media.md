# Simulator evidence in fix PRs

Capture the same action on the baseline and on the verified fix. Label the clips before and after. For a gesture, start recording before touch-down and keep recording through release. Inspect the clips and select a frame from the same point in each gesture. For a static bug, record the steps that reveal the affected screen.

1. In each Expo Simulators session, open the app and use `eas simulator:exec bunx agent-device@latest record start /tmp/before.mp4 --scope device --hide-touches` (use `after.mp4` for verification). Perform the action and run `eas simulator:exec bunx agent-device@latest record stop`. Keep each session ID. If the controller recording fails, stop the session and use its uploaded full-session recording, noting the gesture timestamp.
2. Use `eas simulator:get --id <id> --json` and select the matching video in `artifacts` by filename. Use its `downloadUrl` for the full recording. Check that it opens the expected clip. Share only footage intended for the PR audience. Anyone with that artifact link can download it.
3. Use ffmpeg and the repository helper to make inline previews. Both times are seconds from the start of the source video. The first starts a loop of up to eight seconds. The second picks the still. An optional fifth argument crops both outputs, for example `crop=400:222:806:168`. Use matching framing for before and after.

   ```sh
   scripts/pr-simulator-media.sh /tmp/before.mp4 1 3 .agents/evidence/pr-example/before
   scripts/pr-simulator-media.sh /tmp/after.mp4 1 3 .agents/evidence/pr-example/after
   ```

4. Replace `pr-example` with the issue or branch identifier. Inspect all four outputs and push the PNG and GIF files. Keep the full recordings on Expo. Use the pushed media commit SHA in each image URL so the description keeps working after the branch is deleted.
5. Put the table **in the PR description**. Keep the rest of the description, including the tested app SHA, verification run and simulator session links. For an existing PR, replace its evidence table in place. Confirm each image and clip opens before marking the PR ready. If capture fails, report which evidence is missing and leave the PR in draft.

| Before | After |
| --- | --- |
| ![Failing state](BEFORE_PNG_URL) | ![Verified state](AFTER_PNG_URL) |
| ![Before interaction](BEFORE_GIF_URL) | ![After interaction](AFTER_GIF_URL) |
| [Watch full recording](BEFORE_VIDEO_URL) | [Watch full recording](AFTER_VIDEO_URL) |

Use raw GitHub image URLs for this public repository. The GIFs play inside the description and the recording links open the full-resolution MP4s.

## Run the PR recording job

Include one `simulator-scenario` block when opening a same-repository PR to main. Opening, reopening or pushing a new commit runs the scenario automatically. To run it on an already-open PR after editing the description, apply the `simulator-review` label (remove and reapply it for subsequent runs). This uses GitHub macOS build minutes and two bounded Expo Simulators sessions. The existing GitHub Actions secret `EXPO_TOKEN` needs simulator access for this Expo project.

For the capture toolbar, this scenario starts each drag near the lower edge of its button. Both runs grant camera and microphone access, inject the placeholder camera feed, and wait for the native capture surface to report that it is previewing.

```simulator-scenario
{
  "camera": true,
  "steps": [
    {"action":"pan","label":"Open library","startY":0.86,"dx":0,"dy":90,"durationMs":1800},
    {"action":"pan","label":"Open settings","startY":0.86,"dx":0,"dy":90,"durationMs":1800}
  ]
}
```

For another issue, supply its own ordered interactions. A tap uses `{"action":"tap","label":"Open settings"}`. Labels resolve against the visible accessibility tree on each device. Set `camera` to false when the test does not need a live preview.

GitHub builds release simulator apps from the event's exact base and head commits, with OTA updates disabled. The recording job installs each binary on a fresh cloud iPhone, performs the scenario and stops the session. It uses the media helper to create full-screen previews. A separate publishing job writes both screenshots, loops and full recording links into a managed section of the PR body. Reviewers judge the visual result from those recordings.
