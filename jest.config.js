module.exports = {
  //preset: "ts-jest/presets/js-with-babel",
  //preset: "ts-jest",
  extensionsToTreatAsEsm: [".ts"],
  verbose: true,
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)?$": ["ts-jest", { useESM: true }],
  },
  testPathIgnorePatterns: ["./dist"],
  //transform: {
  //  "^.+\\.(j|t)sx?$": "ts-jest",
  //  "^.+\\.jsx?$": "babel-jest",
  //},
  //testEnvironment: "node",
  //transformIgnorePatterns: [
  //  "node_modules/(?!(unified|remark|bail|is-plain-obj|trough|vfile|vfile-message|unist-util-stringify-position|remark-parse|mdast-util-from-markdown|mdast-util-to-string|micromark|micromark-util-combine-extensions|micromark-util-chunked|micromark-factory-space|micromark-util-character|micromark-core-commonmark)/.*)",
  //],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  coveragePathIgnorePatterns: ["/node_modules/", "setupTests.js"],
  //moduleFileExtensions: ["ts", "tsx", "js", "mjs", "jsx", "json", "node", "md"],
  setupFiles: ["<rootDir>/src/setupTests.js"],
};
