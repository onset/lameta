import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as Path from "path";
import { findBuiltInRulesFile, IRulesFileModule } from "./rulesFile";

const fixtures = Path.resolve("src/problems/test-fixtures/archive-configurations");

describe("findBuiltInRulesFile", () => {
  it("finds the rules.js of a configuration that has one", () => {
    expect(findBuiltInRulesFile("WithRules", fixtures)).toBe(
      Path.join(fixtures, "WithRules", "rules.js"),
    );
  });
  it("returns undefined for a configuration without one", () => {
    expect(findBuiltInRulesFile("WithoutRules", fixtures)).toBeUndefined();
  });
  it("returns undefined for a configuration that doesn't exist", () => {
    expect(findBuiltInRulesFile("NoSuchArchive", fixtures)).toBeUndefined();
    expect(findBuiltInRulesFile("", fixtures)).toBeUndefined();
  });
  it("looks in each of lameta's own archive configurations", () => {
    for (const name of fs.readdirSync("archive-configurations")) {
      const hasOne = fs.existsSync(Path.join("archive-configurations", name, "rules.js"));
      expect(!!findBuiltInRulesFile(name, "archive-configurations")).toBe(hasOne);
    }
  });
  it("finds a file that declares a supported format", async () => {
    const rules: IRulesFileModule = await import(findBuiltInRulesFile("WithRules", fixtures)!);
    expect(rules).toMatchObject({ interfaceVersion: 1, format: "imdi" });
    expect(typeof rules.checkSession).toBe("function");
  });
});
