import * as SplashScreen from "expo-splash-screen";

// the launch image stays up until the first screen has something real to show: the live
// cameras, or the screen that asks for access. then it fades, so opening the app reads as one
// move instead of a cut to an empty preview.

// never keep the launch image up longer than this, whatever happens behind it
export const launchScreenLimitMs = 4000;
// how long the image takes to fade into the app
export const launchScreenFadeMs = 350;

let isHeld = false;
let isRevealed = false;

export function holdLaunchScreen(): void {
  if (isHeld) {
    return;
  }

  isHeld = true;
  SplashScreen.setOptions({ duration: launchScreenFadeMs, fade: true });
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
  setTimeout(revealApp, launchScreenLimitMs);
}

export function revealApp(): void {
  if (isRevealed) {
    return;
  }

  isRevealed = true;
  SplashScreen.hide();
}
