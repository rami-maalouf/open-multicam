jest.mock("tuft-telemetry/expo", () => ({ createExpoTelemetry: jest.fn(() => ({ enabled: true })) }));

// the privacy policy and the store privacy answers promise one thing: release builds send
// anonymous crash, error and performance reports to expo observe, and nothing else leaves the
// device on the app's behalf. this file proves the "nothing else" part and pins the expo
// observe setup to the data those answers declare. change it only together with
// docs/privacy.md, src/core/privacy.ts and the store answers in docs/app-store.md.

declare const require: (moduleName: "node:fs") => {
  readdirSync(path: string, options: { recursive: true }): string[];
  readFileSync(path: string, encoding: "utf8"): string;
};

const { readdirSync, readFileSync } = require("node:fs");

function filesUnder(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory, { recursive: true })
    .filter((file) => pattern.test(file) && !/(?:^|\/)(?:build|Tests)\//.test(file))
    .map((file) => `${directory}/${file}`);
}

function matchesIn(files: string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(file, "utf8")));
}

const appSource = filesUnder("src", /\.tsx?$/);
const moduleSource = filesUnder("modules", /\.tsx?$/);
const nativeSource = filesUnder("modules", /\.(?:swift|kt|java|m|mm)$/);

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

  it("never initializes the development recorder in a release even when build credentials are present", () => {
    Object.defineProperty(globalThis, "__DEV__", { configurable: true, value: false });
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_URL = "https://telemetry.example.invalid";
    process.env.EXPO_PUBLIC_TUFT_TELEMETRY_WRITE_TOKEN = "test-value";
    jest.isolateModules(() => {
      const { telemetry } = jest.requireActual<{ telemetry: unknown }>("@/core/telemetry");
      expect(telemetry).toBeNull();
      expect(jest.requireMock("tuft-telemetry/expo").createExpoTelemetry).not.toHaveBeenCalled();
    });
  });

  it("only initializes an explicitly configured development recorder", () => {
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

describe("release network boundary", () => {
  it("ships expo observe as its only release diagnostics service and no analytics or ads sdk", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies: Record<string, string>;
    };
    const dependencies = Object.keys(packageJson.dependencies);
    const analyticsOrAds =
      /firebase|crashlytics|sentry|bugsnag|datadog|newrelic|new-relic|instabug|embrace|logrocket|amplitude|mixpanel|segment|rudder|posthog|heap|statsig|launchdarkly|appsflyer|adjust|branch|kochava|singular|admob|mobile-ads|facebook|fbsdk|onesignal|appcenter|app-center|expo-insights|tracking-transparency/i;

    expect(dependencies.filter((name) => analyticsOrAds.test(name))).toEqual([]);
    // expo-observe reports from release builds; tuft-telemetry only from configured development
    // builds, as the tests above prove
    expect(dependencies.filter((name) => /telemetry|analytics|observe|metrics|crash/i.test(name))).toEqual([
      "expo-observe",
      "tuft-telemetry",
    ]);
  });

  it("opens no network connection from the app's own code", () => {
    expect(appSource.length).toBeGreaterThan(0);
    expect(nativeSource.length).toBeGreaterThan(0);
    expect(matchesIn([...appSource, ...moduleSource], /\bfetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/)).toEqual([]);
    expect(
      matchesIn(nativeSource, /URLSession|URLRequest|NWConnection|HttpURLConnection|OkHttp|java\.net\.(?:Socket|URL)\b|openConnection/),
    ).toEqual([]);
  });

  it("configures expo observe once, with no data beyond what the privacy answers declare", () => {
    expect(matchesIn(appSource, /Observe\.configure\(/)).toEqual(["src/app/_layout.tsx"]);
    // network traces, custom events and attributes, debug dispatch and a custom endpoint would
    // each send data that docs/privacy.md and the store answers do not declare
    expect(
      matchesIn(appSource, /networkTraces|dispatchInDebug|logEvent|setGlobalAttributes|startSpan|endpointUrl/),
    ).toEqual([]);
    const appJson = JSON.parse(readFileSync("app.json", "utf8")) as {
      expo: { extra: { eas: Record<string, unknown> } };
    };
    expect(appJson.expo.extra.eas.observe).toBeUndefined();
  });

  it("keeps every dynamic route parameter out of navigation metrics", () => {
    const layout = readFileSync("src/app/_layout.tsx", "utf8");
    const filtered = /filteredParams:\s*\[([^\]]*)\]/.exec(layout)?.[1] ?? "";
    const filteredParams = [...filtered.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    const routeParams = filesUnder("src/app", /\.tsx?$/).flatMap((file) =>
      [...file.matchAll(/\[(?:\.\.\.)?([^\]]+)\]/g)].map((match) => match[1]),
    );

    expect(routeParams).toContain("recordingSetId");
    expect(filteredParams).toEqual(expect.arrayContaining(routeParams));
  });
});
