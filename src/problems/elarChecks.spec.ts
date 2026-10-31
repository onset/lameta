import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Contribution } from "../model/file/File";
import { checkProjectFolders } from "./lametaChecks";
import {
  GetOtherConfigurationSettings,
  resetOtherConfigurationSettings,
  SetOtherConfigurationSettings,
} from "../model/Project/OtherConfigurationSettings";

mobx.configure({ enforceActions: "never" });
temp.track();

// The checks of lameta's own that ELAR's settings.json5 turns on with ELAR's values,
// on the Edolo sample under ELAR.

// `files`: names of files to put in ETR009's folder first. lameta renames a file that
// the user adds, so a name that breaks the rules can only come from a file that was
// there already.
function loadEdoloUnderElar(files: string[] = [], configuration = "ELAR"): Project {
  const dir = Path.join(temp.mkdirSync("elar checks"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  for (const name of files) fs.writeFileSync(Path.join(dir, "Sessions", "ETR009", name), "x");
  const sprj = Path.join(dir, "Edolo sample.sprj");
  fs.writeFileSync(
    sprj,
    fs
      .readFileSync(sprj, "utf8")
      .replace(
        "<ArchiveConfigurationName>custom</ArchiveConfigurationName>",
        `<ArchiveConfigurationName>${configuration}</ArchiveConfigurationName>`,
      ),
  );
  return Project.fromDirectory(dir);
}
const etr009 = (project: Project) => project.sessions.items[0] as Session;
// the severity, subject, text and target of each problem that one check found
const found = (project: Project, checkId: string) =>
  checkProjectFolders(project)
    .filter((p) => p.checkId === checkId)
    .map((p) => [p.severity, p.subject, p.text, p.target]);
const inEtr009 = (fileName: string, fieldKey?: string) => ({
  folderType: "session",
  folderId: "ETR009",
  fileName,
  ...(fieldKey ? { fieldKey } : {}),
});

describe("ELAR's file checks", () => {
  afterAll(() => resetOtherConfigurationSettings());

  it("reports a file format that ELAR does not allow, for media and other files", () => {
    const project = loadEdoloUnderElar(["ETR009_photo.bmp", "ETR009_20100606.TXT"]);
    expect(found(project, "fileExtension")).toEqual([
      ["error", "File format", ".bmp is not allowed.", inEtr009("ETR009_photo.bmp")],
      ["error", "File format", ".docx is not allowed.", inEtr009("ETR009_XDoc.docx")],
    ]);
  });

  it("allows an MP3, which mp3WithWavOfSameName checks against a WAV of the same name", () => {
    const project = loadEdoloUnderElar();
    expect(found(project, "fileExtension").filter((p) => p[2] === ".mp3 is not allowed.")).toEqual(
      [],
    );
  });

  it("reports a file name that is too long before its first '.'", () => {
    const project = loadEdoloUnderElar(["ETR009_twenty_letters.wav", "ETR009_twenty_letter.wav"]);
    expect(found(project, "fileNameLength")).toEqual([
      [
        "error",
        "File name",
        "is too long (25 characters).",
        inEtr009("ETR009_Tiny_StandardAudio.wav.annotations.eaf"),
      ],
      ["error", "File name", "is too long (21 characters).", inEtr009("ETR009_twenty_letters.wav")],
    ]);
  });

  it("reports characters that the configuration's pattern does not allow, in the name that export gives the file", () => {
    // Export makes every file name ASCII letters, digits, "_", "." and "-", which
    // ELAR's pattern allows, so try a stricter one
    const project = loadEdoloUnderElar(["ETR009 a.wav"]);
    const settings = GetOtherConfigurationSettings();
    SetOtherConfigurationSettings({
      ...settings,
      checks: {
        ...settings.checks,
        fileNameCharacters: { severity: "error", pattern: "^[A-Za-z0-9]*$" },
      },
    });
    // export makes the space "_"
    expect(found(project, "fileNameCharacters").map((p) => p[3])).toContainEqual(
      inEtr009("ETR009 a.wav"),
    );
    expect(found(project, "fileNameCharacters")[0].slice(0, 3)).toEqual([
      "error",
      "File name",
      "has characters that aren't allowed.",
    ]);
  });

  it("reports a file name without the session's ID", () => {
    const project = loadEdoloUnderElar();
    expect(found(project, "fileNameContainsSessionId").map((p) => p[3])).toEqual([
      inEtr009("SceneAroundCamera.JPG"),
      inEtr009("SceneHouse.JPG"),
    ]);
  });

  it("compares the session's ID as the IMDI writes it, with spaces made '_'", () => {
    const project = loadEdoloUnderElar(["Old_Name_story.wav"]);
    etr009(project).properties.setText("id", "Old Name");
    expect(found(project, "fileNameContainsSessionId").map((p) => p[3])).not.toContainEqual(
      inEtr009("Old_Name_story.wav"),
    );
  });

  it("wants a date stamp on a written file but not on a media file", () => {
    const project = loadEdoloUnderElar(["ETR009_notes_20100606.txt"]);
    expect(found(project, "fileNameDateStamp").map((p) => p[3])).toEqual([
      inEtr009("ETR009_AText.txt"),
      inEtr009("ETR009_Tiny_StandardAudio.wav.annotations.eaf"),
      inEtr009("ETR009_XDoc.docx"),
    ]);
  });

  it("asks a session named ConsentDocuments for neither its ID nor a date stamp, as ELAR's validator does", () => {
    const project = loadEdoloUnderElar();
    etr009(project).properties.setText("id", "ConsentDocuments");
    expect(found(project, "fileNameContainsSessionId")).toEqual([]);
    expect(found(project, "fileNameDateStamp")).toEqual([]);
  });

  it("reports a file over ELAR's size limits, at its size field", () => {
    const project = loadEdoloUnderElar();
    const file = (name: string) =>
      etr009(project).files.find((f) => f.getTextProperty("filename") === name)!;
    file("ETR009_Careful.mp3").properties.setText("size", "19 GB");
    file("ETR009_Tiny.mp4").properties.setText("size", "20 GB");
    file("ETR009_AText.txt").properties.setText("size", "57 GB");
    expect(found(project, "fileSize")).toEqual([
      ["error", "File", "is over 50 GB (57 GB).", inEtr009("ETR009_AText.txt", "size")],
      ["error", "File", "is over 20 GB (20 GB).", inEtr009("ETR009_Tiny.mp4", "size")],
    ]);
  });

  it("leaves out a file that export leaves out", () => {
    const project = loadEdoloUnderElar(["Not_here.bmp.skip"]);
    expect(
      checkProjectFolders(project).filter((p) => p.target.fileName === "Not_here.bmp.skip"),
    ).toEqual([]);
  });
});

describe("ELAR's other checks of lameta's own", () => {
  afterAll(() => resetOtherConfigurationSettings());

  it("reports the project's name when it has characters that ELAR does not allow, or is too long", () => {
    const project = loadEdoloUnderElar();
    const target = { folderType: "project", fieldKey: "name" };
    // "Edolo sample" has a space
    expect(found(project, "projectName")).toEqual([
      ["error", "Project name", "has characters that aren't allowed.", target],
    ]);
    project.properties.setText("name", "0793-SG0123-and-a-name-that-goes-on");
    expect(found(project, "projectName")).toEqual([
      ["error", "Project name", "is too long (35 characters).", target],
    ]);
    project.properties.setText("name", "");
    expect(found(project, "projectName")).toEqual([["error", "Project name", "is empty.", target]]);
  });

  it("warns about a genre that is not in ELAR's list, compared without case", () => {
    const project = loadEdoloUnderElar();
    expect(found(project, "genreInList")).toEqual([]);
    etr009(project).properties.setText("genre", "story");
    expect(found(project, "genreInList")).toEqual([
      [
        "warning",
        undefined,
        'Genre "Story" is not in the ELAR genre list. Please consider using a standardised genre.',
        { folderType: "session", folderId: "ETR009", fieldKey: "genre" },
      ],
    ]);
    etr009(project).properties.setText("genre", "FOLKTALE");
    expect(found(project, "genreInList")).toEqual([]);
    etr009(project).properties.setText("genre", "unknown");
    expect(found(project, "genreInList")).toEqual([]);
  });

  it("reports a session whose contributors have no full name, but not one with no contributors", () => {
    const project = loadEdoloUnderElar();
    const session = etr009(project);
    for (const file of session.files) file.contributions.splice(0);
    expect(found(project, "sessionContributorsWithoutFullName")).toEqual([]);
    const awi = (project.persons.items as Person[]).find(
      (p) => p.getIdToUseForReferences() === "Awi Heole",
    )!;
    session.metadataFile!.contributions.push(new Contribution("Awi Heole", "speaker", ""));
    expect(found(project, "sessionContributorsWithoutFullName")).toEqual([]);
    awi.properties.setText("name", "");
    // the contribution now names nobody, so look the person up by the code they have
    awi.properties.setText("code", "AWI");
    session.metadataFile!.contributions.splice(0, 1, new Contribution("AWI", "speaker", ""));
    expect(found(project, "sessionContributorsWithoutFullName")).toEqual([
      [
        "error",
        "Session",
        "has no contributor with a full name.",
        { folderType: "session", folderId: "ETR009", fieldKey: "contributions" },
      ],
    ]);
  });

  it("makes none of these checks in a project with no archive", () => {
    const project = loadEdoloUnderElar(["ETR009_photo.bmp"], "");
    const ids = new Set(checkProjectFolders(project).map((p) => p.checkId));
    for (const id of [
      "fileExtension",
      "fileNameLength",
      "fileNameCharacters",
      "fileNameContainsSessionId",
      "fileNameDateStamp",
      "projectName",
    ])
      expect(ids.has(id)).toBe(false);
  });
});

describe("ELAR's checks of the values that the IMDI export writes", () => {
  afterAll(() => resetOtherConfigurationSettings());
  const file = (project: Project, name: string) =>
    etr009(project).files.find((f) => f.getTextProperty("filename") === name)!;
  // the project with English and Spanish as its metadata languages, so that ELAR
  // expects translations
  const bilingual = (files: string[] = []) => {
    const project = loadEdoloUnderElar(files);
    project.properties.setText("metadataLanguages", "en;es");
    return project;
  };

  it("reports an MP3 only when the session has a WAV of the same name", () => {
    expect(found(loadEdoloUnderElar(), "mp3WithWavOfSameName")).toEqual([]);
    expect(
      found(loadEdoloUnderElar(["ETR009_Careful_20100606.wav"]), "mp3WithWavOfSameName"),
    ).toEqual([
      [
        "error",
        "MP3 files",
        "are not allowed if there is a WAV recording with the same name.",
        inEtr009("ETR009_Careful.mp3"),
      ],
    ]);
  });

  it("reports a FLExText file next to an EAF of the same name, and warns about one next to other EAFs", () => {
    const project = loadEdoloUnderElar([
      "ETR009_t_20110101.flextext",
      "ETR009_t_20100606.eaf",
      "ETR009_u_20100606.flextext",
    ]);
    expect(found(project, "flextextWithEafOfSameName").map((p) => [p[0], p[3]])).toEqual([
      ["error", inEtr009("ETR009_t_20110101.flextext")],
    ]);
    // only the depositor knows whether one of the other EAF files is of this text
    expect(found(project, "flextextWithOtherEaf").map((p) => [p[0], p[3]])).toEqual([
      ["warning", inEtr009("ETR009_u_20100606.flextext")],
    ]);
  });

  it("reports a resource type that ELAR does not allow, at the file", () => {
    const project = loadEdoloUnderElar(["ETR009_data_20100606.xyz"]);
    const types = found(project, "resourceType");
    expect(types.map((p) => [p[0], p[1], p[3]])).toEqual([
      ["error", "Resource type", inEtr009("ETR009_data_20100606.xyz")],
    ]);
  });

  it("reports a contributor who has no role, at the Contributors tab of the file that lists them", () => {
    const project = loadEdoloUnderElar();
    etr009(project).metadataFile!.contributions.push(new Contribution("Ilawi Amosa", "", ""));
    file(project, "ETR009_Careful.mp3").contributions.push(new Contribution("Awi Heole", "", ""));
    expect(found(project, "contributorWithoutRole")).toEqual([
      [
        "error",
        "Ilawi Amosa",
        "has no role.",
        { folderType: "session", folderId: "ETR009", fieldKey: "contributions" },
      ],
      ["error", "Awi Heole", "has no role.", inEtr009("ETR009_Careful.mp3", "contributions")],
    ]);
  });

  it("wants a translation of a role, at its row on the Translations tab, only when there is a metadata language besides English", () => {
    const project = loadEdoloUnderElar();
    etr009(project).metadataFile!.contributions.push(new Contribution("Awi Heole", "dancer", ""));
    expect(found(project, "roleTranslation")).toEqual([]);
    project.properties.setText("metadataLanguages", "en;es");
    const translation = checkProjectFolders(project).filter((p) => p.checkId === "roleTranslation");
    expect(translation.map((p) => [p.severity, p.subject, p.text, p.target, p.sessionId])).toEqual([
      [
        "warning",
        "Awi Heole's role",
        "needs a translation.",
        { folderType: "project", vocabularyTranslation: { fieldKey: "role", value: "dancer" } },
        "ETR009",
      ],
    ]);
  });

  it("wants a translation of a genre that has none, and of none that has one", () => {
    const project = bilingual();
    // lameta translates "narrative"
    expect(found(project, "genreTranslation")).toEqual([]);
    etr009(project).properties.setText("genre", "weird stuff");
    expect(found(project, "genreTranslation")).toEqual([
      [
        "warning",
        "Genre",
        "needs a translation.",
        {
          folderType: "project",
          vocabularyTranslation: { fieldKey: "genre", value: "weird stuff" },
        },
      ],
    ]);
  });

  it("wants a translated access explanation for each file of access level S", () => {
    const project = bilingual();
    const session = etr009(project);
    session.properties.setText("access", "S");
    session.properties.setText("accessDescription", "asked");
    // a file with an access level of its own
    file(project, "ETR009_Careful.mp3").properties.setText("access", "U");
    const explanations = found(project, "accessDescriptionTranslation");
    const exported = session.files.filter(
      (f) => f !== session.metadataFile && f.getTextProperty("filename") !== "ETR009_Careful.mp3",
    );
    expect(explanations).toHaveLength(exported.length);
    expect(explanations[0]).toEqual([
      "warning",
      "Access Explanation",
      "needs a translation.",
      { folderType: "session", folderId: "ETR009", fieldKey: "accessDescription" },
    ]);
    expect(
      checkProjectFolders(project).find((p) => p.checkId === "accessDescriptionTranslation")!
        .reason,
    ).toBe("Required for access level S.");
    project.properties.setText("metadataLanguages", "en");
    expect(found(project, "accessDescriptionTranslation")).toEqual([]);
  });

  it("makes none of these checks in a project with no archive", () => {
    const project = loadEdoloUnderElar(
      ["ETR009_Careful_20100606.wav", "ETR009_data_20100606.xyz"],
      "",
    );
    project.properties.setText("metadataLanguages", "en;es");
    etr009(project).metadataFile!.contributions.push(new Contribution("Ilawi Amosa", "", ""));
    const ids = new Set(checkProjectFolders(project).map((p) => p.checkId));
    for (const id of [
      "mp3WithWavOfSameName",
      "resourceType",
      "contributorWithoutRole",
      "roleTranslation",
      "genreTranslation",
    ])
      expect(ids.has(id)).toBe(false);
  });
});
