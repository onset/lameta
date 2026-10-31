// ELAR's checks of lameta's IMDI export that are ELAR's own or about the IMDI's shape.
// Checks about a single field are in fields.json5. lameta's general checks, which
// ELAR turns on with its own values, such as the allowed file extensions and ELAR's
// genre list, are in settings.json5.
//
// Started as a port of ELAR's metadata validator 2.0.9, and has since diverged from
// it in which problems it reports and how severe they are. The messages simplify
// the validator's wording, as John Hatton chose for each one, and leave out the
// session and file names, which the sidebar shows already. Do not add suggestions
// or other advice that did not come from ELAR.
//
// See lameta's src/problems/rulesFile.ts for the interface.

export const interfaceVersion = 1;
export const format = "imdi";

// ---------------------------------------------------------------- helpers

function text(el) {
  return el ? el.textContent.trim() : "";
}
function all(parent, tag) {
  return Array.from(parent.getElementsByTagName(tag));
}
function first(parent, tag) {
  return parent.getElementsByTagName(tag)[0];
}
function children(parent, tag) {
  // compared without case, as getElementsByTagName does in an HTML-mode parser
  return Array.from(parent.children).filter((c) => c.localName.toLowerCase() === tag.toLowerCase());
}
function actorNameOf(actor) {
  return text(children(actor, "FullName")[0]) || text(children(actor, "Name")[0]) || "unknown";
}
// Whether a file name, before its first ".", is `namePart` once any _YYYYMMDD
// datestamp is left off both
function sameNameApartFromDate(filename, namePart) {
  const undated = (n) => n.replace(/_[0-9]{8}$/, "");
  return undated(filename.split(".")[0]) === undated(namePart);
}
// What these checks find is something ELAR's archive cannot accept, except a
// missing translation and what only the depositor can judge, which are warnings.
// The sidebar shows `subject` in bold before `message`, and `reason` on a line of
// its own.
function report_(report, id, node, subject, message, reason) {
  report({ id, severity: "error", subject, message, reason, node });
}
function reportWarning(report, id, node, subject, message, reason) {
  report({ id, severity: "warning", subject, message, reason, node });
}
// lameta takes the user to where they enter the translation, which for a genre or
// a role is not the field itself
function reportMissingTranslation(report, id, node, subject, reason) {
  report({
    id,
    severity: "warning",
    subject,
    message: "needs a translation.",
    reason,
    node,
    missingTranslation: true,
  });
}

// The English value and whether there is a translation, for the elements of one
// field: either several elements with LanguageId, or one value in the
// "English / Translation" form.
function readMultilingual(elements) {
  const withLanguage = elements.filter((e) => e.getAttribute("LanguageId"));
  if (withLanguage.length > 0) {
    const english = withLanguage.find(
      (e) => e.getAttribute("LanguageId") === "ISO639-3:eng" && text(e),
    );
    const other = withLanguage.some(
      (e) => e.getAttribute("LanguageId") !== "ISO639-3:eng" && text(e),
    );
    return {
      english: english ? text(english) : text(withLanguage[0]),
      hasEnglish: !!english,
      hasTranslation: other,
      usesLanguageId: true,
      node: english ?? withLanguage[0],
    };
  }
  const value = text(elements[0]);
  if (value.includes(" / ")) {
    const parts = value.split(" / ").map((p) => p.trim());
    return {
      english: parts[0],
      hasEnglish: !!parts[0],
      hasTranslation: !!parts.slice(1).join(" / "),
      usesLanguageId: false,
      node: elements[0],
    };
  }
  return {
    english: value,
    hasEnglish: !!value,
    hasTranslation: false,
    usesLanguageId: false,
    formatError: value.includes("/"),
    node: elements[0],
  };
}

// ---------------------------------------------------------------- checkSession

const kResourceTypes = [
  "ELAN",
  "FLEx",
  "Document",
  "Audio",
  "Video",
  "Image",
  "Settings",
  "Transcriber",
  "Subtitles",
  "Praat",
  "Toolbox",
  "Spreadsheet",
];

export function checkSession(doc, report, project) {
  const session = first(doc, "Session");
  if (!session) return;
  // ELAR: if there is no second metadata language, do not expect a translation
  const expectTranslations = project.metadataLanguages.some((tag) => tag !== "en");
  // The IMDI has English only when it is a metadata language. When it is not, the
  // field rules report that once, on the project's Metadata Languages.
  const expectEnglish = project.metadataLanguages.includes("en");

  checkResources(session, report);
  checkActors(session, expectTranslations, expectEnglish, report);
  checkGenres(session, expectTranslations, report);
  if (expectTranslations) checkAccessDescriptionTranslations(session, report);
}

function checkResources(session, report) {
  const resources = first(session, "Resources");
  const media = resources ? all(resources, "MediaFile") : [];
  const written = resources ? all(resources, "WrittenResource") : [];
  const fileNames = [...media, ...written]
    .map((r) => text(children(r, "ResourceLink")[0]).split("/").pop())
    .filter((n) => n);
  const withExtension = (extension) =>
    fileNames.filter((n) => n.toLowerCase().endsWith("." + extension));
  for (const resource of [...media, ...written]) {
    const isMedia = resource.localName.toLowerCase() === "mediafile";
    const link = children(resource, "ResourceLink")[0];
    if (link) {
      const value = text(link);
      const filename = value.split("/").pop() || value;
      const namePart = filename.split(".")[0];
      const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
      const id = isMedia ? "checkMediaFiles" : "checkWrittenResources";
      // An MP3 or FLExText file is accepted only when there is no better version of
      // it. A WAV or EAF in the session with the same name, apart from the datestamp,
      // is one for certain, so that is an error. Whether there is an original WAV
      // that the session lacks, lameta cannot know, so an MP3 without one is not
      // reported. A FLExText file in a session with other EAF files is a warning,
      // because only the depositor knows whether one of them is this text.
      if (isMedia && ext === "mp3") {
        if (withExtension("wav").some((n) => sameNameApartFromDate(n, namePart))) {
          report_(
            report,
            id + "/mp3",
            link,
            "MP3 files",
            "are not allowed if there is a WAV recording with the same name.",
          );
        }
      }
      if (!isMedia && ext === "flextext") {
        const eafs = withExtension("eaf");
        if (eafs.some((n) => sameNameApartFromDate(n, namePart))) {
          report_(
            report,
            id + "/flextext",
            link,
            "FLExText",
            "isn't accepted when a time-aligned EAF of it is also present.",
          );
        } else if (eafs.length > 0) {
          reportWarning(
            report,
            id + "/flextext",
            link,
            "FLExText",
            "is only accepted if there is no time-aligned EAF of it.",
          );
        }
      }
    }
    const type = children(resource, "Type")[0];
    if (type && !kResourceTypes.includes(text(type))) {
      report_(
        report,
        "checkResourceTypes",
        type,
        "Resource type",
        `"${text(type)}" isn't allowed.`,
      );
    }
  }
}

function checkActors(session, expectTranslations, expectEnglish, report) {
  const actorsElement = first(session, "Actors");
  if (!actorsElement) return;
  for (const actor of all(actorsElement, "Actor")) {
    const roles = children(actor, "Role");
    if (roles.length === 0) continue;
    const actorName = actorNameOf(actor);
    const value = text(roles[0]);
    if (!value || value === "Unspecified") {
      report_(report, "checkActorRole", roles[0], actorName, "has no role.");
      continue;
    }
    const role = readMultilingual(roles);
    if (role.usesLanguageId) {
      if (!role.hasEnglish) {
        if (!expectEnglish) continue;
        report_(
          report,
          "checkActorRole/english",
          role.node,
          `${actorName}'s role`,
          "has no English.",
        );
      } else if (expectTranslations && !role.hasTranslation) {
        reportMissingTranslation(
          report,
          "checkActorRole/translation",
          role.node,
          `${actorName}'s role`,
        );
      }
    } else if (value.includes("/") && !value.includes(" / ")) {
      reportWarning(
        report,
        "checkActorRole/format",
        roles[0],
        undefined,
        `Multilingual metadata available but incorrect format in Role for Actor "${actorName}": "${value}" (expected format: "English / Translation" with spaces around /)`,
      );
    } else if (expectTranslations && !value.includes("/")) {
      reportMissingTranslation(
        report,
        "checkActorRole/translation",
        roles[0],
        `${actorName}'s role`,
      );
    }
  }
}

function checkGenres(session, expectTranslations, report) {
  const content = first(session, "Content");
  if (!content) return;
  const genres = children(content, "Genre");
  if (genres.length === 0) return;
  const genre = readMultilingual(genres);
  // a genre that the IMDI has only in other languages is not checked
  const english = genre.hasEnglish ? genre.english : "";
  if (!english || english === "Unknown" || english === "Unspecified") return;
  if (expectTranslations && !genre.hasTranslation) {
    reportMissingTranslation(report, "genreTranslation", genre.node, "Genre");
  }
}

function checkAccessDescriptionTranslations(session, report) {
  for (const access of all(session, "Access")) {
    const availability = children(access, "Availability")[0];
    const isRestricted = text(availability).toLowerCase() === "s";
    const descriptions = children(access, "Description");
    const description = readMultilingual(descriptions.length ? descriptions : [access]);
    if (descriptions.length === 0 || !description.english) continue;
    if ((isRestricted || !availability) && !description.hasTranslation) {
      const reason = !availability
        ? "The access level is also missing."
        : "Required for access level S.";
      reportMissingTranslation(
        report,
        "accessDescriptionTranslation",
        description.node,
        "Access Explanation",
        reason,
      );
    }
  }
}
