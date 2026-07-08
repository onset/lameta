import * as fs from "fs";

export type CloudFileStatus = "local" | "cloudOnly" | "hydrating" | "unknown";

export type AttributeReader = (path: string) =>
  | {
      IS_OFFLINE: boolean;
      IS_RECALL_ON_DATA_ACCESS: boolean;
      IS_RECALL_ON_OPEN: boolean;
    }
  | undefined;

let testAttributeReader: AttributeReader | undefined;
let cachedFswinModule: { getAttributesSync: AttributeReader } | undefined;
let haveWarnedAboutFswinFailure = false;

export function setAttributeReaderForTests(reader?: AttributeReader): void {
  testAttributeReader = reader;
}

function getAttributeReader(): AttributeReader | undefined {
  if (testAttributeReader) {
    return testAttributeReader;
  }
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
  return cachedFswinModule?.getAttributesSync;
}

export function getCloudFileStatus(path: string): CloudFileStatus {
  const reader = getAttributeReader();
  if (!reader) {
    return "unknown";
  }
  try {
    const attributes = reader(path);
    if (!attributes) {
      return "unknown";
    }
    if (
      attributes.IS_OFFLINE ||
      attributes.IS_RECALL_ON_DATA_ACCESS ||
      attributes.IS_RECALL_ON_OPEN
    ) {
      return "cloudOnly";
    }
    return "local";
  } catch (e) {
    if (!haveWarnedAboutFswinFailure) {
      haveWarnedAboutFswinFailure = true;
      console.warn("cloudFileStatus: failed to read file attributes", e);
    }
    return "unknown";
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let onAbort: (() => void) | undefined;
    const timer = setTimeout(() => {
      // Normal (non-abort) resolution: must remove the listener ourselves --
      // {once: true} only removes it when the "abort" event actually fires,
      // so without this, hours-long polling (one sleep() call per poll, same
      // long-lived signal) would leak one listener per poll and eventually
      // hit Node's MaxListenersExceededWarning.
      if (onAbort) {
        signal?.removeEventListener("abort", onAbort);
      }
      resolve();
    }, ms);
    if (signal) {
      onAbort = () => {
        clearTimeout(timer);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function makeAbortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

// If fswin can't be read (e.g. it fails to load, or errors on every call),
// getCloudFileStatus() returns "unknown" forever. Since hydrateFile has no
// default timeout, that would otherwise poll forever with no way out.
const MAX_CONSECUTIVE_UNKNOWN_POLLS = 5;

export async function hydrateFile(
  path: string,
  options?: {
    pollIntervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
  }
): Promise<void> {
  const pollIntervalMs = options?.pollIntervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs;
  const signal = options?.signal;

  if (signal?.aborted) {
    throw makeAbortError();
  }

  // Reading even 1 byte triggers OneDrive to start hydrating the entire file
  // in the background; there is no way to read only part of a cloud file.
  const handle = await fs.promises.open(path, "r");
  try {
    const buffer = Buffer.alloc(1);
    await handle.read(buffer, 0, 1, 0);
  } finally {
    await handle.close();
  }

  const startTime = Date.now();
  let consecutiveUnknownCount = 0;
  // Note: if the caller aborts or the timeout is hit, we simply stop polling
  // here -- OneDrive keeps hydrating the file in the background regardless.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const status = getCloudFileStatus(path);
    if (status === "local") {
      return;
    }
    if (status === "unknown") {
      consecutiveUnknownCount++;
      if (consecutiveUnknownCount >= MAX_CONSECUTIVE_UNKNOWN_POLLS) {
        throw new Error(
          `hydrateFile: could not determine cloud file status for ${consecutiveUnknownCount} consecutive polls, giving up: ${path}`
        );
      }
    } else {
      consecutiveUnknownCount = 0;
    }
    if (signal?.aborted) {
      throw makeAbortError();
    }
    const elapsedMs = Date.now() - startTime;
    if (timeoutMs !== undefined && elapsedMs >= timeoutMs) {
      throw new Error(`hydrateFile timed out after ${timeoutMs}ms: ${path}`);
    }
    const waitMs =
      timeoutMs !== undefined
        ? Math.min(pollIntervalMs, timeoutMs - elapsedMs)
        : pollIntervalMs;
    await sleep(waitMs, signal);
  }
}
