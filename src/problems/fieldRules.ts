import { t } from "@lingui/macro";
import { i18n as appI18n } from "../other/localization";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Folder } from "../model/Folder/Folder";
import { Field } from "../model/field/Field";
import { FieldSet } from "../model/field/FieldSet";
import { FieldRule } from "../model/field/FieldDefinition";
import { LanguageSlot } from "../model/field/TextHolder";
import { NavigationTarget } from "../navigation/NavigationTarget";
import { ProblemSeverity } from "./rulesFile";

// Checks the rules that fields.json5 sets on single fields (see the rule properties
// of FieldDefinition) against the project's own data. No export is involved.

// A problem reads as its subject in bold, then its text, e.g. "**Access** is
// required.", and then an optional reason on a line of its own.
export interface IProblemWording {
  // the field's label; undefined when the text says it all
  subject?: string;
  text: string;
  // why it is a problem, or what to do about it
  reason?: string;
  // subject and text together, as plain text
  message: string;
}

export interface IFieldProblem extends IProblemWording {
  // the rule that the field breaks, or for lametaChecks.ts, the name of the check
  checkId: string;
  severity: ProblemSeverity;
  target: NavigationTarget;
  // the field that breaks the rule, so that its editor can show the problem too
  field?: Field;
}

export interface IBrokenFieldRule extends IProblemWording {
  rule: FieldRule;
}

export function wordProblem(
  subject: string | undefined,
  text: string,
  reason?: string,
): IProblemWording {
  return {
    subject: subject || undefined,
    text,
    reason,
    message: subject ? subject + " " + text : text,
  };
}

type FolderPlace =
  | {
      folderType: "project";
      documents?: "description" | "other";
      fileName?: string;
    }
  | {
      folderType: "session" | "person";
      folderId: string;
      fileName?: string;
    };

export function checkProjectFields(
  project: Project,
  metadataSlots: LanguageSlot[] = Project.getMetadataLanguageSlots(),
): IFieldProblem[] {
  const metadataSlotTags = metadataSlots.map((s) => s.tag);
  const metadataLanguageNames = new Map(
    metadataSlots.map((s) => [s.tag, s.name || s.label || s.tag]),
  );
  const problems: IFieldProblem[] = [];
  const check = (
    properties: FieldSet,
    place: FolderPlace,
    person?: Person,
    sessionProperties?: FieldSet,
  ) => {
    for (const field of properties.values()) {
      // a person's languages are a list kept outside the field
      const listItemCount =
        person && field.definition?.type === "personLanguageList"
          ? person.languages.length
          : undefined;
      for (const broken of checkField(field, properties, metadataSlotTags, {
        listItemCount,
        projectProperties: project.properties,
        sessionProperties,
        metadataLanguageNames,
      })) {
        problems.push({
          checkId: broken.rule,
          severity: getRuleSeverity(field, broken.rule),
          subject: broken.subject,
          text: broken.text,
          reason: broken.reason,
          message: broken.message,
          target: { ...place, fieldKey: field.key } as NavigationTarget,
          field,
        });
      }
    }
  };
  check(project.properties, { folderType: "project" });
  const checkFolder = (folder: Folder, folderType: "session" | "person", folderId: string) => {
    check(
      folder.properties,
      { folderType, folderId },
      folder instanceof Person ? folder : undefined,
    );
    for (const file of folder.files) {
      if (file === folder.metadataFile) continue;
      check(
        file.properties,
        {
          folderType,
          folderId,
          fileName: file.getTextProperty("filename", ""),
        },
        undefined,
        folder instanceof Session ? folder.properties : undefined,
      );
    }
  };
  for (const session of project.sessions.items as Session[]) {
    checkFolder(session, "session", session.id);
  }
  for (const person of project.persons.items as Person[]) {
    checkFolder(person, "person", person.getIdToUseForReferences());
  }
  const documentFolders = [
    ["description", project.descriptionFolder],
    ["other", project.otherDocsFolder],
  ] as const;
  for (const [documents, folder] of documentFolders) {
    for (const file of folder?.files ?? []) {
      check(file.properties, {
        folderType: "project",
        documents,
        fileName: file.getTextProperty("filename", ""),
      });
    }
  }
  return problems;
}

export function getRuleSeverity(field: Field, rule: FieldRule): ProblemSeverity {
  const severity = field.definition?.severity;
  if (typeof severity === "string") return severity;
  return severity?.[rule] ?? kDefaultRuleSeverity[rule];
}

// A broken rule is something the archive cannot accept, except a missing translation
const kDefaultRuleSeverity: Record<FieldRule, ProblemSeverity> = {
  required: "error",
  requiredWhen: "error",
  minItems: "error",
  pattern: "error",
  maxLength: "error",
  englishRequired: "error",
  translationRequired: "warning",
};

// the fields of a session's file that IMDI takes from the session when the file
// leaves them empty
const kTakenFromSessionWhenEmpty = ["access", "accessDescription"];

export interface ICheckFieldOptions {
  // for a field whose items are kept outside its text, such as a person's languages
  listItemCount?: number;
  // the project's fields, for projectFallback
  projectProperties?: FieldSet;
  // for a file in a session, the session's fields, which IMDI uses for the file's
  // access fields when the file leaves them empty (see ImdiGenerator.addAccess)
  sessionProperties?: FieldSet;
  // the names of the metadata languages, by tag, for messages
  metadataLanguageNames?: Map<string, string>;
}

// Every rule that this field breaks. `properties` holds the other fields of the same
// file, for requiredWhen.
export function checkField(
  field: Field,
  properties: FieldSet,
  metadataSlotTags: string[],
  options: ICheckFieldOptions = {},
): IBrokenFieldRule[] {
  const { listItemCount, projectProperties, sessionProperties, metadataLanguageNames } = options;
  const d = field.definition;
  if (!d || d.visibility === "never") return [];
  const label = field.labelInUILanguage;
  const value = field.text.trim();
  const broken: IBrokenFieldRule[] = [];
  // The texts follow the field's label, which the sidebar shows in bold.
  const add = (rule: FieldRule, text: string, reason?: string) =>
    broken.push({ rule, ...wordProblem(label, text, reason) });
  const addEnglishRequired = () =>
    add(
      "englishRequired",
      t({
        message: "needs English.",
        comment: 'Follows a field\'s name, as in "Title needs English."',
      }),
    );
  const addRequired = () =>
    add(
      "required",
      t({
        message: "is required.",
        comment: 'Follows a field\'s name, as in "Access is required."',
      }),
    );
  // the subject has a colon, as in "Keywords: add at least one."
  const addMinItems = (minItems: number) =>
    broken.push({
      rule: "minItems",
      ...wordProblem(
        t({
          message: `${label}:`,
          comment: 'A field\'s name before an instruction, as in "Keywords: add at least one."',
        }),
        minItems === 1
          ? t({
              message: "add at least one.",
              comment: 'Follows a field\'s name, as in "Keywords: add at least one."',
            })
          : t({
              message: `add at least ${minItems}.`,
              comment: 'Follows a field\'s name, as in "Keywords: add at least 2."',
            }),
      ),
    });

  if (listItemCount !== undefined) {
    if (listItemCount === 0 && d.required) {
      addRequired();
    } else if (d.minItems !== undefined && listItemCount < d.minItems) {
      addMinItems(d.minItems);
    }
    return broken;
  }

  if (value === "") {
    if (
      sessionProperties &&
      kTakenFromSessionWhenEmpty.includes(field.key) &&
      sessionProperties.getTextStringOrEmpty(field.key).trim() !== ""
    )
      return broken;
    const fallbackValue =
      d.projectFallback && projectProperties
        ? projectProperties.getTextStringOrEmpty(d.projectFallback).trim()
        : "";
    if (d.required && fallbackValue === "") {
      addRequired();
    } else if (d.requiredWhen) {
      const other = properties.getValue(d.requiredWhen.field);
      if (other && other.text.trim() === d.requiredWhen.value) {
        const otherLabel = other.labelInUILanguage;
        const otherValue = d.requiredWhen.value;
        add(
          "requiredWhen",
          t({
            message: `is required when ${otherLabel} is ${otherValue}.`,
            comment:
              'Follows a field\'s name, as in "Access Explanation is required when Access is S."',
          }),
        );
      }
    }
    if (broken.length === 0 && d.englishRequired && fallbackValue === "") {
      addEnglishRequired();
    }
    if (broken.length === 0 && d.minItems) {
      addMinItems(d.minItems);
    }
    return broken;
  }

  // Multilingual fields hold several languages; rules about the text apply to each.
  const textsByLanguage = d.multilingual
    ? field
        .getEffectiveSlotTags(metadataSlotTags)
        .map((tag) => ({
          tag,
          text: field.getTextAxisVirtual(tag, metadataSlotTags).trim(),
        }))
        .filter((x) => x.text.length > 0)
    : [{ tag: "en", text: value }];
  const texts = textsByLanguage.map((x) => x.text);

  if (d.pattern) {
    // "u" so that a pattern can use Unicode classes such as \p{Ll}
    const regex = new RegExp(d.pattern, "u");
    if (texts.some((s) => !regex.test(s))) {
      // patternDescription comes from fields.json5; its translations are in fields.po
      const description = d.patternDescription ? appI18n._(d.patternDescription) : undefined;
      add(
        "pattern",
        description
          ? t({
              message: `must be ${description}.`,
              comment:
                'Follows a field\'s name, as in "Title must be capitalised." The description comes from the archive configuration.',
            })
          : t({
              message: "is not in the expected form.",
              comment: 'Follows a field\'s name, as in "ID is not in the expected form."',
            }),
      );
    }
  }
  if (d.maxLength !== undefined && texts.some((s) => s.length > d.maxLength!)) {
    const maxLength = d.maxLength;
    add(
      "maxLength",
      t({
        message: `must be at most ${maxLength} characters.`,
        comment: 'Follows a field\'s name, as in "Title must be at most 100 characters."',
      }),
    );
  }
  if (d.minItems !== undefined) {
    const itemCount = Math.max(
      0,
      ...texts.map(
        (s) =>
          s
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0).length,
      ),
    );
    if (itemCount < d.minItems) {
      addMinItems(d.minItems);
    }
  }
  if (d.englishRequired && field.getTextAxisVirtual("en", metadataSlotTags).trim() === "") {
    addEnglishRequired();
  }
  // the project's metadata languages are the ones a translation can be in; with
  // English alone, there is no translation to expect
  const translationLanguages = metadataSlotTags
    .filter((tag) => tag !== "en")
    .map((tag) => metadataLanguageNames?.get(tag) ?? tag);
  if (
    d.translationRequired &&
    translationLanguages.length > 0 &&
    !textsByLanguage.some((x) => x.tag !== "en")
  ) {
    const languages = translationLanguages.join(" " + t`or` + " ");
    add(
      "translationRequired",
      t({
        message: `needs a ${languages} translation.`,
        comment: 'Follows a field\'s name, as in "Title needs a Spanish or Tok Pisin translation."',
      }),
    );
  }
  return broken;
}
