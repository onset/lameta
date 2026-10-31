import { t } from "@lingui/core/macro";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { File } from "../model/file/File";
import { Field } from "../model/field/Field";
import { GetFileFormatInfoForPath, getImdiResourceTypeForPath } from "../model/file/FileTypeInfo";
import { getCommonFieldDefinition } from "../model/field/ConfiguredFieldDefinitions";
import { findPersonToExport } from "../model/Project/exportableFolders";
import { whereToTranslate } from "../model/Project/whereToTranslate";
import { fileExportNames } from "../export/exportNames";
import { fieldElementValues } from "../export/Imdi-static-fns";
import { ImdiVocabularyTranslator } from "../export/ImdiVocabularyTranslator";
import { iso639_3ForExport } from "../export/languageNameForExport";
import {
  IVocabularyElementValue,
  roleForExport,
  vocabularyElementValues,
} from "../export/vocabularyElementValues";
import { NavigationTarget } from "../navigation/NavigationTarget";
import { titleCase } from "title-case";
import { wordProblem } from "./fieldRules";
import { CheckSettings } from "./checkSettings";
import { isExported } from "./exportedFileChecks";
import type { Report } from "./lametaChecks";

// Checks of the values that the IMDI export writes for a session, worked out from the
// project the way ImdiGenerator works them out: which versions of a recording or text
// a session has, its files' resource types, and its contributors' roles, its genre and
// its access explanations, with their translations. A configuration turns each one on
// in its settings.json5 (see checkSettings.ts).

// What the IMDI says of a value that it may write in several languages: either in
// elements with a LanguageId each, or in one element as "English / Translation"
export function readMultilingual(elements: IVocabularyElementValue[]) {
  const text = (e: IVocabularyElementValue) => e.text.trim();
  const withLanguage = elements.filter((e) => e.languageId);
  if (withLanguage.length > 0) {
    const english = withLanguage.find((e) => e.languageId === "ISO639-3:eng" && text(e));
    return {
      english: english ? text(english) : text(withLanguage[0]),
      hasEnglish: !!english,
      hasTranslation: withLanguage.some((e) => e.languageId !== "ISO639-3:eng" && text(e)),
      usesLanguageId: true,
    };
  }
  const value = elements.length > 0 ? text(elements[0]) : "";
  if (value.includes(" / ")) {
    const parts = value.split(" / ").map((p) => p.trim());
    return {
      english: parts[0],
      hasEnglish: !!parts[0],
      hasTranslation: !!parts.slice(1).join(" / "),
      usesLanguageId: false,
    };
  }
  return { english: value, hasEnglish: !!value, hasTranslation: false, usesLanguageId: false };
}

// The tags of the project's metadata languages, such as ["en", "es"]
function metadataLanguageTags(project: Project): string[] {
  return Project.parseLanguagesToSlots(
    project.properties.getTextStringOrEmpty("metadataLanguages"),
  ).map((slot) => slot.tag);
}

const needsATranslation = () =>
  t({
    message: "needs a translation.",
    comment: 'Follows the name of a value, as in "Genre needs a translation."',
  });

export function checkSessionResourcesAndTranslations(
  project: Project,
  session: Session,
  checks: Map<string, CheckSettings>,
  add: Report,
) {
  const tags = metadataLanguageTags(project);
  // a translation is expected only when there is a metadata language besides English
  const expectTranslations = tags.some((tag) => tag !== "en");
  // When English is not a metadata language, the field rules report that once, on the
  // project's Metadata Languages
  const expectEnglish = tags.includes("en");
  checkResources(session, checks, add);
  if (checks.has("accessDescriptionTranslation") && expectTranslations)
    checkAccessDescriptions(session, checks, add);
  checkRoles(project, session, checks, add, expectTranslations, expectEnglish);
  checkGenreTranslation(project, session, checks, add, expectTranslations);
}

// Whether a file name, before its first ".", is `namePart` once any _YYYYMMDD
// datestamp is left off both
function sameNameApartFromDate(fileName: string, namePart: string): boolean {
  const undated = (n: string) => n.replace(/_[0-9]{8}$/, "");
  return undated(fileName.split(".")[0]) === undated(namePart);
}

// An MP3 or FLExText file is accepted only when there is no better version of it. A WAV
// or EAF in the session with the same name, apart from the datestamp, is one for
// certain. Whether there is an original WAV that the session lacks, lameta cannot know,
// so an MP3 without one is not reported. A FLExText file in a session with other EAF
// files is only a warning, because only the depositor knows whether one of them is this
// text.
function checkResources(session: Session, checks: Map<string, CheckSettings>, add: Report) {
  const resourceType = checks.get("resourceType") as
    | (CheckSettings & { allowedTypes: string[] })
    | undefined;
  if (
    !resourceType &&
    !checks.has("mp3WithWavOfSameName") &&
    !checks.has("flextextWithEafOfSameName") &&
    !checks.has("flextextWithOtherEaf")
  )
    return;
  const exportNames = fileExportNames(session.files);
  const resources = session.files
    .filter((f) => f !== session.metadataFile && isExported(f))
    .map((file) => ({ file, name: exportNames.get(file) ?? "" }));
  const withExtension = (extension: string) =>
    resources.map((r) => r.name).filter((n) => n.toLowerCase().endsWith("." + extension));
  for (const { file, name } of resources) {
    const target: NavigationTarget = {
      folderType: "session",
      folderId: session.id,
      fileName: file.getTextProperty("filename", ""),
    };
    const isMedia = !!GetFileFormatInfoForPath(file.getActualFilePath())?.isMediaType;
    const namePart = name.split(".")[0];
    const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
    if (isMedia && extension === "mp3") {
      if (withExtension("wav").some((n) => sameNameApartFromDate(n, namePart))) {
        add({
          checkId: "mp3WithWavOfSameName",
          ...wordProblem(
            t`MP3 files`,
            t({
              message: "are not allowed if there is a WAV recording with the same name.",
              comment: 'Follows "MP3 files", as in "MP3 files are not allowed if…"',
            }),
          ),
          target,
        });
      }
    }
    if (!isMedia && extension === "flextext") {
      const eafs = withExtension("eaf");
      if (eafs.some((n) => sameNameApartFromDate(n, namePart))) {
        add({
          checkId: "flextextWithEafOfSameName",
          ...wordProblem(
            "FLExText",
            t({
              message: "isn't accepted when a time-aligned EAF of it is also present.",
              comment:
                'Follows "FLExText", the name of a file format, as in "FLExText isn\'t accepted…"',
            }),
          ),
          target,
        });
      } else if (eafs.length > 0) {
        add({
          checkId: "flextextWithOtherEaf",
          ...wordProblem(
            "FLExText",
            t({
              message: "is only accepted if there is no time-aligned EAF of it.",
              comment:
                'Follows "FLExText", the name of a file format, as in "FLExText is only accepted…"',
            }),
          ),
          target,
        });
      }
    }
    if (resourceType) {
      const type = (
        isMedia
          ? titleCase(file.type)
          : getImdiResourceTypeForPath(file.getRelativePathForExportingTheActualFile())
      ).trim();
      if (!resourceType.allowedTypes.includes(type)) {
        add({
          checkId: "resourceType",
          ...wordProblem(
            t`Resource type`,
            t({
              message: `"${type}" isn't allowed.`,
              comment: 'Follows "Resource type", as in "Resource type "Sound" isn\'t allowed."',
            }),
          ),
          target,
        });
      }
    }
  }
}

// The access explanation of each file that export includes, which is the file's own or
// else the session's, when its access level is one that needs it translated
function checkAccessDescriptions(
  session: Session,
  checks: Map<string, CheckSettings>,
  add: Report,
) {
  const settings = checks.get("accessDescriptionTranslation") as CheckSettings & {
    accessLevels: string[];
  };
  const levels = settings.accessLevels.map((l) => l.toLowerCase());
  const tags = Project.getMetadataLanguageSlots().map((slot) => slot.tag);
  for (const file of session.files) {
    if (file === session.metadataFile || !isExported(file)) continue;
    const ownAccess = file.properties.getTextStringOrEmpty("access");
    const access = ownAccess || session.properties.getTextStringOrEmpty("access");
    if (!levels.includes(access.toLowerCase())) continue;
    const owner: Session | File = file.properties.getTextStringOrEmpty("accessDescription")
      ? file
      : session;
    const description = owner.properties.getValue("accessDescription") as Field | undefined;
    if (!description || description.isEmpty() || description.text.trim() === "") continue;
    const value = readMultilingual(fieldElementValues(description, true, tags));
    if (!value.english || value.hasTranslation) continue;
    add({
      checkId: "accessDescriptionTranslation",
      ...wordProblem(
        t`Access Explanation`,
        needsATranslation(),
        t({
          message: `Required for access level ${settings.accessLevels.find((l) => l.toLowerCase() === access.toLowerCase())}.`,
          comment: 'The value is an access level, as in "Required for access level S."',
        }),
      ),
      target: {
        folderType: "session",
        folderId: session.id,
        ...(owner === file ? { fileName: file.getTextProperty("filename", "") } : {}),
        fieldKey: "accessDescription",
      },
    });
  }
}

// Each contributor's role, as the IMDI writes it in their Actor
function checkRoles(
  project: Project,
  session: Session,
  checks: Map<string, CheckSettings>,
  add: Report,
  expectTranslations: boolean,
  expectEnglish: boolean,
) {
  if (
    !["contributorWithoutRole", "roleWithoutEnglish", "roleFormat", "roleTranslation"].some((id) =>
      checks.has(id),
    )
  )
    return;
  const translator = new ImdiVocabularyTranslator(project).getRoleTranslator();
  const definition = getCommonFieldDefinition("role");
  const iso = (tag: string) => iso639_3ForExport(tag, project.privateUseCodes, project);
  for (const contribution of session.getAllContributionsToAllFiles()) {
    const name = contribution.personReference.trim();
    if (!name) continue;
    const person = findPersonToExport(project, name);
    const actorName = person
      ? person.properties.getTextStringOrEmpty("name").trim() || "unknown"
      : name;
    // the session's own file or the one of its files that lists the contribution
    const contributionFile = session.files.find((f) => f.contributions.includes(contribution));
    const source: NavigationTarget = {
      folderType: "session",
      folderId: session.id,
      ...(contributionFile && contributionFile !== session.metadataFile
        ? { fileName: contributionFile.getTextProperty("filename", "") }
        : {}),
      fieldKey: "contributions",
    };
    const roles = vocabularyElementValues(
      roleForExport(contribution.role),
      translator,
      contribution.role,
      definition,
      iso,
    );
    const value = roles[0].text.trim();
    const rolesSubject = t({
      message: `${actorName}'s role`,
      comment: "A contributor's name, as in \"Awi Heole's role needs a translation.\"",
    });
    const translationTarget = whereToTranslate("role", contribution.role) ?? source;
    if (!value || value === "Unspecified") {
      add({
        checkId: "contributorWithoutRole",
        ...wordProblem(
          actorName,
          t({
            message: "has no role.",
            comment: 'Follows a contributor\'s name, as in "Awi Heole has no role."',
          }),
        ),
        target: source,
      });
      continue;
    }
    const role = readMultilingual(roles);
    if (role.usesLanguageId) {
      if (!role.hasEnglish) {
        if (!expectEnglish) continue;
        add({
          checkId: "roleWithoutEnglish",
          ...wordProblem(
            rolesSubject,
            t({
              message: "has no English.",
              comment: "Follows a contributor's role, as in \"Awi Heole's role has no English.\"",
            }),
          ),
          target: source,
        });
      } else if (expectTranslations && !role.hasTranslation) {
        add({
          checkId: "roleTranslation",
          ...wordProblem(rolesSubject, needsATranslation()),
          target: translationTarget,
          sessionId: session.id,
        });
      }
    } else if (value.includes("/") && !value.includes(" / ")) {
      add({
        checkId: "roleFormat",
        ...wordProblem(
          undefined,
          t({
            message: `Multilingual metadata available but incorrect format in Role for Actor "${actorName}": "${value}" (expected format: "English / Translation" with spaces around /)`,
            comment: "Keep English / Translation as it is: it shows the format to use.",
          }),
        ),
        target: source,
      });
    } else if (expectTranslations && !value.includes("/")) {
      add({
        checkId: "roleTranslation",
        ...wordProblem(rolesSubject, needsATranslation()),
        target: translationTarget,
        sessionId: session.id,
      });
    }
  }
}

// The session's genre, which needs a translation when the project has a metadata
// language besides English. A genre that the IMDI has only in other languages is not
// checked.
function checkGenreTranslation(
  project: Project,
  session: Session,
  checks: Map<string, CheckSettings>,
  add: Report,
  expectTranslations: boolean,
) {
  if (!checks.has("genreTranslation") || !expectTranslations) return;
  const value = session.properties.getTextStringOrEmpty("genre");
  const genre = readMultilingual(genreElements(project, session));
  const english = genre.hasEnglish ? genre.english : "";
  if (!english || english === "Unknown" || english === "Unspecified") return;
  if (genre.hasTranslation) return;
  add({
    checkId: "genreTranslation",
    ...wordProblem(t`Genre`, needsATranslation()),
    sessionId: session.id,
    target: whereToTranslate("genre", value) ?? {
      folderType: "session",
      folderId: session.id,
      fieldKey: "genre",
    },
  });
}

// The elements that the IMDI export writes for the session's genre
export function genreElements(project: Project, session: Session): IVocabularyElementValue[] {
  const value = session.properties.getTextStringOrEmpty("genre");
  const label = session.properties.getLabelOfValue("genre").replace(/_/g, " ");
  return vocabularyElementValues(
    label || value,
    new ImdiVocabularyTranslator(project).getGenreTranslator(),
    value,
    session.properties.getFieldDefinition("genre"),
    (tag) => iso639_3ForExport(tag, project.privateUseCodes, project),
  );
}
