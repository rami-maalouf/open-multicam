# Native testing rules

Use the pinned tester-army/e2e CLI through `bun run test:e2e:sim`. Read its packaged docs under `node_modules/e2e/docs` before changing tests or config. Keep deterministic locators and assertions; model actions are optional and require explicit configuration.

Use an explicitly selected isolated OpenMulticam-TesterArmy simulator and the project-local agent-device state directory. Never clear a personal simulator, app library, keychain, or Photos library. Fixture helpers must remove only their owned UUID directories. Validate manifests against the production schema and verify app bundle/build provenance before installation.

Reproduce product bugs in the native UI before fixing them. Preserve failing and passing reports in separate output directories, including accessibility trees and screenshots. A screenshot alone is not proof of behavior. Repeat the complete suite before publication, and keep docs/e2e-coverage.md honest about observed results and hardware limitations. Synthetic videos exercise native library/playback workflows; they cannot prove multicamera capture.
