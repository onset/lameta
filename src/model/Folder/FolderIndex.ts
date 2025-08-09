import Fuse from "fuse.js";
import { Folder, FolderGroup } from "./Folder";
import * as Path from "path";
import { reaction } from "mobx";

interface IndexedFolder {
  folder: Folder;
  blob: string; // concatenation of all field texts and file names
}

// A FolderIndex instance is attached to exactly one FolderGroup.
export class FolderIndex {
  private group?: FolderGroup;
  private fuse?: Fuse<IndexedFolder>;
  private lastSnapshot: string = "";

  public attach(group: FolderGroup) {
    this.group = group;
    this.build();
    group._setIndex(this); // internal hook from FolderGroup
    // Rebuild index reactively when folder items or contained file lists change.
    reaction(
      () =>
        this.group!.items.map(
          (f) =>
            f.properties
              .values()
              .map((fld: any) =>
                fld && typeof fld.text === "string" ? fld.text : ""
              )
              .join("|") +
            "::" +
            (f.files || [])
              .map((file: any) =>
                file && file.pathInFolderToLinkFileOrLocalCopy
                  ? Path.basename(file.pathInFolderToLinkFileOrLocalCopy)
                  : ""
              )
              .join(",")
        ).join("\n"),
      (sig, prev) => {
        if (sig !== prev) {
          this.build();
        }
      }
    );
  }

  public build() {
    if (!this.group) return;
    const items: IndexedFolder[] = this.group.items.map((f) => ({
      folder: f,
      blob: this.makeBlob(f)
    }));
    this.fuse = new Fuse(items, {
      keys: ["blob"],
      includeScore: false,
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 1
    });
    this.lastSnapshot = items.map((i) => i.blob).join("\n");
  }

  public search(query: string): Folder[] {
    if (!this.group) return [];
    if (!this.fuse) this.build();
    if (!query.trim()) return this.group.items;
    const results = this.fuse!.search(query.trim());
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
