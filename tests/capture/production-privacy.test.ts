jest.mock("tuft-telemetry/expo", () => ({ createExpoTelemetry: jest.fn(() => ({ enabled: true })) }));

describe("production privacy", () => {
  const development = Object.getOwnPropertyDescriptor(globalThis, "__DEV__");
  const endpoint = process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL;
  const token = process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN;

  afterEach(() => {
    if (development) Object.defineProperty(globalThis, "__DEV__", development);
    if (endpoint === undefined) delete process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL;
    else process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL = endpoint;
    if (token === undefined) delete process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN;
    else process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN = token;
    jest.clearAllMocks();
  });

  it("never initializes telemetry in a release even when build credentials are present", () => {
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: false });
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL = "https://telemetry.example.invalid";
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN = "test-value";
    jest.isolateModules(() => {
      const { telemetry } = jest.requireActual<{ telemetry: unknown }>("@/core/telemetry");
      expect(telemetry).toBeNull();
      expect(jest.requireMock("tuft-telemetry/expo").createExpoTelemetry).not.toHaveBeenCalled();
    });
  });

  it("only initializes explicitly configured development telemetry", () => {
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: true });
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL = "https://telemetry.example.invalid";
    delete process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN;
    jest.isolateModules(() => {
      expect(jest.requireActual<{ telemetry: unknown }>("@/core/telemetry").telemetry).toBeNull();
    });
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN = "test-value";
    jest.isolateModules(() => {
      expect(jest.requireActual<{ telemetry: unknown }>("@/core/telemetry").telemetry).toEqual({ enabled: true });
    });
  });
});
