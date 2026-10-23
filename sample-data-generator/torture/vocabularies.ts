// The genre, role and access values that lameta offers, read from the repository so the
// generated project keeps up when a list changes.

import * as fs from "fs";
import * as path from "path";

const repo = path.resolve(__dirname, "../..");

export function genres(): Array<{ id: string; label: string }> {
  return JSON.parse(
    fs.readFileSync(path.join(repo, "src/model/Project/Session/genres.json"), "utf8"),
  );
}

export function olacRoles(): string[] {
  const xml = fs.readFileSync(
    path.join(repo, "src/model/Project/AuthorityLists/olac-roles.xml"),
    "utf8",
  );
  return [...xml.matchAll(/<code>([^<]+)<\/code>/g)].map((m) => m[1].trim());
}

// json5 files are JavaScript object literals
function readJson5(file: string): any {
  return new Function(`return (${fs.readFileSync(file, "utf8")});`)();
}

export interface AccessChoice {
  config: string;
  id: string;
  label: string;
}

export function accessChoicesOfEveryConfiguration(): AccessChoice[] {
  const dir = path.join(repo, "archive-configurations");
  const result: AccessChoice[] = [];
  for (const config of fs.readdirSync(dir).sort()) {
    const vocab = path.join(dir, config, "vocabularies.json5");
    if (!fs.existsSync(vocab)) continue;
    for (const a of readJson5(vocab).accessProtocol ?? []) {
      result.push({ config, id: a.id, label: a.label });
    }
  }
  return result;
}
