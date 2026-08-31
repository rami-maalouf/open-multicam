# Starter Migration Allowlist

## Source baseline

Starter source: `/Users/rami/Documents/life-os/expo/content/videos/build-expo-with-claude-code/habit-tracker`

Baseline commit: `d2c58090603c19e96a4463b4f4f3e1e715b948d0`

The starter had these unrelated untracked paths before OpenMulticam migration began:

```text
?? .agents/prompts/
?? .eas/
?? .github/
```

These entries are part of the recorded source baseline. They are not OpenMulticam changes and must remain byte-for-byte untouched.

## T001 allowlist

Only these starter inputs informed T001:

| Starter input | Permitted use | OpenMulticam result |
| --- | --- | --- |
| `package.json` | Expo SDK, React Native, React, test-tool, and approved module versions | Reduced and renamed `package.json` |
| `tsconfig.json` | Expo base, strict mode, and `@/*` alias shape | Stricter OpenMulticam `tsconfig.json` |
| `.gitignore` | Generated-project and local-artifact patterns | Expanded OpenMulticam `.gitignore` |
| `bun.lock` | Confirm Bun package-manager convention only | Not copied; regenerated from the reduced manifest |
| `eslint.config.js` | Inspected for later tooling work | Not copied in T001 |

No application source, route, asset, product model, test, environment file, generated project, EAS identity, credential, build output, screenshot, prompt, agent configuration, Git object, or dependency directory is allowed.

## Integrity evidence

The following source-file hashes were recorded before T001:

```text
package.json      70389d50c7019c0db17ccf5b232b7b7b766e5462e3586581dcdb97b1e2f36947
bun.lock          1d53c20f5fe8125d58e848f0facb3cd9d85f182993f55c36325075e9b65b7fed
tsconfig.json     2263a7e3d0006bc1d519870d76d205b497aa790c58e4f3b29fe022f00a5a50b7
eslint.config.js  44af05c397754512a3990df13dc957b116104479ccd9ddfdce74148aee6569b7
.gitignore        87b7d16b10a7bc53f9bc688aad32a46112d46f1135969f322d67ae9c05cce254
```

Before committing T001, compare the starter commit, status, and these hashes to this baseline. Any difference blocks completion until explained by the human.

## T002 identity rewrite

T002 used the starter's app and EAS files only to understand configuration shape. No value carrying product, bundle, entitlement, update, credential, project, channel, or signing identity was copied.

OpenMulticam intentionally has:

- iPhone-only platform configuration with iPad disabled.
- A minimum deployment target of iOS 18.6.
- The `openmulticam` URL scheme.
- Camera, microphone, and add-only Photos descriptions written for this product.
- No bundle identifier yet. Final Apple identity remains gated near release preparation.
- No EAS project id, owner, updates URL, submit profile, credential, entitlement, or channel.
- Embedded updates only. Runtime network updates are disabled for the local-only Release 1 contract.

Run this forbidden-identity check from the OpenMulticam repository:

```bash
if rg -n 'habittracker|habit-tracker|ripples|Ripples|1e477943-ecf0-4d66-8967-c77e0ec0019c|com\.ramimaalouf\.habittracker|iCloud\.com\.ramimaalouf\.habittracker' app.json eas.json package.json; then
  exit 1
fi
```

## Original asset provenance

The icon and launch artwork were generated with the built-in image-generation tool. No starter or reference-app asset was supplied to the generator.

Final icon prompt:

```text
Use case: logo-brand
Asset type: 1024 by 1024 iOS app icon for OpenMulticam
Primary request: an original, professional symbol for simultaneous two-camera filmmaking. Build the mark from two bold offset viewfinder brackets that overlap into a clean central circular record point, subtly suggesting both an open frame and two synchronized lenses.
Style/medium: minimal vector-like app icon, strong geometric silhouette, premium native iOS finish, flat shapes with only restrained depth
Composition/framing: centered mark, generous optical balance, full-bleed square canvas, readable at very small size; do not bake rounded corners into the artwork
Color palette: near-black ink background, warm signal-coral primary bracket, cool pale-cyan secondary bracket, small off-white central point
Constraints: completely original; no text; no letters; no existing brand resemblance; no DoubleTake imagery; no literal camera body; no aperture-shutter cliché; no watermark; no mockup; no device frame; no transparency; crisp edges; sRGB-friendly contrast
```

Final launch-art prompt:

```text
Use case: precise-object-edit
Asset type: opaque square launch-screen artwork for OpenMulticam
Primary request: replace the entire checkerboard background with one perfectly uniform solid near-black ink color #05090B. Keep the geometric mark centered, but scale the complete mark down proportionally to occupy about 52 percent of the square width, leaving generous equal dark padding on every side.
Invariants: preserve the coral left bracket, pale-cyan right bracket, intentional near-black center ring, off-white center circle, mark geometry, overlap, colors, and crisp smooth edges
Constraints: opaque full-bleed square background; absolutely no checkerboard; no transparency; no texture; no vignette; no speckles; no shadow; no glow; no text; no watermark; no redesign; no extra elements
```

Both project files are opaque 1024 by 1024 RGB PNGs. The original generator outputs remain outside the repository.
