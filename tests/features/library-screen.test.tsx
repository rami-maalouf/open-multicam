import { waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { LibraryScreen } from "@/screens/library/library-screen";
import type { RecordingLibraryEntry } from "@/core/library/entry";
import { recordingManifestFixtures } from "@/testing/recording-fixtures";
import { render } from "@/testing/render";

const mockListRecordings = jest.fn();

jest.mock("../../modules/multicam-capture", () => ({
  multicamCaptureModule: {
    listRecordings: (...args: unknown[]) => mockListRecordings(...args),
  },
}));

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    Link: ({ children }: { children: ReactNode }) => children,
    useFocusEffect: (callback: () => void | (() => void)) =>
      React.useEffect(callback, [callback]),
  };
});

function libraryEntry(
  manifest: typeof recordingManifestFixtures.single | typeof recordingManifestFixtures.discrete,
): RecordingLibraryEntry {
  return {
    ...manifest,
    directoryUri: `file:///recordings/${manifest.recordingSetId}/`,
    clipUris: manifest.clips.map((clip) => ({
      clipId: clip.id,
      uri: `file:///recordings/${manifest.recordingSetId}/${clip.relativePath}`,
    })),
  };
}

describe("recording library", () => {
  beforeEach(() => {
    mockListRecordings.mockReset();
  });

  it("shows an actionable empty state", async () => {
    mockListRecordings.mockResolvedValue([]);
    const screen = render(<LibraryScreen />);

    await waitFor(() => {
      expect(screen.getByText("Your takes stay on this iPhone")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Open camera" })).toBeTruthy();
  });

  it("renders single and grouped dual-camera takes", async () => {
    mockListRecordings.mockResolvedValue([
      libraryEntry(recordingManifestFixtures.discrete),
      libraryEntry(recordingManifestFixtures.single),
    ]);
    const screen = render(<LibraryScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Two-camera take/)).toBeTruthy();
      expect(screen.getByText(/Front/)).toBeTruthy();
    });
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("keeps capture navigation available when reading fails", async () => {
    mockListRecordings.mockRejectedValue(new Error("disk unavailable"));
    const screen = render(<LibraryScreen />);

    await waitFor(() => {
      expect(
        screen.getByText("The recording library could not be read."),
      ).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Open camera" })).toBeTruthy();
  });
});
