import { fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { RecordingLibraryEntry } from "@/core/library/entry";
import { RecordingDetailScreen } from "@/screens/library/recording-detail-screen";
import { recordingManifestFixtures } from "@/testing/recording-fixtures";
import { render } from "@/testing/render";

const mockListRecordings = jest.fn();
const mockRenameRecording = jest.fn();
const mockDeleteRecording = jest.fn();
const mockReplace = jest.fn();
const mockShareAsync = jest.fn();
const mockIsSharingAvailable = jest.fn();
const mockRequestPhotosPermission = jest.fn();
const mockSaveToLibrary = jest.fn();
const mockPause = jest.fn();

jest.mock("../../modules/multicam-capture", () => ({
  multicamCaptureModule: {
    deleteRecording: (...args: unknown[]) => mockDeleteRecording(...args),
    listRecordings: (...args: unknown[]) => mockListRecordings(...args),
    renameRecording: (...args: unknown[]) => mockRenameRecording(...args),
  },
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ recordingSetId: "set-discrete" }),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsSharingAvailable(...args),
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: (...args: unknown[]) =>
    mockRequestPhotosPermission(...args),
  Asset: { create: (...args: unknown[]) => mockSaveToLibrary(...args) },
}));

jest.mock("expo-video", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    useVideoPlayer: (_source: unknown, setup: (player: unknown) => void) => {
      const player = { loop: true, pause: mockPause };
      setup(player);
      return player;
    },
    VideoView: (props: Record<string, unknown>) =>
      React.createElement(View, { ...props, testID: "video-player" }),
  };
});

const entry = {
  ...recordingManifestFixtures.discrete,
  directoryUri: "file:///recordings/set-discrete/",
  clipUris: [
    { clipId: "clip-a", uri: "file:///recordings/set-discrete/a.mp4" },
    { clipId: "clip-b", uri: "file:///recordings/set-discrete/b.mp4" },
  ],
} satisfies RecordingLibraryEntry;

describe("recording detail", () => {
  let alertSpy: jest.SpyInstance;
  let promptSpy: jest.SpyInstance;

  beforeEach(() => {
    mockListRecordings.mockReset();
    mockListRecordings.mockResolvedValue([entry]);
    mockRenameRecording.mockReset();
    mockRenameRecording.mockResolvedValue({ ...entry, name: "Morning" });
    mockDeleteRecording.mockReset();
    mockDeleteRecording.mockResolvedValue(true);
    mockReplace.mockReset();
    mockShareAsync.mockReset();
    mockShareAsync.mockResolvedValue(undefined);
    mockIsSharingAvailable.mockReset();
    mockIsSharingAvailable.mockResolvedValue(true);
    mockRequestPhotosPermission.mockReset();
    mockRequestPhotosPermission.mockResolvedValue({ granted: true });
    mockSaveToLibrary.mockReset();
    mockSaveToLibrary.mockResolvedValue(undefined);
    mockPause.mockReset();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    promptSpy = jest.spyOn(Alert, "prompt").mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    promptSpy.mockRestore();
  });

  it("plays either camera and exposes every take action", async () => {
    const screen = render(<RecordingDetailScreen />);

    await waitFor(() => {
      expect(screen.getByTestId("video-player")).toBeTruthy();
      expect(screen.getByText(/1920 × 1080/)).toBeTruthy();
    });

    fireEvent.press(screen.getByRole("button", { name: "Front" }));
    expect(mockPause).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(2));

    fireEvent.press(screen.getByRole("button", { name: "Save to Photos" }));
    await waitFor(() => expect(mockSaveToLibrary).toHaveBeenCalledTimes(2));
    expect(alertSpy).toHaveBeenCalledWith(
      "Saved to Photos",
      "Every video in this take was saved.",
    );

    fireEvent.press(screen.getByRole("button", { name: "Rename take" }));
    const promptActions = promptSpy.mock.calls[0]?.[2] as
      | Array<{ onPress?: (value?: string) => void }>
      | undefined;
    promptActions?.[1]?.onPress?.("Morning");
    await waitFor(() => {
      expect(mockRenameRecording).toHaveBeenCalledWith(
        "set-discrete",
        "Morning",
      );
    });

    fireEvent.press(screen.getByRole("button", { name: "Delete take" }));
    const deleteCall = alertSpy.mock.calls.find(
      ([title]) => title === "Delete this take?",
    );
    const deleteActions = deleteCall?.[2] as
      | Array<{ onPress?: () => void }>
      | undefined;
    deleteActions?.[1]?.onPress?.();
    await waitFor(() => {
      expect(mockDeleteRecording).toHaveBeenCalledWith("set-discrete");
      expect(mockReplace).toHaveBeenCalledWith("/library");
    });
  });

  it("recovers a rejected library read without hiding an indefinite spinner", async () => {
    mockListRecordings.mockRejectedValueOnce(new Error("manifest unreadable"));
    const screen = render(<RecordingDetailScreen />);
    await waitFor(() => expect(screen.getByText("This take could not be read.")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Open library" }));
    expect(mockReplace).toHaveBeenCalledWith("/library");
    fireEvent.press(screen.getByRole("button", { name: "Try Again" }));
    await waitFor(() => expect(screen.getByTestId("video-player")).toBeTruthy());
    expect(mockDeleteRecording).not.toHaveBeenCalled();
  });

  it("keeps the take available when Photos cannot save a video", async () => {
    mockSaveToLibrary.mockRejectedValue(new Error("asset unavailable"));
    const screen = render(<RecordingDetailScreen />);
    await waitFor(() => expect(screen.getByTestId("video-player")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Save to Photos" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Could not save to Photos", "Your take is still in OpenMulticam. Try saving again when Photos is available."));
    expect(screen.getByTestId("video-player")).toBeTruthy();
    expect(mockDeleteRecording).not.toHaveBeenCalled();
    expect(mockRequestPhotosPermission).toHaveBeenCalledWith(true);
  });

  it("retries only the failed clip after a partial Photos export", async () => {
    mockSaveToLibrary.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("second clip missing"));
    const screen = render(<RecordingDetailScreen />);
    await waitFor(() => expect(screen.getByTestId("video-player")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Save to Photos" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Could not save to Photos", "1 of 2 videos were saved. Your take is still in OpenMulticam. Retry to save only the remaining videos."));
    fireEvent.press(screen.getByRole("button", { name: "Retry saving to Photos" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Saved to Photos" })).toBeDisabled());
    expect(mockSaveToLibrary.mock.calls).toEqual([[entry.clipUris[0]!.uri], [entry.clipUris[1]!.uri], [entry.clipUris[1]!.uri]]);
    fireEvent.press(screen.getByRole("button", { name: "Saved to Photos" }));
    expect(mockSaveToLibrary).toHaveBeenCalledTimes(3);
    expect(mockDeleteRecording).not.toHaveBeenCalled();
  });

  it("blocks concurrent export attempts while permission is pending", async () => {
    let grant: ((permission: { granted: boolean }) => void) | undefined;
    mockRequestPhotosPermission.mockReturnValue(new Promise((resolve) => { grant = resolve; }));
    const screen = render(<RecordingDetailScreen />);
    await waitFor(() => expect(screen.getByTestId("video-player")).toBeTruthy());
    const button = screen.getByRole("button", { name: "Save to Photos" });
    fireEvent.press(button);
    fireEvent.press(button);
    expect(mockRequestPhotosPermission).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saving to Photos" })).toBeDisabled();
    grant?.({ granted: true });
    await waitFor(() => expect(screen.getByRole("button", { name: "Saved to Photos" })).toBeDisabled());
    expect(mockSaveToLibrary).toHaveBeenCalledTimes(2);
  });

  it("makes a rejected Photos permission request retryable", async () => {
    mockRequestPhotosPermission.mockRejectedValueOnce(new Error("Photos unavailable"));
    const screen = render(<RecordingDetailScreen />);
    await waitFor(() => expect(screen.getByTestId("video-player")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Save to Photos" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Could not save to Photos", "Your take is still in OpenMulticam. Try saving again when Photos is available."));
    expect(screen.getByRole("button", { name: "Save to Photos" })).not.toBeDisabled();
    expect(mockSaveToLibrary).not.toHaveBeenCalled();
  });

  it("explains missing recordings", async () => {
    mockListRecordings.mockResolvedValue([]);
    const screen = render(<RecordingDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText("This take is no longer available.")).toBeTruthy();
    });
  });

  it("handles unavailable sharing and denied Photos access", async () => {
    mockIsSharingAvailable.mockResolvedValue(false);
    mockRequestPhotosPermission.mockResolvedValue({ granted: false });
    const screen = render(<RecordingDetailScreen />);

    await waitFor(() => expect(screen.getByTestId("video-player")).toBeTruthy());
    fireEvent.press(screen.getByRole("button", { name: "Share" }));
    fireEvent.press(screen.getByRole("button", { name: "Save to Photos" }));

    await waitFor(() => {
      expect(mockShareAsync).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Photos access is off",
        "Allow Add Photos access in Settings to save this take.",
      );
    });
  });
});
