import { NativeModule, requireNativeModule, requireNativeView } from "expo";
import type { ComponentType } from "react";
import type { ViewProps } from "react-native";

import type { CaptureResult } from "@/core/capture/contracts";
import type {
  CaptureBridgeEvent,
  CaptureRequest,
  DeviceCapabilities,
  ResolvedCapturePreset,
} from "@/core/capture/types";
import type { RecordingSetManifestV1 } from "@/core/library/manifest";

export type RecordingStart = Readonly<{
  recordingSetId: string;
}>;

export type MulticamCaptureModuleEvents = {
  onCaptureEvent: (event: CaptureBridgeEvent) => void;
};

export declare class MulticamCaptureModule extends NativeModule<MulticamCaptureModuleEvents> {
  discoverCapabilities(): Promise<DeviceCapabilities>;
  configure(
    request: CaptureRequest,
  ): Promise<CaptureResult<ResolvedCapturePreset>>;
  startRecording(): Promise<CaptureResult<RecordingStart>>;
  stopRecording(): Promise<CaptureResult<RecordingSetManifestV1>>;
}

export type CaptureSurfaceProps = ViewProps &
  Readonly<{
    onCaptureEvent?: (event: {
      nativeEvent: CaptureBridgeEvent;
    }) => void;
  }>;

export const multicamCaptureModule =
  requireNativeModule<MulticamCaptureModule>("MulticamCapture");

export const CaptureSurfaceView: ComponentType<CaptureSurfaceProps> =
  requireNativeView("MulticamCapture");
