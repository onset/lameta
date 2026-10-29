import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Field } from "../model/field/Field";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { FieldSet } from "../model/field/FieldSet";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { checkField, checkProjectFields, getRuleSeverity } from "./fieldRules";

mobx.configure({ enforceActions: "never" });
temp.track();

const slots = ["en", "es"];

function fieldSet(...definitions: Array<Partial<FieldDefinition> & { value?: string }>): FieldSet {
  const set = new FieldSet();
  for (const d of definitions) {
    const f = Field.fromFieldDefinition(new FieldDefinition({ type: "Text", persist: true, ...d }));
    f.text = d.value ?? "";
    set.setValue(f.key, f);
  }
  return set;
}
// the rules that the field breaks
function check(set: FieldSet, key: string): string[] {
  return checkField(set.getValueOrThrow(key), set, slots).map((b) => b.rule);
}

describe("checkField", () => {
  it("required", () => {
    const set = fieldSet({
      key: "title",
      englishLabel: "Title",
      required: true,
    });
    expect(check(set, "title")).toEqual(["required"]);
    set.setText("title", "x");
    expect(check(set, "title")).toEqual([]);
  });
  it("a field with no rules is never a problem", () => {
    expect(check(fieldSet({ key: "title" }), "title")).toEqual([]);
  });
  it("a field that is never shown is not checked", () => {
    const set = fieldSet({ key: "x", required: true, visibility: "never" });
    expect(check(set, "x")).toEqual([]);
  });
  it("requiredWhen", () => {
    const set = fieldSet(
      { key: "access", englishLabel: "Access", value: "S" },
      {
        key: "accessDescription",
        englishLabel: "Access Explanation",
        requiredWhen: { field: "access", value: "S" },
      },
    );
    expect(check(set, "accessDescription")).toEqual(["requiredWhen"]);
    set.setText("access", "O");
    expect(check(set, "accessDescription")).toEqual([]);
    set.setText("access", "S");
    set.setText("accessDescription", "the speaker asked");
    expect(check(set, "accessDescription")).toEqual([]);
  });
  it("pattern", () => {
    const set = fieldSet(
      {
        key: "id",
        englishLabel: "ID",
        pattern: "^[A-Za-z0-9_-]*$",
        patternDescription: "letters, digits, dashes and underscores only",
        value: "ETR 009",
      },
      { key: "code", englishLabel: "Code", pattern: "^[a-z]+$", value: "AB" },
    );
    expect(check(set, "id")).toEqual(["pattern"]);
    expect(check(set, "code")).toEqual(["pattern"]);
    set.setText("id", "ETR-009_b");
    expect(check(set, "id")).toEqual([]);
  });
  it("maxLength", () => {
    const set = fieldSet({
      key: "id",
      englishLabel: "ID",
      maxLength: 5,
      value: "123456",
    });
    expect(check(set, "id")).toEqual(["maxLength"]);
    set.setText("id", "12345");
    expect(check(set, "id")).toEqual([]);
  });
  it("minItems counts comma-separated values, including none", () => {
    const set = fieldSet({
      key: "keyword",
      englishLabel: "Keyword",
      minItems: 2,
      value: "fish, ",
    });
    expect(check(set, "keyword")).toEqual(["minItems"]);
    set.setText("keyword", "fish, poison");
    expect(check(set, "keyword")).toEqual([]);
    const one = fieldSet({ key: "topic", englishLabel: "Topic", minItems: 1 });
    expect(check(one, "topic")).toEqual(["minItems"]);
  });
  it("englishRequired", () => {
    const set = fieldSet({
      key: "title",
      englishLabel: "Title",
      multilingual: true,
      englishRequired: true,
      value: "[[es]]Pescado",
    });
    expect(check(set, "title")).toEqual(["englishRequired"]);
    set.setText("title", "[[en]]Fish[[es]]Pescado");
    expect(check(set, "title")).toEqual([]);
    // text with no language tags is English
    set.setText("title", "Fish");
    expect(check(set, "title")).toEqual([]);
    // an empty field has no English either
    set.setText("title", "");
    expect(check(set, "title")).toEqual(["englishRequired"]);
  });
  it("englishRequired on a list of languages", () => {
    const set = fieldSet({
      key: "metadataLanguages",
      englishLabel: "Metadata Languages",
      type: "languageChoices",
      englishRequired: true,
      value: "spa:Spanish",
    });
    expect(check(set, "metadataLanguages")).toEqual(["englishRequired"]);
    set.setText("metadataLanguages", "spa:Spanish;eng:English");
    expect(check(set, "metadataLanguages")).toEqual([]);
    set.setText("metadataLanguages", "en;es");
    expect(check(set, "metadataLanguages")).toEqual([]);
    // no metadata languages means English alone
    set.setText("metadataLanguages", "");
    expect(check(set, "metadataLanguages")).toEqual([]);
  });
  it("an empty field that is required is reported once, as required", () => {
    const set = fieldSet({
      key: "title",
      englishLabel: "Title",
      required: true,
      englishRequired: true,
    });
    expect(check(set, "title")).toEqual(["required"]);
  });
});

describe("projectFallback", () => {
  const sessionAndProject = (sessionValue: string, projectValue: string) => {
    const session = fieldSet({
      key: "locationCountry",
      englishLabel: "Country",
      required: true,
      projectFallback: "country",
      value: sessionValue,
    });
    const project = fieldSet({ key: "country", value: projectValue });
    return checkField(session.getValueOrThrow("locationCountry"), session, slots, {
      projectProperties: project,
    }).map((b) => b.rule);
  };
  it("is satisfied by the project's value when the session has none", () => {
    expect(sessionAndProject("", "Papua New Guinea")).toEqual([]);
  });
  it("is satisfied by the session's value when the project has none", () => {
    expect(sessionAndProject("Papua New Guinea", "")).toEqual([]);
  });
  it("is required when both are empty", () => {
    expect(sessionAndProject("", "")).toEqual(["required"]);
  });
  it("is fine when both are set", () => {
    expect(sessionAndProject("Indonesia", "Papua New Guinea")).toEqual([]);
  });
});

describe("translationRequired and severity", () => {
  it("translationRequired needs a value in a language other than English, and names the ones the project has", () => {
    const set = fieldSet({
      key: "title",
      englishLabel: "Title",
      multilingual: true,
      translationRequired: true,
      value: "Fish",
    });
    const names = new Map([
      ["en", "English"],
      ["es", "Spanish"],
      ["tpi", "Tok Pisin"],
    ]);
    const broken = (tags: string[]) =>
      checkField(set.getValueOrThrow("title"), set, tags, {
        metadataLanguageNames: names,
      });
    const messages = (tags: string[]) => broken(tags).map((b) => b.rule);
    expect(messages(slots)).toEqual(["translationRequired"]);
    // the message names the languages that a translation can be in
    const named = broken(["en", "es", "tpi"])[0].text;
    expect(named).toContain("Spanish");
    expect(named).toContain("Tok Pisin");
    expect(named).not.toContain("English");
    // ELAR: with no second metadata language, no translation is expected
    expect(messages(["en"])).toEqual([]);
    set.setText("title", "[[es]]Pescado");
    expect(messages(slots)).toEqual([]);
    set.setText("title", "[[en]]Fish[[es]]Pescado");
    expect(messages(slots)).toEqual([]);
    // in slash syntax, the second value is in the second metadata language
    set.setText("title", "Fish / Pescado");
    expect(messages(slots)).toEqual([]);
  });
  it("takes one severity for all rules, or one per rule", () => {
    const one = fieldSet({ key: "a", pattern: "x", severity: "warning" });
    expect(getRuleSeverity(one.getValueOrThrow("a"), "pattern")).toBe("warning");
    // without a severity, a missing translation is a warning and the rest are errors
    const unset = fieldSet({ key: "c", required: true }).getValueOrThrow("c");
    expect(getRuleSeverity(unset, "required")).toBe("error");
    expect(getRuleSeverity(unset, "pattern")).toBe("error");
    expect(getRuleSeverity(unset, "translationRequired")).toBe("warning");
    const perRule = fieldSet({
      key: "b",
      multilingual: true,
      englishRequired: true,
      maxLength: 3,
      severity: { maxLength: "warning" },
      value: "[[es]]Pescado",
    });
    const field = perRule.getValueOrThrow("b");
    expect(
      checkField(field, perRule, slots).map((b) => [b.rule, getRuleSeverity(field, b.rule)]),
    ).toEqual([
      ["maxLength", "warning"],
      ["englishRequired", "error"],
    ]);
  });
});

describe("checkProjectFields on the Edolo sample under ELAR", () => {
  let project: Project;
  let session: Session;
  beforeAll(() => {
    const dir = Path.join(temp.mkdirSync("field rules"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    const sprj = Path.join(dir, "Edolo sample.sprj");
    fs.writeFileSync(
      sprj,
      fs
        .readFileSync(sprj, "utf8")
        .replace(
          "<ArchiveConfigurationName>custom</ArchiveConfigurationName>",
          "<ArchiveConfigurationName>ELAR</ArchiveConfigurationName>",
        ),
    );
    project = Project.fromDirectory(dir);
    session = project.sessions.items[0] as Session;
  });

  it("reports ELAR's rules with targets that navigateTo understands", () => {
    // ETR009 has topics but no keywords, which ELAR cannot accept
    expect(checkProjectFields(project)).toContainEqual(
      expect.objectContaining({
        checkId: "minItems",
        severity: "error",
        target: {
          folderType: "session",
          folderId: "ETR009",
          fieldKey: "keyword",
        },
        field: session.properties.getValue("keyword"),
      }),
    );
    // ETR009's topics are "fishing, poison". The export capitalises them, and they need
    // no translation, because the sample's only metadata language is English.
    expect(checkProjectFields(project).filter((p) => p.target.fieldKey === "topic")).toEqual([]);
  });

  it("reports a session id that ELAR does not allow, and stops when it is fixed", () => {
    session.properties.setText("id", "ETR 009 with a long name");
    const idProblems = () =>
      checkProjectFields(project).filter(
        (p) => p.target.folderType === "session" && p.target.fieldKey === "id",
      );
    expect(idProblems().map((p) => p.checkId)).toEqual(["pattern", "maxLength"]);
    session.properties.setText("id", "ETR009");
    expect(idProblems()).toEqual([]);
  });

  it("reports a missing or unknown access level as an error", () => {
    const accessProblems = () =>
      checkProjectFields(project)
        .filter(
          (p) =>
            p.target.folderType === "session" &&
            p.target.folderId === "ETR009" &&
            !("fileName" in p.target) &&
            p.target.fieldKey === "access",
        )
        .map((p) => p.severity);
    const access = session.properties.getTextStringOrEmpty("access");
    session.properties.setText("access", "");
    expect(accessProblems()).toEqual(["error"]);
    session.properties.setText("access", "X");
    expect(accessProblems()).toEqual(["error"]);
    session.properties.setText("access", access);
  });

  it("requires an access explanation for S, on the session and on a media file", () => {
    session.properties.setText("access", "S");
    session.properties.setText("accessDescription", "");
    const mp3 = session.files.find((f) => f.getTextProperty("filename") === "ETR009_Careful.mp3")!;
    mp3.properties.setText("access", "S");
    const accessProblems = checkProjectFields(project).filter(
      (p) => p.target.fieldKey === "accessDescription",
    );
    expect(accessProblems.map((p) => p.target)).toEqual([
      {
        folderType: "session",
        folderId: "ETR009",
        fieldKey: "accessDescription",
      },
      {
        folderType: "session",
        folderId: "ETR009",
        fileName: "ETR009_Careful.mp3",
        fieldKey: "accessDescription",
      },
    ]);

    // a file with no explanation of its own gets the session's in IMDI
    session.properties.setText("accessDescription", "the speaker asked");
    expect(
      checkProjectFields(project).filter((p) => p.target.fieldKey === "accessDescription"),
    ).toEqual([]);
    mp3.properties.setText("access", "");
  });

  it("requires an access explanation for S on a project document", () => {
    const document = project.descriptionFolder.files[0];
    document.properties.setText("access", "S");
    const accessProblems = () =>
      checkProjectFields(project).filter(
        (p) => p.target.folderType === "project" && p.target.fieldKey === "accessDescription",
      );
    expect(accessProblems().map((p) => p.target)).toEqual([
      {
        folderType: "project",
        documents: "description",
        fileName: "pretend description.txt",
        fieldKey: "accessDescription",
      },
    ]);
    document.properties.setText("accessDescription", "the speaker asked");
    expect(accessProblems()).toEqual([]);
    document.properties.setText("access", "");
  });

  // no field of ELAR's needs this yet; it shows that if one did, a click would go to
  // where the translation is entered
  it("sends a genre's missing translation to its row on the Translations tab", () => {
    const genreField = session.properties.getValueOrThrow("genre");
    const genre = genreField.text;
    const metadataLanguages = project.properties.getTextStringOrEmpty("metadataLanguages");
    genreField.definition.translationRequired = true;
    try {
      project.properties.setText("metadataLanguages", "en;es");
      session.properties.setText("genre", "weird stuff");
      const genreProblems = () => checkProjectFields(project).filter((p) => p.field === genreField);
      expect(genreProblems().map((p) => [p.checkId, p.target, p.sessionId])).toEqual([
        [
          "translationRequired",
          {
            folderType: "project",
            vocabularyTranslation: { fieldKey: "genre", value: "weird stuff" },
          },
          "ETR009",
        ],
      ]);
      // the translation is in the project's vocabulary translations, not in the field
      project.vocabularyTranslations.setGenre("weird stuff", "custom", { es: "cosas raras" });
      expect(genreProblems()).toEqual([]);
    } finally {
      genreField.definition.translationRequired = undefined;
      session.properties.setText("genre", genre);
      project.properties.setText("metadataLanguages", metadataLanguages);
    }
  });

  it("requires English among the metadata languages, and points at them", () => {
    const metadataLanguages = project.properties.getTextStringOrEmpty("metadataLanguages");
    const metadataLanguageProblems = () =>
      checkProjectFields(project)
        .filter((p) => p.target.fieldKey === "metadataLanguages")
        .map((p) => [p.checkId, p.severity, p.target]);
    try {
      project.properties.setText("metadataLanguages", "es");
      expect(metadataLanguageProblems()).toEqual([
        ["englishRequired", "error", { folderType: "project", fieldKey: "metadataLanguages" }],
      ]);
      project.properties.setText("metadataLanguages", "es;en");
      expect(metadataLanguageProblems()).toEqual([]);
    } finally {
      project.properties.setText("metadataLanguages", metadataLanguages);
    }
  });

  it("counts a person's languages", () => {
    const person = project.persons.items[0] as Person;
    const languageProblems = () =>
      checkProjectFields(project).filter(
        (p) =>
          p.target.folderType === "person" &&
          p.target.folderId === person.getIdToUseForReferences() &&
          p.target.fieldKey === "languages",
      );
    expect(languageProblems()).toEqual([]);
    const languages = [...person.languages];
    person.languages = [];
    expect(languageProblems().map((p) => p.checkId)).toEqual(["minItems"]);
    person.languages = languages;
  });
});
