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

let testCloudSyncRoots: string[] | undefined;

export function setCloudSyncRootsForTests(roots?: string[]): void {
  testCloudSyncRoots = roots;
  cachedSyncRoots = undefined;
}

let cachedSyncRoots: string[] | undefined;

function getCloudSyncRoots(): string[] {
  if (testCloudSyncRoots) {
    return testCloudSyncRoots;
  }
  if (!cachedSyncRoots) {
    // OneDrive publishes its sync root(s) in these env vars. This misses
    // exotic setups (e.g. SharePoint libraries synced outside them), but for
    // those, files still get cloud/syncing icons from their attributes --
    // only the "available on this device" checkmarks depend on this check.
    cachedSyncRoots = [
      process.env.OneDrive,
      process.env.OneDriveConsumer,
      process.env.OneDriveCommercial
    ].filter((r): r is string => !!r);
  }
  return cachedSyncRoots;
}

// True when the path lives under a OneDrive sync root. File attributes alone
// cannot distinguish a fully-hydrated OneDrive file from a plain local file,
// so this is what decides whether a "local" file gets a checkmark icon.
export function isUnderCloudSyncRoot(path: string): boolean {
  const normalized = path.replace(/\//g, "\\").toLowerCase();
  return getCloudSyncRoots().some((root) => {
    const normalizedRoot = root.replace(/\//g, "\\").replace(/\\+$/, "").toLowerCase();
    return (
      normalized === normalizedRoot ||
      normalized.startsWith(normalizedRoot + "\\")
    );
  });
}
