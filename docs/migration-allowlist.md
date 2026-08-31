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
