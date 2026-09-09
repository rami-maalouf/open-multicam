export const supportUrl = "https://github.com/rami-maalouf/open-multicam/blob/main/docs/support.md";
export const privacyPolicyUrl = "https://github.com/rami-maalouf/open-multicam/blob/main/docs/privacy.md";

export const privacySections = [
  {
    title: "Your recordings stay with you",
    body: "OpenMulticam is made by Rami Maalouf. The App Store app does not collect your recordings, personal information, usage analytics, advertising identifiers, or location. There is no account or app-operated server. Camera and microphone input is processed on your iPhone.",
  },
  {
    title: "Camera, microphone, and Photos",
    body: "Camera access provides preview and video recording. Microphone access adds sound to your videos. Photos access is requested only when you choose Export to Photos, and is used to add the selected videos. OpenMulticam does not browse your existing photo library. You can change permissions in iOS Settings.",
  },
  {
    title: "Storage and deletion",
    body: "Videos and recording details are stored in the app's local library until you delete them or remove the app. Your iPhone's backup settings may include app data in a device or iCloud backup managed by Apple. Deleting a take from OpenMulticam does not delete copies you previously exported to Photos, Files, or another app.",
  },
  {
    title: "Sharing is your choice",
    body: "Recordings leave the app only when you choose to export or share them. The destination app or service then handles that copy under its own privacy policy. Photos may sync through iCloud Photos if you have enabled it.",
  },
  {
    title: "Optional donations",
    body: "Apple processes the optional one-time donation through the App Store. OpenMulticam checks Apple's verified purchase status on your device to show a thank-you message and restore your purchase. We do not receive your payment card details or send purchase receipts to an app-operated server. Donating does not unlock features.",
  },
  {
    title: "Support and external pages",
    body: "Opening support or source-code links takes you to GitHub, which applies its own privacy policy. If you contact us, we receive the information you choose to share and use it to respond. Public GitHub issues are visible to everyone. Please do not include private recordings or sensitive information.",
  },
  {
    title: "Contact and policy updates",
    body: "For privacy questions, contact Rami Maalouf through the support link below. Changes to this policy will be published on the privacy policy page. Last updated September 9, 2026.",
  },
] as const;
