import fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  getFakeCloudProviderIfActive,
  getFakeCloudSyncRootsIfActive
} from "./fakeCloudProvider";

// "local" = hydrated, but OneDrive's "free up space" could dehydrate it.
// "localPinned" = hydrated and the user (or lameta) asked to always keep it
// on this device (IS_PINNED).
export type CloudFileStatus =
  | "local"
  | "localPinned"
  | "cloudOnly"
  | "hydrating"
  | "unknown";

export function isLocallyAvailable(status: CloudFileStatus): boolean {
  return status === "local" || status === "localPinned";
}

export type AttributeReader = (path: string) =>
  | {
      IS_OFFLINE: boolean;
      IS_RECALL_ON_DATA_ACCESS: boolean;
      IS_RECALL_ON_OPEN: boolean;
      IS_PINNED?: boolean;
    }
  | undefined;

export type PinWriter = (path: string, pinned: boolean) => Promise<void>;

interface FswinModule {
  getAttributesSync: AttributeReader;
  setAttributesAsync: (
    path: string,
    attributes: { IS_PINNED?: boolean; IS_UNPINNED?: boolean }
  ) => Promise<boolean>;
}

let testAttributeReader: AttributeReader | undefined;
let testPinWriter: PinWriter | undefined;
let cachedFswinModule: FswinModule | undefined;
let haveWarnedAboutFswinFailure = false;

export function setAttributeReaderForTests(reader?: AttributeReader): void {
  testAttributeReader = reader;
}

export function setPinWriterForTests(writer?: PinWriter): void {
  testPinWriter = writer;
}

function getFswinModule(): FswinModule | undefined {
  if (process.platform !== "win32") {
    return undefined;
  }
  if (!cachedFswinModule) {
    try {
      // Lazy require: must never run at module-load time, or this module
      // would blow up on macOS/CI/Vitest where fswin isn't installed.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cachedFswinModule = require("fswin");
    } catch (e) {
      if (!haveWarnedAboutFswinFailure) {
        haveWarnedAboutFswinFailure = true;
        console.warn("cloudFileStatus: failed to load fswin", e);
      }
      return undefined;
    }
  }
  return cachedFswinModule;
}

function getAttributeReader(): AttributeReader | undefined {
  if (testAttributeReader) {
    return testAttributeReader;
  }
  return getFswinModule()?.getAttributesSync;
}

function statusFromAttributes(
  attributes:
    | {
        IS_OFFLINE: boolean;
        IS_RECALL_ON_DATA_ACCESS: boolean;
        IS_RECALL_ON_OPEN: boolean;
        IS_PINNED?: boolean;
      }
    | undefined
): CloudFileStatus {
  if (!attributes) {
    return "unknown";
  }
  const isPlaceholder =
    attributes.IS_OFFLINE ||
    attributes.IS_RECALL_ON_DATA_ACCESS ||
    attributes.IS_RECALL_ON_OPEN;
  if (isPlaceholder) {
    return attributes.IS_PINNED ? "hydrating" : "cloudOnly";
  }
  return attributes.IS_PINNED ? "localPinned" : "local";
}

function readStatus(path: string): CloudFileStatus {
  const reader = getAttributeReader();
  if (!reader) {
    return "unknown";
  }
  try {
    return statusFromAttributes(reader(path));
  } catch (e) {
    if (!haveWarnedAboutFswinFailure) {
      haveWarnedAboutFswinFailure = true;
      console.warn("cloudFileStatus: failed to read file attributes", e);
    }
    return "unknown";
  }
}

// Platform abstraction over the local cloud sync engine.
//
// capabilities.canFetch = a real provider exists that can deliver placeholder
// (cloud-only) files on demand. canFetch=false means we cannot tell placeholder
// files apart or make them appear -- there is nothing to fetch.
//
// capabilities.canPin = a durable "keep this file on this device" pin exists
// that survives a "free up space" sweep. Only Windows (OneDrive's Files
// On-Demand, driven via fswin attributes) has this.
//
// On macOS there is no user-space durable pin (nothing like Windows IS_PINNED),
// so the mac provider has canPin=false: setPinned(path, true) instead triggers a
// one-shot materialization (download-now), and setPinned(path, false) stops
// waiting on it. That is why callers gate durable-pin behavior on canPin while
// gating "can we fetch this placeholder at all" on canFetch.
export interface CloudFileProvider {
  readonly capabilities: { canPin: boolean; canFetch: boolean };
  getStatus(path: string): CloudFileStatus;
  // pinned=true: ask the sync engine to download the file (Windows: & keep it
  //   local durably; macOS: a one-shot materialization).
  // pinned=false: cancel/stop waiting on that request; never dehydrates.
  setPinned(path: string, pinned: boolean): Promise<void>;
}

async function writePinAttribute(path: string, pinned: boolean): Promise<void> {
  const fswin = getFswinModule();
  if (!fswin) {
    throw new Error("cloudFileStatus: fswin is unavailable, cannot set pin state");
  }
  // Only ever clear IS_PINNED to unpin -- never set IS_UNPINNED, which would
  // invite OneDrive to dehydrate the file. Unpinning should just stop asking
  // for it to be kept local, not push it back to the cloud.
  const attributes = pinned
    ? { IS_PINNED: true, IS_UNPINNED: false }
    : { IS_PINNED: false };
  const succeeded = await fswin.setAttributesAsync(path, attributes);
  if (!succeeded) {
    throw new Error(
      `cloudFileStatus: fswin.setAttributesAsync failed to ${pinned ? "pin" : "unpin"} ${path}`
    );
  }
}

class WindowsCloudFileProvider implements CloudFileProvider {
  public readonly capabilities = { canPin: true, canFetch: true };

  getStatus(path: string): CloudFileStatus {
    return readStatus(path);
  }

  async setPinned(path: string, pinned: boolean): Promise<void> {
    const writer = testPinWriter ?? writePinAttribute;
    await writer(path, pinned);
  }
}

class NullCloudFileProvider implements CloudFileProvider {
  public readonly capabilities = { canPin: false, canFetch: false };

  getStatus(_path: string): CloudFileStatus {
    return "unknown";
  }

  async setPinned(_path: string, _pinned: boolean): Promise<void> {
    // No provider available: nothing to do.
  }
}

// -------------------------------------------------------------------------
// macOS provider
// -------------------------------------------------------------------------
//
// Modern providers (OneDrive, Dropbox, Google Drive, Box) use Apple's
// FileProvider framework. A cloud-only placeholder is a "dataless" file: it
// stats with a real size > 0 but blocks === 0. Node doesn't expose st_flags /
// SF_DATALESS, so "regular file, size > 0, blocks === 0" is our heuristic.
// iCloud Drive is older/separate: evicted files may show up as dataless files
// OR as a legacy ".<basename>.icloud" sibling placeholder (real file missing).
//
// macOS gives us no OS notification when a download finishes and no durable
// pin, so "pinning" is a one-shot materialization: we ask the provider to
// download the file and track it as in-flight until getStatus() sees it become
// a real (non-dataless) file. cloudFilePoller drives that polling.

// What we need from a stat() to classify a file. Kept minimal so the pure
// classifier and the test seam don't depend on the full fs.Stats shape.
export type MacStat = { isFile: boolean; size: number; blocks: number };

export type MacStatReader = (path: string) => MacStat | undefined;

// undefined result = file missing.
let testMacStatReader: MacStatReader | undefined;
let testICloudSiblingChecker: ((path: string) => boolean) | undefined;
let testMaterializer: ((path: string) => Promise<void>) | undefined;
let haveWarnedAboutMacStatFailure = false;
let haveWarnedAboutMacMaterializeFailure = false;

export function setMacStatReaderForTests(reader?: MacStatReader): void {
  testMacStatReader = reader;
}

// Seam for the ".<basename>.icloud" legacy-placeholder sibling existence check.
export function setICloudSiblingCheckerForTests(
  checker?: (path: string) => boolean
): void {
  testICloudSiblingChecker = checker;
}

// Seam for the one-shot materialization (brctl / cat). Resolves once the
// request is *initiated*, not once the download completes.
export function setMaterializerForTests(
  m?: (path: string) => Promise<void>
): void {
  testMaterializer = m;
}

const kICloudProviderName = "iCloud Drive";

function isICloudRoot(root: CloudSyncRoot | undefined): boolean {
  return root?.providerName === kICloudProviderName;
}

// Pure stat -> status classifier. The caller supplies the facts that require
// fs / sync-root lookups; this function does no IO so it is trivially testable.
export function statusFromMacStat(
  stat: MacStat | undefined,
  ctx: {
    underSyncRoot: boolean;
    underICloudRoot: boolean;
    inFlight: boolean;
    hasICloudSibling: boolean;
  }
): CloudFileStatus {
  // Not under any sync root: not our concern, and this bounds sparse-file
  // (size>0, blocks==0) false positives to cloud folders.
  if (!ctx.underSyncRoot) {
    return "unknown";
  }
  if (stat) {
    if (stat.isFile && stat.size > 0 && stat.blocks === 0) {
      // Dataless placeholder: cloud-only unless we asked for it.
      return ctx.inFlight ? "hydrating" : "cloudOnly";
    }
    // Exists and has data (or is a dir/other) -> present locally. macOS never
    // reports "localPinned" (no durable pin). in-flight self-cleanup happens
    // in the caller, which owns the mutable set.
    return "local";
  }
  // File missing. On iCloud, an evicted file may only exist as a legacy
  // ".<basename>.icloud" sibling placeholder.
  if (ctx.underICloudRoot && ctx.hasICloudSibling) {
    return ctx.inFlight ? "hydrating" : "cloudOnly";
  }
  return "unknown";
}

// The legacy iCloud placeholder sibling for a missing file:
//   /a/b/foo.mp3  ->  /a/b/.foo.mp3.icloud
function iCloudSiblingPath(filePath: string): string {
  return path.join(
    path.dirname(filePath),
    "." + path.basename(filePath) + ".icloud"
  );
}

function readMacStat(filePath: string): MacStat | undefined {
  if (testMacStatReader) {
    return testMacStatReader(filePath);
  }
  const s = fs.statSync(filePath, { throwIfNoEntry: false });
  if (!s) {
    return undefined;
  }
  return { isFile: s.isFile(), size: s.size, blocks: s.blocks };
}

function iCloudSiblingExists(filePath: string): boolean {
  if (testICloudSiblingChecker) {
    return testICloudSiblingChecker(filePath);
  }
  return fs.existsSync(iCloudSiblingPath(filePath));
}

class MacCloudFileProvider implements CloudFileProvider {
  public readonly capabilities = { canPin: false, canFetch: true };

  // Paths (normalized) for which a one-shot materialization is in progress.
  private inFlight = new Set<string>();
  // Reader child processes keyed by normalized path, so setPinned(false) can
  // kill the blocking read.
  private readers = new Map<string, import("child_process").ChildProcess>();

  getStatus(filePath: string): CloudFileStatus {
    const root = getSyncRootForPath(filePath);
    if (!root) {
      return "unknown";
    }
    const key = normalizeForCompare(filePath);
    const inFlight = this.inFlight.has(key);
    const underICloud = isICloudRoot(root);
    try {
      const stat = readMacStat(filePath);
      const hasICloudSibling =
        !stat && underICloud ? iCloudSiblingExists(filePath) : false;
      const status = statusFromMacStat(stat, {
        underSyncRoot: true,
        underICloudRoot: underICloud,
        inFlight,
        hasICloudSibling
      });
      // Self-clean: once a requested file has materialized (become "local"),
      // drop it from the in-flight set. This is how "hydrating" transitions to
      // "local" for the poller.
      if (status === "local" && inFlight) {
        this.inFlight.delete(key);
      }
      return status;
    } catch (e) {
      if (!haveWarnedAboutMacStatFailure) {
        haveWarnedAboutMacStatFailure = true;
        console.warn("cloudFileStatus: failed to stat file", e);
      }
      return "unknown";
    }
  }

  async setPinned(filePath: string, pinned: boolean): Promise<void> {
    const key = normalizeForCompare(filePath);
    if (!pinned) {
      // Stop waiting: forget it and kill any blocking reader. The provider may
      // keep downloading in the background; that matches Windows' unpin caveat.
      this.inFlight.delete(key);
      const child = this.readers.get(key);
      if (child) {
        this.readers.delete(key);
        try {
          child.kill();
        } catch {
          // already gone
        }
      }
      return;
    }

    // pinned=true: one-shot materialization. Mark in-flight *before* kicking off
    // the request so a concurrent getStatus() already sees "hydrating".
    this.inFlight.add(key);

    if (testMaterializer) {
      // Don't await completion -- resolve once the request is initiated.
      testMaterializer(filePath).catch((e) => {
        this.inFlight.delete(key);
        this.warnMaterializeFailedOnce(e);
      });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execFile, spawn } = require("child_process");
    const root = getSyncRootForPath(filePath);
    if (isICloudRoot(root)) {
      // iCloud: brctl requests a download; it returns after requesting, not
      // after completion.
      execFile("brctl", ["download", filePath], (err: unknown) => {
        if (err) {
          this.inFlight.delete(key);
          this.warnMaterializeFailedOnce(err);
        }
      });
      return;
    }

    // FileProvider root: reading any byte makes the kernel materialize the
    // whole file, and the read blocks until done. Do it in a child process so a
    // multi-GB blocking read never occupies Node's threadpool.
    const child = spawn("/bin/cat", [filePath], { stdio: "ignore" });
    this.readers.set(key, child);
    child.on("exit", (code: number | null) => {
      this.readers.delete(key);
      if (code !== 0) {
        // getStatus self-cleans on success; on failure fall back to cloudOnly.
        this.inFlight.delete(key);
        this.warnMaterializeFailedOnce(new Error(`/bin/cat exited ${code}`));
      }
    });
    child.on("error", (e: unknown) => {
      this.readers.delete(key);
      this.inFlight.delete(key);
      this.warnMaterializeFailedOnce(e);
    });
  }

  private warnMaterializeFailedOnce(e: unknown): void {
    if (!haveWarnedAboutMacMaterializeFailure) {
      haveWarnedAboutMacMaterializeFailure = true;
      console.warn("cloudFileStatus: failed to materialize file", e);
    }
  }
}

const windowsProvider = new WindowsCloudFileProvider();
const macProvider = new MacCloudFileProvider();
const nullProvider = new NullCloudFileProvider();

export function getCloudFileProvider(): CloudFileProvider {
  // Windows/macOS unit-test seams take precedence, preserving existing
  // behavior exactly (and keeping existing unit tests unaffected by the e2e
  // env var below).
  if (testAttributeReader || testPinWriter) {
    return windowsProvider;
  }
  if (testMacStatReader || testMaterializer || testICloudSiblingChecker) {
    return macProvider;
  }
  // E2E_FAKE_CLOUD_PROVIDER: an e2e-controllable fake, see fakeCloudProvider.ts.
  // This check is cheap (an env var read cached after the first call) so it's
  // safe to make on every getCloudFileProvider() call.
  const fakeProvider = getFakeCloudProviderIfActive();
  if (fakeProvider) {
    return fakeProvider;
  }
  if (process.platform === "win32") {
    return windowsProvider;
  }
  if (process.platform === "darwin") {
    return macProvider;
  }
  return nullProvider;
}

// Kept as a delegate so existing callers don't change.
export function getCloudFileStatus(path: string): CloudFileStatus {
  return getCloudFileProvider().getStatus(path);
}

// A folder synced by some cloud sync engine, plus the name of that engine
// as the user knows it ("OneDrive", "Dropbox", ...) for use in UI text.
export interface CloudSyncRoot {
  path: string;
  providerName: string;
}

let testCloudSyncRoots: CloudSyncRoot[] | undefined;

export function setCloudSyncRootsForTests(
  roots?: (string | CloudSyncRoot)[]
): void {
  testCloudSyncRoots = roots?.map((r) =>
    typeof r === "string" ? { path: r, providerName: "OneDrive" } : r
  );
  cachedSyncRoots = undefined;
}

let cachedSyncRoots: CloudSyncRoot[] | undefined;

// Every sync engine built on the Windows Cloud Files API (OneDrive, Dropbox,
// Google Drive, iCloud, ...) registers its sync roots under this key. It is
// the same API whose placeholder attributes fswin reads above, so anything
// that can produce a cloud-only file shows up here.
const syncRootManagerKey =
  "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\SyncRootManager";

// Key names are program-ids like "GoogleDrive!S-1-5-...!account"; map the
// known id prefixes to the names users see. Unknown engines fall back to
// their id, which is usually recognizable ("MEGA", "pCloud", ...).
const friendlyProviderNames: Record<string, string> = {
  OneDrive: "OneDrive",
  Dropbox: "Dropbox",
  GoogleDrive: "Google Drive",
  DriveFS: "Google Drive",
  iCloudDrive: "iCloud Drive",
  Box: "Box"
};

// Parses `reg query <syncRootManagerKey> /s` output. Each sync root is a key
// like "...\SyncRootManager\Dropbox!<SID>!<account>" whose UserSyncRoots
// subkey maps the user's SID to the synced folder:
//   HKEY_LOCAL_MACHINE\...\SyncRootManager\Dropbox!S-1-5-21-...!dbid:...\UserSyncRoots
//       S-1-5-21-...    REG_SZ    C:\Users\me\Dropbox
export function parseSyncRootManagerOutput(output: string): CloudSyncRoot[] {
  const roots: CloudSyncRoot[] = [];
  let currentProviderId: string | undefined;
  let inUserSyncRoots = false;
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("HKEY_")) {
      const key = line.trim().match(/\\SyncRootManager\\([^\\]+)(\\UserSyncRoots)?$/i);
      currentProviderId = key?.[1].split("!")[0];
      inUserSyncRoots = !!key?.[2];
      continue;
    }
    if (!inUserSyncRoots || !currentProviderId) {
      continue;
    }
    const value = line.match(/^\s+\S+\s+REG_(?:EXPAND_)?SZ\s+(.+?)\s*$/);
    if (value) {
      roots.push({
        path: value[1],
        providerName:
          friendlyProviderNames[currentProviderId] ?? currentProviderId
      });
    }
  }
  return roots;
}

// macOS FileProvider sync roots live at
//   ~/Library/CloudStorage/<ProviderId>-<Account>/
// e.g. "OneDrive-Personal", "GoogleDrive-user@gmail.com". The provider id is
// the part before the first "-"; map it through friendlyProviderNames, falling
// back to the id itself for unknown engines (same policy as Windows).
export function providerNameFromCloudStorageDir(dirName: string): string {
  const id = dirName.split("-")[0];
  return friendlyProviderNames[id] ?? id;
}

// iCloud Drive root ("iCloud Drive" in Finder).
function iCloudDriveRoot(home: string): string {
  return path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs");
}

function readSyncRootsFromCloudStorage(): CloudSyncRoot[] {
  if (process.platform !== "darwin") {
    return [];
  }
  const home = os.homedir();
  const roots: CloudSyncRoot[] = [];
  const cloudStorage = path.join(home, "Library", "CloudStorage");

  // Modern FileProvider roots.
  try {
    for (const entry of fs.readdirSync(cloudStorage, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        roots.push({
          path: path.join(cloudStorage, entry.name),
          providerName: providerNameFromCloudStorageDir(entry.name)
        });
      }
    }
  } catch {
    // No CloudStorage dir (or unreadable): no modern providers.
  }

  // Finder also creates home-dir symlinks (e.g. ~/OneDrive ->
  // ~/Library/CloudStorage/OneDrive-Personal); users may open projects through
  // either path, so add each such symlink as an alias root.
  const cloudStorageNorm = normalizeForCompare(cloudStorage);
  try {
    for (const entry of fs.readdirSync(home, { withFileTypes: true })) {
      if (!entry.isSymbolicLink()) {
        continue;
      }
      const linkPath = path.join(home, entry.name);
      try {
        const resolved = fs.realpathSync(linkPath);
        const resolvedNorm = normalizeForCompare(resolved);
        if (
          resolvedNorm === cloudStorageNorm ||
          resolvedNorm.startsWith(cloudStorageNorm + "/")
        ) {
          const seg =
            resolved
              .slice(cloudStorage.length)
              .replace(/^[/\\]+/, "")
              .split(/[/\\]/)[0] || path.basename(resolved);
          roots.push({
            path: linkPath,
            providerName: providerNameFromCloudStorageDir(seg)
          });
        }
      } catch {
        // Dangling symlink; ignore.
      }
    }
  } catch {
    // Home unreadable; ignore.
  }

  // iCloud Drive (older/separate framework).
  const iCloudRoot = iCloudDriveRoot(home);
  try {
    if (fs.existsSync(iCloudRoot)) {
      roots.push({ path: iCloudRoot, providerName: kICloudProviderName });
      // With Desktop & Documents sync on, ~/Desktop and ~/Documents are also
      // iCloud-synced roots. Detect it by the mirrored Desktop folder.
      if (fs.existsSync(path.join(iCloudRoot, "Desktop"))) {
        roots.push({
          path: path.join(home, "Desktop"),
          providerName: kICloudProviderName
        });
        roots.push({
          path: path.join(home, "Documents"),
          providerName: kICloudProviderName
        });
      }
    }
  } catch {
    // ignore
  }

  return roots;
}

function readSyncRootsFromRegistry(): CloudSyncRoot[] {
  if (process.platform !== "win32") {
    return [];
  }
  try {
    // Lazy require for the same reason as fswin above.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execFileSync } = require("child_process");
    const output: string = execFileSync(
      "reg",
      ["query", syncRootManagerKey, "/s"],
      { encoding: "utf8", windowsHide: true, timeout: 3000 }
    );
    return parseSyncRootManagerOutput(output);
  } catch (e) {
    console.warn("cloudFileStatus: failed to enumerate cloud sync roots", e);
    return [];
  }
}

function getCloudSyncRoots(): CloudSyncRoot[] {
  if (testCloudSyncRoots) {
    return testCloudSyncRoots;
  }
  const fakeSyncRoots = getFakeCloudSyncRootsIfActive();
  if (fakeSyncRoots) {
    return fakeSyncRoots;
  }
  if (!cachedSyncRoots) {
    if (process.platform === "darwin") {
      cachedSyncRoots = readSyncRootsFromCloudStorage();
    } else {
      const roots = readSyncRootsFromRegistry();
      // OneDrive also publishes its sync root(s) in env vars; keep them as a
      // Windows-only fallback in case the registry read fails or misses one.
      for (const envRoot of [
        process.env.OneDrive,
        process.env.OneDriveConsumer,
        process.env.OneDriveCommercial
      ]) {
        if (
          envRoot &&
          !roots.some(
            (r) => normalizeForCompare(r.path) === normalizeForCompare(envRoot)
          )
        ) {
          roots.push({ path: envRoot, providerName: "OneDrive" });
        }
      }
      cachedSyncRoots = roots;
    }
  }
  return cachedSyncRoots;
}

// The separator paths are compared with on this platform: backslash on
// Windows, forward slash everywhere else (macOS/APFS).
function compareSeparator(): string {
  return process.platform === "win32" ? "\\" : "/";
}

// Fold paths into a comparable form: canonicalize to the platform separator,
// strip trailing separators, and lowercase (Windows and the APFS default are
// both case-insensitive). On darwin we fold "\" -> "/" so synthetic Windows
// test paths still compare correctly. Unicode is folded to NFC because macOS
// file APIs can hand back decomposed (NFD) names -- e.g. an accented account
// name in a CloudStorage folder -- while paths from settings/UI are usually
// precomposed, and a mixed-form prefix compare would silently fail.
export function normalizeForCompare(p: string): string {
  const composed = p.normalize("NFC");
  if (process.platform === "win32") {
    return composed.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
  }
  return composed.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

// The sync root a path lives under, or undefined for a plain local path.
// File attributes alone cannot distinguish a fully-hydrated cloud file from a
// plain local file, so this is what decides whether a "local" file gets a
// checkmark icon -- and it is where UI text learns which sync engine
// ("OneDrive Status" vs "Dropbox Status") owns the file.
export function getSyncRootForPath(p: string): CloudSyncRoot | undefined {
  const sep = compareSeparator();
  const normalized = normalizeForCompare(p);
  return getCloudSyncRoots().find((root) => {
    const normalizedRoot = normalizeForCompare(root.path);
    return (
      normalized === normalizedRoot ||
      normalized.startsWith(normalizedRoot + sep)
    );
  });
}

export function isUnderCloudSyncRoot(path: string): boolean {
  return !!getSyncRootForPath(path);
}

// "OneDrive", "Dropbox", ... or undefined when the path is not under any
// known sync root (callers fall back to generic wording).
export function getCloudProviderNameForPath(path: string): string | undefined {
  return getSyncRootForPath(path)?.providerName;
}
