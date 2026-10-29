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

describe("IMDI export of a person whose linked consent file's .link file was deleted", () => {
  beforeAll(() => {
    setupLanguageFinderForTests();
  });

  it("exports without copying that file or listing that person among those who gave consent", async () => {
    const projectDirectory = Path.join(temp.mkdirSync("deletedPermitLink"), "Permits");
    const sessionDirectory = Path.join(projectDirectory, "Sessions", "Talk");
    fs.mkdirpSync(sessionDirectory);
    fs.writeFileSync(
      Path.join(projectDirectory, "Permits.sprj"),
      `<?xml version="1.0" encoding="utf-8"?><Project><Title>Permits</Title></Project>`,
    );
    fs.writeFileSync(
      Path.join(sessionDirectory, "Talk.session"),
      `<Session><id type="string">Talk</id><contributions type="xml"><contributor><name>Awi Heole</name><role>speaker</role></contributor><contributor><name>Ilawi Amosa</name><role>speaker</role></contributor></contributions></Session>`,
    );
    const personDirectory = Path.join(projectDirectory, "People", "Awi_Heole");
    fs.mkdirpSync(personDirectory);
    fs.copyFileSync(
      "sample data/Edolo sample/People/Awi_Heole/Awi_Heole.person",
      Path.join(personDirectory, "Awi_Heole.person"),
    );
    // a second person whose consent file is there, so that the export has a consent bundle
    const otherDirectory = Path.join(projectDirectory, "People", "Ilawi_Amosa");
    fs.mkdirpSync(otherDirectory);
    fs.copyFileSync(
      "sample data/Edolo sample/People/Ilawi_Amosa/Ilawi_Amosa.person",
      Path.join(otherDirectory, "Ilawi_Amosa.person"),
    );
    fs.writeFileSync(Path.join(otherDirectory, "Ilawi_Amosa_Consent.jpg"), "consent");
    const project = Project.fromDirectory(projectDirectory);
    expect(project.loadingError).toBeUndefined();
    const mediaDirectory = temp.mkdirSync("deletedPermitLinkMedia");
    setMediaFolderOrEmptyForThisProjectAndMachine(mediaDirectory);
    const media = Path.join(mediaDirectory, "Awi_Heole_Consent.jpg");
    fs.writeFileSync(media, "pretend consent");
    const person = project.persons.items.find((p) => p.directory === personDirectory)!;
    const link = OtherFile.CreateLinkFile(
      media,
      new EncounteredVocabularyRegistry(),
      personDirectory,
    );
    person.files.push(link);
    expect(link.isLabeledAsConsent()).toBe(true);

    fs.removeSync(link.pathInFolderToLinkFileOrLocalCopy);

    const generator = ImdiBundler.generateExportData(
      project,
      temp.mkdirSync("deletedPermitLinkImdi"),
      IMDIMode.RAW_IMDI,
      true,
      () => true,
    );
    const copied: string[] = [];
    let consentImdi = "";
    for (let r = await generator.next(); ; r = await generator.next()) {
      const filesToCopy = "filesToCopy" in r.value ? r.value.filesToCopy : [];
      copied.push(...filesToCopy.map((c) => Path.basename(c.source)));
      if (/<Session>\s*<Name>ConsentDocuments</.test(r.value.imdiXml))
        consentImdi = r.value.imdiXml;
      if (r.done) break;
    }
    expect(copied).toContain("Ilawi_Amosa_Consent.jpg");
    expect(copied.some((name) => name.startsWith("Awi_Heole_Consent"))).toBe(false);
    // the person whose consent file is gone is not listed as having given consent
    expect(consentImdi).toContain("Ilawi Amosa");
    expect(consentImdi).not.toContain("Awi Heole");
  });
});
