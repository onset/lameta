import Fuse from "fuse.js";
import { Folder, FolderGroup } from "./Folder";
import * as Path from "path";

interface IndexedFolder {
  folder: Folder;
  blob: string; // concatenation of all field texts
}

export class FolderIndex {
  private indices = new Map<FolderGroup, Fuse<IndexedFolder>>();
  private lastSnapshots = new Map<FolderGroup, string>();

  public attach(group: FolderGroup) {
    // build immediately
    this.build(group);
    group._setIndex(this); // internal hook
  }

  public build(group: FolderGroup) {
    const items: IndexedFolder[] = group.items.map((f) => ({
      folder: f,
      blob: this.makeBlob(f)
    }));
    const fuse = new Fuse(items, {
      keys: ["blob"],
      includeScore: false,
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 1
    });
    this.indices.set(group, fuse);
    // remember snapshot for change detection (not currently used externally)
    const snap = items.map((i) => i.blob).join("\n");
    this.lastSnapshots.set(group, snap);
  }

  public search(group: FolderGroup, query: string): Folder[] {
    const fuse = this.indices.get(group);
    if (!fuse) {
      this.build(group);
      return this.search(group, query);
    }
    if (!query.trim()) return group.items;
    const results = fuse.search(query.trim());
    return results.map((r) => r.item.folder);
  }

  private makeBlob(f: Folder): string {
    try {
      const fieldBits = f.properties
        .values()
        .map((field: any) =>
          field && typeof field.text === "string" ? field.text : ""
        );
      const fileNameBits = (f.files || []).map((file: any) =>
        file && file.pathInFolderToLinkFileOrLocalCopy
          ? Path.basename(file.pathInFolderToLinkFileOrLocalCopy)
          : ""
      );
      return [...fieldBits, ...fileNameBits].join(" | ");
    } catch {
      return "";
    }
  }
}
