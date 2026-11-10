import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as Path from "path";
import JSON5 from "json5";
import {
  ChecksOfConfiguration,
  enabledChecks,
  kChecks,
  mergeChecks,
  problemsWithChecks,
} from "./checkSettings";

const readSettings = (directory: string) =>
  JSON5.parse(fs.readFileSync(Path.join(directory, "settings.json5"), "utf8"));
const lametaChecks: ChecksOfConfiguration = readSettings("archive-configurations/lameta").checks;
const configurationDirectories = [
  "archive-configurations",
  "src/problems/test-fixtures/archive-configurations",
]
  .flatMap((root) =>
    fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => Path.join(root, d.name)),
  )
  .filter((d) => fs.existsSync(Path.join(d, "settings.json5")));

describe("the checks of each configuration", () => {
  it("finds the configurations", () => {
    expect(configurationDirectories.map((d) => Path.basename(d))).toEqual(
      expect.arrayContaining(["lameta", "ELAR", "WithoutConsentCheck"]),
    );
  });

  // a typo would otherwise turn a check off without a word
  it.each(configurationDirectories)(
    "%s names only checks that exist, with settings that fit",
    (dir) => {
      const own: ChecksOfConfiguration | undefined = readSettings(dir).checks;
      const merged = Path.basename(dir) === "lameta" ? own! : mergeChecks(lametaChecks, own);
      expect(problemsWithChecks(merged)).toEqual([]);
    },
  );

  it("lameta's list turns on the checks that every configuration starts with", () => {
    expect(Object.keys(lametaChecks).sort()).toEqual(
      [
        "contributorWithoutConsent",
        "contributorWithoutPerson",
        "fileNameNotAllowed",
        "languageNameVariations",
        "sessionWithoutContributors",
        "sessionWithoutFiles",
      ].sort(),
    );
  });
});

describe("mergeChecks", () => {
  const base: ChecksOfConfiguration = {
    sessionWithoutFiles: { severity: "error" },
    languageNameVariations: { severity: "warning" },
  };

  it("keeps lameta's checks that the configuration does not name", () => {
    expect(mergeChecks(base, { fileNameLength: { severity: "error", maxLength: 20 } })).toEqual({
      ...base,
      fileNameLength: { severity: "error", maxLength: 20 },
    });
  });

  it("changes a check's severity, and turns a check off with false", () => {
    expect(
      mergeChecks(base, {
        languageNameVariations: { severity: "error" },
        sessionWithoutFiles: false,
      }),
    ).toEqual({ sessionWithoutFiles: false, languageNameVariations: { severity: "error" } });
  });

  it("changes one setting of a check and keeps its others", () => {
    expect(
      mergeChecks(
        { fileSize: { severity: "error", limitsInGigabytes: [20] } },
        { fileSize: { severity: "warning" } },
      ),
    ).toEqual({ fileSize: { severity: "warning", limitsInGigabytes: [20] } });
  });
});

describe("problemsWithChecks", () => {
  const base = (): ChecksOfConfiguration => ({ sessionWithoutFiles: { severity: "error" } });

  it("reports a name that is not a check", () => {
    expect(problemsWithChecks({ sessionWithoutFile: { severity: "error" } })).toEqual([
      '"sessionWithoutFile" is not one of lameta\'s checks.',
    ]);
  });

  it("reports a missing or wrong severity", () => {
    expect(problemsWithChecks({ sessionWithoutFiles: {} })).toEqual([
      '"sessionWithoutFiles" needs a severity of "error" or "warning".',
    ]);
    expect(
      problemsWithChecks({ sessionWithoutFiles: { severity: "fatal" as never } }),
    ).toHaveLength(1);
  });

  it("reports a setting that is missing, unknown, or of the wrong kind", () => {
    expect(problemsWithChecks({ fileNameLength: { severity: "error" } })).toEqual([
      '"fileNameLength" needs the setting "maxLength".',
    ]);
    expect(problemsWithChecks({ fileNameLength: { severity: "error", maxLength: "20" } })).toEqual([
      '"fileNameLength" needs "maxLength" to be a number.',
    ]);
    expect(
      problemsWithChecks({ fileNameLength: { severity: "error", maxLength: 20, max: 3 } }),
    ).toEqual(['"fileNameLength" has no setting "max".']);
    expect(
      problemsWithChecks({ fileNameCharacters: { severity: "error", pattern: "[a-" } }),
    ).toEqual(['"fileNameCharacters" needs "pattern" to be a regular expression.']);
    expect(
      problemsWithChecks({
        fileNameDateStamp: { severity: "error", appliesTo: ["text"], exceptSessions: [] },
      }),
    ).toEqual(['"fileNameDateStamp" needs "appliesTo" to be a list of "media" and "written".']);
  });

  it("reports a value that is neither false nor settings, after merging", () => {
    expect(problemsWithChecks(mergeChecks(base(), { sessionWithoutFiles: null as never }))).toEqual(
      ['"sessionWithoutFiles" must be false or an object of settings.'],
    );
  });

  it("refuses to turn off a check that is always on", () => {
    expect(problemsWithChecks({ metadataUnreadable: false })).toEqual([
      '"metadataUnreadable" cannot be turned off.',
    ]);
  });
});

describe("enabledChecks", () => {
  it("has the checks that are on, and those that are always on", () => {
    const enabled = enabledChecks({
      sessionWithoutFiles: { severity: "warning" },
      languageNameVariations: false,
    });
    expect([...enabled.keys()].sort()).toEqual(["metadataUnreadable", "sessionWithoutFiles"]);
    expect(enabled.get("sessionWithoutFiles")!.severity).toBe("warning");
  });

  it("keeps a check that is always on, even when the configuration turns it off", () => {
    expect(enabledChecks({ metadataUnreadable: false }).get("metadataUnreadable")).toEqual({
      severity: "error",
    });
  });

  it("leaves out a check whose settings do not fit", () => {
    expect(enabledChecks({ fileNameLength: { severity: "error" } }).has("fileNameLength")).toBe(
      false,
    );
  });

  it("knows every check that lameta's list and ELAR's name", () => {
    for (const id of Object.keys(
      mergeChecks(lametaChecks, readSettings("archive-configurations/ELAR").checks),
    ))
      expect(kChecks[id]).toBeDefined();
  });
});
