import { render as renderWithoutProviders } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

import { AdaptiveMaterial } from "@/components/adaptive-material";
import {
  AccessibilityPreferencesProvider,
  useAccessibilityPreferences,
} from "@/foundation/accessibility/preferences";
import { playHaptic } from "@/foundation/haptics/haptics";
import { act, render, waitFor } from "@/testing/render";

jest.mock("expo-blur", () => {
  const React = require("react");

  return {
    BlurView: (props: object) => React.createElement("BlurView", props),
  };
});

jest.mock("expo-glass-effect", () => {
  const React = require("react");

  return {
    GlassView: (props: object) => React.createElement("GlassView", props),
    isLiquidGlassAvailable: jest.fn(),
  };
});

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Rigid: "rigid",
  },
  NotificationFeedbackType: {
    Error: "error",
    Success: "success",
    Warning: "warning",
  },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

const mockedGlassAvailability = jest.mocked(isLiquidGlassAvailable);
const preferenceHandlers = new Map<string, (value: boolean) => void>();
const subscriptionRemovers: jest.Mock[] = [];

function PreferenceProbe({ onChange }: { onChange: (value: string) => void }) {
  const preferences = useAccessibilityPreferences();

  useEffect(() => {
    onChange(JSON.stringify(preferences));
  }, [onChange, preferences]);

  return null;
}

describe("accessibility preferences", () => {
  beforeEach(() => {
    preferenceHandlers.clear();
    subscriptionRemovers.length = 0;
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    jest
      .spyOn(AccessibilityInfo, "isDarkerSystemColorsEnabled")
      .mockResolvedValue(true);
    jest
      .spyOn(AccessibilityInfo, "isReduceTransparencyEnabled")
      .mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockImplementation(
        ((eventName: string, handler: (value: boolean) => void) => {
          const remove = jest.fn();
          preferenceHandlers.set(eventName, handler);
          subscriptionRemovers.push(remove);
          return { remove } as unknown as ReturnType<
            typeof AccessibilityInfo.addEventListener
          >;
        }) as typeof AccessibilityInfo.addEventListener,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("observes initial iOS preferences and subsequent changes", async () => {
    const onChange = jest.fn();
    const screen = renderWithoutProviders(
      <AccessibilityPreferencesProvider>
        <PreferenceProbe onChange={onChange} />
      </AccessibilityPreferencesProvider>,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        JSON.stringify({
          increaseContrast: true,
          reduceMotion: true,
          reduceTransparency: false,
        }),
      );
    });

    act(() => {
      preferenceHandlers.get("reduceMotionChanged")?.(false);
      preferenceHandlers.get("darkerSystemColorsChanged")?.(false);
      preferenceHandlers.get("reduceTransparencyChanged")?.(true);
    });

    expect(onChange).toHaveBeenLastCalledWith(
      JSON.stringify({
        increaseContrast: false,
        reduceMotion: false,
        reduceTransparency: true,
      }),
    );

    screen.unmount();
    expect(subscriptionRemovers).toHaveLength(3);
    for (const remove of subscriptionRemovers) {
      expect(remove).toHaveBeenCalledTimes(1);
    }
  });

  it("keeps safe defaults when native preference queries fail", async () => {
    jest
      .mocked(AccessibilityInfo.isReduceMotionEnabled)
      .mockRejectedValueOnce(new Error("unavailable"));
    jest
      .mocked(AccessibilityInfo.isDarkerSystemColorsEnabled)
      .mockRejectedValueOnce(new Error("unavailable"));
    jest
      .mocked(AccessibilityInfo.isReduceTransparencyEnabled)
      .mockRejectedValueOnce(new Error("unavailable"));
    const onChange = jest.fn();
    const screen = renderWithoutProviders(
      <AccessibilityPreferencesProvider>
        <PreferenceProbe onChange={onChange} />
      </AccessibilityPreferencesProvider>,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(2);
    });
    expect(onChange).toHaveBeenLastCalledWith(
      JSON.stringify({
        increaseContrast: false,
        reduceMotion: false,
        reduceTransparency: false,
      }),
    );

    screen.unmount();
  });
});

describe("semantic haptics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps app events to supported native feedback", async () => {
    await playHaptic("selection");
    await playHaptic("captureReady");
    await playHaptic("recordingStart");
    await playHaptic("recordingStop");
    await playHaptic("success");
    await playHaptic("warning");
    await playHaptic("error");

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(1, "light");
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(2, "rigid");
    expect(Haptics.impactAsync).toHaveBeenNthCalledWith(3, "medium");
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(1, "success");
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(2, "warning");
    expect(Haptics.notificationAsync).toHaveBeenNthCalledWith(3, "error");
  });

  it("skips disabled feedback and contains native failures", async () => {
    await playHaptic("selection", { enabled: false });
    jest.mocked(Haptics.selectionAsync).mockRejectedValueOnce(new Error("busy"));

    await expect(playHaptic("selection")).resolves.toBeUndefined();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });
});

describe("adaptive material", () => {
  beforeEach(() => {
    mockedGlassAvailability.mockReset();
  });

  it("uses liquid glass when it is available", () => {
    mockedGlassAvailability.mockReturnValue(true);
    const screen = render(
      <AdaptiveMaterial
        interactive
        material="floatingControl"
        testID="material"
      />,
    );

    expect(screen.getByTestId("material").type).toBe("GlassView");
    expect(screen.getByTestId("material")).toHaveProp("isInteractive", true);
  });

  it("falls back to a system blur on earlier iOS versions", () => {
    mockedGlassAvailability.mockReturnValue(false);
    const screen = render(
      <AdaptiveMaterial material="previewOverlay" testID="material" />,
    );

    expect(screen.getByTestId("material").type).toBe("BlurView");
    expect(screen.getByTestId("material")).toHaveProp("intensity", 64);
  });

  it("uses a solid readable surface when transparency is reduced", () => {
    mockedGlassAvailability.mockReturnValue(true);
    const screen = render(
      <AdaptiveMaterial material="bar" testID="material" />,
      { accessibilityPreferences: { reduceTransparency: true } },
    );

    expect(screen.getByTestId("material").type).toBe("View");
  });
});
