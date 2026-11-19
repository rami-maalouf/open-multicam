import { fireEvent } from "@testing-library/react-native";
import { Platform } from "react-native";

import { SettingsScreen } from "@/screens/shell/app-shell-screens";
import { render } from "@/testing/render";
import { colors } from "@/theme";

const mockPush = jest.fn();

jest.mock("@expo/ui", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  const ListItem = ({
    children,
    onPress,
    testID,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
  }) => React.createElement(Pressable, { onPress, testID }, children);
  ListItem.Supporting = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, { testID: "supporting-slot" }, children);

  return {
    Host: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
    FieldGroup: Object.assign(({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children), { Section: View }),
    ListItem,
    Text: ({
      children,
      testID,
      textStyle,
    }: {
      children?: React.ReactNode;
      testID?: string;
      textStyle?: object;
    }) => React.createElement(Text, { style: textStyle, testID }, children),
  };
});

// the shell module re-exports the camera and library screens, which need native modules
jest.mock("@/screens/capture/capture-screen", () => ({ CaptureScreen: () => null }));
jest.mock("@/screens/library/library-screen", () => ({ LibraryScreen: () => null }));

jest.mock("expo-router", () => ({
  router: { dismissTo: jest.fn(), push: (path: string) => mockPush(path) },
}));

jest.mock("expo-application", () => ({ nativeApplicationVersion: "1.0.2" }));

afterEach(() => {
  jest.restoreAllMocks();
  mockPush.mockReset();
});

describe("settings screen", () => {
  it("draws each detail line in the secondary color on ios", () => {
    jest.replaceProperty(Platform, "OS", "ios");

    const screen = render(<SettingsScreen />);

    expect(screen.getByTestId("version-settings-row-detail")).toHaveTextContent("1.0.2");
    expect(screen.getByTestId("version-settings-row-detail")).toHaveStyle({
      color: colors.secondary,
    });
    // rows without a detail have no supporting slot
    expect(screen.getAllByTestId("supporting-slot")).toHaveLength(5);
  });

  it("leaves the detail color to material on android", () => {
    jest.replaceProperty(Platform, "OS", "android");

    const screen = render(<SettingsScreen />);

    expect(screen.getByTestId("privacy-settings-row-detail").props.style).toBeUndefined();
  });

  it("opens the privacy policy and the support screen", () => {
    const screen = render(<SettingsScreen />);

    fireEvent.press(screen.getByTestId("privacy-settings-row"));
    fireEvent.press(screen.getByTestId("support-settings-row"));

    expect(mockPush.mock.calls).toEqual([["/privacy"], ["/support"]]);
  });
});
