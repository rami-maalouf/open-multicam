import { existsSync, readFileSync } from "node:fs";

const isFoundationPreviewScenario =
  process.env.OPENMULTICAM_E2E_SCENARIO === "foundation-preview";
const scenarioDescribe = isFoundationPreviewScenario ? describe : describe.skip;

scenarioDescribe("foundation preview simulator scenario", () => {
  it("exposes a development-only native foundation review surface", () => {
    const routePath = "src/app/dev-foundation.tsx";
    const layoutPath = "src/app/_layout.tsx";
    const screenPath =
      "src/screens/settings/foundation-preview-screen.tsx";

    expect(existsSync(routePath)).toBe(true);
    expect(existsSync(layoutPath)).toBe(true);
    expect(existsSync(screenPath)).toBe(true);

    const routeSource = readFileSync(routePath, "utf8");
    const layoutSource = readFileSync(layoutPath, "utf8");
    const screenSource = readFileSync(screenPath, "utf8");

    expect(routeSource).toContain("!__DEV__");
    expect(routeSource).toContain('<Redirect href="/"');
    expect(layoutSource).toContain('name="dev-foundation"');
    expect(layoutSource).toContain('title: "Foundation Preview"');
    expect(screenSource).toContain("<Host");
    expect(screenSource).toContain("<Switch");
    expect(screenSource).toContain("Large accessibility text");
    expect(screenSource).toContain("Dark camera preview");
  });
});
