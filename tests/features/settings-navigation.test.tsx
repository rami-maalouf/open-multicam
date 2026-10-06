import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import * as Application from "expo-application";

import { SettingsScreen } from "@/screens/shell/app-shell-screens";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), dismissTo: jest.fn() } }));
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.3.4" }));
jest.mock("@expo/ui", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return {
    Host: View,
    List: View,
    Text,
    ListItem: ({ children, supportingText, onPress, testID }: { children: React.ReactNode; supportingText?: string; onPress?: () => void; testID?: string }) =>
      React.createElement(Pressable, { onPress, testID }, children, React.createElement(Text, {}, supportingText)),
  };
});
jest.mock("@/screens/capture/capture-screen", () => ({ CaptureScreen: () => null }));
jest.mock("@/screens/library/library-screen", () => ({ LibraryScreen: () => null }));

beforeEach(() => jest.clearAllMocks());

it("provides offline policy, support, library and return navigation with the installed version", () => {
  const screen = render(<SettingsScreen />);
  expect(screen.getByText("2.3.4")).toBeTruthy();
  fireEvent.press(screen.getByTestId("privacy-settings-row"));
  fireEvent.press(screen.getByTestId("support-settings-row"));
  fireEvent.press(screen.getByText("Open library"));
  fireEvent.press(screen.getByText("Return to capture"));
  expect(router.push).toHaveBeenNthCalledWith(1, "/privacy");
  expect(router.push).toHaveBeenNthCalledWith(2, "/support");
  expect(router.push).toHaveBeenNthCalledWith(3, "/library");
  expect(router.dismissTo).toHaveBeenCalledWith("/");
});

it("shows a readable fallback when an installed version is unavailable", () => {
  const previous = Application.nativeApplicationVersion;
  Object.defineProperty(Application, "nativeApplicationVersion", { configurable: true, value: null });
  try {
    const screen = render(<SettingsScreen />);
    expect(screen.getByText("1.0.0")).toBeTruthy();
  } finally {
    Object.defineProperty(Application, "nativeApplicationVersion", { configurable: true, value: previous });
  }
});
