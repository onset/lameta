import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import { describe, it, expect, beforeAll } from "vitest";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { OtherFile } from "../model/file/File";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";
import { setMediaFolderOrEmptyForThisProjectAndMachine } from "../model/Project/MediaFolderAccess";
import ImdiBundler from "./ImdiBundler";
import { IMDIMode } from "./ImdiGenerator";
import { setupLanguageFinderForTests } from "../languageFinder/LanguageFinder";

temp.track();

// A .link file can be deleted while the project is open (by a sync service, or
// in Explorer). Export must then treat the linked file as missing, not throw.
describe("IMDI export of a session whose .link file was deleted", () => {
  beforeAll(() => {
    setupLanguageFinderForTests();
  });

  async function exportWithDeletedLink(copyInProjectFiles: boolean) {
    const projectDirectory = Path.join(temp.mkdirSync("deletedLink"), "Linky");
    const sessionDirectory = Path.join(projectDirectory, "Sessions", "Linked");
    fs.mkdirpSync(sessionDirectory);
    fs.writeFileSync(
      Path.join(projectDirectory, "Linky.sprj"),
      `<?xml version="1.0" encoding="utf-8"?><Project><Title>Linky</Title></Project>`,
    );
    fs.writeFileSync(
      Path.join(sessionDirectory, "Linked.session"),
      `<Session><id type="string">Linked</id></Session>`,
    );
    fs.writeFileSync(Path.join(sessionDirectory, "kept.txt"), "notes");
    const project = Project.fromDirectory(projectDirectory);
    expect(project.loadingError).toBeUndefined();
    const mediaDirectory = temp.mkdirSync("deletedLinkMedia");
    setMediaFolderOrEmptyForThisProjectAndMachine(mediaDirectory);
    const media = Path.join(mediaDirectory, "clip.mp3");
    fs.writeFileSync(media, "pretend audio");
    const session = project.sessions.items[0] as Session;
    const link = OtherFile.CreateLinkFile(
      media,
      new EncounteredVocabularyRegistry(),
      sessionDirectory,
    );
    session.files.push(link);

    fs.removeSync(link.pathInFolderToLinkFileOrLocalCopy);

    const generator = ImdiBundler.generateExportData(
      project,
      temp.mkdirSync("deletedLinkImdi"),
      IMDIMode.RAW_IMDI,
      copyInProjectFiles,
      () => true,
    );
    const xml: string[] = [];
    const copied: string[] = [];
    for (let r = await generator.next(); ; r = await generator.next()) {
      xml.push(r.value.imdiXml);
      const filesToCopy = "filesToCopy" in r.value ? r.value.filesToCopy : [];
      copied.push(...filesToCopy.map((c) => Path.basename(c.source)));
      if (r.done) break;
    }
    return { all: xml.join("\n"), copied };
  }

  it("exports the session without the linked file", async () => {
    const { all } = await exportWithDeletedLink(false);
    expect(all).toContain("<Name>Linked</Name>");
    expect(all).toContain("kept.txt");
    expect(all).not.toContain("clip.mp3");
  });

  it("copies the session's other files but not the linked file", async () => {
    const { all, copied } = await exportWithDeletedLink(true);
    expect(all).toContain("<Name>Linked</Name>");
    expect(copied).toContain("kept.txt");
    expect(copied.some((name) => name.startsWith("clip.mp3"))).toBe(false);
  });
});
