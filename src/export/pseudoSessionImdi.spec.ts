import { describe, it, beforeAll, beforeEach, afterEach } from "vitest";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import {
  setResultXml,
  xexpect as expect,
  count,
  printResultXml
} from "../other/xmlUnitTestUtils";
import temp from "temp";
import { Folder } from "../model/Folder/Folder";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";
import {
  SetOtherConfigurationSettings,
  GetOtherConfigurationSettings,
  resetOtherConfigurationSettings
} from "../model/Project/OtherConfigurationSettings";
import * as mobx from "mobx";

mobx.configure({
  enforceActions: "never"
});

temp.track();

let project: Project;
let projectDir: string;

function randomFileName() {
  return Math.random().toString(36).substring(7) + ".txt";
}

describe("Pseudo-session IMDI for project documents", () => {
  beforeEach(async () => {
    projectDir = temp.mkdirSync("lameta pseudo-session imdi test");
    project = Project.fromDirectory(projectDir);
    // Add a file to the description folder so we have something to export
    await project.descriptionFolder.addFileForTestAsync(randomFileName());
  });

  afterEach(() => {
    resetOtherConfigurationSettings();
  });

  describe("Genre", () => {
    it("should have genre set to 'Collection description' by default", () => {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect("//Session/MDGroup/Content/Genre").toMatch(
        "Collection description"
      );
    });

    it("should allow custom genre to be specified", () => {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "OtherDocuments",
        project.descriptionFolder,
        "Custom Genre",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect("//Session/MDGroup/Content/Genre").toMatch("Custom Genre");
    });
  });

  describe("Project details", () => {
    it("should include project title", () => {
      project.properties.setText("title", "Test Language Documentation");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect("//Session/MDGroup/Project/Title").toMatch(
        "Test Language Documentation"
      );
    });

    it("should include project name from title", () => {
      project.properties.setText("title", "My Project Name");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect("//Session/MDGroup/Project/Name").toMatch("My Project Name");
    });

    it("should include project description as sibling of Contact", () => {
      project.properties.setText(
        "collectionDescription",
        "This project documents an endangered language"
      );

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      // Description should be a direct child of Project, not inside Contact
      expect("//Session/MDGroup/Project/Description").toMatch(
        "This project documents an endangered language"
      );
      // Verify it's NOT inside Contact
      expect(count("//Session/MDGroup/Project/Contact/Description")).toBe(0);
    });

    it("should include project id from grantId", () => {
      project.properties.setText("grantId", "IGS1042");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect("//Session/MDGroup/Project/Id").toMatch("IGS1042");
    });

    it("should include contact name", () => {
      project.properties.setText("contactPerson", "Celeste Escobar");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect("//Session/MDGroup/Project/Contact/Name").toMatch(
        "Celeste Escobar"
      );
    });
  });

  describe("Languages", () => {
    it("should include subject languages from project", () => {
      project.properties.setText(
        "collectionSubjectLanguages",
        "spa:Spanish;por:Portuguese"
      );

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect(count("//Session/MDGroup/Content/Languages/Language")).toBe(2);
      expect("//Session/MDGroup/Content/Languages/Language[1]/Id").toMatch(
        "ISO639-3:spa"
      );
      expect("//Session/MDGroup/Content/Languages/Language[1]/Name").toMatch(
        "Spanish"
      );
      expect(
        "//Session/MDGroup/Content/Languages/Language[1]/Description"
      ).toMatch("Subject Language");
    });

    it("should include working languages from project", () => {
      project.properties.setText("collectionWorkingLanguages", "eng:English");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect(count("//Session/MDGroup/Content/Languages/Language")).toBe(1);
      expect("//Session/MDGroup/Content/Languages/Language[1]/Id").toMatch(
        "ISO639-3:eng"
      );
      expect(
        "//Session/MDGroup/Content/Languages/Language[1]/Description"
      ).toMatch("Working Language");
    });

    it("should include both subject and working languages", () => {
      project.properties.setText("collectionSubjectLanguages", "spa:Spanish");
      project.properties.setText("collectionWorkingLanguages", "eng:English");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect(count("//Session/MDGroup/Content/Languages/Language")).toBe(2);
      // Subject language first
      expect(
        "//Session/MDGroup/Content/Languages/Language[1]/Description"
      ).toMatch("Subject Language");
      // Working language second
      expect(
        "//Session/MDGroup/Content/Languages/Language[2]/Description"
      ).toMatch("Working Language");
    });

    it("should include metadata languages as Keys", () => {
      project.properties.setText("metadataLanguages", "en:English;es:Spanish");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect(
        count("//Session/MDGroup/Keys/Key[@Name='MetadataLanguage']")
      ).toBe(2);
    });
  });

  describe("Actor (Researcher)", () => {
    it("should include actor with Researcher role from collection steward", () => {
      project.properties.setText("collectionSteward", "Dr. Jane Smith");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect(count("//Session/MDGroup/Actors/Actor")).toBe(1);
      expect("//Session/MDGroup/Actors/Actor/Role").toMatch("Researcher");
      expect("//Session/MDGroup/Actors/Actor/Name").toMatch("Dr. Jane Smith");
      expect("//Session/MDGroup/Actors/Actor/FullName").toMatch(
        "Dr. Jane Smith"
      );
    });

    it("should not include actor if collection steward is empty", () => {
      project.properties.setText("collectionSteward", "");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect(count("//Session/MDGroup/Actors/Actor")).toBe(0);
    });

    it("should include all required actor fields", () => {
      project.properties.setText("collectionSteward", "Dr. Jane Smith");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.descriptionFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "DescriptionDocuments",
        project.descriptionFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      // Check all required IMDI Actor fields are present
      expect(count("//Session/MDGroup/Actors/Actor/Code")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/FamilySocialRole")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Languages")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/EthnicGroup")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Age")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/BirthDate")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Sex")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Education")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Anonymized")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Contact")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Keys")).toBe(1);
      expect(count("//Session/MDGroup/Actors/Actor/Description")).toBe(1);
    });
  });

  describe("OtherDocuments folder", () => {
    it("should work the same for OtherDocuments folder", async () => {
      await project.otherDocsFolder.addFileForTestAsync(randomFileName());
      project.properties.setText("collectionSteward", "Dr. John Doe");
      project.properties.setText("collectionSubjectLanguages", "fra:French");
      project.properties.setText("title", "French Documentation Project");

      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        project.otherDocsFolder,
        project
      );
      const xml = generator.makePseudoSessionImdiForOtherFolder(
        "OtherDocuments",
        project.otherDocsFolder,
        "Collection description",
        true // omitNamespaces for testing
      );
      setResultXml(xml);

      expect("//Session/Name").toMatch("OtherDocuments");
      expect("//Session/MDGroup/Content/Genre").toMatch(
        "Collection description"
      );
      expect("//Session/MDGroup/Content/Languages/Language/Id").toMatch(
        "ISO639-3:fra"
      );
      expect("//Session/MDGroup/Actors/Actor/Role").toMatch("Researcher");
      expect("//Session/MDGroup/Actors/Actor/Name").toMatch("Dr. John Doe");
      expect("//Session/MDGroup/Project/Title").toMatch(
        "French Documentation Project"
      );
    });
  });
});
