const mockSetOptions = jest.fn();
const mockPreventAutoHideAsync = jest.fn();
const mockHide = jest.fn();

jest.mock("expo-splash-screen", () => ({
  hide: () => mockHide(),
  preventAutoHideAsync: () => mockPreventAutoHideAsync(),
  setOptions: (options: unknown) => mockSetOptions(options),
}));

type LaunchScreen = typeof import("@/foundation/launch/launch-screen");

// each test gets a fresh module, because the hold and the reveal happen once per launch
function loadLaunchScreen(): LaunchScreen {
  let launchScreen: LaunchScreen | undefined;
  jest.isolateModules(() => {
    launchScreen = require("@/foundation/launch/launch-screen");
  });
  return launchScreen as LaunchScreen;
}

describe("launch screen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSetOptions.mockReset();
    mockHide.mockReset();
    mockPreventAutoHideAsync.mockReset();
    mockPreventAutoHideAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("holds the launch image once, and fades it out", () => {
    const launchScreen = loadLaunchScreen();

    launchScreen.holdLaunchScreen();
    launchScreen.holdLaunchScreen();

    expect(mockPreventAutoHideAsync).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledWith({
      duration: launchScreen.launchScreenFadeMs,
      fade: true,
    });
  });

  it("reveals the app once, when the first screen is ready", () => {
    const launchScreen = loadLaunchScreen();

    launchScreen.holdLaunchScreen();
    launchScreen.revealApp();
    launchScreen.revealApp();
    jest.advanceTimersByTime(launchScreen.launchScreenLimitMs);

    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  it("reveals the app on its own when nothing is ready in time", () => {
    const launchScreen = loadLaunchScreen();

    launchScreen.holdLaunchScreen();
    jest.advanceTimersByTime(launchScreen.launchScreenLimitMs - 1);
    expect(mockHide).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(mockHide).toHaveBeenCalledTimes(1);
  });

  it("carries on when the launch image cannot be held", async () => {
    mockPreventAutoHideAsync.mockRejectedValue(new Error("already hidden"));
    const launchScreen = loadLaunchScreen();

    expect(() => launchScreen.holdLaunchScreen()).not.toThrow();
    await Promise.resolve();
    launchScreen.revealApp();
    expect(mockHide).toHaveBeenCalledTimes(1);
  });
});
