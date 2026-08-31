const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const platformImportPatterns = [
  {
    group: ["expo-sqlite"],
    message: "use the catalog adapter in @/platform/database",
  },
  {
    group: ["modules/multicam-capture", "modules/multicam-capture/*"],
    message: "use the typed adapter in @/platform/capture",
  },
];

module.exports = defineConfig([
  globalIgnores([
    ".expo/**",
    "coverage/**",
    "dist/**",
    "ios/**",
    "android/**",
  ]),
  expoConfig,
  {
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/screens/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: platformImportPatterns }],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...platformImportPatterns,
            {
              group: ["@/platform/database/*", "@/platform/export/*"],
              message: "routes render screen bodies and do not own platform operations",
            },
          ],
        },
      ],
    },
  },
]);
