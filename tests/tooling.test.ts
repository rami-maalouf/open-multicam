import packageJson from "../package.json";

const requiredScripts = [
  "start",
  "ios",
  "lint",
  "typecheck",
  "test",
  "test:coverage",
  "test:native",
  "test:e2e:sim",
  "test:e2e:device",
  "check:repository",
  "doctor",
  "validate",
] as const;

describe("project tooling contract", () => {
  it("exposes every approved command", () => {
    expect(Object.keys(packageJson.scripts)).toEqual(
      expect.arrayContaining(requiredScripts),
    );
  });

  it("uses bun and keeps validation fail-closed", () => {
    for (const command of Object.values(packageJson.scripts)) {
      expect(command).not.toMatch(/\b(?:npm|npx|pnpm|yarn)\b/);
    }

    const validateCommand = packageJson.scripts.validate;

    expect(validateCommand).not.toMatch(/\|\|\s*true|;\s*true/);

    for (const stage of [
      "check:repository",
      "lint",
      "typecheck",
      "test:coverage",
      "doctor",
    ]) {
      expect(validateCommand).toContain(`bun run ${stage}`);
    }
  });
});
