import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import * as temp from "temp";
import fs from "fs-extra";
import Path from "path";
import { Project } from "./Project";
import { Person } from "./Person/Person";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

let projectDirectory: string;
let projectName: string;

beforeAll(() => {
  setupLanguageFinderForTests();
});

describe("V2 to V3 migration on project open", () => {
  beforeEach(() => {
    projectDirectory = temp.mkdirSync("v2-to-v3-migration");
    projectName = Path.basename(projectDirectory);
    fs.ensureDirSync(Path.join(projectDirectory, "Sessions"));
    fs.ensureDirSync(Path.join(projectDirectory, "People"));
  });

  afterEach(() => {
    temp.cleanupSync();
  });

  it("migrates V2 project title and V2 language fields", () => {
    writeProjectFile(`
  <Title>V2 Project Title</Title>
  <VernacularISO3CodeAndName>abc:Abracadabra</VernacularISO3CodeAndName>
  <AnalysisISO3CodeAndName>xyz:Xabradabra</AnalysisISO3CodeAndName>`);

    const project = Project.fromDirectory(projectDirectory);

    expect(project.properties.getTextStringOrEmpty("title")).toBe(
      "V2 Project Title"
    );
    // name was missing, so we should get it from title
    expect(project.properties.getTextStringOrEmpty("name")).toBe(
      "V2 Project Title"
    );
    // VernacularISO3CodeAndName --> SubjectLanguages
    expect(project.properties.getTextStringOrEmpty("SubjectLanguages")).toBe(
      "abc:Abracadabra"
    );
    // AnalysisISO3CodeAndName --> WorkingLanguages
    expect(project.properties.getTextStringOrEmpty("WorkingLanguages")).toBe(
      "xyz:Xabradabra"
    );
  });

  it("migrates V2 session situation and setting into description", () => {
    writeProjectFile("");
    writeSession(
      "Session1",
      `
  <description type="string">Existing description.</description>
  <situation type="string">Riverbank recording</situation>
  <setting type="string">Morning interview</setting>`
    );

    const project = Project.fromDirectory(projectDirectory);
    const session = project.sessions.items[0];
    const description = session.properties.getTextStringOrEmpty("description");

    expect(description).toContain("Existing description.");
    expect(description).toContain("Situation: Riverbank recording");
    expect(description).toContain("Setting: Morning interview");
    expect(session.properties.getTextStringOrEmpty("situation")).toBe("");
    expect(session.properties.getTextStringOrEmpty("setting")).toBe("");
  });

  it("migrates V2 person language fields into the modern languages list", () => {
    writeProjectFile("");
    writePerson(
      "Jane Doe",
      `
  <FullName>Jane Doe</FullName>
  <primaryLanguage>etr</primaryLanguage>
  <primaryLanguageLearnedIn>Huya</primaryLanguageLearnedIn>
  <mothersLanguage>en</mothersLanguage>
  <fathersLanguage>fr</fathersLanguage>
  <otherLanguage0>de</otherLanguage0>
  <Description>Lorem Ipsum.</Description>`
    );

    const project = Project.fromDirectory(projectDirectory);
    const person = project.persons.items[0] as Person;

    expect(person.languages.map((language) => language.code)).toEqual([
      "etr",
      "eng",
      "fra",
      "deu"
    ]);
    expect(person.languages[0].primary).toBe(true);
    expect(person.languages[1].mother).toBe(true);
    expect(person.languages[2].father).toBe(true);
    expect(person.properties.getTextStringOrEmpty("description")).toContain(
      "Lorem Ipsum."
    );
    expect(person.properties.getTextStringOrEmpty("description")).toContain(
      "Huya"
    );
  });
});

function writeProjectFile(projectFields: string): void {
  fs.writeFileSync(
    Path.join(projectDirectory, projectName + ".sprj"),
    `<?xml version="1.0" encoding="utf-8"?>
<Project>
  ${projectFields}
</Project>`
  );
}

function writeSession(sessionId: string, sessionFields: string): void {
  const sessionDir = Path.join(projectDirectory, "Sessions", sessionId);
  fs.ensureDirSync(sessionDir);
  fs.writeFileSync(
    Path.join(sessionDir, sessionId + ".session"),
    `<?xml version="1.0" encoding="utf-8"?>
<Session>
  ${sessionFields}
</Session>`
  );
}

function writePerson(personFolderName: string, personFields: string): void {
  const personDir = Path.join(projectDirectory, "People", personFolderName);
  fs.ensureDirSync(personDir);
  fs.writeFileSync(
    Path.join(personDir, personFolderName + ".person"),
    `<?xml version="1.0" encoding="utf-8"?>
<Person>
  ${personFields}
</Person>`
  );
}
