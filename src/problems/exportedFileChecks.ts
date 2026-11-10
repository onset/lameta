import { t } from "@lingui/core/macro";
import { Session } from "../model/Project/Session/Session";
import { File } from "../model/file/File";
import { GetFileFormatInfoForPath } from "../model/file/FileTypeInfo";
import { getStatusOfFile } from "../model/file/FileStatus";
import { fileExportNames } from "../export/exportNames";
import { shouldIncludeFile } from "../export/shouldIncludeFile";
import { wordProblem } from "./fieldRules";
import { CheckSettings } from "./checkSettings";
import type { Report } from "./lametaChecks";

// The checks of a session's files by the names that export gives them: fileExtension,
// fileNameLength, fileNameCharacters, fileNameContainsSessionId, fileNameDateStamp and
// fileSize (see checkSettings.ts for their settings). A file that export leaves out is
// not checked.
export function checkExportedFiles(
  session: Session,
  checks: Map<string, CheckSettings>,
  add: Report,
  isExported: (file: File) => boolean,
) {
  const extensions = checks.get("fileExtension") as
    | (CheckSettings & { mediaExtensions: string[]; writtenExtensions: string[] })
    | undefined;
  const length = checks.get("fileNameLength") as
    | (CheckSettings & { maxLength: number })
    | undefined;
  const characters = checks.get("fileNameCharacters") as
    | (CheckSettings & { pattern: string })
    | undefined;
  const sessionId = checks.get("fileNameContainsSessionId") as
    | (CheckSettings & { exceptSessions: string[] })
    | undefined;
  const dateStamp = checks.get("fileNameDateStamp") as
    | (CheckSettings & { appliesTo: ("media" | "written")[]; exceptSessions: string[] })
    | undefined;
  const size = checks.get("fileSize") as
    | (CheckSettings & { limitsInGigabytes: number[] })
    | undefined;
  if (!extensions && !length && !characters && !sessionId && !dateStamp && !size) return;

  const allowedCharacters = characters && new RegExp(characters.pattern);
  // the session's id as the IMDI names the session, with each space made "_"
  const id = session.properties.getTextStringOrEmpty("id").replace(/ /g, "_").trim();
  const exportNames = fileExportNames(session.files);
  for (const file of session.files) {
    if (file === session.metadataFile) continue;
    // Says whether export includes the file only when the file has a problem, because
    // finding out looks at the disk
    let exported: boolean | undefined;
    const report = (problem: Parameters<Report>[0]) => {
      exported ??= isExported(file);
      if (exported) add(problem);
    };
    const target = {
      folderType: "session" as const,
      folderId: session.id,
      fileName: file.getTextProperty("filename", ""),
    };
    const fileName = exportNames.get(file) ?? file.getNameToUseWhenExportingUsingTheActualFile();
    const namePart = fileName.split(".")[0];
    const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
    const isMedia = !!GetFileFormatInfoForPath(file.getActualFilePath())?.isMediaType;

    if (sessionId && !sessionId.exceptSessions.includes(id) && !fileName.includes(id)) {
      report({
        checkId: "fileNameContainsSessionId",
        ...wordProblem(
          t`File name`,
          t({
            message: `doesn't contain the session ID "${id}".`,
            comment:
              'Follows "File name", as in "File name doesn\'t contain the session ID "ETR009"."',
          }),
        ),
        target,
      });
    }
    if (allowedCharacters && !allowedCharacters.test(namePart)) {
      report({
        checkId: "fileNameCharacters",
        ...wordProblem(
          t`File name`,
          t({
            message: "has characters that aren't allowed.",
            comment: 'Follows "File name", as in "File name has characters that aren\'t allowed."',
          }),
        ),
        target,
      });
    }
    if (extensions && extension) {
      const allowed = isMedia ? extensions.mediaExtensions : extensions.writtenExtensions;
      if (!allowed.some((e) => e.toLowerCase() === extension)) {
        report({
          checkId: "fileExtension",
          ...wordProblem(
            t`File format`,
            t({
              message: `.${extension} is not allowed.`,
              comment: 'Follows "File format", as in "File format .docx is not allowed."',
            }),
          ),
          target,
        });
      }
    }
    if (length && namePart.length > length.maxLength) {
      report({
        checkId: "fileNameLength",
        ...wordProblem(
          t`File name`,
          t({
            message: `is too long (${namePart.length} characters).`,
            comment:
              'Follows "File name", as in "File name is too long (23 characters)." Counts the characters before the first "."',
          }),
        ),
        target,
      });
    }
    if (
      dateStamp &&
      !dateStamp.exceptSessions.includes(id) &&
      dateStamp.appliesTo.includes(isMedia ? "media" : "written") &&
      !/_[0-9]{8}\./.test(fileName)
    ) {
      report({
        checkId: "fileNameDateStamp",
        ...wordProblem(
          t`File name`,
          t({
            message: "has no date stamp (_YYYYMMDD).",
            comment:
              'Follows "File name", as in "File name has no date stamp (_YYYYMMDD)." Keep _YYYYMMDD as it is.',
          }),
        ),
        target,
      });
    }
    if (size) {
      // lameta writes a file's size like "21 GB"
      const gigabytes = file.getTextProperty("size", "").match(/(\d+)\s*GB/i);
      const n = gigabytes ? parseInt(gigabytes[1], 10) : 0;
      const reached = size.limitsInGigabytes.filter((limit) => n >= limit);
      if (reached.length > 0) {
        const limit = Math.max(...reached);
        report({
          checkId: "fileSize",
          ...wordProblem(
            t`File`,
            t({
              message: `is over ${limit} GB (${n} GB).`,
              comment: 'Follows "File", as in "File is over 20 GB (23 GB)."',
            }),
          ),
          target: { ...target, fieldKey: "size" },
        });
      }
    }
  }
}

// Whether the IMDI export includes this file of a session, as
// ImdiGenerator.resourcesOfType decides. A file that is only in the cloud counts,
// because export downloads it.
export function isExported(file: File): boolean {
  if (file.isDeletedLinkFile()) return false;
  if (!shouldIncludeFile(file.getActualFilePath())) return false;
  return !getStatusOfFile(file).missing;
}
