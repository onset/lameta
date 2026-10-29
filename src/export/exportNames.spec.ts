import { describe, it, expect } from "vite-plus/test";
import * as fs from "fs";
import * as Path from "path";
import * as temp from "temp";
import { autorun, runInAction } from "mobx";
import { sessionFolderExportName, uniqueExportNames } from "./exportNames";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";

describe("uniqueExportNames", () => {
  it("numbers names that sanitize to the same name, and leaves an unchanged name alone", () => {
    expect(uniqueExportNames(["Tape 1", "Tape_1"])).toEqual(["Tape_1_2", "Tape_1"]);
    expect(uniqueExportNames(["Tape_1", "Tape 1"])).toEqual(["Tape_1", "Tape_1_2"]);
  });
  it("numbers before the extension", () => {
    expect(uniqueExportNames(["a b.wav", "a_b.wav"])).toEqual(["a_b_2.wav", "a_b.wav"]);
  });
  it("treats names that differ only in case as the same, as Windows does", () => {
    expect(uniqueExportNames(["Café", "CAFE"])).toEqual(["Cafe_2", "CAFE"]);
  });
  it("does not use a taken name", () => {
    expect(uniqueExportNames(["otherdocuments", "OtherDocuments"], ["OtherDocuments"])).toEqual([
      "otherdocuments_2",
      "OtherDocuments_3",
    ]);
  });
  it("leaves names that do not clash as sanitizing makes them", () => {
    expect(uniqueExportNames(["COM1", "x y"])).toEqual(["COM1_", "x_y"]);
  });
  it("does not make a name that, with a suffix, is another name", () => {
    expect(uniqueExportNames(["Tape 1", "Tape_1_2.imdi"], ["Tape_1"], [".imdi"])).toEqual([
      "Tape_1_3",
      "Tape_1_2.imdi",
    ]);
    expect(uniqueExportNames(["Tape_1_2.imdi"], ["Tape_1_2"], [".imdi"])).toEqual([
      "Tape_1_2_2.imdi",
    ]);
  });
});

describe("sessionFolderExportName", () => {
  temp.track();
  const sessionXml = fs.readFileSync(
    "sample data/Edolo sample/Sessions/ETR009/ETR009.session",
    "utf8",
  );
  function makeSession(projectDir: string, folder: string): string {
    const dir = Path.join(projectDir, "Sessions", folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(Path.join(dir, folder + ".session"), sessionXml);
    return dir;
  }

  it("tells a reaction about a session's name only when that name changes", () => {
    const projectDir = Path.join(temp.mkdirSync("lameta export name"), "Names");
    makeSession(projectDir, "Tape 1");
    const project = Project.fromDirectory(projectDir);
    const tape1 = project.sessions.items[0];
    const names: (string | undefined)[] = [];
    const stop = autorun(() => names.push(sessionFolderExportName(project, tape1)));
    const add = (folder: string) =>
      runInAction(() =>
        project.sessions.items.push(
          Session.fromDirectory(
            makeSession(projectDir, folder),
            new EncounteredVocabularyRegistry(),
          ),
        ),
      );

    add("Interview");
    expect(names).toEqual(["Tape_1"]);
    // "Tape_1" keeps its name, so "Tape 1" is numbered
    add("Tape_1");
    expect(names).toEqual(["Tape_1", "Tape_1_2"]);
    stop();
  });
});
