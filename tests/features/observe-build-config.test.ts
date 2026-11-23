import easJson from "../../eas.json";

declare const require: (moduleName: "node:fs") => {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: "utf8"): string;
};

const { readdirSync, readFileSync } = require("node:fs");

type Profile = {
  extends?: string;
  uploadSourceMaps?: boolean;
  buildArtifactPaths?: string[];
  ios?: Profile;
};

const profiles = easJson.build as Record<string, Profile>;

// the same merge eas-cli applies to `extends`: the child wins, and ios settings merge one level
function resolve(name: string): Profile {
  const { extends: base, ...profile } = profiles[name] ?? {};
  if (base === undefined) {
    return profile;
  }
  const parent = resolve(base);
  return { ...parent, ...profile, ios: { ...parent.ios, ...profile.ios } };
}

// one shell command per entry, with backslash line continuations joined
function shellCommands(text: string): string[] {
  return text.replace(/\\\n\s*/g, " ").split("\n");
}

describe("expo observe build settings", () => {
  it.each(["production", "internal-ota", "internal-ota-device"])(
    "uploads source maps and keeps the dSYM files for %s builds",
    (name) => {
      const profile = resolve(name);

      expect(profile.uploadSourceMaps).toBe(true);
      expect(profile.ios?.buildArtifactPaths).toContain("ios/build/*.app.dSYM.zip");
    },
  );

  it("uploads source maps with every update it publishes", () => {
    const workflows = readdirSync(".eas/workflows")
      .filter((file) => file.endsWith(".yml"))
      .map((file) => readFileSync(`.eas/workflows/${file}`, "utf8"));
    const publishes = workflows
      .flatMap(shellCommands)
      .filter((command) => !command.trim().startsWith("#"))
      .filter((command) => /(?:\beas|eas-cli(?:@\S+)?) update(?![:\w-])/.test(command));

    // the prebuilt update job has no way to upload source maps for expo observe
    expect(workflows.filter((workflow) => /^\s*type:\s*update\s*$/m.test(workflow))).toEqual([]);
    expect(publishes.length).toBeGreaterThan(0);
    for (const command of publishes) {
      expect(command).toContain("--upload-source-maps");
    }
  });
});
