import { createExpoTelemetry } from "tuft-telemetry/expo";

const endpoint = process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL;
const token = process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN;

export const telemetry =
  endpoint && token
    ? createExpoTelemetry({
        endpoint,
        token,
        redactKeys: [/file/i, /path/i, /url/i, /token/i],
      })
    : null;
