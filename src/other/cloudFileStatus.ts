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

// Platform abstraction: on Windows this drives OneDrive's Files On-Demand
// pin/unpin via fswin attributes; a future macOS provider would have
// canPin=false and no durable pin (setPinned(true) there would instead
// trigger a one-shot materialization).
export interface CloudFileProvider {
  readonly capabilities: { canPin: boolean };
  getStatus(path: string): CloudFileStatus;
  // pinned=true: ask the sync engine to download & keep the file local.
  // pinned=false: cancel that request; never dehydrates.
  // A future macOS provider will have canPin=false; setPinned(path, true) may
  // instead trigger a one-shot materialization (no external durable pin exists there).
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
  public readonly capabilities = { canPin: true };

  getStatus(path: string): CloudFileStatus {
    return readStatus(path);
  }

  async setPinned(path: string, pinned: boolean): Promise<void> {
    const writer = testPinWriter ?? writePinAttribute;
    await writer(path, pinned);
  }
}

class NullCloudFileProvider implements CloudFileProvider {
  public readonly capabilities = { canPin: false };

  getStatus(_path: string): CloudFileStatus {
    return "unknown";
  }

  async setPinned(_path: string, _pinned: boolean): Promise<void> {
    // No provider available: nothing to do.
  }
}

const windowsProvider = new WindowsCloudFileProvider();
const nullProvider = new NullCloudFileProvider();

export function getCloudFileProvider(): CloudFileProvider {
  if (testAttributeReader || testPinWriter) {
    return windowsProvider;
  }
  return process.platform === "win32" ? windowsProvider : nullProvider;
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
  if (!cachedSyncRoots) {
    const roots = readSyncRootsFromRegistry();
    // OneDrive also publishes its sync root(s) in env vars; keep them as a
    // fallback in case the registry read fails or misses one.
    for (const envRoot of [
      process.env.OneDrive,
      process.env.OneDriveConsumer,
      process.env.OneDriveCommercial
    ]) {
      if (
        envRoot &&
        !roots.some((r) => normalizeForCompare(r.path) === normalizeForCompare(envRoot))
      ) {
        roots.push({ path: envRoot, providerName: "OneDrive" });
      }
    }
    cachedSyncRoots = roots;
  }
  return cachedSyncRoots;
}

function normalizeForCompare(path: string): string {
  return path.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
}

// The sync root a path lives under, or undefined for a plain local path.
// File attributes alone cannot distinguish a fully-hydrated cloud file from a
// plain local file, so this is what decides whether a "local" file gets a
// checkmark icon -- and it is where UI text learns which sync engine
// ("OneDrive Status" vs "Dropbox Status") owns the file.
export function getSyncRootForPath(path: string): CloudSyncRoot | undefined {
  const normalized = normalizeForCompare(path);
  return getCloudSyncRoots().find((root) => {
    const normalizedRoot = normalizeForCompare(root.path);
    return (
      normalized === normalizedRoot ||
      normalized.startsWith(normalizedRoot + "\\")
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
