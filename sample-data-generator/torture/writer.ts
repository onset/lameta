// Writes the project and records, for every case, the path, why it is there and the
// lameta code it aims at. The record becomes OtherDocuments/torture-cases.md.

import * as fs from "fs";
import * as path from "path";

export type Tier = "portable" | "hostile" | "large";

export interface CaseRecord {
  path: string;
  why: string;
  targets: string;
  tier: Tier;
}

// Paths in the portable tier must check out on Windows without core.longpaths, from a
// clone at a path of up to about 90 characters.
export const kMaxPortableRelativePath = 170;

// Windows file systems are case-insensitive, and macOS usually is, so the portable
// tier must not hold two names that differ only in case or Unicode normalization.
function collisionKey(rel: string): string {
  return rel.normalize("NFC").toLowerCase();
}

export class ProjectWriter {
  public readonly root: string;
  public readonly records: CaseRecord[] = [];
  private written = new Map<string, string>();
  // a fixed time, so the files are the same on every run
  private static readonly kTime = new Date("2024-06-01T12:00:00Z");

  constructor(
    root: string,
    public tier: Tier = "portable",
  ) {
    this.root = root;
  }

  private check(rel: string) {
    if (this.tier !== "portable") return;
    if (rel !== rel.normalize("NFC"))
      throw new Error(
        `Portable case has a name that is not NFC (macOS git would rename it): ${rel}`,
      );
    if (rel.length > kMaxPortableRelativePath)
      throw new Error(
        `Portable case path is ${rel.length} characters, over ${kMaxPortableRelativePath}: ${rel}`,
      );
    for (const part of rel.split("/")) {
      if (/[. ]$/.test(part)) throw new Error(`Portable case ends in a dot or space: ${rel}`);
      if (/^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(part))
        throw new Error(`Portable case uses a Windows reserved name: ${rel}`);
    }
    const key = collisionKey(rel);
    const other = this.written.get(key);
    if (other !== undefined && other !== rel)
      throw new Error(`Portable cases ${other} and ${rel} differ only in case or normalization`);
    this.written.set(key, rel);
  }

  public abs(rel: string): string {
    return path.join(this.root, ...rel.split("/"));
  }

  // Bun, unlike Node, opens plain Windows paths through Win32 name parsing, which sends
  // "nul" to the null device and strips trailing dots and spaces. A \\?\ path skips that.
  private literal(p: string): string {
    return process.platform === "win32" && !p.startsWith("\\\\?\\") ? `\\\\?\\${p}` : p;
  }

  public file(rel: string, content: string | Buffer) {
    this.check(rel);
    const p = this.literal(this.abs(rel));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
    fs.utimesSync(p, ProjectWriter.kTime, ProjectWriter.kTime);
  }

  public dir(rel: string) {
    this.check(rel);
    fs.mkdirSync(this.literal(this.abs(rel)), { recursive: true });
  }

  public note(rel: string, why: string, targets: string) {
    this.records.push({ path: rel, why, targets, tier: this.tier });
  }
}
