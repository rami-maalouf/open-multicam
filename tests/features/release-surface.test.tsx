import { fireEvent } from "@testing-library/react-native";

import DevFoundationRoute from "@/app/dev-foundation";
import { render } from "@/testing/render";

jest.mock("@expo/ui", () => {
  const React = require("react");

  return {
    Column: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement("Column", props, children),
    Host: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement("Host", props, children),
    Switch: ({ label, ...props }: { label?: string }) =>
      React.createElement("Switch", {
        ...props,
        accessibilityLabel: label,
        accessibilityRole: "switch",
        accessible: true,
      }),
  };
});

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement(View, {
        accessibilityLabel: href,
        testID: "release-redirect",
      }),
  };
});

const originalDevelopmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "__DEV__",
);

function setDevelopmentMode(value: boolean) {
  Object.defineProperty(globalThis, "__DEV__", {
    configurable: true,
    value,
  });
}

afterEach(() => {
  if (originalDevelopmentDescriptor !== undefined) {
    Object.defineProperty(
      globalThis,
      "__DEV__",
      originalDevelopmentDescriptor,
    );
  }
});

describe("foundation preview release surface", () => {
  it("redirects the synthetic route in release behavior", () => {
    setDevelopmentMode(false);
    const screen = render(<DevFoundationRoute />);

    expect(screen.getByTestId("release-redirect")).toBeTruthy();
    expect(screen.getByLabelText("/")).toBeTruthy();
    expect(screen.queryByText("Foundation preview")).toBeNull();
  });

  it("renders native synthetic controls only in development", () => {
    setDevelopmentMode(true);
    const screen = render(<DevFoundationRoute />);

    expect(
      screen.getByRole("header", { name: "Foundation preview" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("switch")).toHaveLength(4);

    fireEvent(
      screen.getByTestId("large-accessibility-text-switch"),
      "valueChange",
      true,
    );
    fireEvent(
      screen.getByTestId("increase-contrast-switch"),
      "valueChange",
      true,
    );
    fireEvent(
      screen.getByTestId("dark-camera-preview-switch"),
      "valueChange",
      true,
    );
    fireEvent(
      screen.getByTestId("reduce-motion-switch"),
      "valueChange",
      true,
    );

    expect(screen.getByText("Accessibility title at 200% scale")).toBeTruthy();
    expect(screen.getByText("High contrast dark preview")).toBeTruthy();
    expect(screen.getByText("Motion transitions disabled")).toBeTruthy();
  });
});
