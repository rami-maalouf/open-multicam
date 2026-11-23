import { act, fireEvent } from "@testing-library/react-native";
import { Observe, ObserveRoot } from "expo-observe";
import type { ReactNode } from "react";

import RootLayout from "@/app/_layout";
import { FallbackScreen } from "@/screens/shell/fallback-screen";
import { render } from "@/testing/render";
import type { ObserveRootProps } from "../mocks/expo-observe";

jest.mock("expo-device", () => ({ isDevice: true }));

jest.mock("@/foundation/launch/launch-screen", () => ({
  holdLaunchScreen: jest.fn(),
}));

jest.mock("expo-router/react-navigation", () => ({
  DarkTheme: { colors: {} },
  DefaultTheme: { colors: {} },
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("expo-router/stack", () => {
  const Stack = ({ children }: { children: ReactNode }) => children;
  Stack.Screen = () => null;
  return { Stack };
});

const expectedIntegrations = {
  "expo-router": { filteredParams: ["recordingSetId"] },
};

describe("expo observe root", () => {
  it("configures expo observe once, before any screen mounts", () => {
    // the root layout module ran when it was imported above
    expect(Observe.configure).toHaveBeenCalledTimes(1);
    expect(Observe.configure).toHaveBeenCalledWith({
      environment: undefined,
      integrations: expectedIntegrations,
    });
  });

  it("files release builds on a simulator under their own environment", () => {
    // the isolated registry below reuses this mock object, so the layout reads the new value
    const device: { isDevice: boolean } = jest.requireMock("expo-device");
    device.isDevice = false;
    try {
      jest.isolateModules(() => {
        const isolated: typeof import("../mocks/expo-observe") = require("expo-observe");
        require("@/app/_layout");
        expect(isolated.Observe.configure).toHaveBeenCalledTimes(1);
        expect(isolated.Observe.configure).toHaveBeenCalledWith({
          environment: "simulator",
          integrations: expectedIntegrations,
        });
      });
    } finally {
      device.isDevice = true;
    }
  });

  it("wraps the whole app in a boundary whose fallback can restart it", async () => {
    render(<RootLayout />);
    // let the accessibility preferences settle
    await act(async () => undefined);

    const props = jest.mocked(ObserveRoot).mock.calls.at(-1)?.[0] as ObserveRootProps | undefined;
    const fallback = props?.errorBoundaryFallback;
    expect(typeof fallback).toBe("function");

    const resetError = jest.fn();
    const screen = render(
      <>{typeof fallback === "function" ? fallback({ error: new Error("render failed"), resetError }) : null}</>,
    );

    expect(screen.getByTestId("fallback-screen")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try Again" }));
    expect(resetError).toHaveBeenCalledTimes(1);
  });
});

describe("fallback screen", () => {
  it("explains the problem, reassures about saved takes and offers a retry", () => {
    const onRetry = jest.fn();
    const screen = render(<FallbackScreen onRetry={onRetry} />);

    expect(screen.getByRole("header", { name: "Something went\nwrong." })).toBeTruthy();
    expect(screen.getByText(/Takes you already saved are not affected/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Try Again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
