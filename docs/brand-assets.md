# Brand assets

Updated November 7, 2026.

The mark is a cartoon prism in 3D glasses. White light goes in, and two beams come out: aqua and record red. One lens of the glasses is aqua and the other is red, like 3D glasses that join two views into one picture. That is what the app does: one moment, seen by two cameras.

The art is flat vector: thick ink outlines (`#0c2329`), a two-tone glass prism (`#bff6f9`, `#7fdde6`), aqua `#3fe0ec` and red `#ff4a5e`. The app icon sits on a dark teal studio (`#17414b` to `#06151a`), with the beams running off its edges.

| Asset | Usage | Format |
| --- | --- | --- |
| `assets/icon.png` | Default and light iOS app icon | 1024 by 1024, opaque sRGB PNG |
| `assets/icon-dark.png` | Dark iOS app icon (the same art; it is already dark) | 1024 by 1024, opaque sRGB PNG |
| `assets/splash-icon.png` | Launch mark in both appearances | 1024 by 1024, sRGB PNG with transparency |
| `website/src/img/icon-64.png`, `icon-180.png` | The website's favicon, bar mark and touch icon | PNG |
| `assets/brand/icon.svg`, `splash.svg` | The vector sources | SVG |

All of them come from one script:

```bash
bun assets/brand/prism.mjs
```

It writes the SVG sources, renders them with macOS `sips`, and flattens the app icons to opaque RGB with `ffmpeg`. Change the art in `assets/brand/prism.mjs`, never in the PNGs.

The launch mark keeps round beam ends and has no background. It sits on a dark launch background in both appearances: `#05090b` in light mode and `#030607` in dark mode. iOS applies its own corner mask to the app icon. A new native build is required for installed apps and App Store Connect to receive these assets.

iOS caches the launch screen by asset name, not by content. When the art changes but the name stays the same, an updated app keeps showing the old launch art until the device restarts. Then the splash view fades the new art in over it. `plugins/with-fresh-launch-screen.js` prevents this. At prebuild it renames the launch logo and background to `SplashScreenLogo-<hash>` and `SplashScreenBackground-<hash>`, using a hash of their content. New art always gets a new name, so no change is needed when the art changes.
