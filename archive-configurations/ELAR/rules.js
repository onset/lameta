// ELAR's checks of lameta's IMDI export that are not about a single field.
// (Checks about a single field are in fields.json5.)
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
function sessionNameOf(doc) {
  const session = first(doc, "Session");
  return session ? text(children(session, "Name")[0]) : "";
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

const kMediaExtensions = ["wav", "mp4", "jpg", "jpeg", "png", "tif", "tiff"];
const kWrittenExtensions = [
  "eaf",
  "csv",
  "pdf",
  "txt",
  "flextext",
  "fwbackup",
  "textgrid",
  "trs",
  "exb",
  "exs",
  "coma",
  "srt",
  "vtt",
  "apk",
  "exe",
];
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
  const sessionName = sessionNameOf(doc);
  const isConsent = sessionName === "ConsentDocuments";
  // ELAR: if there is no second metadata language, do not expect a translation
  const expectTranslations = project.metadataLanguages.some((tag) => tag !== "en");
  // The IMDI has English only when it is a metadata language. When it is not, the
  // field rules report that once, on the project's Metadata Languages.
  const expectEnglish = project.metadataLanguages.includes("en");

  checkResources(session, sessionName, isConsent, report);
  checkActors(session, expectTranslations, expectEnglish, report);
  checkGenres(session, expectTranslations, report);
  if (expectTranslations) checkAccessDescriptionTranslations(session, report);
}

function checkResources(session, sessionName, isConsent, report) {
  const resources = first(session, "Resources");
  const media = resources ? all(resources, "MediaFile") : [];
  const written = resources ? all(resources, "WrittenResource") : [];
  // A session that has no files is reported by lameta's own checks (lametaChecks.ts),
  // for every configuration, so not here
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
      if (!isConsent && !filename.includes(sessionName) && !namePart.includes(sessionName)) {
        report_(
          report,
          id + "/sessionId",
          link,
          "File name",
          `doesn't contain the session ID "${sessionName}".`,
        );
      }
      if (namePart.replace(/[a-zA-Z0-9_-]+/g, "").length >= 1) {
        report_(
          report,
          id + "/characters",
          link,
          "File name",
          "has characters that aren't allowed.",
        );
      }
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
      const allowed = isMedia ? kMediaExtensions : kWrittenExtensions;
      // the MP3 check above says when an MP3 is accepted
      if (ext && ext !== "mp3" && !allowed.includes(ext)) {
        report_(report, id + "/extension", link, "File format", `.${ext} is not allowed.`);
      }
      if (namePart.length >= 21) {
        report_(
          report,
          id + "/length",
          link,
          "File name",
          `is too long (${namePart.length} characters).`,
        );
      }
      if (!isMedia && !isConsent && !/_[0-9]{8}\./.test(filename)) {
        report_(report, id + "/dateStamp", link, "File name", "has no date stamp (_YYYYMMDD).");
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
    const size = children(resource, "Size")[0];
    const gb = text(size).match(/(\d+)\s*GB/i);
    if (gb) {
      const n = parseInt(gb[1], 10);
      const limit = n >= 50 ? 50 : n >= 40 ? 40 : n >= 30 ? 30 : n >= 20 ? 20 : 0;
      if (limit) {
        report_(report, "checkFileSize", size, "File", `is over ${limit} GB (${n} GB).`);
      }
    }
  }
}

function checkActors(session, expectTranslations, expectEnglish, report) {
  const actorsElement = first(session, "Actors");
  if (!actorsElement) return;
  const actors = all(actorsElement, "Actor");
  if (!actors.some((a) => text(children(a, "FullName")[0]))) {
    report_(
      report,
      "checkForActors",
      actorsElement,
      "Session",
      "has no contributor with a full name.",
    );
  }
  for (const actor of actors) {
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
  // a genre in other languages alone has nothing to compare with ELAR's English list
  const english = genre.hasEnglish ? genre.english : "";
  if (!english || english === "Unknown" || english === "Unspecified") return;
  // ELAR's validator reports this as a warning
  if (!kElarGenresLowerCase.includes(english.toLowerCase())) {
    reportWarning(
      report,
      "genreMapping",
      genre.node,
      undefined,
      `Genre "${english}" is not in the ELAR genre list. Please consider using a standardised genre.`,
    );
  }
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

// ---------------------------------------------------------------- checkCorpus

export function checkCorpus(doc, report) {
  const corpus = first(doc, "Corpus");
  if (!corpus) return;
  const name = children(corpus, "Name")[0];
  const folderName = text(name);
  if (!folderName) {
    report_(report, "checkCorpusFolderName", name ?? corpus, "Project name", "is empty.");
  } else {
    if (folderName.replace(/[a-zA-Z0-9-]+/g, "").length >= 1) {
      report_(
        report,
        "checkCorpusFolderName",
        name,
        "Project name",
        "has characters that aren't allowed.",
      );
    }
    if (folderName.length >= 35) {
      report_(
        report,
        "checkCorpusFolderName",
        name,
        "Project name",
        `is too long (${folderName.length} characters).`,
      );
    }
  }
}

// ---------------------------------------------------------------- checkAcrossSessions

// Capitalisation is not compared across sessions: the field rules for topics and
// keywords already require ELAR's capitalisation in each session.
export function checkAcrossSessions(docs, report) {
  const sessionLanguages = [];
  const actorLanguages = [];
  for (const doc of docs) {
    const session = first(doc, "Session");
    if (!session) continue;
    const content = first(session, "Content");
    if (content) {
      const languages = children(content, "Languages")[0];
      if (languages) {
        for (const language of children(languages, "Language")) {
          const id = text(children(language, "Id")[0]);
          const name = children(language, "Name")[0];
          if (id && text(name)) sessionLanguages.push({ id, value: text(name), node: name });
        }
      }
    }
    for (const actor of all(session, "Actor")) {
      const languages = children(actor, "Languages")[0];
      if (!languages) continue;
      for (const language of children(languages, "Language")) {
        const id = text(children(language, "Id")[0]);
        const name = children(language, "Name")[0];
        if (id && text(name)) actorLanguages.push({ id, value: text(name), node: name });
      }
    }
  }
  reportLanguageNameVariations(sessionLanguages, report);
  reportLanguageNameVariations(actorLanguages, report);
}

// One ISO code written with different language names
function reportLanguageNameVariations(entries, report) {
  const groups = new Map();
  for (const entry of entries) {
    const code = entry.id.replace("ISO639-3:", "").toLowerCase();
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(entry);
  }
  for (const [code, group] of groups) {
    // spellings that differ only in capitalisation count as one
    const names = [...new Map(group.map((e) => [e.value.toLowerCase(), e.value])).values()];
    const message = `is spelled differently in other sessions: ${names.map((n) => `"${n}"`).join(" vs ")}.`;
    reportVariations(
      group,
      (e) => e.value.toLowerCase(),
      "languageNameVariations",
      `Language ${code}`,
      message,
      report,
    );
  }
}

// Reports each entry whose spelling is not the one that most entries use. When two
// spellings are equally common, there is no majority, so every entry is reported.
function reportVariations(group, spellingOf, id, subject, message, report) {
  const counts = new Map();
  for (const entry of group) {
    const spelling = spellingOf(entry);
    counts.set(spelling, (counts.get(spelling) ?? 0) + 1);
  }
  if (counts.size < 2) return;
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const tie = ranked[0][1] === ranked[1][1];
  for (const entry of group) {
    if (!tie && spellingOf(entry) === ranked[0][0]) continue;
    report_(report, id, entry.node, subject, message);
  }
}

// ---------------------------------------------------------------- ELAR's genre list

// From ELAR's metadata validator 2.0.9
const kElarGenres = [
  "Academic output",
  "Anecdote",
  "Art",
  "Audiobook",
  "Autobiography",
  "Biography",
  "Brochure",
  "Catalog",
  "Chant",
  "Collection description",
  "Commentary",
  "Community materials",
  "Consent",
  "Conversation",
  "Dance",
  "Description",
  "Dialogue",
  "Dictionary",
  "Dissertation",
  "Drama",
  "Elicitation",
  "Ethnobiological description",
  "Ethnography",
  "Fable",
  "Fairy tale",
  "Field note",
  "Folk song",
  "Folktale",
  "Folklore",
  "Formulaic discourse",
  "Glossary",
  "Gossip",
  "Grammar",
  "History",
  "Hymn",
  "Incantation",
  "Instrumental music",
  "Interactive discourse",
  "Interview",
  "Joke",
  "Landscape description",
  "Language play",
  "Lecture",
  "Legend",
  "Letter",
  "Lexical database",
  "Ludic discourse",
  "Lullaby",
  "Manual",
  "Map",
  "Metadata",
  "Metadocumentation",
  "Monologue",
  "Music",
  "Myth",
  "Mythology",
  "Narrative",
  "Notebook",
  "Notes",
  "Novel",
  "Oral history",
  "Oral literature",
  "Oratory",
  "Orthography",
  "Personal narrative",
  "Photograph",
  "Poetry",
  "Poster",
  "Prayer",
  "Primer",
  "Procedural discourse",
  "Proverb",
  "Questionnaire",
  "Recipe",
  "Recitation",
  "Report",
  "Riddle",
  "Ritual",
  "Sand drawing",
  "Sermon",
  "Short story",
  "Singing",
  "Song",
  "Speech",
  "Stimuli",
  "Textbook",
  "Traditional game",
  "Translation",
  "Unintelligible speech",
  "Verbal art",
  "Video",
  "Word list",
];
const kElarGenresLowerCase = kElarGenres.map((g) => g.toLowerCase());
