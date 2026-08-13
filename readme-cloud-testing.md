# Manual test plan: cloud sync (macOS + Windows)

How to gain confidence in lameta's cloud-sync support, with emphasis on boundary
conditions that could lose data or crash the app at startup. Written for a human
tester on macOS 12.3+ (FileProvider era); a Windows regression pass is at the end.

Implementation background that shapes these tests:

- lameta detects cloud placeholders by **dataless stat** (`size > 0, blocks == 0`)
  but only for paths under a known **sync root**: `~/Library/CloudStorage/*`
  (OneDrive, Dropbox, Google Drive, Box), home-folder symlinks into it
  (`~/OneDrive`), iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs`),
  and — when Desktop & Documents sync is on — `~/Desktop` and `~/Documents`.
- "Download" on macOS is a **one-shot fetch** (there is no durable pin like
  Windows' "Always keep on this device"); the provider may re-evict files later.
- At project load, lameta reads every `.sprj` / `.session` / `.person` / `.meta`
  file synchronously; evicted ones hydrate on demand during that read. A failed
  hydration should trip a **circuit breaker**: one "couldn't reach {provider}"
  banner with Retry — never a storm of error dialogs, never an aborted load.
- Auto-fetch: selecting a cloud-only file smaller than the threshold
  (**default 10 MB**, File menu) downloads it after a ~1.5 s dwell. Skipped while
  offline.
- Offline detection uses the OS "network up" signal (`navigator.onLine`).

## Tester's toolbox

| Action | How |
|---|---|
| Evict an iCloud file (make it cloud-only) | `brctl evict <file>` in Terminal, or Finder → right-click → Remove Download |
| Evict a OneDrive/Dropbox/GDrive file | Finder → right-click → Remove Download, or `fileproviderctl evict <file>` |
| Check whether a file is really dataless | `stat -f "blocks=%b size=%z" <file>` → dataless = `blocks=0` with `size>0` |
| Force download outside lameta | open the file in Finder, or `brctl download <file>` (iCloud) |
| Go offline | Wi-Fi off in menu bar (see also the "LAN but no internet" case below) |
| Pause OneDrive without going offline | OneDrive menu-bar icon → Pause syncing |
| Watch lameta's logs | run a dev build (`yarn dev`) and watch the terminal, or Console.app filtered to lameta |

Use a **throwaway copy** of a real project for anything in the data-loss section.
Keep a pristine zip of it outside any cloud folder so you can diff afterwards
(`diff -r pristine/ tested/` ignoring media).

---

## 1. Smoke test, per provider

Run this list once per provider you care about — at minimum **OneDrive** and
**iCloud Drive** (they use different plumbing), ideally also Dropbox and Google
Drive (untested by the developers so far):

- [ ] Put a project in the provider's folder, let it sync, evict all media.
- [ ] Open the project: evicted files show a **blue cloud icon** and grey name;
      local files show no icon.
- [ ] Select an evicted file > 10 MB: the "{Provider} Status" card appears with
      the provider's real name in the title, and a green **Download this file to
      my computer** button. It must NOT download by itself.
- [ ] Click Download: card shows "Waiting" + spinner, row icon becomes sync
      arrows; when the download finishes, the preview (player/image/text)
      appears by itself — no reselect needed.
- [ ] Select an evicted file < 10 MB and just wait ~2 s: it downloads by itself
      (auto-fetch) and the preview appears.
- [ ] "Stop waiting" during a large download returns the card to the Download
      state (the provider may quietly finish the download anyway — that's fine).
- [ ] "Show in Finder" opens the enclosing folder.
- [ ] Open the same project through the other path spelling where applicable:
      `~/OneDrive/...` (symlink) vs `~/Library/CloudStorage/OneDrive-.../...`.
      Both must behave identically.
- [ ] iCloud only: put the project in `~/Documents` (with Desktop & Documents
      sync on) rather than in iCloud Drive proper; icons and card must still
      appear and say "iCloud Drive".

## 2. Startup / project-load boundaries (crash hunting)

These are the highest-value crash tests. After each, the bar is: **lameta opens,
shows what it can, and shows at most one banner** — no crash, no dialog storm,
no half-written files.

- [ ] **Everything evicted, online.** Evict the entire project folder including
      the `.sprj` itself (Finder → Remove Download on the folder). Open lameta.
      Expect: project loads with all metadata intact. lameta prefetches all
      evicted metadata files in parallel (watch for the
      `[cloudMetadataPrefetch] Prefetching N…` log line), so the load should
      take roughly as long as the slowest single file, not minutes — but the UI
      still freezes without feedback for that duration. Note how bad it feels;
      a progress indicator may still be warranted.
- [ ] **Everything evicted, offline.** Same starting point, Wi-Fi off, open
      lameta. Expect: single "couldn't reach {provider}" banner with Retry; rows
      show a cloud-unavailable look; NO crash; NO storm of provider error
      dialogs. Turn Wi-Fi on, press Retry: everything loads.
- [ ] **Metadata evicted, media local** and the reverse. Both should load fine.
- [ ] **Wi-Fi dies mid-load.** Start opening a fully-evicted project online,
      turn Wi-Fi off while sessions are still appearing. Expect: banner for the
      remainder, already-loaded sessions fine, Retry finishes the job later.
- [ ] **Provider app not running.** Quit OneDrive completely (menu bar icon →
      Quit), then open a project inside the OneDrive folder with evicted files.
      Expect: files may read as unavailable and stat calls can take a long time
      (macOS gives "Operation timed out" after ~1 min per access when the
      provider extension is dead) — lameta must survive it, however slowly, and
      recover after OneDrive restarts. This is a known rough edge: note the hang
      duration.
- [ ] **Provider signed out / mid-setup.** Sign out of OneDrive (or test right
      after first sign-in while it's still indexing) and open the project.
      Same expectation as above.
- [ ] **Zero-byte and truncated metadata.** Manually create a 0-byte
      `x.session` file and a `y.session` containing half an XML document inside
      a session folder (simulates an interrupted sync). Open the project.
      Expect: one error message per broken file — not a crash. lameta now
      refuses to save over an unparseable metadata file (unit-tested), so after
      editing and quitting, verify the broken file's bytes on disk are
      unchanged (recoverable by hand or from the provider's version history).
- [ ] **Legacy iCloud placeholder.** If you can find/construct one, a session
      folder where the real file is missing and only `.name.session.icloud`
      exists. Expect: treated as cloud-only, not as "file missing".
- [ ] **Project outside any cloud folder** (plain local). Everything behaves as
      before this feature existed: no icons, no cards, no cloud code in the way.
- [ ] **Reopen loop.** Open/close the app 5 times in a row against a cloud
      project, alternating online/offline. Watch for crashes on the 2nd+ launch
      (stale state, half-hydrated files).

## 3. Losing the network at every awkward moment

- [ ] **During a download.** Click Download on a ~100 MB file, kill Wi-Fi at
      ~50%. Expect: "Waiting" persists (with the minutes counter hidden and the
      offline wording shown); when Wi-Fi returns, the download completes and the
      preview appears. "Stop waiting" must work while offline.
- [ ] **Between selection and auto-fetch.** Select a small evicted file and cut
      Wi-Fi within a second. Expect: no download starts, no hang; card shows
      offline wording; Download button disabled (grey).
- [ ] **Offline UI coherence.** While offline with a cloud-only file selected:
      row icons show the crossed-out cloud, card says "…appears to be offline",
      Download button is grey/disabled, "Show in Finder" still works. Going back
      online re-enables the button *without* reselecting or restarting.
- [ ] **Router up, internet down.** Unplug the router's WAN side (or block the
      provider's traffic) while Wi-Fi stays associated. The OS still reports
      "online", so lameta will allow a Download that cannot complete.
      Expect: card sits in "Waiting" indefinitely with the minutes counter
      climbing; "Stop waiting" recovers. This is a known blind spot — confirm
      nothing worse than an honest endless wait happens.
- [ ] **Captive-ish flakiness.** Toggle Wi-Fi off/on repeatedly (5×, a few
      seconds apart) while a project with evicted files is open and a download
      is running. Expect: no crash, status icons settle correctly afterwards.

## 4. Data-loss risk scenarios (use a throwaway project!)

The theme: lameta writes metadata files and renames files/folders; the sync
engine moves data underneath it. Diff against your pristine copy after each.

- [ ] **Edit metadata while offline.** Open project offline (metadata already
      local), edit session titles/notes, quit, go online, let it sync. On a
      second machine (or web view), confirm the edits arrived and no
      "conflicted copy" files appeared.
- [ ] **Two-machine conflict.** Edit the *same session* on two machines while
      one is offline, then reconnect. The provider will create a conflict file
      (`ETR009 (conflicted copy).session`, `-DESKTOP-XYZ` suffixes, etc.).
      Reopen in lameta. Documented (unit-tested) behavior: the real session
      loads normally and the conflicted copy appears as an ordinary attached
      file in the file list — visible for a human to resolve, never merged or
      silently chosen. Confirm that holds with a real provider-generated
      conflict file, and that opening/deleting the conflict file from within
      lameta works.
- [ ] **Rename with evicted files.** Change a session's ID (which renames the
      folder and every file in it) while that session's media is evicted.
      Expect: rename succeeds, placeholders stay placeholders under the new
      name, and after downloading, content matches the pristine copy. Repeat
      while offline; repeat again mid-download of one of the files (this is the
      scariest one — a rename racing an in-flight materialization).
- [ ] **"Free Up Space" under a running app.** With lameta open and a session
      selected, use Finder/OneDrive to evict that session's media (and then,
      separately, its already-read `.session` file). Expect: icons flip back to
      clouds on the next poll/selection; nothing crashes; editing and saving
      the session still works (the save must rehydrate or rewrite, never write
      a 0-byte file).
- [ ] **Evict while playing.** Play a long audio file and evict it mid-playback.
      Playback will die — acceptable — but lameta must not crash, and the file
      must return to cloud-only state cleanly.
- [ ] **Quit mid-download / mid-save.** Quit lameta (and once, force-quit) while
      a large download is in "Waiting" and again immediately after editing
      metadata. Relaunch. Expect: clean startup; the metadata file on disk is
      whole (never truncated); the interrupted download either finished (the
      provider owns it) or the file is still a valid placeholder.
- [ ] **Add Files while offline.** Use "Add Files" to copy new media into a
      cloud project while offline, quit, reconnect. Expect: files upload, the
      project on a second machine sees them, nothing is lost.
- [ ] **Delete vs evict confusion.** Delete a file from within lameta while it
      is cloud-only (0 local bytes). Confirm the deletion propagates to the
      cloud (check the provider's web UI + trash) — and that lameta's trash
      behavior (`.trash` folder) works when the file had no local content.
- [ ] **Move the whole project** (Finder-drag it between a cloud and a
      non-cloud folder) while lameta has it open. Expect: bad things may happen
      to the open session, but no data destroyed and next launch recovers
      (worst case: "project not found" and a clean re-open).

## 5. Boundary values & odd files

- [ ] File exactly 0 bytes in the cloud (e.g. the sample project's empty
      `.txt`): must read as **local** (a 0-byte file has 0 blocks — make sure it
      isn't misread as cloud-only, which would block its preview forever).
- [ ] File just under / just over the 10 MB auto-fetch threshold; then set the
      threshold to "never" and "always" in the File menu and confirm both
      extremes behave.
- [ ] A genuinely **sparse** local file inside the cloud folder if you can make
      one (`dd if=/dev/zero of=sparse bs=1 count=1 seek=100m` then evict/restore)
      — and one *outside* any cloud folder (must show no cloud UI at all).
- [ ] Filenames with spaces, `é`/diacritics (NFC/NFD!), emoji, very long names;
      a session folder > 200 chars deep. Evict, reopen, download.
- [ ] Case games: rename `Sound.WAV` → `sound.wav` on one machine while evicted
      on the other (APFS and OneDrive are both case-insensitive-ish; watch for
      duplicate/lost files).
- [ ] A file that exists in the provider's web UI but was **deleted locally**
      (sync lag): row should disappear or show missing — not crash.
- [ ] Hundreds of files in one session, all evicted: file list stays responsive
      (status is polled per file); select-all-ish operations don't trigger a
      mass download.

## 6. Provider misbehavior

- [ ] Kill the provider's process (`killall OneDrive`) during a download.
      Expect: eventual failure back to cloud-only or endless Waiting +
      functional "Stop waiting" — no crash. ⚠️ The exact error signature macOS
      returns here feeds lameta's "couldn't reach provider" detection and is
      only provisionally implemented — please capture lameta's log output for
      the developers when you do this.
- [ ] OneDrive "Pause syncing" (2 h) with evicted metadata, then open the
      project: does it hydrate anyway (OS-level requests sometimes bypass
      pause), or produce the single banner? Either is acceptable; dialogs
      storming or a crash is not.
- [ ] Storage quota full on the provider (if testable): uploading new files
      from a lameta project fails at the provider level; lameta shouldn't care
      or corrupt anything.
- [ ] iCloud "Optimize Mac Storage" ON with a nearly-full disk: let macOS evict
      things on its own overnight, then reopen the project.
- [ ] Uninstall/reinstall the provider between lameta runs (sync-root list is
      cached per app-run; a re-launch must pick up the new state).

## 7. Windows regression pass (the interface changed underneath it)

Quick pass on Windows 10/11 + OneDrive to confirm nothing regressed:

- [ ] Icons, status card, and the **checkbox** (not a button — Windows keeps
      "Tell OneDrive that I want this file on my computer") still work; checkbox
      pins durably (file survives "Free up space").
- [ ] `.meta` sidecars still get pinned automatically when their media is read.
- [ ] Offline: checkbox behavior unchanged, banner + Retry on failed metadata
      reads unchanged.
- [ ] Auto-fetch under threshold works; the new offline suppression also
      applies (select small cloud file while offline → no fetch attempt).

## 8. What to record when something goes wrong

1. The provider, macOS version, and whether the path went through a symlink.
2. `stat -f "blocks=%b size=%z flags=%f" <file>` for the file in question.
3. lameta's log (dev terminal or Console.app) — especially any line starting
   with `cloudFileStatus:` or mentioning the cloud read guard, and the exact
   error `{ code, errno, syscall }` if shown.
4. Whether the provider's own client showed an error dialog at the same time
   (a design goal is that lameta *prevents* triggering those storms).
5. For suspected data loss: the `diff -r` against your pristine copy, plus the
   provider's web-UI version history for the affected file.
