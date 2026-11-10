import * as Path from "path";

// Whether export includes a folder's file, judged by its name alone
export function shouldIncludeFile(path: string): boolean {
  // skip these, on advice of ELAR
  return [".sprj", ".session", ".person", ".skip"].indexOf(Path.extname(path)) === -1;
}
