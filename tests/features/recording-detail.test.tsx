import { fireEvent, waitFor } from "@testing-library/react-native";
import { Alert, Platform } from "react-native";

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

jest.mock("expo-media-library/legacy", () => ({
  saveToLibraryAsync: (...args: unknown[]) => mockSaveToLibrary(...args),
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

  it("renames on Android without the iOS prompt, keeping the draft after failure", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    mockRenameRecording.mockRejectedValueOnce(new Error("disk unavailable"));
    try {
      const screen = render(<RecordingDetailScreen />);
      await screen.findByTestId("video-player");
      fireEvent.press(screen.getByRole("button", { name: "Rename take" }));
      fireEvent.changeText(screen.getByLabelText("Take name"), "Morning");
      fireEvent.press(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't rename take", expect.any(String)));
      expect(screen.getByLabelText("Take name")).toHaveProp("value", "Morning");
      fireEvent.press(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(screen.queryByLabelText("Take name")).toBeNull());
      expect(mockRenameRecording).toHaveBeenLastCalledWith("set-discrete", "Morning");
      expect(promptSpy).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });

  it.each([30, 32, 33, 36])("exports every clip without library permission on Android API %i", async (version) => {
    jest.replaceProperty(Platform, "OS", "android");
    jest.spyOn(Platform, "Version", "get").mockReturnValue(version);
    try {
      const screen = render(<RecordingDetailScreen />);
      await screen.findByTestId("video-player");
      fireEvent.press(screen.getByRole("button", { name: "Save to gallery" }));
      await waitFor(() => expect(mockSaveToLibrary).toHaveBeenCalledTimes(2));
      expect(mockRequestPhotosPermission).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith("Saved to gallery", "Every video in this take was saved.");
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("requests write-only access on legacy Android and explains denied access", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    jest.spyOn(Platform, "Version", "get").mockReturnValue(29);
    mockRequestPhotosPermission.mockResolvedValue({ granted: false });
    try {
      const screen = render(<RecordingDetailScreen />);
      await screen.findByTestId("video-player");
      fireEvent.press(screen.getByRole("button", { name: "Save to gallery" }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Gallery access is off", expect.stringContaining("write access")));
      expect(mockRequestPhotosPermission).toHaveBeenCalledWith(true);
      expect(mockSaveToLibrary).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });

  it("reports partial export failures without losing the original take", async () => {
    mockSaveToLibrary.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("storage full"));
    const screen = render(<RecordingDetailScreen />);
    await screen.findByTestId("video-player");
    fireEvent.press(screen.getByRole("button", { name: "Save to Photos" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Couldn't save every video", expect.stringContaining("Some videos")));
    expect(screen.getByTestId("video-player")).toBeTruthy();
    expect(mockDeleteRecording).not.toHaveBeenCalled();
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

  it("keeps the take playable when the share sheet fails", async () => {
    mockShareAsync.mockRejectedValueOnce(new Error("share provider unavailable"));
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    try {
      const screen = render(<RecordingDetailScreen />);
      await screen.findByTestId("video-player");
      fireEvent.press(screen.getByRole("button", { name: "Share" }));
      await waitFor(() => expect(alert).toHaveBeenCalledWith("Couldn't share take", expect.any(String)));
      expect(screen.getByTestId("video-player")).toBeTruthy();
      expect(mockDeleteRecording).not.toHaveBeenCalled();
    } finally {
      alert.mockRestore();
    }
  });

  it("offers only the video that survived an interrupted two-camera take", async () => {
    const [clipA, clipB] = entry.clips;
    mockListRecordings.mockResolvedValue([
      {
        ...entry,
        outcome: { kind: "recoverable", reason: "finalization-incomplete", playableClipIds: ["clip-b"] },
        clips: [
          { ...clipA, status: "corrupt" as const, media: null, issue: "The interrupted file could not be decoded." },
          { ...clipB, status: "recoverable" as const, issue: "Recovered after the recording was interrupted." },
        ],
      } satisfies RecordingLibraryEntry,
    ]);
    const screen = render(<RecordingDetailScreen />);

    await screen.findByTestId("video-player");
    expect(screen.getByText(/One video in this take couldn't be saved/)).toBeTruthy();
    expect(screen.getByText(/0:04/)).toBeTruthy();
    // a single surviving clip needs no camera picker
    expect(screen.queryByRole("button", { name: "Front" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    expect(mockShareAsync).toHaveBeenCalledWith("file:///recordings/set-discrete/b.mp4", expect.any(Object));
  });

  it("offers only deletion for a take with nothing left to play", async () => {
    const [clipA, clipB] = entry.clips;
    mockListRecordings.mockResolvedValue([
      {
        ...entry,
        outcome: { kind: "corrupt", reason: "unreadable-track" },
        clips: [
          { ...clipA, status: "corrupt" as const, media: null, issue: "The interrupted file could not be decoded." },
          { ...clipB, status: "corrupt" as const, media: null, issue: "The interrupted file could not be decoded." },
        ],
      } satisfies RecordingLibraryEntry,
    ]);
    const screen = render(<RecordingDetailScreen />);

    expect(await screen.findByText("This take couldn't be saved")).toBeTruthy();
    expect(screen.queryByTestId("video-player")).toBeNull();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Save to/ })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Delete take" }));
    const deleteActions = alertSpy.mock.calls.find(([title]) => title === "Delete this take?")?.[2] as
      | Array<{ onPress?: () => void }>
      | undefined;
    deleteActions?.[1]?.onPress?.();
    await waitFor(() => expect(mockDeleteRecording).toHaveBeenCalledWith("set-discrete"));
  });
});
