import { describe, expect, it } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const config = require("../electron-builder.config.js");

describe("electron-builder config", () => {
  // electron-builder fills in macros such as ${version} in file names, but not in
  // mac.extendInfo, which goes into Info.plist as written
  it("has no macros in the Mac Info.plist values", () => {
    for (const [key, value] of Object.entries(config.mac.extendInfo)) {
      expect(String(value), key).not.toContain("${");
    }
  });
});
