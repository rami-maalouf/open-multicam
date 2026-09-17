/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>"],
  testMatch: ["**/*.test.[jt]s?(x)"],
  transformIgnorePatterns: [
    "node_modules/(?!(.bun|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|standard-navigation|@sentry/react-native|native-base|react-native-svg))",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^tuft-telemetry/expo$":
      "<rootDir>/tests/mocks/tuft-telemetry-expo.ts",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/app/**",
    "!src/**/*.d.ts",
    "!src/testing/**",
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
