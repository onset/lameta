import * as fs from "fs-extra";
import { getExtension } from "../other/CopyManager";

export type ReasonPathCannotBeAdded = "lametaFileType" | "folder";

// Throws if a path cannot be examined.
export function findPathsThatCannotBeAdded(
  paths: string[],
): { path: string; reason: ReasonPathCannotBeAdded }[] {
  return paths.flatMap((path): { path: string; reason: ReasonPathCannotBeAdded }[] => {
    // Block lameta internal file types by extension
    if (["session", "person", "meta"].includes(getExtension(path))) {
      return [{ path, reason: "lametaFileType" }];
    }
    // Disallow folders
    if (fs.lstatSync(path).isDirectory()) {
      return [{ path, reason: "folder" }];
    }
    return [];
  });
}
