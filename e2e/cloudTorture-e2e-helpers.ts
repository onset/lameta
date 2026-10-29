import fs from "fs";
import * as Path from "path";
import { ChildProcess, spawn, spawnSync } from "child_process";
import { Page, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { E2eProject } from "./various-e2e-helpers";

/*
  Shared by cloudTorture.e2e.ts and cloudCollision.e2e.ts, which run lameta against a real
  sync client. LAMETA_CLOUD_DIR names a test folder inside a sync root (OneDrive, Dropbox,
  iCloud Drive, Google Drive); the torture project lives in it as TortureCloud.
*/

export const cloudDir = process.env.LAMETA_CLOUD_DIR;
export const projectName = "TortureCloud";
const slow = !!process.env.LAMETA_CLOUD_SLOW;

export const projectDir = () => Path.join(cloudDir!, projectName);
export const sessionsDir = () => Path.join(projectDir(), "Sessions");
export const peopleDir = () => Path.join(projectDir(), "People");

export function logFinding(msg: string) {
  console.log(`CLOUD-FINDING: ${new Date().toISOString().slice(11, 19)} ${msg}`);
}

export const seconds = (since: number) => Math.round((Date.now() - since) / 1000);

// The generator writes this document last, so a project without it is one that the
// generator did not finish.
const casesDocument = () => Path.join(projectDir(), "OtherDocuments", "torture-cases.md");

export function ensureProjectGenerated() {
  fs.mkdirSync(cloudDir!, { recursive: true });
  if (fs.existsSync(casesDocument())) return;
  if (fs.existsSync(projectDir()) && fs.readdirSync(projectDir()).length > 0)
    throw new Error(
      `${projectDir()} holds a project that the torture generator did not finish. Delete it and run again.`,
    );
  // no shell, so that a path with spaces stays one argument
  const r = spawnSync(
    process.execPath,
    [
      Path.join("node_modules", "tsx", "dist", "cli.mjs"),
      "sample-data-generator/torture/generate-torture-project.ts",
      projectDir(),
      "--large-media",
    ],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error("the torture generator failed");
}

export function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = Path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Makes files online-only. Returns how many of them the service now reports as online-only.
export function makeOnlineOnly(dir: string): number {
  if (process.platform === "win32") {
    spawnSync("attrib", ["+U", "-P", Path.join(dir, "*"), "/S", "/D"], { shell: true });
    // OneDrive frees up the files on its own schedule, and can take a while to start; wait
    // until it has started and then stopped, up to ten minutes
    const started = Date.now();
    let count = countOnlineOnly(dir);
    for (
      let previous = -1;
      (count === 0 || count > previous) && Date.now() - started < 10 * 60_000;
    ) {
      previous = count;
      spawnSync("powershell", ["-NoProfile", "-Command", "Start-Sleep 30"]);
      count = countOnlineOnly(dir);
    }
    logFinding(`online-only settled at ${count} after ${seconds(started)}s`);
    return count;
  }
  // macOS: iCloud Drive evicts with brctl; the FileProvider services with fileproviderctl.
  // One process per file, so run eight at a time and skip what is already online-only.
  const started = Date.now();
  const files = walk(dir);
  const dataless = datalessFlags(files);
  const local = files.filter((_, i) => !dataless[i]);
  spawnSync(
    "xargs",
    [
      "-0",
      "-P",
      "8",
      "-n",
      "1",
      "sh",
      "-c",
      'brctl evict "$0" 2>/dev/null || fileproviderctl evict "$0"',
    ],
    { input: local.join("\0") },
  );
  logFinding(`evicted ${local.length} files in ${seconds(started)}s`);
  return countOnlineOnly(dir);
}

const SF_DATALESS = 0x40000000;

// macOS marks an online-only file SF_DATALESS
function datalessFlags(files: string[]): boolean[] {
  const out = spawnSync("stat", ["-f", "%f", ...files], { encoding: "utf8" }).stdout;
  return out
    .split("\n")
    .filter((l) => l)
    .map((l) => (Number(l) & SF_DATALESS) !== 0);
}

export function countOnlineOnly(dir: string): number {
  if (process.platform === "darwin") return datalessFlags(walk(dir)).filter((d) => d).length;
  const fswin = require("fswin");
  return walk(dir).filter((f) => {
    const a = fswin.getAttributesSync(f);
    return a && (a.IS_OFFLINE || a.IS_RECALL_ON_DATA_ACCESS);
  }).length;
}

function slowDown(pid: number) {
  if (process.platform === "win32") {
    const script = `
      function Kids($p) { Get-CimInstance Win32_Process -Filter "ParentProcessId=$p" | % { $_.ProcessId; Kids $_.ProcessId } }
      @(${pid}) + @(Kids ${pid}) | % { try { (Get-Process -Id $_).ProcessorAffinity = 1; "$_ affinity=1" } catch { "$_ failed" } }`;
    const r = spawnSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" });
    logFinding(`slow mode, pid ${pid}: ${r.stdout.replace(/\s+/g, " ")} ${r.stderr ?? ""}`);
  } else {
    const r = spawnSync("taskpolicy", ["-b", "-p", String(pid)], { encoding: "utf8" });
    logFinding(`slow mode, pid ${pid}: taskpolicy exit ${r.status} ${r.stderr ?? ""}`);
  }
}

// The text of every .session file in the session folders whose names start with prefix,
// including the copies a service or lameta set aside, as "folder/file: content".
export function sessionTexts(prefix: string): string[] {
  return fs
    .readdirSync(sessionsDir())
    .filter((d) => d.startsWith(prefix))
    .flatMap((d) =>
      fs
        .readdirSync(Path.join(sessionsDir(), d))
        .filter((f) => f.includes(".session"))
        .map((f) => `${d}/${f}: ${readOrMissing(Path.join(sessionsDir(), d, f))}`),
    );
}

function readOrMissing(path: string): string {
  try {
    return fs.readFileSync(path, "utf8").replace(/\s+/g, " ");
  } catch (e) {
    return `(unreadable: ${(e as Error).message})`;
  }
}

// Polls until the service has carried a change across. The service replaces a file it brings
// down, so a check can find it missing for a moment.
export async function arrives(what: string, check: () => boolean, timeout = 300_000) {
  const started = Date.now();
  const tolerant = () => {
    try {
      return check();
    } catch {
      return false;
    }
  };
  await expect.poll(tolerant, { timeout, intervals: [2000] }).toBe(true);
  logFinding(`${what} arrived after ${seconds(started)}s`);
}

/** One running lameta with the torture project open, and a record of what it did. */
export class CloudLameta implements LametaDriver {
  public name = process.platform === "win32" ? "lameta on Windows" : "lameta on this Mac";
  public errors: string[] = [];
  // every write and rename lameta makes, with the time, to tell its changes from the service's
  public writes: string[] = [];
  private constructor(
    public runner: LametaE2ERunner,
    public page: Page,
    public project: E2eProject,
  ) {}

  public static async open(): Promise<CloudLameta> {
    const runner = new LametaE2ERunner();
    const page = await runner.launch({
      extraArgs: [Path.join(projectDir(), `${projectName}.sprj`)],
    });
    const project = new E2eProject(runner);
    project.projectDirectory = projectDir();
    const app = new CloudLameta(runner, page, project);
    page.on("console", (m) => {
      if (m.type() === "error") app.errors.push(m.text());
      if (m.text().startsWith("CLOUD-WRITE ")) app.writes.push(m.text().slice(12));
    });
    page.on("pageerror", (e) => app.errors.push(`pageerror: ${e.message}`));
    if (slow) slowDown(runner.electronApp.process().pid!);
    await app.recordToasts();
    await app.recordWrites();
    const started = Date.now();
    const opened = page
      .getByTestId("project-tab")
      .waitFor({ state: "attached", timeout: 15 * 60_000 });
    await app.watchLoading(opened, started);
    await opened;
    logFinding(`project opened in ${seconds(started)}s`);
    // An online-only project opens slowly, so the registration dialog can arrive after the
    // workspace does; keep closing it until no modal is left.
    await runner.cancelRegistration();
    const modal = page.locator(".ReactModal__Overlay");
    for (let i = 0; i < 5 && (await modal.count()) > 0; i++) {
      await page
        .getByTestId("cancel")
        .click({ timeout: 5000 })
        .catch(() => {});
      await page.waitForTimeout(1000);
    }
    return app;
  }

  public async quit() {
    await this.runner.quit();
  }

  // What the user sees while the project opens: the loading dialog's text every 15 s, and a
  // screenshot of it each time, in test-results/cloud-loading.
  private async watchLoading(opened: Promise<unknown>, started: number) {
    let done = false;
    opened.then(
      () => (done = true),
      () => (done = true),
    );
    const dir = Path.join("test-results", "cloud-loading");
    fs.mkdirSync(dir, { recursive: true });
    while (!done) {
      // LoadingProjectDialog has no dialog role; find it by its message, and read its row
      const dialog = this.page
        .getByText(/Getting project information|Loading (Sessions|People)/)
        .first()
        .locator("xpath=..");
      const text = await dialog
        .innerText({ timeout: 1000 })
        .then((t) => t.replace(/\s+/g, " ").trim())
        .catch(() => "(no dialog)");
      logFinding(`opening, ${seconds(started)}s: ${text.slice(0, 200)}`);
      await this.page
        .screenshot({ path: Path.join(dir, `loading-${seconds(started)}s.png`) })
        .catch(() => {});
      await Promise.race([opened.catch(() => {}), this.page.waitForTimeout(15_000)]);
    }
  }

  public async goToSessions() {
    await this.project.goToSessions();
  }

  public async selectRow(name: string) {
    await this.page.getByRole("gridcell", { name, exact: true }).first().click();
  }

  /** Types into a session or person field by its name, e.g. "title", "location", "id". */
  public async setField(name: string, value: string) {
    const field = this.page.getByTestId(`field-${name}-edit`);
    await field.waitFor({ state: "visible" });
    await field.click();
    await field.fill(value);
    await this.page.keyboard.press("Tab");
  }

  public async readField(name: string): Promise<string> {
    return await this.page
      .getByTestId(`field-${name}-edit`)
      .innerText({ timeout: 10_000 })
      .catch((e) => `(not shown: ${(e as Error).message.split("\n")[0]})`);
  }

  public async setSessionId(id: string) {
    await this.setField("id", id);
  }

  public async newSession(id: string) {
    await this.goToSessions();
    await this.project.addSession();
    await this.setSessionId(id);
  }

  public async deleteSelected(kind: "Session" | "People") {
    await this.runner.clickMenu(
      kind,
      kind === "Session" ? "Delete Session..." : "Delete Person...",
    );
    await this.page.locator("#deleteButton").click();
    await this.page.locator("#deleteButton").waitFor({ state: "detached", timeout: 30_000 });
  }

  public async toasts(): Promise<string[]> {
    return await this.page.evaluate(() => (window as any).__cloudTortureToasts ?? []);
  }

  public async report(label: string, writesMatching?: string) {
    logFinding(`${label}: ${this.errors.length} renderer errors`);
    for (const e of this.errors.slice(0, 15)) logFinding(`  ${e.split("\n")[0].slice(0, 300)}`);
    const toasts = await this.toasts();
    logFinding(`${label}: ${toasts.length} toasts`);
    for (const t of toasts) logFinding(`  toast: ${t.replace(/\s+/g, " ").slice(0, 300)}`);
    if (writesMatching)
      for (const w of this.writes.filter((w) => w.toLowerCase().includes(writesMatching)))
        logFinding(`  lameta wrote: ${w.slice(0, 260)}`);
  }

  // Toasts vanish after a few seconds, so record each one as it appears.
  private async recordToasts() {
    await this.page.evaluate(() => {
      const seen: string[] = ((window as any).__cloudTortureToasts = []);
      new MutationObserver((mutations) => {
        for (const m of mutations)
          m.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement && n.classList.contains("Toastify__toast"))
              seen.push(n.innerText);
          });
      }).observe(document.body, { childList: true, subtree: true });
    });
  }

  private async recordWrites() {
    await this.page.evaluate(() => {
      const fs = (window as any).require("fs");
      for (const name of [
        "writeFileSync",
        "renameSync",
        "copyFileSync",
        "unlinkSync",
        "mkdirSync",
        "rmSync",
        "rmdirSync",
      ]) {
        const original = fs[name];
        fs[name] = function (...args: unknown[]) {
          console.log(
            `CLOUD-WRITE ${new Date().toISOString()} ${name} ${args.slice(0, 2).join(" -> ")}`,
          );
          return original.apply(this, args);
        };
      }
    });
  }
}

/*
  Two computers on one project. The other computer is reached over ssh: LAMETA_CLOUD_PEER is
  the ssh target (user@host, macOS or Linux) that syncs the same account,
  LAMETA_CLOUD_PEER_DIR is the same test folder as that computer sees it,
  LAMETA_CLOUD_PEER_REPO is a lameta checkout there with this branch built, and
  LAMETA_CLOUD_PEER_PATH (optional) is put in front of PATH there, to find node and pnpm.
*/
export const peer = process.env.LAMETA_CLOUD_PEER;
const peerDir = process.env.LAMETA_CLOUD_PEER_DIR;
const peerRepo = process.env.LAMETA_CLOUD_PEER_REPO;
const peerPath = process.env.LAMETA_CLOUD_PEER_PATH;
export const havePeer = !!(cloudDir && peer && peerDir);

export function onPeer(command: string): string {
  const r = spawnSync("ssh", ["-o", "BatchMode=yes", peer!, command], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`on the other computer: ${command}\n${r.stderr}`);
  return r.stdout.trim();
}

const quote = (s: string) => "'" + s.split("'").join("'\\''") + "'";

/** Session folders on one computer's disk, changed the way a user or another program would. */
export interface SessionsDisk {
  name: string;
  setTitle(id: string, title: string): void;
  rename(id: string, newId: string): void;
  remove(id: string): void;
  exists(id: string): boolean;
  // the text of every .session file in folders whose names start with prefix
  texts(prefix: string): string[];
}

// Replaces the session's title element, whatever its case, with the <title> that lameta writes
function insertTitle(xml: string, id: string, title: string): string {
  const withoutOld = xml.replace(/\s*<title\b[^>]*>[^<]*<\/title>/gi, "");
  return withoutOld.replace(
    `<id type="string">${id}</id>`,
    `<id type="string">${id}</id>\n  <title type="string">${title}</title>`,
  );
}

export const localDisk: SessionsDisk = {
  name: process.platform === "win32" ? "Windows" : "this Mac",
  setTitle(id, title) {
    const f = Path.join(sessionsDir(), id, `${id}.session`);
    fs.writeFileSync(f, insertTitle(fs.readFileSync(f, "utf8"), id, title));
  },
  rename(id, newId) {
    fs.renameSync(Path.join(sessionsDir(), id), Path.join(sessionsDir(), newId));
    fs.renameSync(
      Path.join(sessionsDir(), newId, `${id}.session`),
      Path.join(sessionsDir(), newId, `${newId}.session`),
    );
  },
  remove(id) {
    fs.rmSync(Path.join(sessionsDir(), id), { recursive: true, force: true });
  },
  exists(id) {
    return fs.existsSync(Path.join(sessionsDir(), id));
  },
  texts: sessionTexts,
};

const peerSessions = () => `${peerDir}/${projectName}/Sessions`;
const inPeerSessions = (command: string) => onPeer(`cd ${quote(peerSessions())} && ${command}`);

export const peerDisk: SessionsDisk = {
  name: "the other computer",
  setTitle(id, title) {
    const f = `${id}/${id}.session`;
    const xml = inPeerSessions(`cat ${quote(f)}`);
    const b64 = Buffer.from(insertTitle(xml, id, title)).toString("base64");
    inPeerSessions(`echo ${b64} | base64 -d > ${quote(f)}`);
  },
  rename(id, newId) {
    inPeerSessions(
      `mv ${quote(id)} ${quote(newId)} && mv ${quote(`${newId}/${id}.session`)} ${quote(`${newId}/${newId}.session`)}`,
    );
  },
  remove(id) {
    inPeerSessions(`rm -rf ${quote(id)}`);
  },
  exists(id) {
    return inPeerSessions(`test -e ${quote(id)} && echo yes || echo no`) === "yes";
  },
  texts(prefix) {
    const script = `for f in ${quote(prefix)}*/*.session*; do [ -e "$f" ] && printf '%s: ' "$f" && tr -s '[:space:]' ' ' < "$f" && echo; done; true`;
    return inPeerSessions(script)
      .split("\n")
      .filter((l) => l);
  },
};

/** What a test can do with a lameta, whichever computer it runs on. */
export interface LametaDriver {
  name: string;
  goToSessions(): Promise<void>;
  selectRow(name: string): Promise<void>;
  setField(name: string, value: string): Promise<void>;
  readField(name: string): Promise<string>;
  newSession(id: string): Promise<void>;
  deleteSelected(kind: "Session" | "People"): Promise<void>;
  report(label: string, writesMatching?: string): Promise<void>;
  quit(): Promise<void>;
}

const peerBox = "/tmp/lameta-cloud-peer";

/**
 * A lameta on the other computer. Its own Playwright run (the "peer lameta" test in
 * cloudCollision.e2e.ts) opens the project there, carries out each command that this one
 * appends to a file there, and appends each result to another file.
 */
export class PeerLameta implements LametaDriver {
  public name = "lameta on the other computer";
  private sent = 0;
  private run?: ChildProcess;

  public static async open(): Promise<PeerLameta> {
    const p = new PeerLameta();
    onPeer(`rm -rf ${peerBox} && mkdir -p ${peerBox} && touch ${peerBox}/inbox ${peerBox}/outbox`);
    const env = [
      `LAMETA_CLOUD_DIR=${quote(peerDir!)}`,
      "LAMETA_CLOUD_ROLE=peer",
      process.env.LAMETA_CLOUD_SLOW ? "LAMETA_CLOUD_SLOW=1" : "",
    ].join(" ");
    const pathPrefix = peerPath ? `export PATH=${quote(peerPath)}:$PATH; ` : "";
    p.run = spawn("ssh", [
      "-o",
      "BatchMode=yes",
      peer!,
      `${pathPrefix}cd ${quote(peerRepo!)} && ${env} pnpm exec playwright test cloudCollision -g "peer lameta" --reporter=line`,
    ]);
    p.run.stdout!.on("data", (d: Buffer) => {
      for (const line of d.toString().split("\n"))
        if (line.includes("CLOUD-FINDING")) console.log(`[other computer] ${line.trim()}`);
    });
    await p.result(0, 20 * 60_000);
    return p;
  }

  public goToSessions() {
    return this.call("goToSessions");
  }
  public selectRow(name: string) {
    return this.call("selectRow", name);
  }
  public setField(name: string, value: string) {
    return this.call("setField", name, value);
  }
  public readField(name: string) {
    return this.call("readField", name);
  }
  public newSession(id: string) {
    return this.call("newSession", id);
  }
  public deleteSelected(kind: "Session" | "People") {
    return this.call("deleteSelected", kind);
  }
  public report(label: string, writesMatching?: string) {
    return this.call("report", label, writesMatching);
  }
  public async quit() {
    await this.call("quit").catch(() => {});
    this.run?.kill();
  }

  private async call(op: string, ...args: unknown[]): Promise<any> {
    const n = ++this.sent;
    onPeer(`echo ${quote(JSON.stringify({ n, op, args }))} >> ${peerBox}/inbox`);
    return await this.result(n, 5 * 60_000);
  }

  // Waits for the peer's answer to command n; answer 0 says that it is ready.
  private async result(n: number, timeout: number): Promise<any> {
    let answer: { n: number; ok: boolean; value?: unknown; error?: string } | undefined;
    const answered = () => {
      answer = onPeer(`cat ${peerBox}/outbox`)
        .split("\n")
        .filter((l) => l)
        .map((l) => JSON.parse(l))
        .find((a) => a.n === n);
      return !!answer;
    };
    await expect.poll(answered, { timeout, intervals: [500] }).toBe(true);
    if (!answer!.ok) throw new Error(`lameta on the other computer: ${answer!.error}`);
    return answer!.value;
  }
}

/** The other computer's side of PeerLameta: carries out commands until told to quit. */
export async function servePeerCommands(app: CloudLameta) {
  const inbox = `${peerBox}/inbox`;
  const answer = (a: object) => fs.appendFileSync(`${peerBox}/outbox`, JSON.stringify(a) + "\n");
  answer({ n: 0, ok: true });
  let done = 0;
  // give up after 30 minutes with no command
  for (let idle = 0; idle < 30 * 60 * 5; idle++) {
    const commands = fs
      .readFileSync(inbox, "utf8")
      .split("\n")
      .filter((l) => l)
      .map((l) => JSON.parse(l))
      .filter((c) => c.n > done);
    for (const c of commands) {
      done = c.n;
      idle = 0;
      if (c.op === "quit") {
        answer({ n: c.n, ok: true });
        return;
      }
      try {
        answer({ n: c.n, ok: true, value: await (app as any)[c.op](...c.args) });
      } catch (e) {
        answer({ n: c.n, ok: false, error: (e as Error).message.split("\n")[0] });
      }
    }
    await app.page.waitForTimeout(200);
  }
}
