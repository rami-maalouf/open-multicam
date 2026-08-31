import {
  act,
  cleanup,
  fireEvent,
  render as libraryRender,
  renderHook,
  type RenderOptions,
  waitFor,
  within,
} from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import {
  AccessibilityPreferencesProvider,
  defaultAccessibilityPreferences,
  type AccessibilityPreferences,
} from "@/foundation/accessibility/preferences";

export { act, cleanup, fireEvent, renderHook, waitFor, within };

export type AppRenderOptions = Omit<RenderOptions, "wrapper"> & {
  accessibilityPreferences?: Partial<AccessibilityPreferences>;
};

export function render(
  ui: ReactElement,
  {
    accessibilityPreferences,
    ...options
  }: AppRenderOptions = {},
) {
  const preferences = {
    ...defaultAccessibilityPreferences,
    ...accessibilityPreferences,
  };

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AccessibilityPreferencesProvider value={preferences}>
        {children}
      </AccessibilityPreferencesProvider>
    );
  }

  return libraryRender(ui, { ...options, wrapper: Wrapper });
}
