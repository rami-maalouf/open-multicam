import { act, fireEvent, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AppState } from "react-native";

import { CaptureScreen } from "@/screens/shell/app-shell-screens";
import { render } from "@/testing/render";

const mockDiscoverCapabilities = jest.fn();
const mockGetPermissionStatus = jest.fn();
const mockConfigure = jest.fn();
const mockRequestCameraPermission = jest.fn();
const mockRequestMicrophonePermission = jest.fn();
const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();
const mockOpenSettings = jest.fn();
let mockModuleEventListener: ((event: unknown) => void) | null = null;
let mockCaptureFocusEffect: (() => void | (() => void)) | null = null;

jest.mock("../../modules/multicam-capture", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    CaptureSurfaceView: ({ children, ...props }: { children?: ReactNode }) =>
      React.createElement(View, props, children),
    multicamCaptureModule: {
      addListener: (_eventName: string, listener: (event: unknown) => void) => {
        mockModuleEventListener = listener;
        return { remove: jest.fn() };
      },
      configure: (...args: unknown[]) => mockConfigure(...args),
      discoverCapabilities: (...args: unknown[]) =>
        mockDiscoverCapabilities(...args),
      getPermissionStatus: (...args: unknown[]) =>
        mockGetPermissionStatus(...args),
      openSettings: (...args: unknown[]) => mockOpenSettings(...args),
      requestCameraPermission: (...args: unknown[]) =>
        mockRequestCameraPermission(...args),
      requestMicrophonePermission: (...args: unknown[]) =>
        mockRequestMicrophonePermission(...args),
      startRecording: (...args: unknown[]) => mockStartRecording(...args),
      stopRecording: (...args: unknown[]) => mockStopRecording(...args),
    },
  };
});

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    Link: ({ children }: { children: ReactNode }) => children,
    useFocusEffect: (callback: () => void | (() => void)) => {
      mockCaptureFocusEffect = callback;
      React.useEffect(callback, [callback]);
    },
  };
});

const simulatorCapabilities = {
  kind: "device-capabilities",
  schemaVersion: 1,
  discoveredAtMs: 1_234,
  isSimulator: true,
  cameras: [],
  multicam: {
    kind: "unsupported",
    reason: {
      kind: "camera-unavailable",
      message:
        "No simulator camera source was found. Start the EAS Camera helper or SimCam, then reopen OpenMulticam.",
    },
  },
  configurations: [],
} as const;

const simcamCapabilities = {
  ...simulatorCapabilities,
  cameras: [
    {
      id: "simcam-back",
      label: "SimCam Back",
      position: "back",
      deviceType: "wide",
      fieldOfViewDegrees: 70,
      zoomRange: { minimum: 1, maximum: 4 },
      supportsFocusPoint: true,
      supportsExposurePoint: true,
      supportsTorch: false,
    },
  ],
  multicam: {
    kind: "unsupported",
    reason: {
      kind: "multicam-unsupported",
      message:
        "Simulator camera input is connected. Single-camera preview is available; dual-camera capture still requires a physical iPhone.",
    },
  },
  configurations: [
    {
      kind: "supported",
      id: "single:simcam-back",
      mode: "single",
      output: "single-file",
      cameraIds: ["simcam-back"],
      frameRates: [30],
      availability: "recommended",
      profile: "core1080p",
      codec: "h264",
      bitrate: 16_000_000,
      stabilization: "standard",
      estimatedHardwareCost: 0.45,
    },
  ],
  recommendedConfigurationId: "single:simcam-back",
} as const;

describe("native capture surface", () => {
  beforeEach(() => {
    mockModuleEventListener = null;
    mockCaptureFocusEffect = null;
    mockDiscoverCapabilities.mockReset();
    mockDiscoverCapabilities.mockResolvedValue(simulatorCapabilities);
    mockGetPermissionStatus.mockReset();
    mockGetPermissionStatus.mockResolvedValue({
      kind: "capture-permissions",
      camera: "authorized",
      microphone: "authorized",
    });
    mockConfigure.mockReset();
    mockConfigure.mockResolvedValue({ ok: true, value: {} });
    mockRequestCameraPermission.mockReset();
    mockRequestCameraPermission.mockResolvedValue({
      kind: "capture-permissions",
      camera: "authorized",
      microphone: "not-determined",
    });
    mockRequestMicrophonePermission.mockReset();
    mockRequestMicrophonePermission.mockResolvedValue({
      kind: "capture-permissions",
      camera: "authorized",
      microphone: "authorized",
    });
    mockStartRecording.mockReset();
    mockStartRecording.mockResolvedValue({
      ok: true,
      value: { recordingSetId: "take-1" },
    });
    mockStopRecording.mockReset();
    mockStopRecording.mockResolvedValue({ ok: true, value: {} });
    mockOpenSettings.mockReset();
    mockOpenSettings.mockResolvedValue(true);
  });

  it("mounts the native surface and explains simulator availability", async () => {
    const screen = render(<CaptureScreen />);

    expect(screen.getByTestId("native-capture-surface")).toBeTruthy();
    expect(screen.getByText("Checking camera access…")).toBeTruthy();

    await waitFor(() => {
      expect(
        screen.getByText(
          "No simulator camera source was found. Start the EAS Camera helper or SimCam, then reopen OpenMulticam.",
        ),
      ).toBeTruthy();
    });
    expect(mockDiscoverCapabilities).toHaveBeenCalledTimes(1);
  });

  it("detects a simulator camera injected after the app launches", async () => {
    mockDiscoverCapabilities
      .mockResolvedValueOnce(simulatorCapabilities)
      .mockResolvedValue(simcamCapabilities);

    const screen = render(<CaptureScreen />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "No simulator camera source was found. Start the EAS Camera helper or SimCam, then reopen OpenMulticam.",
        ),
      ).toBeTruthy();
    });

    await waitFor(
      () => {
        expect(screen.getByText("SimCam Back")).toBeTruthy();
      },
      { timeout: 2_000 },
    );

    expect(mockDiscoverCapabilities).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
  });

  it("accepts only newer documented state events", async () => {
    const screen = render(<CaptureScreen />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "No simulator camera source was found. Start the EAS Camera helper or SimCam, then reopen OpenMulticam.",
        ),
      ).toBeTruthy();
    });

    act(() => {
      mockModuleEventListener?.({
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
      });
    });

    expect(screen.getByLabelText(/Native state failed/)).toBeTruthy();

    act(() => {
      mockModuleEventListener?.({
        kind: "state-changed",
        sequence: 1,
        state: { kind: "idle" },
      });
    });

    expect(screen.getByLabelText(/Native state failed/)).toBeTruthy();
  });

  it("reveals the native preview when SimCam exposes a camera", async () => {
    mockDiscoverCapabilities.mockResolvedValue(simcamCapabilities);

    const screen = render(<CaptureScreen />);

    await waitFor(() => {
      expect(screen.queryByText("Two perspectives. One take.")).toBeNull();
    });
    expect(screen.getByText("SimCam Back")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    expect(screen.getByTestId("native-capture-surface")).toBeTruthy();
  });

  it("asks before requesting camera and microphone access", async () => {
    mockGetPermissionStatus.mockResolvedValue({
      kind: "capture-permissions",
      camera: "not-determined",
      microphone: "not-determined",
    });

    const screen = render(<CaptureScreen />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
      expect(mockRequestMicrophonePermission).toHaveBeenCalledTimes(1);
    });
  });

  it("opens Settings after camera access is denied", async () => {
    mockGetPermissionStatus.mockResolvedValue({
      kind: "capture-permissions",
      camera: "denied",
      microphone: "denied",
    });
    const screen = render(<CaptureScreen />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Settings" })).toBeTruthy();
    });
    fireEvent.press(screen.getByRole("button", { name: "Open Settings" }));
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("records, finalizes, and restores the selected preview", async () => {
    mockDiscoverCapabilities.mockResolvedValue(simcamCapabilities);
    const screen = render(<CaptureScreen />);

    const recordButton = await screen.findByRole("button", { name: "Record" });
    await waitFor(() => expect(recordButton).toBeEnabled());
    fireEvent.press(recordButton);

    const stopButton = await screen.findByRole("button", {
      name: "Stop recording",
    });
    fireEvent.press(stopButton);

    await waitFor(() => {
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
      expect(mockStopRecording).toHaveBeenCalledTimes(1);
      expect(mockConfigure).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    });
  });

  it("reconfigures the camera when the capture route regains focus", async () => {
    mockDiscoverCapabilities.mockResolvedValue(simcamCapabilities);
    const screen = render(<CaptureScreen />);

    await waitFor(() => {
      expect(mockConfigure).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    });

    act(() => {
      mockCaptureFocusEffect?.();
    });

    await waitFor(() => {
      expect(mockDiscoverCapabilities).toHaveBeenCalledTimes(2);
      expect(mockConfigure).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    });
  });

  it("refreshes capture after an interrupted take finalizes natively", async () => {
    mockDiscoverCapabilities.mockResolvedValue(simcamCapabilities);
    const screen = render(<CaptureScreen />);

    const recordButton = await screen.findByRole("button", { name: "Record" });
    await waitFor(() => expect(recordButton).toBeEnabled());
    fireEvent.press(recordButton);
    await screen.findByRole("button", { name: "Stop recording" });

    const previousAppState = AppState.currentState;
    Object.defineProperty(AppState, "currentState", {
      configurable: true,
      value: "active",
    });
    act(() => {
      mockModuleEventListener?.({
        kind: "state-changed",
        sequence: 1,
        state: {
          kind: "completed",
          recordingSetId: "take-1",
          durationMs: 2_000,
        },
      });
    });

    await waitFor(() => {
      expect(mockDiscoverCapabilities).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    });
    Object.defineProperty(AppState, "currentState", {
      configurable: true,
      value: previousAppState,
    });
  });

  it("shows native start and stop failures", async () => {
    mockDiscoverCapabilities.mockResolvedValue(simcamCapabilities);
    mockStartRecording.mockResolvedValueOnce({
      ok: false,
      error: {
        kind: "capture-error",
        code: "recording_start_failed",
        message: "Recording could not start.",
        retryable: true,
        recoveryAction: "retry",
      },
    });
    const startFailure = render(<CaptureScreen />);

    const recordButton = await startFailure.findByRole("button", {
      name: "Record",
    });
    await waitFor(() => expect(recordButton).toBeEnabled());
    fireEvent.press(recordButton);
    await waitFor(() => {
      expect(startFailure.getByText("Recording could not start.")).toBeTruthy();
    });
    startFailure.unmount();

    mockStartRecording.mockResolvedValue({
      ok: true,
      value: { recordingSetId: "take-2" },
    });
    mockStopRecording.mockResolvedValueOnce({
      ok: false,
      error: {
        kind: "capture-error",
        code: "finalization_failed",
        message: "The recording could not be finalized.",
        retryable: true,
        recoveryAction: "retry",
      },
    });
    const stopFailure = render(<CaptureScreen />);
    const secondRecordButton = await stopFailure.findByRole("button", {
      name: "Record",
    });
    await waitFor(() => expect(secondRecordButton).toBeEnabled());
    fireEvent.press(secondRecordButton);
    fireEvent.press(
      await stopFailure.findByRole("button", { name: "Stop recording" }),
    );
    await waitFor(() => {
      expect(
        stopFailure.getByText("The recording could not be finalized."),
      ).toBeTruthy();
    });
  });

  it("switches between hardware-supported camera configurations", async () => {
    mockDiscoverCapabilities.mockResolvedValue({
      ...simcamCapabilities,
      cameras: [
        { ...simcamCapabilities.cameras[0], id: "back", label: "Wide" },
        {
          ...simcamCapabilities.cameras[0],
          id: "front",
          label: "Front",
          position: "front",
        },
      ],
      multicam: { kind: "supported" },
      configurations: [
        {
          ...simcamCapabilities.configurations[0],
          id: "pip:back:front",
          mode: "pip",
          output: "composite-file",
          cameraIds: ["back", "front"],
          frameRates: [24, 25, 30],
        },
        {
          ...simcamCapabilities.configurations[0],
          id: "discrete:back:front",
          mode: "discrete",
          output: "dual-files",
          cameraIds: ["back", "front"],
          frameRates: [24, 25],
        },
        {
          ...simcamCapabilities.configurations[0],
          id: "single:back",
          cameraIds: ["back"],
        },
      ],
      recommendedConfigurationId: "pip:back:front",
    });
    const screen = render(<CaptureScreen />);

    const pickerButton = await screen.findByRole("button", {
      name: "Cameras: Wide + Front",
    });
    await waitFor(() => {
      expect(mockConfigure).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          mode: "pip",
          output: "composite-file",
          cameraAId: "back",
          cameraBId: "front",
        }),
      );
    });
    fireEvent.press(pickerButton);
    expect(screen.getByText("Picture in picture")).toBeTruthy();
    expect(screen.getByText("Two separate videos")).toBeTruthy();
    fireEvent.press(screen.getByText("Single camera"));

    await waitFor(() => {
      expect(mockConfigure).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Wide")).toBeTruthy();
    });
  });

  it("offers retry when discovery or configuration fails", async () => {
    mockDiscoverCapabilities.mockRejectedValueOnce(new Error("camera reset"));
    const screen = render(<CaptureScreen />);

    const retry = await screen.findByRole("button", { name: "Try Again" });
    mockDiscoverCapabilities.mockResolvedValue(simcamCapabilities);
    fireEvent.press(retry);

    await waitFor(() => {
      expect(screen.getByText("SimCam Back")).toBeTruthy();
    });
  });
});
