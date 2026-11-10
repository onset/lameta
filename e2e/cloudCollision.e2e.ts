import { test, expect } from "@playwright/test";
import {
  CloudLameta,
  LametaDriver,
  PeerLameta,
  SessionsDisk,
  arrives,
  ensureProjectGenerated,
  havePeer,
  localDisk,
  logFinding,
  peerDisk,
  servePeerCommands,
} from "./cloudTorture-e2e-helpers";

/*
  Two computers on one cloud-synced project (opt-in). Set LAMETA_CLOUD_DIR as for
  cloudTorture.e2e.ts, plus LAMETA_CLOUD_PEER, LAMETA_CLOUD_PEER_DIR, LAMETA_CLOUD_PEER_REPO
  and, if needed, LAMETA_CLOUD_PEER_PATH (see cloudTorture-e2e-helpers.ts). For example, from
  Windows with a Mac on the same Dropbox account:

     $env:LAMETA_CLOUD_DIR="C:\Users\<you>\Dropbox\lameta-cloud-tests"
     $env:LAMETA_CLOUD_PEER="<mac user>@<mac address>"
     $env:LAMETA_CLOUD_PEER_DIR="/Users/<mac user>/Library/CloudStorage/Dropbox/lameta-cloud-tests"
     $env:LAMETA_CLOUD_PEER_REPO="/Users/<mac user>/<lameta checkout>"
     $env:LAMETA_CLOUD_PEER_PATH="/Users/<mac user>/.volta/bin"
     pnpm exec playwright test cloudCollision

  The other computer runs its lameta through the "peer lameta" test below, started over ssh.

  Every test logs what it saw (grep for CLOUD-FINDING); the assertions are that nothing
  typed into a session that still exists is lost, wherever the service or lameta put it.
*/

const isPeer = process.env.LAMETA_CLOUD_ROLE === "peer";
const settleMs = 120_000;

// The text of every copy of the sessions whose names start with prefix, on both computers.
function bothDisks(prefix: string): string {
  return [...localDisk.texts(prefix), ...peerDisk.texts(prefix)].join("\n").toLowerCase();
}

function logDisks(prefix: string) {
  for (const disk of [localDisk, peerDisk])
    for (const t of disk.texts(prefix)) logFinding(`  on ${disk.name}: ${t.slice(0, 400)}`);
}

test.describe("peer lameta", () => {
  test.skip(!isPeer, "started over ssh by the tests below, on the other computer");
  test.describe.configure({ timeout: 3 * 60 * 60_000 });

  test("peer lameta", async () => {
    const app = await CloudLameta.open();
    await app.goToSessions();
    await servePeerCommands(app);
    await app.quit();
  });
});

const directions: {
  label: string;
  open: () => Promise<LametaDriver>;
  lametaDisk: SessionsDisk;
  filesDisk: SessionsDisk;
}[] = [
  {
    label: "lameta here, files changed on the other computer",
    open: () => CloudLameta.open(),
    lametaDisk: localDisk,
    filesDisk: peerDisk,
  },
  {
    label: "lameta on the other computer, files changed here",
    open: () => PeerLameta.open(),
    lametaDisk: peerDisk,
    filesDisk: localDisk,
  },
];

for (const d of directions) {
  test.describe(`Two computers: ${d.label}`, () => {
    test.skip(isPeer || !havePeer, "opt-in: set the LAMETA_CLOUD_PEER variables");
    test.describe.configure({ timeout: 40 * 60_000 });
    let app: LametaDriver | undefined;
    test.beforeAll(() => {
      // the generator can take minutes, and a hook keeps Playwright's 30 s default otherwise
      test.setTimeout(40 * 60_000);
      ensureProjectGenerated();
    });
    test.afterAll(async () => {
      test.setTimeout(5 * 60_000);
      await app?.quit();
    });

    test("the other computer edits, renames and deletes sessions that lameta has open", async () => {
      app = await d.open();
      const stamp = `one_${Date.now() % 100000}`;
      const [same, mine, theirs, renamed, deleted] = [
        "same",
        "mine",
        "theirs",
        "renamed",
        "deleted",
      ].map((s) => `${stamp}_${s}`);
      for (const id of [same, mine, theirs, renamed, deleted]) await app.newSession(id);
      await app.selectRow(mine); // saves the last one
      await arrives("the new sessions", () => d.filesDisk.exists(deleted));

      // 1. the same session and field, in lameta and in the file, at about the same moment
      await app.selectRow(same);
      d.filesDisk.setTitle(same, "title from the file");
      await app.setField("title", "title from lameta");
      // 2. different sessions
      d.filesDisk.setTitle(theirs, "their title");
      await app.selectRow(mine);
      await app.setField("title", "my title");
      await app.selectRow(same); // saves mine
      await arrives("their title", () =>
        d.lametaDisk.texts(theirs).some((t) => t.includes("their title")),
      );

      // 3. the session that lameta has open is renamed, then edited in lameta
      await app.selectRow(renamed);
      d.filesDisk.rename(renamed, `${renamed}_x`);
      await arrives("the rename", () => d.lametaDisk.exists(`${renamed}_x`));
      await app.setField("title", "typed after their rename");
      logFinding(`after their rename, ${app.name} shows title "${await app.readField("title")}"`);

      // 4. the session that lameta has open is deleted, then edited in lameta
      await app.selectRow(deleted);
      d.filesDisk.remove(deleted);
      await arrives("the delete", () => !d.lametaDisk.exists(deleted));
      await app.setField("title", "typed into a session they deleted");
      logFinding(`after their delete, ${app.name} shows title "${await app.readField("title")}"`);
      await app.selectRow(mine);

      await new Promise((r) => setTimeout(r, settleMs));
      logDisks(stamp);
      await app.report(d.label, stamp);
      const all = bothDisks(stamp);
      // lameta capitalizes the first letter of a title, so compare in lower case
      for (const text of ["title from lameta", "title from the file", "my title", "their title"])
        expect(all, `"${text}" should survive somewhere`).toContain(text);
    });
  });
}

test.describe("Two computers: lameta on both", () => {
  test.skip(isPeer || !havePeer, "opt-in: set the LAMETA_CLOUD_PEER variables");
  // not serial: one failing scenario must not stop the others; after a failure the next
  // scenario opens both lametas again
  test.describe.configure({ timeout: 40 * 60_000 });

  let here: CloudLameta;
  let there: PeerLameta;
  const stamp = `both_${Date.now() % 100000}`;
  const id = (s: string) => `${stamp}_${s}`;
  const both = () => [here, there] as LametaDriver[];
  const settle = () => new Promise((r) => setTimeout(r, settleMs));
  const saveBoth = () => Promise.all(both().map((a) => a.selectRow(id("park"))));

  test.beforeAll(async () => {
    // a hook keeps Playwright's 30 s default unless it sets its own
    test.setTimeout(40 * 60_000);
    ensureProjectGenerated();
    here = await CloudLameta.open();
    // the other lameta reads the project once, when it opens, so make every session first
    for (const s of ["park", "same", "fields", "stale", "rename", "delete"])
      await here.newSession(id(s));
    await here.selectRow(id("park"));
    await arrives("the new sessions", () => peerDisk.exists(id("delete")));
    there = await PeerLameta.open();
  });
  test.afterAll(async () => {
    test.setTimeout(5 * 60_000);
    await there?.quit();
    await here?.quit();
  });

  test("both edit the same field of one session at the same moment", async () => {
    await Promise.all(both().map((a) => a.selectRow(id("same"))));
    await Promise.all([
      here.setField("title", "Windows title"),
      there.setField("title", "Mac title"),
    ]);
    await saveBoth();
    await settle();
    for (const a of both()) {
      await a.selectRow(id("same"));
      logFinding(`same field: ${a.name} shows title "${await a.readField("title")}"`);
    }
    logDisks(id("same"));
    const all = bothDisks(id("same"));
    expect(all).toContain("windows title");
    expect(all).toContain("mac title");
  });

  test("both edit different fields of one session", async () => {
    await Promise.all(both().map((a) => a.selectRow(id("fields"))));
    await Promise.all([
      here.setField("location", "location from Windows"),
      there.setField("title", "title from the Mac"),
    ]);
    await saveBoth();
    await settle();
    for (const a of both()) {
      await a.selectRow(id("fields"));
      logFinding(
        `different fields: ${a.name} shows title "${await a.readField("title")}", location "${await a.readField("location")}"`,
      );
    }
    logDisks(id("fields"));
    const all = bothDisks(id("fields"));
    expect(all).toContain("location from windows");
    expect(all).toContain("title from the mac");
  });

  test("one saves, then the other saves a different field from what it read before", async () => {
    await there.selectRow(id("stale"));
    await there.setField("title", "title saved first on the Mac");
    await there.selectRow(id("park"));
    await arrives("the Mac's title", () =>
      localDisk.texts(id("stale")).some((t) => t.includes("itle saved first on the Mac")),
    );
    await here.selectRow(id("stale"));
    logFinding(`stale: Windows shows title "${await here.readField("title")}" before editing`);
    await here.setField("location", "location saved later on Windows");
    await here.selectRow(id("park"));
    await settle();
    logDisks(id("stale"));
    const all = bothDisks(id("stale"));
    expect(all).toContain("title saved first on the mac");
    expect(all).toContain("location saved later on windows");
  });

  test("one renames a session while the other edits it", async () => {
    await Promise.all(both().map((a) => a.selectRow(id("rename"))));
    // when the Mac's rename reaches this disk, to set against when Windows saves
    const started = Date.now();
    let renameArrived: number | undefined;
    const watch = setInterval(() => {
      if (renameArrived === undefined && localDisk.exists(id("rename_mac")))
        renameArrived = Date.now() - started;
    }, 250);
    await Promise.all([
      there.setField("id", id("rename_mac")),
      here.setField("title", "typed on Windows during their rename"),
    ]);
    logFinding(`rename: after typing, Windows shows title "${await here.readField("title")}"`);
    const savedAt = Date.now() - started;
    await saveBoth();
    logFinding(
      `rename: Windows saved at ${savedAt} ms; the Mac's rename reached Windows at ${renameArrived ?? "not yet"} ms; old folder on Windows then=${localDisk.exists(id("rename"))}`,
    );
    await settle();
    clearInterval(watch);
    logFinding(`rename: the Mac's rename reached Windows at ${renameArrived} ms`);
    await here.selectRow(id("rename")).catch(() => logFinding("rename: old row gone on Windows"));
    logFinding(`rename: Windows now shows title "${await here.readField("title")}"`);
    logDisks(id("rename"));
    await here.report("rename while editing", id("rename"));
    expect(bothDisks(id("rename"))).toContain("typed on windows during their rename");
  });

  test("one deletes a session while the other edits it", async () => {
    await Promise.all(both().map((a) => a.selectRow(id("delete"))));
    await there.deleteSelected("Session");
    await here.setField("title", "typed on Windows into a session the Mac deleted");
    await here.selectRow(id("park"));
    await settle();
    logFinding(
      `delete while editing: folder on Windows=${localDisk.exists(id("delete"))}, on the Mac=${peerDisk.exists(id("delete"))}`,
    );
    logDisks(id("delete"));
    await here.report("delete while editing", id("delete"));
  });

  test("both make a new session at the same moment", async () => {
    await Promise.all([here.newSession(id("new_win")), there.newSession(id("new_mac"))]);
    await saveBoth();
    await settle();
    for (const disk of [localDisk, peerDisk]) {
      logFinding(
        `new sessions on ${disk.name}: win=${disk.exists(id("new_win"))} mac=${disk.exists(id("new_mac"))} leftover New_Session=${disk.texts("New_Session").length}`,
      );
      expect(disk.exists(id("new_win")), `${id("new_win")} on ${disk.name}`).toBe(true);
      expect(disk.exists(id("new_mac")), `${id("new_mac")} on ${disk.name}`).toBe(true);
    }
    logDisks(id("new"));
    for (const a of both()) await a.report(`${a.name}, end`, stamp);
  });
});
