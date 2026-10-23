// Turns what src/export/tortureProject.manual.spec.ts writes into text that two versions of
// lameta, or two runs of one version, can be compared by, and compares two such folders.
// See compare-exports.ts.

import * as fs from "fs";
import * as path from "path";

// The files that the comparison reads. Everything else that the harness writes is either
// media that the bundles copy, or export.zip, whose CSVs it also writes under csv/.
const kComparedExtensions = new Set([
  ".imdi",
  ".opex",
  ".json",
  ".csv",
  ".session",
  ".person",
  ".sprj",
  ".meta",
]);

// The paths that the harness writes into report.json, so that the report can be compared
// across machines and worktrees
export interface RunPaths {
  projectDir: string;
  lametaDir: string;
  outDir: string;
}

// ImdiBundler also copies the project's files into the bundle folders, without waiting for the
// copies to finish, so there only the IMDI and OPEX that it writes are lameta's output.
const kBundleFolders = ["imdi-bundle/", "opex-bundle/"];
const kBundleExtensions = new Set([".imdi", ".opex"]);

export function isCompared(relativePath: string): boolean {
  const extension = path.extname(relativePath).toLowerCase();
  return kBundleFolders.some((folder) => relativePath.startsWith(folder))
    ? kBundleExtensions.has(extension)
    : kComparedExtensions.has(extension);
}

// The IMDI files that ImdiBundler makes for the project's documents. Each is a session that
// no user made, dated the day of the export.
const kDocumentPseudoSessions = new Set([
  "ConsentDocuments",
  "DescriptionDocuments",
  "OtherDocuments",
]);

// Removes what changes from run to run without lameta's behavior changing: the export date
// and lameta version on each IMDI, RO-Crate's datePublished, the times that RO-Crate reads
// from the file system (a session's own date has no time, so it stays), the time in the note
// that a date parse error leaves, and the guid that lameta gives a project whose .sprj has
// none.
export function normalizeExportText(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/ Date="\d{4}-\d\d-\d\d"/g, ' Date="(export date)"')
    .replace(/ Originator="lameta [^"]*"/g, ' Originator="lameta"')
    .replace(/"datePublished": "[^"]*"/g, '"datePublished": "(export time)"')
    .replace(/"(dateCreated|dateModified)": "\d{4}-\d\d-\d\dT[^"]*"/g, '"$1": "(file time)"')
    .replace(
      /Encountered on \w{3} \w{3} \d\d \d{4} \d\d:\d\d:\d\d GMT[+-]\d{4}( \([^)]*\))?/g,
      "Encountered on (time)",
    )
    .replace(/\b[0-9a-f]{32}\b/g, "(guid)");
}

// report.json without its stack traces, which name lines of code, and with the folders of
// the run replaced by names that every run shares
export function normalizeReport(reportJson: string, paths: RunPaths): string {
  const report = JSON.parse(reportJson.replace(/^\uFEFF/, ""));
  delete report.projectDir;
  delete report.out;
  for (const f of report.failures ?? []) delete f.stack;
  let text = JSON.stringify(report, null, 2);
  // longest first, because one of these folders can be inside another
  const replacements = [
    [paths.projectDir, "(project)"],
    [paths.lametaDir, "(lameta)"],
    [paths.outDir, "(out)"],
  ].sort((x, y) => y[0].length - x[0].length);
  for (const [dir, name] of replacements) {
    // the report holds each path both as written and JSON-escaped
    text = text.split(JSON.stringify(dir).slice(1, -1)).join(name).split(dir).join(name);
  }
  return normalizeExportText(text);
}

// lameta writes a lameta-source or lameta-translations comment before most IMDI elements
// so that a problem found in the IMDI can lead back to a field. A version that predates
// them differs on every line that has one, which hides everything else.
export function withoutSourceComments(text: string): string {
  return text.replace(/^[ \t]*<!-- ?lameta-(source|translations) .*-->\n/gm, "");
}

export function writeNormalizedCopy(rawDir: string, normalizedDir: string, paths: RunPaths) {
  fs.rmSync(normalizedDir, { recursive: true, force: true });
  for (const rel of listFiles(rawDir)) {
    if (!isCompared(rel)) continue;
    const text = fs.readFileSync(path.join(rawDir, rel), "utf8");
    const target = path.join(normalizedDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, normalizeExportFile(rel, text, paths));
  }
}

export function normalizeExportFile(relativePath: string, text: string, paths: RunPaths): string {
  if (relativePath === "report.json") return normalizeReport(text, paths);
  const normalized = normalizeExportText(text);
  const name = path.basename(relativePath, path.extname(relativePath));
  return kDocumentPseudoSessions.has(name)
    ? normalized.replace(/<Date>\d{4}-\d\d-\d\d<\/Date>/g, "<Date>(export date)</Date>")
    : normalized;
}

// true if `inner` is `outer` or a folder below it
export function isInside(inner: string, outer: string): boolean {
  const relative = path.relative(path.resolve(outer), path.resolve(inner));
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function listFiles(dir: string, sub = ""): string[] {
  return fs
    .readdirSync(path.join(dir, sub), { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? listFiles(dir, path.join(sub, e.name)) : [path.join(sub, e.name)],
    )
    .map((p) => p.split(path.sep).join("/"))
    .sort();
}

// One change, and every file it happened in. A change that the exporter makes in many files,
// such as a new code for a language, shows up once with its count.
export interface Change {
  description: string;
  files: string[];
}

export interface Comparison {
  onlyBefore: string[];
  onlyAfter: string[];
  changes: Change[];
}

export function compareFolders(
  beforeDir: string,
  afterDir: string,
  options: { ignoreSourceComments?: boolean } = {},
): Comparison {
  const before = new Set(listFiles(beforeDir));
  const after = new Set(listFiles(afterDir));
  const read = (dir: string, rel: string) => {
    const text = fs.readFileSync(path.join(dir, rel), "utf8");
    return options.ignoreSourceComments ? withoutSourceComments(text) : text;
  };
  const changes = new Map<string, string[]>();
  for (const rel of before) {
    if (!after.has(rel)) continue;
    const a = read(beforeDir, rel);
    const b = read(afterDir, rel);
    if (a === b) continue;
    const found = rel.endsWith(".csv") ? compareCsv(a, b) : compareLines(a, b);
    if (found.length === 0) found.push("differs only in the order of lines or in whitespace");
    for (const description of found) {
      if (!changes.has(description)) changes.set(description, []);
      changes.get(description)!.push(rel);
    }
  }
  return {
    onlyBefore: [...before].filter((f) => !after.has(f)),
    onlyAfter: [...after].filter((f) => !before.has(f)),
    changes: [...changes]
      .map(([description, files]) => ({ description, files }))
      .sort(
        (x, y) => y.files.length - x.files.length || x.description.localeCompare(y.description),
      ),
  };
}

// The lines that one side has more of than the other, so that a line written twice where it
// was written once counts. Order and indentation are ignored, so that one change made at
// different depths in different files is reported once; compareFolders reports a file whose
// only differences are those.
export function compareLines(before: string, after: string): string[] {
  const counts = new Map<string, number>();
  for (const l of before.split("\n")) counts.set(l.trim(), (counts.get(l.trim()) ?? 0) + 1);
  for (const l of after.split("\n")) counts.set(l.trim(), (counts.get(l.trim()) ?? 0) - 1);
  const removed = [...counts].filter(([, n]) => n > 0).map(([l]) => `- ${l}`);
  const added = [...counts].filter(([, n]) => n < 0).map(([l]) => `+ ${l}`);
  return [...removed, ...added];
}

// A CSV row is one long line, so compare it cell by cell. Rows are matched by their first
// cell and, where two rows share one (two people with the same name), by which of them
// they are.
export function compareCsv(before: string, after: string): string[] {
  const [headA = [], ...rowsA] = parseCsv(before);
  const [headB = [], ...rowsB] = parseCsv(after);
  const result: string[] = [];
  for (const h of headA) if (!headB.includes(h)) result.push(`column removed: ${h}`);
  for (const h of headB) if (!headA.includes(h)) result.push(`column added: ${h}`);
  // The key is the first cell and which occurrence of it the row is, so that a person really
  // named "Maria (2)" is not taken for the second Maria. It is shown with the cell quoted and
  // the occurrence outside the quotes ("Maria" #2), which no cell's own text can look like.
  const keyed = (rows: string[][]) => {
    const seen = new Map<string, number>();
    return new Map(
      rows.map((r) => {
        const n = (seen.get(r[0]) ?? 0) + 1;
        seen.set(r[0], n);
        return [JSON.stringify([r[0], n]), r];
      }),
    );
  };
  const shown = (key: string) => {
    const [first, n] = JSON.parse(key) as [string, number];
    return n === 1 ? JSON.stringify(first) : `${JSON.stringify(first)} #${n}`;
  };
  const a = keyed(rowsA);
  const b = keyed(rowsB);
  for (const key of a.keys()) if (!b.has(key)) result.push(`row removed: ${shown(key)}`);
  for (const key of b.keys()) if (!a.has(key)) result.push(`row added: ${shown(key)}`);
  for (const [k, rowA] of a) {
    const rowB = b.get(k);
    if (!rowB) continue;
    const key = shown(k);
    headA.forEach((h, i) => {
      const j = headB.indexOf(h);
      if (j < 0) return;
      const x = rowA[i] ?? "";
      const y = rowB[j] ?? "";
      if (x !== y) result.push(`${h} of ${key}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`);
    });
  }
  return result;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function formatComparison(c: Comparison, maxFilesPerChange = 3): string {
  const lines: string[] = [];
  for (const f of c.onlyBefore) lines.push(`only before: ${f}`);
  for (const f of c.onlyAfter) lines.push(`only after: ${f}`);
  for (const change of c.changes) {
    const shown = change.files.slice(0, maxFilesPerChange).join(", ");
    const more = change.files.length > maxFilesPerChange ? ", ..." : "";
    lines.push(`${String(change.files.length).padStart(5)}  ${change.description}`);
    lines.push(`       in ${shown}${more}`);
  }
  return lines.join("\n");
}

export function isEmpty(c: Comparison): boolean {
  return c.onlyBefore.length + c.onlyAfter.length + c.changes.length === 0;
}
