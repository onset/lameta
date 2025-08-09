import { describe, it, expect } from "vitest";
import { FolderGroup, Folder } from "./Folder";
import { FieldSet } from "../field/FieldSet";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { FolderIndex } from "./FolderIndex";

class FakeFolder extends Folder {
  private _props = new FieldSet();
  constructor(fields: Record<string, string>) {
    super("", null as any, [], new EncounteredVocabularyRegistry());
    Object.entries(fields).forEach(([k, v]) =>
      this._props.addTextProperty(k, v)
    );
  }
  public get properties(): FieldSet {
    return this._props;
  }
  public importIdMatchesThisFolder(): boolean {
    return false;
  }
  public get folderType() {
    return "session" as const;
  }
  public get propertyForCheckingId(): string {
    return "id";
  }
  public migrateFromPreviousVersions(): void {
    /* noop */
  }
  public get displayName(): string {
    return this._props.getTextStringOrEmpty("title");
  }
}

describe("FolderIndex", () => {
  it("searches across concatenated fields and updates after field change", () => {
    const g = new FolderGroup();
    const f1 = new FakeFolder({ id: "A1", title: "Alpha", notes: "red fox" });
    const f2 = new FakeFolder({
      id: "B1",
      title: "Bravo",
      notes: "blue whale"
    });
    g.items.push(f1, f2);
    const index = new FolderIndex();
    index.attach(g);

    g.filter("fox");
    expect(g.filteredItems!.length).toBe(1);
    expect(g.filteredItems![0]).toBe(f1);

    // change a field to include search term
    f2.properties.setText("notes", "giant fox hunter");
    // explicitly rebuild index (in app a reaction or subsequent attach/build could handle this)
    index.build(g);
    g.filter("fox");
    // Both should now match; order not guaranteed
    expect(g.filteredItems!.length).toBe(2);
  });
});
