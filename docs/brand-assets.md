# Brand assets

Updated September 16, 2026 using the built-in image-generation tool.

The mark uses two overlapping viewfinder frames to represent simultaneous camera views. Rounded bevels and shallow shadows give it a sculpted 3D appearance. Teal and aqua come from the app's existing palette.

| Asset | Usage | Format |
| --- | --- | --- |
| `assets/icon.png` | Default and light iOS app icon | 1024 by 1024, opaque sRGB PNG |
| `assets/icon-dark.png` | Dark iOS app icon | 1024 by 1024, opaque sRGB PNG |
| `assets/splash-icon.png` | Launch mark in both appearances | 1024 by 1024, sRGB PNG with transparency |

The launch backgrounds match the theme tokens: `#f7f6f2` in light mode and `#080d0f` in dark mode. App icons have full square backgrounds; iOS applies its own corner mask. The images were normalized to 1024 pixels for packaging; generator originals remain outside the repository. A new native build is required for installed apps and App Store Connect to receive these assets.

## Light icon prompt

```text
Use case: logo-brand
Asset type: production-ready 1024 x 1024 iOS app icon for OpenMulticam, a private dual-camera video app.
Primary request: a striking but very minimal sculptural mark built from exactly two thick rounded-square viewfinder frames, offset diagonally and partially overlapping. One frame sits a little behind and above-left, the other in front and below-right. Together they convey two simultaneous camera views. Each frame has a large clean empty square opening with rounded inside corners. Keep both silhouettes distinct. Straight-on orthographic view, almost no perspective rotation.
Style/medium: carefully art-directed shallow 3D product render, smoothly machined satin ceramic/glass hybrid, broad clean bevels, restrained translucent edge highlights, premium precision. Strong simple silhouette legible at 40 pixels. Not a line drawing.
Composition: one centered combined symbol filling about 67 percent of the square width and height. Thick substantial frame rims. Full-bleed perfectly square canvas; do not draw an outer app tile or rounded outer corners.
Palette: deep petrol teal #006D77 foreground frame, luminous muted aqua #4FC6D1 rear frame, soft pale aqua bevel highlights. Warm off-white #F7F6F2 background, uniform and completely untextured to the edges. Soft close ambient shadow directly beneath the sculpture, upper-left studio light, modest depth.
Constraints: exactly two frames, no other objects. No text, letters, camera body, lens circles, aperture blades, record dots, arrows, sparkles, neon glow, rainbow, exaggerated glass refraction, metallic chrome, grain, watermark or presentation mockup. Opaque background. Elegant, quiet, minimal, tactile.
```

## Dark icon prompt

The light icon was supplied as the edit target.

```text
Use case: lighting-weather
Asset type: dark-appearance version of the supplied OpenMulticam iOS app icon.
Input image: the approved geometry and composition reference; preserve it exactly.
Change only the background and light response for dark mode. Replace the warm white background with a completely uniform near-black petrol #080D0F, full bleed to every edge and inside both square openings. Keep the two thick rounded-square frames, their exact positions, proportions, overlap, outer silhouettes, empty openings, front-facing orthographic orientation and material. Preserve aqua #4FC6D1 on the back upper-left frame. Slightly lift the foreground deep teal toward #168E99 so the sculpture remains legible against the dark background, with restrained pale aqua highlights on broad bevels and soft shadows. Same minimal, satin ceramic 3D character; clean, polished, no textures. No new details, text, circles, symbols, glow, backdrop vignette, extra app tile, corner mask or mockup. Output one opaque square image.
```

## Launch mark prompt

The light icon was supplied as the edit target. Transparency was checked by compositing on both theme backgrounds at its 260-point launch size.

```text
Use case: background-extraction
Asset type: transparent splash-screen PNG for OpenMulticam.
Extract the two overlapping rounded teal viewfinder frames in this image onto a genuinely transparent alpha background. Preserve precisely the current sculpture geometry, placement, teal and aqua colors, broad clean bevels and lighting. Remove the entire off-white backdrop and external floor shadow, including background inside both openings. Keep the square canvas and same padding. All cutout edges must be smooth, clean and antialiased, with no jagged spill, stray pixels, spikes, color fringe or detached flecks. The two frame surfaces remain solid and opaque, including the pale highlights. Background alpha zero. Do not include any black or white matte. No other changes. Output a PNG with real alpha transparency.
```

