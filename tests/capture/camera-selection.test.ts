import {
  availableModes,
  camerasFor,
  partnersFor,
  resolveSelection,
  selectCamera,
} from "@/core/capture/selection";
import type { SupportedCaptureConfiguration } from "@/core/capture/types";

const shared = {
  kind: "supported",
  profile: "core1080p",
  codec: "h264",
  bitrate: 16_000_000,
  stabilization: "standard",
  estimatedHardwareCost: 0.8,
  availability: "available",
  frameRates: [24, 25, 30],
} as const;

function configuration(
  id: string,
  mode: string,
  cameraIds: readonly string[],
): SupportedCaptureConfiguration {
  return {
    ...shared,
    id,
    mode,
    output:
      mode === "single"
        ? "single-file"
        : mode === "discrete"
          ? "dual-files"
          : "composite-file",
    cameraIds,
  } as unknown as SupportedCaptureConfiguration;
}

// a pro-style device: three back lenses, one front, and only some pairs are
// hardware supported
const configurations = [
  configuration("pip:wide:front", "pip", ["wide", "front"]),
  configuration("pip:ultra:front", "pip", ["ultra", "front"]),
  configuration("split:wide:front", "split", ["wide", "front"]),
  configuration("split:wide:tele", "split", ["wide", "tele"]),
  configuration("single:wide", "single", ["wide"]),
  configuration("single:ultra", "single", ["ultra"]),
];

describe("camera slot selection", () => {
  it("lists only the styles the device reported, in sheet order", () => {
    expect(availableModes(configurations)).toEqual(["pip", "split", "single"]);
  });

  it("honours an exact pair when the hardware supports it", () => {
    expect(resolveSelection(configurations, "pip", "ultra", "front")).toEqual({
      configurationId: "pip:ultra:front",
      mode: "pip",
      leadingCameraId: "ultra",
      trailingCameraId: "front",
    });
  });

  it("puts the requested camera in slot one even when it is listed second", () => {
    const selection = resolveSelection(configurations, "pip", "front", "wide");

    expect(selection?.leadingCameraId).toBe("front");
    expect(selection?.trailingCameraId).toBe("wide");
  });

  it("keeps the requested slot one camera when the partner is unavailable", () => {
    const selection = resolveSelection(configurations, "split", "tele", "front");

    expect(selection?.configurationId).toBe("split:wide:tele");
    expect(selection?.leadingCameraId).toBe("tele");
    expect(selection?.trailingCameraId).toBe("wide");
  });

  it("returns nothing for a style the device cannot run", () => {
    expect(resolveSelection(configurations, "discrete", "wide", "front")).toBeNull();
  });

  it("drops the second slot in single mode", () => {
    const selection = resolveSelection(configurations, "single", "ultra", null);

    expect(selection).toEqual({
      configurationId: "single:ultra",
      mode: "single",
      leadingCameraId: "ultra",
    });
  });

  it("reports only the cameras that can pair with slot one", () => {
    expect([...partnersFor(configurations, "split", "wide")].sort()).toEqual([
      "front",
      "tele",
    ]);
    expect([...partnersFor(configurations, "pip", "ultra")]).toEqual(["front"]);
    expect([...partnersFor(configurations, "single", "wide")]).toEqual([]);
  });

  it("reports every camera usable in a style", () => {
    expect([...camerasFor(configurations, "pip")].sort()).toEqual([
      "front",
      "ultra",
      "wide",
    ]);
  });

  describe("tapping a tile", () => {
    const current = resolveSelection(configurations, "pip", "wide", "front");

    it("leaves slot one alone when it is tapped again", () => {
      expect(selectCamera(configurations, "pip", current, "wide")).toBe(current);
    });

    it("promotes slot two, which reverses an unchanged pair", () => {
      const next = selectCamera(configurations, "pip", current, "front");

      expect(next?.configurationId).toBe("pip:wide:front");
      expect(next?.leadingCameraId).toBe("front");
      expect(next?.trailingCameraId).toBe("wide");
    });

    it("pairs a compatible camera into slot two", () => {
      const split = resolveSelection(configurations, "split", "wide", "front");
      const next = selectCamera(configurations, "split", split, "tele");

      expect(next?.leadingCameraId).toBe("wide");
      expect(next?.trailingCameraId).toBe("tele");
    });

    it("re-roots the selection around a camera that cannot pair with slot one", () => {
      // ultra cannot join wide in pip, so tapping it makes ultra slot one
      const next = selectCamera(configurations, "pip", current, "ultra");

      expect(next?.configurationId).toBe("pip:ultra:front");
      expect(next?.leadingCameraId).toBe("ultra");
    });

    it("starts a selection when there is none yet", () => {
      const next = selectCamera(configurations, "pip", null, "front");

      expect(next?.leadingCameraId).toBe("front");
    });
  });
});
