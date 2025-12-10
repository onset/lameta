import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import {
  setResultXml,
  xexpect as expect,
  count,
  printResultXml
} from "../other/xmlUnitTestUtils";
import temp from "temp";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { Field, FieldType } from "../model/field/Field";

let project: Project;
let session: Session;
let projectDir: string;

beforeAll(async () => {
  temp.track();
  projectDir = temp.mkdirSync("lameta imdi multilingual keys test");
  project = Project.fromDirectory(projectDir);
  session = project.addSession();
});

afterAll(() => {
  temp.cleanupSync();
});

// Helper to get or create a field
const getOrCreateField = (key: string): Field => {
  if (!session.properties.getHasValue(key)) {
    session.properties.addTextProperty(key, "");
  }
  return session.properties.getValueOrThrow(key);
};

beforeEach(() => {
  // Clear topic and keyword fields before each test
  if (session.properties.getHasValue("topic")) {
    session.properties.removeProperty("topic");
  }
  if (session.properties.getHasValue("keyword")) {
    session.properties.removeProperty("keyword");
  }
});

describe("monolingual topic and keyword export", () => {
  it("exports monolingual keywords without index or LanguageId attributes", () => {
    const keywordField = getOrCreateField("keyword");
    keywordField.text = "Fat, Heron";
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    // Should have 2 keyword Keys split by comma
    expect(count(`//Keys/Key[@Name="Keyword"]`)).toBe(2);
    // Should NOT have index or LanguageId attributes
    expect(`//Keys/Key[@Name="Keyword"][@index]`).toNotExist();
    expect(`//Keys/Key[@Name="Keyword"][@LanguageId]`).toNotExist();
  });

  it("exports monolingual topic without index or LanguageId attributes", () => {
    const topicField = getOrCreateField("topic");
    topicField.text = "The moon and the sun adventures";
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(count(`//Keys/Key[@Name="Topic"]`)).toBe(1);
    expect(`//Keys/Key[@Name="Topic"]`).toHaveText(
      "The moon and the sun adventures"
    );
    // Should NOT have index or LanguageId attributes
    expect(`//Keys/Key[@Name="Topic"][@index]`).toNotExist();
    expect(`//Keys/Key[@Name="Topic"][@LanguageId]`).toNotExist();
  });
});

describe("multilingual topic and keyword export", () => {
  it("exports multilingual keywords with index and LanguageId attributes", () => {
    // Set up multilingual keyword field
    const keywordField = getOrCreateField("keyword");

    // Mark the field as multilingual in definition
    keywordField.definition = new FieldDefinition({
      key: "keyword",
      englishLabel: "Keywords",
      persist: true,
      multilingual: true,
      separatorWithCommaInstructions:
        "Separate with commas. Note that individual keywords cannot contain a comma."
    });

    // Set multilingual values: "Fat, Heron" in English, "Grasa, Garza" in Spanish
    keywordField.setTextAxis("en", "Fat, Heron");
    keywordField.setTextAxis("es", "Grasa, Garza");

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );

    //printResultXml();

    // Should have 4 keyword Keys (2 in English, 2 in Spanish)
    expect(count(`//Keys/Key[@Name="Keyword"]`)).toBe(4);

    // English keywords with index
    expect(
      `//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-1:en"][@index="1"]`
    ).toHaveText("Fat");
    expect(
      `//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-1:en"][@index="2"]`
    ).toHaveText("Heron");

    // Spanish keywords with matching index (es is 2-letter so ISO639-1)
    expect(
      `//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-1:es"][@index="1"]`
    ).toHaveText("Grasa");
    expect(
      `//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-1:es"][@index="2"]`
    ).toHaveText("Garza");
  });

  it("exports multilingual topic with index and LanguageId attributes", () => {
    const topicField = getOrCreateField("topic");

    topicField.definition = new FieldDefinition({
      key: "topic",
      englishLabel: "Topic",
      persist: true,
      multilingual: true,
      separatorWithCommaInstructions:
        "Separate with commas. Note that individual topics cannot contain a comma."
    });

    // Single topic in three languages
    topicField.setTextAxis("en", "The moon and the sun adventures");
    topicField.setTextAxis("es", "Las aventuras de la luna y el sol");
    topicField.setTextAxis("pt", "As aventuras da lua e do sol");

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );

    //printResultXml();

    // Should have 3 topic Keys (1 per language)
    expect(count(`//Keys/Key[@Name="Topic"]`)).toBe(3);

    // All should have index="1" since there's only one topic
    expect(
      `//Keys/Key[@Name="Topic"][@LanguageId="ISO639-1:en"][@index="1"]`
    ).toHaveText("The moon and the sun adventures");
    expect(
      `//Keys/Key[@Name="Topic"][@LanguageId="ISO639-1:es"][@index="1"]`
    ).toHaveText("Las aventuras de la luna y el sol");
    expect(
      `//Keys/Key[@Name="Topic"][@LanguageId="ISO639-1:pt"][@index="1"]`
    ).toHaveText("As aventuras da lua e do sol");
  });

  it("exports multiple multilingual topics with correct indexes", () => {
    const topicField = getOrCreateField("topic");

    topicField.definition = new FieldDefinition({
      key: "topic",
      englishLabel: "Topic",
      persist: true,
      multilingual: true,
      separatorWithCommaInstructions:
        "Separate with commas. Note that individual topics cannot contain a comma."
    });

    // Two topics in each language
    topicField.setTextAxis("en", "Moon adventures, Sun stories");
    topicField.setTextAxis("es", "Aventuras de luna, Historias del sol");

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );

    //printResultXml();

    // Should have 4 topic Keys (2 per language)
    expect(count(`//Keys/Key[@Name="Topic"]`)).toBe(4);

    // English topics with indexes
    expect(
      `//Keys/Key[@Name="Topic"][@LanguageId="ISO639-1:en"][@index="1"]`
    ).toHaveText("Moon adventures");
    expect(
      `//Keys/Key[@Name="Topic"][@LanguageId="ISO639-1:en"][@index="2"]`
    ).toHaveText("Sun stories");

    // Spanish topics with matching indexes (es is 2-letter so ISO639-1)
    expect(
      `//Keys/Key[@Name="Topic"][@LanguageId="ISO639-1:es"][@index="1"]`
    ).toHaveText("Aventuras de luna");
    expect(
      `//Keys/Key[@Name="Topic"][@LanguageId="ISO639-1:es"][@index="2"]`
    ).toHaveText("Historias del sol");
  });

  it("handles edge case with extra spaces around commas", () => {
    const keywordField = getOrCreateField("keyword");

    keywordField.definition = new FieldDefinition({
      key: "keyword",
      englishLabel: "Keywords",
      persist: true,
      multilingual: true,
      separatorWithCommaInstructions:
        "Separate with commas. Note that individual keywords cannot contain a comma."
    });

    // Extra spaces around commas
    keywordField.setTextAxis("en", "  Fat  ,   Heron  ");
    keywordField.setTextAxis("es", "Grasa  ,  Garza");

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );

    // Should have 4 keyword Keys, values should be trimmed
    expect(count(`//Keys/Key[@Name="Keyword"]`)).toBe(4);
    expect(
      `//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-1:en"][@index="1"]`
    ).toHaveText("Fat");
    expect(
      `//Keys/Key[@Name="Keyword"][@LanguageId="ISO639-1:en"][@index="2"]`
    ).toHaveText("Heron");
  });

  it("does not add index/LanguageId if field has only one language even if definition says multilingual", () => {
    const keywordField = getOrCreateField("keyword");

    keywordField.definition = new FieldDefinition({
      key: "keyword",
      englishLabel: "Keywords",
      persist: true,
      multilingual: true,
      separatorWithCommaInstructions:
        "Separate with commas. Note that individual keywords cannot contain a comma."
    });

    // Only English, no other languages
    keywordField.setTextAxis("en", "Fat, Heron");

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );

    // Should have 2 keyword Keys
    expect(count(`//Keys/Key[@Name="Keyword"]`)).toBe(2);

    // Should NOT have index or LanguageId (only one language)
    expect(`//Keys/Key[@Name="Keyword"][@index]`).toNotExist();
    expect(`//Keys/Key[@Name="Keyword"][@LanguageId]`).toNotExist();
  });
});
