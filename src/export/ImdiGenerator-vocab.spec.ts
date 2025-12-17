import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import temp from "temp";
import {
  setResultXml,
  value,
  count,
  select,
  xexpect
} from "../other/xmlUnitTestUtils";
import { Contribution } from "../model/file/File";
import {
  SetOtherConfigurationSettings,
  GetOtherConfigurationSettings,
  resetOtherConfigurationSettings
} from "../model/Project/OtherConfigurationSettings";

let project: Project;
const projectDir = temp.mkdirSync("lameta imdi generator vocab test");
describe("ImdiGenerator genre handling", () => {
  beforeAll(async () => {
    temp.track();
    project = Project.fromDirectory(projectDir);
    await project.descriptionFolder.addFileForTestAsync(randomFileName());
    await project.otherDocsFolder.addFileForTestAsync(randomFileName());
  });
  it("should convert genre to sentence case", () => {
    const session = project.addSession();
    session.properties.setText("genre", "procedural_discourse");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      project,
      true
    );
    setResultXml(imdi);

    // Check for correct genre case in the output
    expect(value("//Session/MDGroup/Content/Genre")).toBe(
      "Procedural discourse"
    );
  });
});

describe("ImdiGenerator multilingual vocabulary export", () => {
  let multiLangProject: Project;
  const multiLangProjectDir = temp.mkdirSync(
    "lameta imdi generator multilang vocab test"
  );

  beforeAll(async () => {
    temp.track();
    multiLangProject = Project.fromDirectory(multiLangProjectDir);
    // Set up project with English, Spanish, and Portuguese as metadata languages
    multiLangProject.properties.setText(
      "metadataLanguages",
      "en:English;es:Spanish;pt:Portuguese"
    );
    await multiLangProject.descriptionFolder.addFileForTestAsync(
      randomFileName()
    );
    await multiLangProject.otherDocsFolder.addFileForTestAsync(
      randomFileName()
    );
  });

  beforeEach(() => {
    // Set to ELAR schema which supports multilingual vocabulary
    SetOtherConfigurationSettings({
      ...GetOtherConfigurationSettings(),
      imdiSchema: "IMDI_3.0_elar.xsd"
    });
  });

  afterEach(() => {
    // Clean up
    resetOtherConfigurationSettings();
  });

  it("should output Genre in multiple languages based on metadataLanguageSlots", () => {
    const session = multiLangProject.addSession();
    session.properties.setText("genre", "narrative");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      multiLangProject,
      true
    );
    setResultXml(imdi);

    // Should have Genre elements for each language that has a translation
    const genreCount = count("//Session/MDGroup/Content/Genre");
    expect(genreCount).toBeGreaterThanOrEqual(1);

    // English should be present
    xexpect(
      "//Session/MDGroup/Content/Genre[@LanguageId='ISO639-3:eng']"
    ).toHaveText("Narrative");

    // Spanish should be present (from genres.csv)
    xexpect(
      "//Session/MDGroup/Content/Genre[@LanguageId='ISO639-3:spa']"
    ).toHaveText("Narrativa");

    // Portuguese should be present (from genres.csv - pt-BR column)
    xexpect(
      "//Session/MDGroup/Content/Genre[@LanguageId='ISO639-3:por']"
    ).toHaveText("Narrativa");

    // All should have the correct vocabulary link and type
    const genreNodes = select("//Session/MDGroup/Content/Genre");
    genreNodes.forEach((node) => {
      const element = node as Element;
      expect(element.getAttribute("Link")).toBe(
        "http://www.mpi.nl/IMDI/Schema/Content-Genre.xml"
      );
      expect(element.getAttribute("Type")).toBe("OpenVocabulary");
    });
  });

  it("should output SubGenre in multiple languages", () => {
    const session = multiLangProject.addSession();
    session.properties.setText("subgenre", "myth");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      multiLangProject,
      true
    );
    setResultXml(imdi);

    // Should have SubGenre elements
    const subgenreCount = count("//Session/MDGroup/Content/SubGenre");
    expect(subgenreCount).toBeGreaterThanOrEqual(1);

    // Check English - should be sentence case
    xexpect(
      "//Session/MDGroup/Content/SubGenre[@LanguageId='ISO639-3:eng']"
    ).toHaveText("Myth");
  });

  it("should output Role in multiple languages for actors", () => {
    const session = multiLangProject.addSession();
    const person = multiLangProject.addPerson();
    person.properties.setText("name", "Test Person");
    person.properties.setText("code", "TP");

    // Add a contribution with a known role
    session.addContribution(new Contribution("Test Person", "speaker", ""));

    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      multiLangProject,
      true
    );
    setResultXml(imdi);

    // Should have Role elements for the actor
    const roleCount = count("//Session/MDGroup/Actors/Actor/Role");
    expect(roleCount).toBeGreaterThanOrEqual(1);

    // English should have "Speaker" (sentence case)
    xexpect(
      "//Session/MDGroup/Actors/Actor/Role[@LanguageId='ISO639-3:eng']"
    ).toHaveText("Speaker");

    // Spanish should have the translation
    xexpect(
      "//Session/MDGroup/Actors/Actor/Role[@LanguageId='ISO639-3:spa']"
    ).toHaveText("Hablante");

    // All Role elements should have vocabulary attributes
    const roleNodes = select("//Session/MDGroup/Actors/Actor/Role");
    roleNodes.forEach((node) => {
      const element = node as Element;
      expect(element.getAttribute("Link")).toBe(
        "http://www.mpi.nl/IMDI/Schema/Actor-Role.xml"
      );
      expect(element.getAttribute("Type")).toBe("OpenVocabulary");
    });
  });

  it("should handle empty genre gracefully", () => {
    const session = multiLangProject.addSession();
    session.properties.setText("genre", "");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      multiLangProject,
      true
    );
    setResultXml(imdi);

    // Should have at least one Genre element (empty but with attributes)
    const genreCount = count("//Session/MDGroup/Content/Genre");
    expect(genreCount).toBeGreaterThanOrEqual(1);
  });

  it("should skip languages without translations", () => {
    // Create a project with a language that has no translations in the CSV
    const noTransProject = Project.fromDirectory(
      temp.mkdirSync("lameta no trans test")
    );
    noTransProject.properties.setText(
      "metadataLanguages",
      "en:English;tpi:Tok Pisin"
    );

    // Must set ELAR schema after creating project since Project.fromDirectory reloads settings
    SetOtherConfigurationSettings({
      ...GetOtherConfigurationSettings(),
      imdiSchema: "IMDI_3.0_elar.xsd"
    });

    const session = noTransProject.addSession();
    session.properties.setText("genre", "narrative");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      noTransProject,
      true
    );
    setResultXml(imdi);

    // Should have English (using ISO639-3 code)
    xexpect(
      "//Session/MDGroup/Content/Genre[@LanguageId='ISO639-3:eng']"
    ).toHaveText("Narrative");

    // Should NOT have Tok Pisin since there's no translation
    expect(
      count("//Session/MDGroup/Content/Genre[@LanguageId='ISO639-3:tpi']")
    ).toBe(0);
  });
});

// Tests for standard IMDI 3.0 (non-ELAR) schema compatibility
describe("ImdiGenerator standard IMDI 3.0 vocabulary export (non-ELAR)", () => {
  let standardProject: Project;
  const standardProjectDir = temp.mkdirSync("lameta imdi standard vocab test");

  beforeAll(async () => {
    temp.track();
    standardProject = Project.fromDirectory(standardProjectDir);
    // Set up project with multiple metadata languages
    standardProject.properties.setText(
      "metadataLanguages",
      "en:English;es:Spanish;pt:Portuguese"
    );
    await standardProject.descriptionFolder.addFileForTestAsync(
      randomFileName()
    );
    await standardProject.otherDocsFolder.addFileForTestAsync(randomFileName());
  });

  beforeEach(() => {
    // Reset to standard IMDI 3.0 schema (non-ELAR)
    resetOtherConfigurationSettings();
    // Verify we're using standard schema
    expect(GetOtherConfigurationSettings().imdiSchema).toBe("IMDI_3.0.xsd");
  });

  afterEach(() => {
    // Clean up
    resetOtherConfigurationSettings();
  });

  it("should output only one Genre element without LanguageId for standard IMDI 3.0", () => {
    const session = standardProject.addSession();
    session.properties.setText("genre", "narrative");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      standardProject,
      true
    );
    setResultXml(imdi);

    // Should have exactly one Genre element
    const genreCount = count("//Session/MDGroup/Content/Genre");
    expect(genreCount).toBe(1);

    // The Genre element should NOT have a LanguageId attribute
    const genreNodes = select("//Session/MDGroup/Content/Genre");
    expect(genreNodes.length).toBe(1);
    const genreElement = genreNodes[0] as Element;
    expect(genreElement.hasAttribute("LanguageId")).toBe(false);

    // Should have correct value (sentence case)
    expect(value("//Session/MDGroup/Content/Genre")).toBe("Narrative");

    // Should have correct vocabulary link and type
    expect(genreElement.getAttribute("Link")).toBe(
      "http://www.mpi.nl/IMDI/Schema/Content-Genre.xml"
    );
    expect(genreElement.getAttribute("Type")).toBe("OpenVocabulary");
  });

  it("should output only one SubGenre element without LanguageId for standard IMDI 3.0", () => {
    const session = standardProject.addSession();
    session.properties.setText("subgenre", "myth");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      standardProject,
      true
    );
    setResultXml(imdi);

    // Should have exactly one SubGenre element
    const subgenreCount = count("//Session/MDGroup/Content/SubGenre");
    expect(subgenreCount).toBe(1);

    // The SubGenre element should NOT have a LanguageId attribute
    const subgenreNodes = select("//Session/MDGroup/Content/SubGenre");
    expect(subgenreNodes.length).toBe(1);
    const subgenreElement = subgenreNodes[0] as Element;
    expect(subgenreElement.hasAttribute("LanguageId")).toBe(false);

    // Should have correct value (sentence case)
    expect(value("//Session/MDGroup/Content/SubGenre")).toBe("Myth");
  });

  it("should output only one Role element without LanguageId for standard IMDI 3.0", () => {
    const session = standardProject.addSession();
    const person = standardProject.addPerson();
    person.properties.setText("name", "Test Person Standard");
    person.properties.setText("code", "TPS");

    // Add a contribution with a known role
    session.addContribution(
      new Contribution("Test Person Standard", "speaker", "")
    );

    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      standardProject,
      true
    );
    setResultXml(imdi);

    // Should have exactly one Role element per actor
    const roleCount = count("//Session/MDGroup/Actors/Actor/Role");
    expect(roleCount).toBe(1);

    // The Role element should NOT have a LanguageId attribute
    const roleNodes = select("//Session/MDGroup/Actors/Actor/Role");
    expect(roleNodes.length).toBe(1);
    const roleElement = roleNodes[0] as Element;
    expect(roleElement.hasAttribute("LanguageId")).toBe(false);

    // Should have correct value (sentence case)
    expect(value("//Session/MDGroup/Actors/Actor/Role")).toBe("Speaker");
  });

  it("should handle empty genre for standard IMDI 3.0", () => {
    const session = standardProject.addSession();
    session.properties.setText("genre", "");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      standardProject,
      true
    );
    setResultXml(imdi);

    // Should have exactly one Genre element (empty but with attributes)
    const genreCount = count("//Session/MDGroup/Content/Genre");
    expect(genreCount).toBe(1);

    // No LanguageId attribute
    const genreNodes = select("//Session/MDGroup/Content/Genre");
    const genreElement = genreNodes[0] as Element;
    expect(genreElement.hasAttribute("LanguageId")).toBe(false);
  });
});

// Tests for ELAR schema with multilingual vocabulary
describe("ImdiGenerator ELAR schema multilingual vocabulary export", () => {
  let elarProject: Project;
  const elarProjectDir = temp.mkdirSync("lameta imdi elar vocab test");

  beforeAll(async () => {
    temp.track();
    elarProject = Project.fromDirectory(elarProjectDir);
    // Set up project with multiple metadata languages
    elarProject.properties.setText(
      "metadataLanguages",
      "en:English;es:Spanish;pt:Portuguese"
    );
    await elarProject.descriptionFolder.addFileForTestAsync(randomFileName());
    await elarProject.otherDocsFolder.addFileForTestAsync(randomFileName());
  });

  beforeEach(() => {
    // Set to ELAR schema which supports multilingual vocabulary
    SetOtherConfigurationSettings({
      ...GetOtherConfigurationSettings(),
      imdiSchema: "IMDI_3.0_elar.xsd"
    });
  });

  afterEach(() => {
    // Clean up
    resetOtherConfigurationSettings();
  });

  it("should output multiple Genre elements with LanguageId for ELAR schema", () => {
    const session = elarProject.addSession();
    session.properties.setText("genre", "narrative");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      elarProject,
      true
    );
    setResultXml(imdi);

    // Should have multiple Genre elements (one per language with translations)
    const genreCount = count("//Session/MDGroup/Content/Genre");
    expect(genreCount).toBeGreaterThan(1);

    // Each Genre element should have a LanguageId attribute
    const genreNodes = select("//Session/MDGroup/Content/Genre");
    genreNodes.forEach((node) => {
      const element = node as Element;
      expect(element.hasAttribute("LanguageId")).toBe(true);
    });

    // English should be present
    xexpect(
      "//Session/MDGroup/Content/Genre[@LanguageId='ISO639-3:eng']"
    ).toHaveText("Narrative");
  });

  it("should output MetadataLanguage keys in session MDGroup/Keys", () => {
    const session = elarProject.addSession();
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      elarProject,
      true
    );
    setResultXml(imdi);

    // Should have MetadataLanguage keys for each metadata language
    const metadataLangCount = count(
      "//Session/MDGroup/Keys/Key[@Name='MetadataLanguage']"
    );
    expect(metadataLangCount).toBe(3);

    // Check the format: "ISO639-3:eng: English"
    const keys = select("//Session/MDGroup/Keys/Key[@Name='MetadataLanguage']");
    const values = keys.map((node) => (node as Element).textContent);

    // English - always use ISO639-3
    expect(values).toContain("ISO639-3:eng: English");
    // Spanish - always use ISO639-3
    expect(values).toContain("ISO639-3:spa: Spanish");
    // Portuguese - always use ISO639-3
    expect(values).toContain("ISO639-3:por: Portuguese");
  });

  it("should not output MetadataLanguage keys when only default language is set", () => {
    // Create a project with just the default language (empty metadataLanguages = English only)
    const singleLangProject = Project.fromDirectory(
      temp.mkdirSync("lameta single lang test")
    );
    // Don't set metadataLanguages, so it defaults to English only

    // Must set ELAR schema after creating project
    SetOtherConfigurationSettings({
      ...GetOtherConfigurationSettings(),
      imdiSchema: "IMDI_3.0_elar.xsd"
    });

    const session = singleLangProject.addSession();
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      singleLangProject,
      true
    );
    setResultXml(imdi);

    // Should NOT have MetadataLanguage keys (backwards compatibility)
    const metadataLangCount = count(
      "//Session/MDGroup/Keys/Key[@Name='MetadataLanguage']"
    );
    expect(metadataLangCount).toBe(0);

    // Keys element should still exist but be empty
    expect(count("//Session/MDGroup/Keys")).toBe(1);
  });
});

function randomFileName() {
  return Math.random().toString(36).substring(7) + ".test.txt";
}
