import { describe, it, beforeAll, afterAll, beforeEach, expect as vitestExpect } from "vitest";
import ImdiGenerator, { IMDIMode, parseLanguageCodeAndName } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import {
  setResultXml,
  xexpect as expect,
  count
} from "../other/xmlUnitTestUtils";
import temp from "temp";
import { Contribution } from "../model/file/File";

let project: Project;
let session: Session;
const projectDir = temp.mkdirSync("lameta imdi session generator test");
beforeAll(async () => {
  temp.track();
  project = Project.fromDirectory(projectDir);
  await project.descriptionFolder.addFileForTestAsync(randomFileName());
  await project.otherDocsFolder.addFileForTestAsync(randomFileName());
  session = project.addSession();
  // set the session date to a known value so that the test results are predictable

  await session.addFileForTestAsync(randomFileName());
  const mary = project.addPerson("Mary");
  mary.properties.setText("birthYear", "1980");
});

afterAll(() => {
  temp.cleanupSync();
});
describe("session imdi export", () => {
  it("uses the IMDI date format", () => {
    // Given a date that includes the time
    session.properties.setText("date", "2010-01-01T07:00:00.000Z");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    // we need to strip out the time
    expect("//Date").toHaveText("2010-01-01");
  });

  it("genres should show title case version instead of underscored", () => {
    session.properties.setText("genre", "academic_output");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(count("//Genre")).toBe(1);
    expect("//Genre").toHaveText("Academic output");
  });

  // notion issue #239
  it("keyword case handling", () => {
    session.properties.setText("keyword", "foo, one two UN, FLEx, XYZ");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("one two UN");
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("FLEx");
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("foo");
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("XYZ");
  });

  it("should  output an Actor for a contributor with a matching person", () => {
    session.removeAllContributionsForUnitTest();
    session.addContribution(
      new Contribution("Mary", "careful_speech_speaker", "")
    );
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect("//Actor").toHaveCount(1);
    expect("//Actor/Name").toHaveText("Mary");
    expect("//Actor/Age").toHaveText("30");
    expect("//Actor/Role").toHaveText("Careful speech speaker"); // this is ELAR's prefered case and spacing
  });

  // Regression Test
  it("A contribution from a person with a missing Person should still be output correct role", () => {
    session.removeAllContributionsForUnitTest();
    session.addContribution(
      new Contribution("I am made up", "careful_speech_speaker", "")
    );
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect("//Actor").toHaveCount(1);
    expect("//Actor/Role").toHaveText("Careful speech speaker"); // this is ELAR's prefered case and spacing
  });

  /* the actual policy is in discussion in Notion #238

  It's not clear what we will do, but at the moment, we're output a minimal Actor
  
  it("should not output an Actor for a contributor without a matching person", () => {
    session.addContribution(new Contribution("Joe", "Speaker", ""));
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true 
      )
    );
    expect("//Actor").toNotExist();
  });*/
  it("should output an Actor for a contributor without a matching person", () => {
    session.removeAllContributionsForUnitTest();
    session.addContribution(new Contribution("Joe", "Speaker", ""));
    setResultXml(
      ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project, true)
    );
    expect("//Actor").toHaveCount(1);
    expect("//Actor/Age").toHaveText("Unspecified");
  });

  // notion issue #255
  it("session access applies to resources", () => {
    session.properties.setText("access", "open");

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(`//Resources/WrittenResource/Access/Availability`).toMatch("open");
  });

  it("missing access should still emit access nodes", () => {
    session.properties.removeProperty("access");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(count(`//Resources/WrittenResource/Access`)).toBe(1);
    expect(`//Resources/WrittenResource/Access/Availability`).toMatch("");
  });

  it("multilingual accessDescription should output separate Description elements with LanguageId", () => {
    // Add back the access field if it was removed by a previous test
    if (!session.properties.getHasValue("access")) {
      session.properties.addTextProperty("access", "S");
    } else {
      session.properties.setText("access", "S");
    }
    // Set multilingual access description using the internal multilingual format
    const accessDescField = session.properties.getValue("accessDescription");
    if (accessDescField) {
      accessDescField.setTextAxis("en", "my access explanation");
      accessDescField.setTextAxis("es", "explicación de acceso");
    }

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );

    // Should have two Description elements with LanguageId attributes in the WrittenResource Access section
    expect(count(`//Resources/WrittenResource/Access/Description[@LanguageId]`)).toBeGreaterThan(0);
    // Check the descriptions have proper LanguageId attributes
    expect(`//Resources/WrittenResource/Access/Description[@LanguageId='ISO639-3:eng']`).toHaveText("my access explanation");
    expect(`//Resources/WrittenResource/Access/Description[@LanguageId='ISO639-3:spa']`).toHaveText("explicación de acceso");
  });

  it("should not include Notes in the Keys", () => {
    session.properties.setText("notes", "We shared red hots.");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect("//Content/Keys/Key[@Name='Notes']").toNotExist();
  });

  it("replaces spaces with underscores in IDs", () => {
    session.properties.setText("id", "my session id");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      project,
      true
    );

    // should find <Name>my_session_id</Name> in the IMDI output
    expect(imdi).toContain("<Name>my_session_id</Name>");
  });

  // https://github.com/onset/lameta/issues/XXX - Language Id should only have code, Name should only have language name
  describe("session language IMDI export", () => {
    beforeEach(() => {
      // Reset languages before each test
      session.properties.setText("languages", "");
      session.properties.setText("workingLanguages", "");
    });

    it("should output only the code in Language Id (not 'code : Name' format)", () => {
      // When languages are stored in "code : Name" format (legacy or migrated from project)
      session.properties.setText("languages", "pta : Guarani");
      session.properties.setText("workingLanguages", "eng : English");

      setResultXml(
        ImdiGenerator.generateSession(
          IMDIMode.RAW_IMDI,
          session,
          project,
          true /*omit namespace*/
        )
      );

      // The Id should only contain the code, not the full "code : name" string
      expect("//Languages/Language[1]/Id").toHaveText("ISO639-3:pta");
      expect("//Languages/Language[2]/Id").toHaveText("ISO639-3:eng");
    });

    it("should output only the language name in Language Name (not 'code : Name' format)", () => {
      // When languages are stored in "code : Name" format
      session.properties.setText("languages", "pta : Guarani");
      session.properties.setText("workingLanguages", "eng : English");

      setResultXml(
        ImdiGenerator.generateSession(
          IMDIMode.RAW_IMDI,
          session,
          project,
          true /*omit namespace*/
        )
      );

      // The Name should only contain the language name, not "code : name"
      expect("//Languages/Language[1]/Name").toHaveText("Guarani");
      expect("//Languages/Language[2]/Name").toHaveText("English");
    });

    it("should handle plain code format correctly", () => {
      // When languages are stored as plain codes (modern format)
      session.properties.setText("languages", "fra");
      session.properties.setText("workingLanguages", "spa");

      setResultXml(
        ImdiGenerator.generateSession(
          IMDIMode.RAW_IMDI,
          session,
          project,
          true /*omit namespace*/
        )
      );

      expect("//Languages/Language[1]/Id").toHaveText("ISO639-3:fra");
      expect("//Languages/Language[1]/Name").toHaveText("French");
      expect("//Languages/Language[2]/Id").toHaveText("ISO639-3:spa");
      expect("//Languages/Language[2]/Name").toHaveText("Spanish");
    });

    it("should handle multiple languages with mixed formats", () => {
      // Multiple languages, some in "code : Name" format, some plain codes
      session.properties.setText("languages", "pta : Guarani;fra");
      session.properties.setText("workingLanguages", "eng : English");

      setResultXml(
        ImdiGenerator.generateSession(
          IMDIMode.RAW_IMDI,
          session,
          project,
          true /*omit namespace*/
        )
      );

      expect("//Languages/Language[1]/Id").toHaveText("ISO639-3:pta");
      expect("//Languages/Language[1]/Name").toHaveText("Guarani");
      expect("//Languages/Language[2]/Id").toHaveText("ISO639-3:fra");
      expect("//Languages/Language[2]/Name").toHaveText("French");
      expect("//Languages/Language[3]/Id").toHaveText("ISO639-3:eng");
      expect("//Languages/Language[3]/Name").toHaveText("English");
    });

    it("should handle custom language codes (qaa-x-*) correctly", () => {
      // Custom language with private-use code
      session.properties.setText("languages", "qaa-x-MyLanguage:My Custom Language");

      setResultXml(
        ImdiGenerator.generateSession(
          IMDIMode.RAW_IMDI,
          session,
          project,
          true /*omit namespace*/
        )
      );

      expect("//Languages/Language[1]/Id").toHaveText("ISO639-3:qaa-x-MyLanguage");
      expect("//Languages/Language[1]/Name").toHaveText("My Custom Language");
    });

    it("should fall back to project languages when session has no languages", () => {
      // Set up project-level languages in "code : Name" format
      project.properties.setText("collectionSubjectLanguages", "ita : Italian;deu : German");
      project.properties.setText("collectionWorkingLanguages", "por : Portuguese");

      // Session has no languages
      session.properties.setText("languages", "");
      session.properties.setText("workingLanguages", "");

      setResultXml(
        ImdiGenerator.generateSession(
          IMDIMode.RAW_IMDI,
          session,
          project,
          true /*omit namespace*/
        )
      );

      // Should use project-level languages with correct parsing
      expect("//Languages/Language[1]/Id").toHaveText("ISO639-3:ita");
      expect("//Languages/Language[1]/Name").toHaveText("Italian");
      expect("//Languages/Language[1]/Description").toHaveText("Subject Language");
      expect("//Languages/Language[2]/Id").toHaveText("ISO639-3:deu");
      expect("//Languages/Language[2]/Name").toHaveText("German");
      expect("//Languages/Language[3]/Id").toHaveText("ISO639-3:por");
      expect("//Languages/Language[3]/Name").toHaveText("Portuguese");
      expect("//Languages/Language[3]/Description").toHaveText("Working Language");

      // Clean up
      project.properties.setText("collectionSubjectLanguages", "");
      project.properties.setText("collectionWorkingLanguages", "");
    });
  });
});

describe("parseLanguageCodeAndName", () => {
  it("should parse 'code : Name' format (legacy with spaces)", () => {
    const result = parseLanguageCodeAndName("pta : Guarani");
    vitestExpect(result.code).toBe("pta");
    vitestExpect(result.name).toBe("Guarani");
  });

  it("should parse 'code:Name' format (no spaces)", () => {
    const result = parseLanguageCodeAndName("eng:English");
    vitestExpect(result.code).toBe("eng");
    vitestExpect(result.name).toBe("English");
  });

  it("should parse plain code format", () => {
    const result = parseLanguageCodeAndName("fra");
    vitestExpect(result.code).toBe("fra");
    vitestExpect(result.name).toBeUndefined();
  });

  it("should handle custom language codes (qaa-x-*)", () => {
    const result = parseLanguageCodeAndName("qaa-x-MyLang:My Custom Language");
    vitestExpect(result.code).toBe("qaa-x-MyLang");
    vitestExpect(result.name).toBe("My Custom Language");
  });

  it("should handle whitespace in values", () => {
    const result = parseLanguageCodeAndName("  pta : Guarani  ");
    vitestExpect(result.code).toBe("pta");
    vitestExpect(result.name).toBe("Guarani");
  });

  it("should handle names containing colons", () => {
    // If someone has a language name like "Language: Special Edition"
    const result = parseLanguageCodeAndName("qaa:Language: Special Edition");
    vitestExpect(result.code).toBe("qaa");
    vitestExpect(result.name).toBe("Language: Special Edition");
  });

  it("should return undefined name for empty name after colon", () => {
    const result = parseLanguageCodeAndName("eng:");
    vitestExpect(result.code).toBe("eng");
    vitestExpect(result.name).toBeUndefined();
  });
});

function randomFileName() {
  return Math.random().toString(36).substring(7) + ".fssync.test.txt";
}
