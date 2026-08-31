import { fireEvent, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { CaptureScreen } from "@/screens/shell/app-shell-screens";
import { render } from "@/testing/render";

const mockDiscoverCapabilities = jest.fn();

jest.mock("../../modules/multicam-capture", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    CaptureSurfaceView: ({
      children,
      onCaptureEvent,
      ...props
    }: {
      children?: ReactNode;
      onCaptureEvent?: (event: unknown) => void;
    }) => React.createElement(View, { ...props, onCaptureEvent }, children),
    multicamCaptureModule: {
      discoverCapabilities: (...args: unknown[]) =>
        mockDiscoverCapabilities(...args),
    },
  };
});

jest.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

const simulatorCapabilities = {
  kind: "device-capabilities",
  schemaVersion: 1,
  discoveredAtMs: 1_234,
  cameras: [],
  multicam: {
    kind: "unsupported",
    reason: {
      kind: "camera-unavailable",
      message:
        "No simulator camera was found. Start SimCam, then reopen OpenMulticam.",
    },
  },
  configurations: [],
} as const;

describe("native capture surface", () => {
  beforeEach(() => {
    mockDiscoverCapabilities.mockReset();
    mockDiscoverCapabilities.mockResolvedValue(simulatorCapabilities);
  });

  it("mounts the native surface and explains simulator availability", async () => {
    const screen = render(<CaptureScreen />);

    expect(screen.getByTestId("native-capture-surface")).toBeTruthy();
    expect(screen.getByText("Checking camera compatibility…")).toBeTruthy();

    await waitFor(() => {
      expect(
        screen.getByText(
          "No simulator camera was found. Start SimCam, then reopen OpenMulticam.",
        ),
      ).toBeTruthy();
    });
    expect(mockDiscoverCapabilities).toHaveBeenCalledTimes(1);
  });

  it("accepts only newer documented state events", async () => {
    const screen = render(<CaptureScreen />);
    const surface = screen.getByTestId("native-capture-surface");

    await waitFor(() => {
      expect(
        screen.getByText(
          "No simulator camera was found. Start SimCam, then reopen OpenMulticam.",
        ),
      ).toBeTruthy();
    });

    fireEvent(surface, "captureEvent", {
      nativeEvent: {
        kind: "state-changed",
        sequence: 2,
        state: {
          kind: "failed",
          error: {
            kind: "capture-error",
            code: "preview_unavailable",
            message: "The camera preview could not start.",
            retryable: true,
            recoveryAction: "retry",
          },
        },
      },
    });

    expect(screen.getByLabelText(/Native state failed/)).toBeTruthy();

    fireEvent(surface, "captureEvent", {
      nativeEvent: {
        kind: "state-changed",
        sequence: 1,
        state: { kind: "idle" },
      },
    });

    expect(screen.getByLabelText(/Native state failed/)).toBeTruthy();
  });

  it("reveals the native preview when SimCam exposes a camera", async () => {
    mockDiscoverCapabilities.mockResolvedValue({
      ...simulatorCapabilities,
      cameras: [{ id: "simcam-back", label: "SimCam Back" }],
      multicam: {
        kind: "unsupported",
        reason: {
          kind: "multicam-unsupported",
          message:
            "SimCam is connected. Single-camera preview is available; dual-camera capture still requires a physical iPhone.",
        },
      },
    });

    const screen = render(<CaptureScreen />);

    await waitFor(() => {
      expect(screen.queryByText("Two perspectives. One take.")).toBeNull();
    });
    expect(screen.getByText("Single camera preview")).toBeTruthy();
    expect(screen.getByTestId("native-capture-surface")).toBeTruthy();
  });
});
