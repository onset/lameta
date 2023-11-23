import * as Path from "path";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function showInExplorer(path: string) {}
export async function asyncTrash(path: string) {
  return asyncTrashWithContext<null>(path, null);
}
export async function asyncTrashWithContext<T>(
  path: string,
  callerContext: T
): Promise<{ succeeded: boolean; path: string; context: T }> {
  return Promise.resolve({
    succeeded: false,
    path: path,
    context: callerContext
  }); // we don't get a result from removeSync
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function locate(relativePath: string): string {
  return "";
}

// normalize both in terms of resolving things like ".." but also going to posix path separators
export function normalizePath(path: string): string {
  return Path.normalize(path).replace(/\\/g, "/");
}
