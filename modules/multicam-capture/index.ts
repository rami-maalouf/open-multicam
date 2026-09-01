import { NativeModule, requireNativeModule, requireNativeView } from "expo";
import type { ComponentType } from "react";
import type { ViewProps } from "react-native";

import type { CaptureResult } from "@/core/capture/contracts";
import type {
  CaptureBridgeEvent,
  CapturePermissions,
  CaptureRequest,
  DeviceCapabilities,
  ResolvedCapturePreset,
} from "@/core/capture/types";
import type { RecordingSetManifestV1 } from "@/core/library/manifest";
import type { RecordingLibraryEntry } from "@/core/library/entry";

export type RecordingStart = Readonly<{
  recordingSetId: string;
}>;

export type MulticamCaptureModuleEvents = {
  onCaptureEvent: (event: CaptureBridgeEvent) => void;
};

export declare class MulticamCaptureModule extends NativeModule<MulticamCaptureModuleEvents> {
  getPermissionStatus(): Promise<CapturePermissions>;
  requestCameraPermission(): Promise<CapturePermissions>;
  requestMicrophonePermission(): Promise<CapturePermissions>;
  openSettings(): Promise<boolean>;
  discoverCapabilities(): Promise<DeviceCapabilities>;
  configure(
    request: CaptureRequest,
  ): Promise<CaptureResult<ResolvedCapturePreset>>;
  startRecording(): Promise<CaptureResult<RecordingStart>>;
  stopRecording(): Promise<CaptureResult<RecordingSetManifestV1>>;
  listRecordings(): Promise<readonly RecordingLibraryEntry[]>;
  deleteRecording(recordingSetId: string): Promise<boolean>;
  renameRecording(
    recordingSetId: string,
    name: string,
  ): Promise<RecordingSetManifestV1>;
}

export type CaptureSurfaceProps = ViewProps;

export const multicamCaptureModule =
  requireNativeModule<MulticamCaptureModule>("MulticamCapture");

export const CaptureSurfaceView: ComponentType<CaptureSurfaceProps> =
  requireNativeView("MulticamCapture");
