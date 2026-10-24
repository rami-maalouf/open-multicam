# App Store release

Last checked: October 24, 2026.

OpenMulticam is a free iPhone app with an optional, one-time developer donation. Every camera feature is free. The donation follows Twilight's StoreKit 2 non-consumable model, including restoration through the Apple Account.

## October 24 release preparation

- Version: 1.0.0, production build 2. EAS build: `0f543175-cc8a-4e7e-8c45-919e45c59186`, source commit `84bd525`.
- The production build finished successfully. The downloaded archive confirms bundle ID `com.ramimaalouf.openmulticam`, version 1.0.0, build 2, minimum iOS 18.6, and SDK `iphoneos26.5`.
- EAS upload submission `a2eee719-7319-4066-a4c6-690fccaa10fd` finished. Apple build `03b227b1-ab4b-4f07-b2e9-977490ad6b9a` is `VALID`, `APP_STORE_ELIGIBLE`, and selected for app version 1.0.0. Its internal TestFlight state is `READY_FOR_BETA_TESTING`; the existing internal Team (Expo) group has access to all builds. Nothing has been submitted to App Review.
- Final marketing assets are in `/Users/rami/Documents/life-os/design/app-store/open-multicam/final/`. Four 1206 x 2622 screenshots and four 1320 x 2868 screenshots are uploaded in filename order. The obsolete privacy screenshot was removed from the listing and remains in Apple's Asset Library.
- `app-preview.mp4` is uploaded for the medium Dynamic Island display, with other compatible display groups inheriting it. Apple reports both video delivery and the poster frame as complete. The video is 886 x 1920, 30 fps, and 27.17 seconds.
- Verified existing listing: free app, 175 territories, automatic release after approval, published Data Not Collected privacy declaration, complete age rating, reviewer contact, and accessible privacy/support URLs.
- `bun run validate` passes: 174 tests and all 21 Expo Doctor checks, with 90.18% branch coverage. Native XCTest passes with full state-machine region and line coverage. All four hosted StoreKit tests pass on iOS 26.1. The separate foundation-preview scenario also passes; that scenario checks the development review surface, not physical camera behavior.
- The owner confirmed dual-camera recording, playback, and export work on a physical iPhone before the SDK 57 patch alignment. The newly built binary still needs a TestFlight smoke test.
- The owner accepted the updated agreements and completed the legal-entity step. The Free Apps Agreement is active. The Paid Apps Agreement is `Pending User Info`: Apple still requests a bank account, Canadian GST/HST Form 506, and the U.S. Tax Questionnaire. Complete these in App Store Connect Business before offering the donation.
- The donation's review screenshot is uploaded and Apple reports `COMPLETE`; the donation product is now `READY_TO_SUBMIT`. Accepted source: `/Users/rami/Documents/life-os/design/app-store/open-multicam/final/review/donation-review-1206x2622.png` (1206 x 2622, no alpha). Apple screenshot ID: `c3cba0e4-f4f5-4755-8bc2-ac22be9c3e17`. The 414 x 900 preview copy was rejected for incorrect dimensions and its failed upload was removed. The accepted image shows the Support OpenMulticam screen with `Donate $1.99`, captured on October 24 on the iOS 26.1 simulator while a hosted XCTest held an `SKTestSession` with `modules/tip-jar/ios/Tests/Support.storekit`. Running the app from Xcode with the scheme's StoreKit configuration did not apply it; StoreKit stayed on Sandbox, which has no product until the Paid Apps Agreement is active. Include the first donation product with the first app version's review submission.

## App identifiers

- Bundle ID: `com.ramimaalouf.openmulticam`
- App Store Connect ID: `6810275542`
- Apple team: `3V2UU7RRK9`
- EAS project: `7e272538-a33a-4184-9bd5-7b28712854b7`
- Donation product: `com.ramimaalouf.openmulticam.tip.developer.support`
- Donation type: non-consumable, US base price $1.99, with Apple's regional price equalization.
- App Store availability: the same 175 territories as Twilight, including new territories automatically.

## Validation

```sh
bun install --frozen-lockfile
bun run validate
bun run test:native
bun run test:storekit
```

The StoreKit tests require XcodeGen (`brew install xcodegen`) and an iOS 26.1 iPhone simulator. They build a temporary app host and exercise real StoreKit Test purchases, restoration, pending approval, refunds, and failures without charging a real Apple Account. `OPENMULTICAM_SIMULATOR_UDID` overrides the selected simulator.

Apple's iOS 26.5 simulator currently fails to save StoreKit test configurations when invoked from the command line, including hosted tests. Keep the StoreKit test runtime separate from the production build SDK. See the [Apple Developer Forums report](https://developer.apple.com/forums/thread/808030).

Validate camera recording, interruption, playback, export to Photos, and sharing on a physical iPhone. The simulator cannot establish real multicamera hardware compatibility. Run a sandbox donation through TestFlight after Apple's Paid Apps Agreement is active and the product is available.

## Build and upload

The `production` profile in `eas.json` uses App Store distribution, remote build numbers, and the Xcode 26.6 image. Certificates, profiles, and the App Store Connect API key are stored in EAS credentials, never in the repository. The App Store profile is distinct from the development or ad hoc profile.

```sh
bunx eas-cli@23.2.0 build --platform ios --profile production
bunx eas-cli@23.2.0 submit --platform ios --profile production --id BUILD_ID
```

Use the exact verified build ID. Uploading places the build in App Store Connect/TestFlight; it does not submit the app for review.

`store.config.json` contains the public listing copy. Sync it with:

```sh
bunx eas-cli@23.2.0 metadata:push --non-interactive
```

EAS Metadata does not currently expose Apple's new `socialMedia` and `socialMediaAgeRestricted` answers. Both are **No** for OpenMulticam. Check these in App Store Connect after syncing metadata. Reviewer contact details are maintained privately in App Store Connect.

## Before submitting

- The Account Holder must accept the current Apple Developer Program License Agreement.
- Developer donations require the Paid Apps Agreement, legal entity information, and any tax/banking information Apple requests, even though the app itself is free.
- Keep the [privacy policy](privacy.md) and [support page](support.md) publicly accessible at their listing URLs.
- App Privacy: Data Not Collected. Production telemetry is disabled in code and covered by a release privacy test. Recordings and StoreKit entitlement checks stay on the device; Apple processes payments.
- Age rating: 4+, with all questionnaire content and interactive features absent. No hosted social media, chat, advertising, or unrestricted web browser.
- Content rights: the app does not contain third-party media. Use only approved, non-private sample footage in store screenshots.
- Upload opaque screenshots depicting the actual app. The current listing uses 1206 x 2622 for the medium Dynamic Island display and 1320 x 2868 for the large display; verify the accepted display groups in App Store Connect for each release.
- Upload the donation's review screenshot and complete its review notes. The first donation product must be included in the same review submission as the first app version.
- Select the processed build, add the app version and donation for review, then submit the combined submission. Automatic release after approval is configured.

## Current Apple requirements

- [Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/): Xcode 26 and iOS 26 SDK or later have been required since April 28, 2026.
- [App Store Connect release notes](https://developer.apple.com/help/app-store-connect/release-notes/): new age-rating questions and the updated in-app purchase submission flow.
- [Submit an in-app purchase](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase): first purchases must accompany a new app version.
- [Review guidelines](https://developer.apple.com/app-store/review/guidelines/): developer tips may use in-app purchase; the app must include an accessible privacy policy.

Check these official sources for every release. Dates and SDK requirements can change.
