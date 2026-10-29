import fs from "fs";
import * as Path from "path";
import { test, expect } from "@playwright/test";
import {
  CloudLameta,
  cloudDir,
  ensureProjectGenerated,
  logFinding,
  makeOnlineOnly,
  peopleDir,
  sessionsDir,
  walk,
  localDisk,
} from "./cloudTorture-e2e-helpers";

/*
  Tries to break lameta's cloud sync against a real sync client on one computer (opt-in).

  LAMETA_CLOUD_DIR names a test folder inside a sync root (OneDrive, Dropbox, iCloud Drive,
  Google Drive). The suite generates the torture project there, with its large media, the
  first time it runs, then opens it with lameta while the service syncs.

     $env:LAMETA_CLOUD_DIR="C:\OneDrive-tests\OneDrive\lameta\cloud-torture"
     pnpm exec playwright test cloudTorture

  LAMETA_CLOUD_SLOW=1 holds lameta to one CPU core (Windows) or to background priority
  (macOS), to stand in for a slow computer.

  Here, changes "from another computer" are made by writing to the sync folder directly: that
  is what the sync client does when it applies them. cloudCollision.e2e.ts makes them on a
  second computer for real.

  Every test logs what it saw (grep for CLOUD-FINDING); assertions pin only what must hold.
*/

let app: CloudLameta | undefined;

test.describe("Cloud sync torture (real sync client)", () => {
  test.skip(!cloudDir, "opt-in: set LAMETA_CLOUD_DIR to a folder in a sync root");
  test.setTimeout(20 * 60_000);

  test.beforeAll(() => {
    // the generator can take minutes, and a hook keeps Playwright's 30 s default otherwise
    test.setTimeout(40 * 60_000);
    ensureProjectGenerated();
  });
  test.afterEach(async () => {
    await app?.quit();
    app = undefined;
  });

  test("opens the project after the service made it online-only", async () => {
    const all = walk(Path.dirname(sessionsDir())).length;
    const offline = makeOnlineOnly(Path.dirname(sessionsDir()));
    logFinding(`online-only before opening: ${offline} of ${all} files`);

    app = await CloudLameta.open();
    const page = app.page;
    await app.project.goToSessions();
    await app.selectRow("BIG_media");
    await expect(page.getByTestId("field-id-edit")).toHaveText("BIG_media", { timeout: 60_000 });
    const video = page.getByRole("gridcell", { name: "BIG_video_1GB_20241201.mp4" });
    await expect(video).toBeVisible({ timeout: 60_000 });
    await video.click();
    await page.waitForTimeout(5000);
    await app.report("open online-only project");
    expect(app.errors.filter((e) => e.startsWith("pageerror"))).toEqual([]);
  });

  test("renames a session while its large media is still downloading", async () => {
    const oldDir = Path.join(sessionsDir(), "BIG_media");
    test.skip(!fs.existsSync(oldDir), "BIG_media was renamed by an earlier run");
    makeOnlineOnly(oldDir);
    app = await CloudLameta.open();
    const page = app.page;
    await app.project.goToSessions();
    await app.selectRow("BIG_media");
    // ask for the video, which starts the download, then rename at once
    await page.getByRole("gridcell", { name: "BIG_video_1GB_20241201.mp4" }).click();
    const download = page.getByRole("button", { name: /Download|keep on this device/i });
    if (await download.isVisible().catch(() => false)) await download.click();
    await page.getByRole("gridcell", { name: "BIG_media.session" }).click();
    const newId = `BIG_media_renamed_${Date.now() % 100000}`;
    await app.setSessionId(newId);

    // each file rename and the folder rename get their own 9.5 s retry budget
    const newDir = Path.join(sessionsDir(), newId);
    const settled = async () => fs.existsSync(newDir) || (await app!.toasts()).length > 0;
    await expect.poll(settled, { timeout: 120_000 }).toBe(true);
    await page.waitForTimeout(3000);
    logFinding(`after rename mid-download: id field shows "${await app.readField("id")}"`);
    const oldLeft = fs.existsSync(oldDir) ? fs.readdirSync(oldDir) : null;
    const newHas = fs.existsSync(newDir) ? fs.readdirSync(newDir) : null;
    logFinding(`after rename mid-download: old folder holds ${JSON.stringify(oldLeft)}`);
    logFinding(`after rename mid-download: new folder holds ${JSON.stringify(newHas)}`);
    await app.report("rename mid-download");
    // the session is either wholly renamed or wholly not; never split across two folders
    expect(oldLeft === null || newHas === null).toBe(true);
  });

  test("quick creates, renames and deletes of sessions and people", async () => {
    app = await CloudLameta.open();
    const stamp = Date.now() % 100000;
    const kept: string[] = [];
    await app.project.goToSessions();
    for (let i = 0; i < 12; i++) {
      await app.project.addSession();
      const id = `churn_${stamp}_${i}`;
      await app.setSessionId(id);
      if (i % 3 === 1) {
        await app.setSessionId(`${id}_r`);
        kept.push(`${id}_r`);
      } else if (i % 3 === 2) {
        await app.deleteSelected("Session");
      } else kept.push(id);
    }
    const people: string[] = [];
    await app.project.goToPeople();
    for (let i = 0; i < 6; i++) {
      await app.project.addPerson(`Churn ${stamp} ${i}`);
      if (i % 2 === 1) await app.deleteSelected("People");
      else people.push(`Churn_${stamp}_${i}`);
    }
    await app.project.goToSessions();
    // long enough for a service to bring back a folder that it did not let go of
    await app.page.waitForTimeout(60_000);

    const onDisk = fs.readdirSync(sessionsDir()).filter((d) => d.startsWith(`churn_${stamp}`));
    logFinding(`churn sessions expected ${JSON.stringify(kept.sort())}`);
    logFinding(`churn sessions on disk  ${JSON.stringify(onDisk.sort())}`);
    const peopleOnDisk = fs.readdirSync(peopleDir()).filter((d) => d.startsWith(`Churn_${stamp}`));
    logFinding(
      `churn people expected ${JSON.stringify(people.sort())} on disk ${JSON.stringify(peopleOnDisk.sort())}`,
    );
    for (const id of kept) {
      const f = Path.join(sessionsDir(), id, `${id}.session`);
      expect(fs.existsSync(f), `${f} should exist`).toBe(true);
    }
    await app.report("churn", `churn_${stamp}`);
    expect(onDisk.sort()).toEqual(kept.sort());
    expect(peopleOnDisk.sort()).toEqual(people.sort());
  });

  test("opens a project holding the conflict copies that each service makes", async () => {
    const stamp = Date.now() % 100000;
    const id = `conflict_${stamp}`;
    const dir = Path.join(sessionsDir(), id);
    fs.mkdirSync(dir, { recursive: true });
    const xml = (title: string) =>
      `<?xml version="1.0" encoding="utf-8"?>\n<Session><id>${id}</id><title>${title}</title></Session>`;
    fs.writeFileSync(Path.join(dir, `${id}.session`), xml("canonical"));
    // OneDrive, Dropbox, Google Drive, Syncthing
    fs.writeFileSync(Path.join(dir, `${id}-MACBOOK.session`), xml("onedrive copy"));
    fs.writeFileSync(
      Path.join(dir, `${id} (John Hatton's conflicted copy 2026-10-23).session`),
      xml("dropbox copy"),
    );
    fs.writeFileSync(Path.join(dir, `${id} (1).session`), xml("gdrive copy"));
    fs.writeFileSync(
      Path.join(dir, `${id}.sync-conflict-20261023-101010-ABCDEFG.session`),
      xml("syncthing copy"),
    );
    // a conflicted copy of a whole session folder
    const dirCopy = Path.join(sessionsDir(), `${id} (John Hatton's conflicted copy 2026-10-23)`);
    fs.mkdirSync(dirCopy, { recursive: true });
    fs.writeFileSync(Path.join(dirCopy, `${id}.session`), xml("folder copy"));

    app = await CloudLameta.open();
    await app.project.goToSessions();
    const rows = await app.page.getByRole("gridcell", { name: id, exact: true }).count();
    logFinding(`sessions listed with id ${id}: ${rows}`);
    await app.selectRow(id);
    await app.page.waitForTimeout(3000);
    logFinding(`conflict session shows title "${await app.readField("title")}"`);
    await app.report("conflict copies");
    expect(app.errors.filter((e) => e.startsWith("pageerror"))).toEqual([]);
  });

  test("another program renames, then deletes, the session that is open here", async () => {
    app = await CloudLameta.open();
    const stamp = Date.now() % 100000;
    const id = `remote_${stamp}`;
    await app.newSession(id);
    await app.newSession(`${id}_park`);
    await app.selectRow(id);
    await app.page.waitForTimeout(3000);

    localDisk.rename(id, `${id}_theirs`);
    await app.setField("location", "typed here after the remote rename");
    await app.selectRow(`${id}_park`);
    await app.page.waitForTimeout(3000);
    const resurrected = localDisk.exists(id);
    const lostEdit = !localDisk
      .texts(id)
      .some((t) => t.includes("typed here after the remote rename"));
    logFinding(`remote rename: old folder recreated=${resurrected}, local edit lost=${lostEdit}`);

    // the parking session vanishes while it is selected here
    localDisk.remove(`${id}_park`);
    await app.setField("location", "typed into a deleted session");
    await app.project.addSession();
    const freshRenders = await app.page
      .getByTestId("field-id-edit")
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    logFinding(`remote delete: a new session still renders=${freshRenders}`);
    await app.report("remote rename/delete");
    expect(freshRenders).toBe(true);
  });
});
