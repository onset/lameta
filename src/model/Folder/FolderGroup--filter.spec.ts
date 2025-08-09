import { describe, it, expect } from "vitest";
import { Folder, FolderGroup } from "./Folder";
import { FieldSet } from "../field/FieldSet";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";

// Minimal fake Folder implementation for testing filter logic
class FakeFolder extends Folder {
  private _props: FieldSet;
  public constructor(fields: Record<string, string>) {
    // directory/metadata/customVocab not needed for filter logic
    super("", null as any, [], new EncounteredVocabularyRegistry());
    this._props = new FieldSet();
    Object.keys(fields).forEach((k) =>
      this._props.addTextProperty(k, fields[k])
    );
  }
  public get properties(): FieldSet {
    return this._props;
  }
  public importIdMatchesThisFolder(id: string): boolean {
    return false;
  }
  public get folderType() {
    return "session" as const; // arbitrary
  }
  public get propertyForCheckingId(): string {
    return "id";
  }
  public migrateFromPreviousVersions(): void {
    /* noop */
  }
  public get displayName(): string {
    return this._props.getTextStringOrEmpty("title") || "";
  }
}

describe("FolderGroup.filter", () => {
  it("sets filteredItems undefined when called with undefined or blank", () => {
    const g = new FolderGroup();
    g.items.push(new FakeFolder({ id: "One", title: "Alpha" }));
    g.filter(undefined);
    expect(g.filteredItems).toBeUndefined();
    g.filter(" ");
    expect(g.filteredItems).toBeUndefined();
  });
  it("filters case-insensitively across all fields", () => {
    const g = new FolderGroup();
    g.items.push(new FakeFolder({ id: "S1", title: "Alpha" }));
    g.items.push(
      new FakeFolder({ id: "S2", title: "Bravo", notes: "The Quick Brown fox" })
    );
    g.items.push(
      new FakeFolder({ id: "S3", title: "charlie", description: "βeta data" })
    );

    g.filter("alpha");
    expect(g.filteredItems!.length).toBe(1);
    expect(g.filteredItems![0].properties.getTextStringOrEmpty("title")).toBe(
      "Alpha"
    );

    g.filter("FOX");
    expect(g.filteredItems!.length).toBe(1);
    expect(g.filteredItems![0].properties.getTextStringOrEmpty("id")).toBe(
      "S2"
    );

    g.filter("βETA");
    expect(g.filteredItems!.length).toBe(1);
    expect(g.filteredItems![0].properties.getTextStringOrEmpty("id")).toBe(
      "S3"
    );

    g.filter("nosuchmatch");
    expect(g.filteredItems).toBeDefined();
    expect(g.filteredItems!.length).toBe(0);

    g.filter(undefined);
    expect(g.filteredItems).toBeUndefined();
  });
  it("matches on file names when fields don't contain term", () => {
    const g = new FolderGroup();
    const f1 = new FakeFolder({ id: "F1", title: "NoMatch" }) as any;
    f1.files = [
      {
        pathInFolderToLinkFileOrLocalCopy: "/tmp/audio-one.MP3"
      }
    ];
    const f2 = new FakeFolder({ id: "F2", title: "StillNo" }) as any;
    f2.files = [
      {
        pathInFolderToLinkFileOrLocalCopy: "/tmp/readme.txt"
      }
    ];
    g.items.push(f1, f2);
    g.filter("mp3");
    expect(g.filteredItems!.length).toBe(1);
    expect(g.filteredItems![0].properties.getTextStringOrEmpty("id")).toBe(
      "F1"
    );
  });
});
