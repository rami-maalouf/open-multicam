# OpenMulticam's website

The one-page site for OpenMulticam: what the app does and why it exists, in a few lines,
around a Three.js scene of the icon's two sculpted frames, each one a live camera.

It is plain HTML, CSS and one module, bundled by [Bun](https://bun.sh) into static files.
The words and layout load first; the 3D scene is a separate file that loads after the page
has painted, runs only while the hero is on screen, and holds still for readers who ask for
reduced motion. Without WebGL, a still picture in picture stands in for it.

| File | What it is |
|---|---|
| `src/index.html` | The page: hero with the layout switch, why it exists, how it works, the close. |
| `src/styles.css` | The look: a dark studio, the icon's aqua and petrol teal, the record button's red. |
| `src/main.js` | Reveals, the frosted bar, the layout switch and its timer, the deferred load of the scene, and the Android waitlist dialog (`/?join=android` opens it). |
| `api/waitlist.ts` | The Android waitlist: saves the email to the shared Notion waitlist (`App: openmulticam`). Needs `NOTION_API_KEY` and `NOTION_WAITLIST_DATASOURCE_ID` on the Vercel project. |
| `src/scene.js` | The two frames: shader-lit rounded rims with depth, the feeds cropped to fit, springs between picture in picture, split and two files. |
| `src/public/media/` | `feeds.mp4`: the back and front camera side by side (the clips behind the store screenshots), a 7 second loop. `feeds.jpg` is its first frame. |
| `src/public/fonts/` | Sora, Geist and Geist Mono (SIL OFL). |
| `src/img/` | The icon cuts and the share image. |
| `build.ts` | Bundles `src/index.html` into `dist/` and adds the fixed-address files. `vercel.json` runs it on Vercel and serves `dist/`. |

```sh
bun install
bun run preview    # build, then serve dist/ on a local port
bun run build      # dist/
./deploy.sh        # build and publish to Vercel (project "openmulticam")
```

Bun's dev server can't resolve the fonts' absolute paths, so preview the built site.

The feed loop is made from `.artifacts/simulator-cameras/{back,front}.mp4`:

```sh
ffmpeg -ss 0.5 -t 8 -i back.mp4 -ss 2 -t 8 -i front.mp4 -filter_complex "\
[0:v]scale=540:960,fps=30,setsar=1[b];[1:v]scale=540:960,fps=30,setsar=1[f];[b][f]hstack=2,split[s1][s2];\
[s1]trim=0:7,setpts=PTS-STARTPTS[main];[s2]trim=7:8,setpts=PTS-STARTPTS,format=yuva420p,fade=t=out:st=0:d=1:alpha=1[tail];\
[main][tail]overlay=eof_action=pass,format=yuv420p[out]" -map "[out]" -an -c:v libx264 -preset veryslow -crf 31 \
-movflags +faststart src/public/media/feeds.mp4
```

Keep each claim true to the app: `README.md`, `SPEC.md` and `store.config.json` are the source.
