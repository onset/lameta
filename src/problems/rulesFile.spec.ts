import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as Path from "path";
import { UserSettings } from "../other/UserSettings";
import { findBuiltInRulesFile, getRulesFileUnsupported, IRulesFileModule } from "./rulesFile";

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
    expect(getRulesFileUnsupported(true, rules)).toBeUndefined();
    expect(typeof rules.checkSession).toBe("function");
  });
});

describe("getRulesFileUnsupported", () => {
  it("accepts imdi rules for an archive that uses IMDI", () => {
    expect(getRulesFileUnsupported(true, { interfaceVersion: 1, format: "imdi" })).toBeUndefined();
    // not loaded yet
    expect(getRulesFileUnsupported(true)).toBeUndefined();
  });
  it("reports an archive that does not use IMDI", () => {
    expect(getRulesFileUnsupported(false)).toEqual({
      reason: "archive-does-not-use-imdi",
    });
  });
  it("reports a format other than imdi", () => {
    expect(getRulesFileUnsupported(true, { interfaceVersion: 1, format: "rocrate" })).toEqual({
      reason: "format",
      format: "rocrate",
    });
  });
  it("reports another interface version", () => {
    expect(getRulesFileUnsupported(true, { interfaceVersion: 2, format: "imdi" })).toEqual({
      reason: "interface-version",
      interfaceVersion: 2,
    });
  });
});

describe("local rules file per archive configuration", () => {
  it("keeps a separate choice for each configuration", () => {
    const settings = new UserSettings();
    expect(settings.getProblemRulesFile("ELAR")).toBeUndefined();
    settings.setProblemRulesFile("ELAR", "c:/rules/elar-test.js");
    expect(settings.getProblemRulesFile("ELAR")).toBe("c:/rules/elar-test.js");
    expect(settings.getProblemRulesFile("PARADISEC")).toBeUndefined();

    settings.setProblemRulesFile("PARADISEC", "c:/rules/paradisec.js");
    expect(settings.getProblemRulesFile("ELAR")).toBe("c:/rules/elar-test.js");
    expect(settings.getProblemRulesFile("PARADISEC")).toBe("c:/rules/paradisec.js");
  });
  it("goes back to the built-in file for one configuration only", () => {
    const settings = new UserSettings();
    settings.setProblemRulesFile("ELAR", "c:/rules/elar-test.js");
    settings.setProblemRulesFile("PARADISEC", "c:/rules/paradisec.js");
    settings.setProblemRulesFile("ELAR", undefined);
    expect(settings.getProblemRulesFile("ELAR")).toBeUndefined();
    expect(settings.getProblemRulesFile("PARADISEC")).toBe("c:/rules/paradisec.js");
  });
});
