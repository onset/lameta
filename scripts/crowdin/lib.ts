// Shared helpers for the one-time v2→v3 Crowdin sort-out scripts and the
// ongoing backup/report tooling. Run any of these with `yarn tsx scripts/crowdin/<name>.ts`.
// All scripts authenticate with the LAMETA_CROWDIN_TOKEN environment variable.
import * as fs from "fs";
import * as path from "path";
// no bundled types; tsx runs it fine and scripts/ is outside tsconfig
import gettextParser from "gettext-parser";

export const PROJECT_ID = 324607; // "laMeta" (identifier saymorex)
export const V3_BRANCH_ID = 66;
export const V3_BRANCH_NAME = "V3";
export const TM_ID = 118965;
export const GLOSSARY_ID = 107977;
export const API_BASE = "https://api.crowdin.com/api/v2";

// Single source of truth for language identity across Crowdin, the locale/
// folder layout (post-cleanup), and the multilingual CSV column headers.
export interface Lang {
  crowdinId: string; // Crowdin language id
  folder: string; // locale/<folder>/  (matches .linguirc locales)
  csvColumn: string; // column header in genres/roles/accessProtocols.csv
}
export const LANGS: Lang[] = [
  { crowdinId: "es-ES", folder: "es", csvColumn: "es-ES" },
  { crowdinId: "fr", folder: "fr", csvColumn: "fr" },
  { crowdinId: "ru", folder: "ru", csvColumn: "ru" },
  { crowdinId: "zh-CN", folder: "zh-CN", csvColumn: "zh-CN" },
  { crowdinId: "pt-BR", folder: "pt-BR", csvColumn: "pt-BR" },
  { crowdinId: "id", folder: "id", csvColumn: "id" },
  { crowdinId: "fa", folder: "fa", csvColumn: "fa" }
];

function token(): string {
  const t = process.env.LAMETA_CROWDIN_TOKEN;
  if (!t) throw new Error("LAMETA_CROWDIN_TOKEN is not set");
  return t;
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Thin fetch wrapper: JSON in/out, bearer auth, 429/5xx backoff.
export async function api(
  pathAndQuery: string,
  init?: { method?: string; body?: unknown }
): Promise<any> {
  const url = API_BASE + pathAndQuery;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token()}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {})
      },
      body: init?.body ? JSON.stringify(init.body) : undefined
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      const wait = Math.min(2000 * 2 ** attempt, 30000);
      console.warn(`  ${res.status} from ${pathAndQuery}, retrying in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (res.status === 204) return undefined;
    const json = await res.json().catch(() => undefined);
    if (!res.ok) {
      throw new Error(
        `Crowdin API ${init?.method ?? "GET"} ${pathAndQuery} -> ${res.status}: ${JSON.stringify(json)}`
      );
    }
    return json;
  }
}

// GET all pages of a list endpoint; returns the unwrapped `data` items.
export async function apiAll(pathAndQuery: string): Promise<any[]> {
  const sep = pathAndQuery.includes("?") ? "&" : "?";
  const out: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await api(`${pathAndQuery}${sep}limit=500&offset=${offset}`);
    const items = page.data.map((d: any) => d.data);
    out.push(...items);
    if (items.length < 500) return out;
  }
}

export async function downloadToFile(url: string, dest: string): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

// ---- PO helpers (gettext-parser) ----

export interface PoEntry {
  msgctxt: string; // "" when absent
  msgid: string;
  msgstr: string;
}

export function loadPo(filePath: string): any {
  return gettextParser.po.parse(fs.readFileSync(filePath));
}

export function poEntries(parsed: any): PoEntry[] {
  const out: PoEntry[] = [];
  for (const ctx of Object.keys(parsed.translations)) {
    for (const id of Object.keys(parsed.translations[ctx])) {
      if (id === "") continue; // header
      const e = parsed.translations[ctx][id];
      out.push({ msgctxt: ctx, msgid: id, msgstr: (e.msgstr ?? [""]).join("") });
    }
  }
  return out;
}

export function entryKey(msgctxt: string, msgid: string): string {
  return `${msgctxt}${msgid}`;
}

export function countNonEmptyMsgstr(filePath: string): number {
  return poEntries(loadPo(filePath)).filter((e) => e.msgstr.trim() !== "").length;
}

// Walk a directory tree, returning absolute paths of all files.
export function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
