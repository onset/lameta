// This file exists only because this codebase still has many shared/renderer files
// that import `path`, while Vite browser bundles cannot safely load `node:path`.
//
// The intent is narrow:
// - renderer/browser code gets this shim through the Vite alias in vite.config.ts
// - tests get `node:path` through vitest.config.js
// - main process code imports `node:path` directly
//
// Keep this file small and boring. It is only a compatibility layer for the subset
// of path behavior the renderer currently uses. If code starts needing more of the
// real Node path API, prefer moving that logic out of the renderer or changing that
// call site to avoid `path` entirely instead of expanding this shim casually.

const WINDOWS_SEPARATOR = "\\";
const POSIX_SEPARATOR = "/";

function getRuntimeSeparator() {
  return typeof process !== "undefined" && process.platform === "win32"
    ? WINDOWS_SEPARATOR
    : POSIX_SEPARATOR;
}

function detectSeparator(path: string) {
  if (!path) {
    return getRuntimeSeparator();
  }

  return path.includes(WINDOWS_SEPARATOR) || /^[A-Za-z]:/.test(path)
    ? WINDOWS_SEPARATOR
    : path.includes(POSIX_SEPARATOR)
      ? POSIX_SEPARATOR
      : getRuntimeSeparator();
}

function stripTrailingSeparators(path: string, separator: string) {
  if (path === separator || /^[A-Za-z]:\\$/.test(path)) {
    return path;
  }

  return path.replace(
    new RegExp(`[${separator === WINDOWS_SEPARATOR ? "\\\\" : "/"}]+$`),
    ""
  );
}

function splitRoot(path: string) {
  if (/^[A-Za-z]:[\\/]/.test(path)) {
    return {
      root: path.slice(0, 3).replace(POSIX_SEPARATOR, WINDOWS_SEPARATOR),
      rest: path.slice(3)
    };
  }

  if (path.startsWith("//") || path.startsWith("\\\\")) {
    const normalized = path.replace(/\//g, WINDOWS_SEPARATOR);
    const parts = normalized.split(WINDOWS_SEPARATOR).filter(Boolean);
    if (parts.length >= 2) {
      const root = `\\\\${parts[0]}\\${parts[1]}\\`;
      return {
        root,
        rest: parts.slice(2).join(WINDOWS_SEPARATOR)
      };
    }
  }

  if (path.startsWith(POSIX_SEPARATOR) || path.startsWith(WINDOWS_SEPARATOR)) {
    return {
      root: detectSeparator(path),
      rest: path.slice(1)
    };
  }

  return { root: "", rest: path };
}

function normalizeSegments(path: string) {
  const separator = detectSeparator(path);
  const normalizedInput = path.replace(/[\\/]+/g, separator);
  const { root, rest } = splitRoot(normalizedInput);
  const segments = rest.split(separator).filter(Boolean);
  const normalizedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (
        normalizedSegments.length > 0 &&
        normalizedSegments[normalizedSegments.length - 1] !== ".."
      ) {
        normalizedSegments.pop();
      } else if (!root) {
        normalizedSegments.push(segment);
      }
      continue;
    }

    normalizedSegments.push(segment);
  }

  const joined = normalizedSegments.join(separator);
  if (!root) {
    return joined || ".";
  }

  return joined ? `${root}${joined}` : root;
}

export const sep = getRuntimeSeparator();
export const delimiter = sep === WINDOWS_SEPARATOR ? ";" : ":";

export function normalize(path: string) {
  if (!path) {
    return ".";
  }

  return normalizeSegments(path);
}

export function join(...parts: string[]) {
  const filtered = parts.filter((part) => part && part.length > 0);
  if (filtered.length === 0) {
    return ".";
  }

  return normalize(filtered.join(detectSeparator(filtered[0])));
}

export function dirname(path: string) {
  const normalized = normalize(path);
  const separator = detectSeparator(normalized);
  const trimmed = stripTrailingSeparators(normalized, separator);

  if (trimmed === ".") {
    return ".";
  }

  if (/^[A-Za-z]:\\?$/.test(trimmed)) {
    return `${trimmed.slice(0, 2)}${WINDOWS_SEPARATOR}`;
  }

  const index = trimmed.lastIndexOf(separator);
  if (index === -1) {
    return ".";
  }

  if (index === 0) {
    return separator;
  }

  return trimmed.slice(0, index);
}

export function basename(path: string, suffix?: string) {
  const normalized = normalize(path);
  const separator = detectSeparator(normalized);
  const trimmed = stripTrailingSeparators(normalized, separator);
  const index = trimmed.lastIndexOf(separator);
  let base = index === -1 ? trimmed : trimmed.slice(index + 1);

  if (suffix && base.endsWith(suffix)) {
    base = base.slice(0, -suffix.length);
  }

  return base;
}

export function extname(path: string) {
  const base = basename(path);
  const index = base.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }

  return base.slice(index);
}

export function parse(path: string) {
  const normalized = normalize(path);
  const rootInfo = splitRoot(normalized);
  const base = basename(normalized);
  const ext = extname(base);
  const dir = dirname(normalized);

  return {
    root: rootInfo.root,
    dir,
    base,
    ext,
    name: ext ? base.slice(0, -ext.length) : base
  };
}

export function resolve(...parts: string[]) {
  const filtered = parts.filter((part) => part && part.length > 0);
  if (filtered.length === 0) {
    return ".";
  }

  let resolved = filtered[0];
  for (let index = 1; index < filtered.length; index += 1) {
    const part = filtered[index];
    if (/^(?:[A-Za-z]:[\\/]|[\\/])/.test(part)) {
      resolved = part;
    } else {
      resolved = join(resolved, part);
    }
  }

  return normalize(resolved);
}

const browserPath = {
  sep,
  delimiter,
  normalize,
  join,
  dirname,
  basename,
  extname,
  parse,
  resolve
};

export default browserPath;