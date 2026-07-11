import fs from "fs";
import {
  CloudFileProvider,
  CloudFileStatus,
  CloudSyncRoot,
  normalizeForCompare
} from "./cloudFileStatus";

// An e2e-controllable fake cloud provider, so Playwright tests can exercise
// lameta's cloud-sync UI (icons, the "<Provider> Status" card, hydrate
// button, ...) on any machine -- without a real OneDrive/Dropbox/iCloud
// account or the platform-specific placeholder-file machinery the real
// providers need (fswin on Windows, FileProvider dataless files on macOS).
//
// Activated by setting E2E_FAKE_CLOUD_PROVIDER to the path of a JSON manifest
// file before the app launches:
//   {
//     "syncRoots": [{ "path": "...", "providerName": "FakeDrive" }],
//     "cloudOnly": ["/abs/path/to/file1", ...],
//     "hydrateDelayMs": 500
//   }
// The real files on disk have real content the whole time -- this fakes only
// the STATUS lameta reads, which is all the UI actually depends on.

export interface FakeCloudManifest {
  syncRoots: CloudSyncRoot[];
  // Normalized (see normalizeForCompare) absolute paths of files to report as
  // cloud-only until a setPinned(path, true) hydrates them.
  cloudOnly: string[];
  hydrateDelayMs: number;
}

const kDefaultHydrateDelayMs = 500;

let haveCheckedEnv = false;
let cachedManifest: FakeCloudManifest | undefined;

// Reads and parses the manifest the first time any of this module's exported
// functions is called, then caches it for the rest of the process's life --
// matching the existing lazy-cache pattern this file's sibling
// (cloudFileStatus.ts) uses for cachedSyncRoots/cachedFswinModule. A test run
// is expected to write its final manifest before launching the app and never
// change it afterward; re-reading on every call would be pointless work (and
// would make "first use" caching -- which mirrors the real providers this
// fake stands in for -- untestable).
function loadManifestOnce(): FakeCloudManifest | undefined {
  if (haveCheckedEnv) {
    return cachedManifest;
  }
  haveCheckedEnv = true;
  // Indexing instead of process.env.E2E_FAKE_CLOUD_PROVIDER: Vite statically
  // replaces `process.env` in renderer code (see getTestEnvironment.ts), which
  // would otherwise bake in whatever this var was (usually unset) at build
  // time instead of reading it live from the launched process.
  const manifestPath = process["env"]["E2E_FAKE_CLOUD_PROVIDER"];
  if (!manifestPath) {
    return undefined;
  }
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const parsed = JSON.parse(raw);
    cachedManifest = {
      syncRoots: Array.isArray(parsed.syncRoots) ? parsed.syncRoots : [],
      cloudOnly: Array.isArray(parsed.cloudOnly)
        ? parsed.cloudOnly.map(normalizeForCompare)
        : [],
      hydrateDelayMs:
        typeof parsed.hydrateDelayMs === "number"
          ? parsed.hydrateDelayMs
          : kDefaultHydrateDelayMs
    };
  } catch (e) {
    console.warn(
      `fakeCloudProvider: failed to load manifest at ${manifestPath}`,
      e
    );
    cachedManifest = undefined;
  }
  return cachedManifest;
}

type FakeFileState = "hydrating" | "local";

export class FakeCloudFileProvider implements CloudFileProvider {
  // Matches the macOS provider's shape: no durable pin, but can fetch. This
  // is what makes the UI show the "Download this file to my computer" /
  // "Stop waiting" button pair instead of the Windows pin checkbox.
  public readonly capabilities = { canPin: false, canFetch: true };

  // Per-path override of the manifest's default "cloudOnly" classification.
  // Absent = still cloudOnly (the manifest's static list is the ground truth
  // until a setPinned(true) starts hydrating it).
  private fileStates = new Map<string, FakeFileState>();
  private hydrateTimers = new Map<string, ReturnType<typeof setTimeout>>();

  getStatus(filePath: string): CloudFileStatus {
    const manifest = loadManifestOnce();
    if (!manifest) {
      return "unknown";
    }
    const key = normalizeForCompare(filePath);
    if (!manifest.cloudOnly.includes(key)) {
      // Not one of the manifest's cloud-only files: as far as this fake is
      // concerned, it's just a normal local file.
      return "local";
    }
    return this.fileStates.get(key) ?? "cloudOnly";
  }

  async setPinned(filePath: string, pinned: boolean): Promise<void> {
    const manifest = loadManifestOnce();
    if (!manifest) {
      return;
    }
    const key = normalizeForCompare(filePath);

    if (!pinned) {
      const timer = this.hydrateTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.hydrateTimers.delete(key);
      }
      // Cancel back to cloudOnly -- but never dehydrate a file that already
      // finished hydrating, matching the real providers' "unpin never
      // dehydrates" contract (see CloudFileProvider.setPinned's doc comment).
      if (this.fileStates.get(key) !== "local") {
        this.fileStates.delete(key);
      }
      return;
    }

    if (!manifest.cloudOnly.includes(key)) {
      // Nothing to hydrate; this path was never marked cloud-only.
      return;
    }

    this.fileStates.set(key, "hydrating");
    const existingTimer = this.hydrateTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(() => {
      this.fileStates.set(key, "local");
      this.hydrateTimers.delete(key);
    }, manifest.hydrateDelayMs);
    this.hydrateTimers.set(key, timer);
  }
}

let singleton: FakeCloudFileProvider | undefined;

// Returns the fake provider if E2E_FAKE_CLOUD_PROVIDER names a loadable
// manifest, else undefined (so the real factory in cloudFileStatus.ts falls
// through to the platform providers unchanged).
export function getFakeCloudProviderIfActive(): CloudFileProvider | undefined {
  if (!loadManifestOnce()) {
    return undefined;
  }
  if (!singleton) {
    singleton = new FakeCloudFileProvider();
  }
  return singleton;
}

// Returns the manifest's sync roots if the fake provider is active, else
// undefined (so getCloudSyncRoots() in cloudFileStatus.ts falls through to
// real sync-root detection unchanged).
export function getFakeCloudSyncRootsIfActive(): CloudSyncRoot[] | undefined {
  return loadManifestOnce()?.syncRoots;
}

// Test-only seam: forget the cached manifest/env check and all per-path
// hydrate state, so each unit test starts clean regardless of what a
// previous test wrote to process.env.E2E_FAKE_CLOUD_PROVIDER.
export function resetFakeCloudProviderForTests(): void {
  haveCheckedEnv = false;
  cachedManifest = undefined;
  singleton = undefined;
}
