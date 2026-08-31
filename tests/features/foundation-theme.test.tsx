import { render } from "@testing-library/react-native";

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
});
