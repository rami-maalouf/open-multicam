import { Platform } from "react-native";

import { render } from "@testing-library/react-native";

import { AccessibilityPreferencesProvider } from "@/foundation/accessibility/preferences";
import { AppText } from "@/components/app-text";
import { Icon } from "@/components/icon";
import { colors, resolveThemePalette, spacing } from "@/theme";

describe("semantic theme foundation", () => {
  it("resolves every approved appearance and contrast palette", () => {
    const light = resolveThemePalette("light", "standard");
    const highContrastLight = resolveThemePalette("light", "high");
    const dark = resolveThemePalette("dark", "standard");
    const highContrastDark = resolveThemePalette("dark", "high");

    expect(light.background).not.toBe(dark.background);
    expect(light.label).not.toBe(highContrastLight.label);
    expect(dark.label).not.toBe(highContrastDark.label);
    expect(highContrastDark.previewLabel).toBe("#ffffff");
    expect(spacing.control).toBeGreaterThan(spacing.compact);
  });

  it("maps text variants to accessible roles while allowing an override", () => {
    const screen = render(
      <>
        <AppText variant="title">Capture</AppText>
        <AppText accessibilityRole="alert" tone="critical" variant="body">
          Camera unavailable
        </AppText>
        <AppText allowFontScaling={false}>Status</AppText>
      </>,
    );

    expect(screen.getByRole("header", { name: "Capture" })).toHaveProp(
      "allowFontScaling",
      true,
    );
    expect(
      screen.getByRole("alert", { name: "Camera unavailable" }),
    ).toHaveStyle({ color: colors.critical });
    expect(screen.getByText("Status")).toHaveProp("allowFontScaling", false);
  });

  it("uses a local vector source for Android icons", () => {
    jest.replaceProperty(Platform, "OS", "android");
    try {
      const screen = render(<Icon label="Open library" name="rectangle.stack" />);
      const source = JSON.stringify(screen.getByRole("image", { name: "Open library" }).props.source);
      expect(source).toContain("data:image/svg+xml");
      expect(source).not.toContain("sf:");
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("exposes labeled icons and keeps decorative icons silent", () => {
    const screen = render(
      <>
        <Icon label="Open library" name="photo.on.rectangle" />
        <Icon
          name="circle.fill"
          size="compact"
          testID="recording-indicator"
          tone="recording"
        />
      </>,
    );

    expect(
      screen.getByRole("image", { name: "Open library" }).props.tintColor,
    ).not.toEqual(
      screen.getByTestId("recording-indicator").props.tintColor,
    );
    expect(screen.queryByRole("image", { name: "circle.fill" })).toBeNull();
  });

  it("updates Android colors with appearance and contrast", () => {
    jest.replaceProperty(Platform, "OS", "android");
    const scheme = jest.spyOn(require("react-native"), "useColorScheme").mockReturnValue("light");
    try {
      const { useThemeColors } = require("@/theme");
      function Probe() {
        const theme = useThemeColors();
        return <AppText testID="theme-probe" style={{ backgroundColor: theme.background }}>Theme</AppText>;
      }
      function Harness({ contrast = false }: { contrast?: boolean }) {
        return (
          <AccessibilityPreferencesProvider value={{ increaseContrast: contrast, reduceMotion: false, reduceTransparency: false }}>
            <Probe />
          </AccessibilityPreferencesProvider>
        );
      }
      const screen = render(<Harness contrast={false} />);
      expect(screen.getByTestId("theme-probe")).toHaveStyle({ backgroundColor: "#f7f6f2" });
      scheme.mockReturnValue("dark");
      screen.rerender(<Harness contrast={false} />);
      expect(screen.getByTestId("theme-probe")).toHaveStyle({ backgroundColor: "#080d0f" });
      screen.rerender(<Harness contrast={true} />);
      expect(screen.getByTestId("theme-probe")).toHaveStyle({ backgroundColor: "#000000" });
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("resolves static colors for android appearance", () => {
    try {
      jest.isolateModules(() => {
        const rn = require("react-native");
        jest.replaceProperty(rn.Platform, "OS", "android");
        jest.spyOn(rn.Appearance, "getColorScheme").mockReturnValue("dark");
        const { colors: androidColors } = require("@/theme");
        expect(androidColors.background).toBe("#080d0f");
      });
    } finally {
      jest.restoreAllMocks();
    }
  });
});
