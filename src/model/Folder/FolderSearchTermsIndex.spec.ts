import { describe, it, expect } from "vitest";
import { Folder } from "./Folder";
import { FolderGroup } from "./FolderGroup";
import { FieldSet } from "../field/FieldSet";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
// No direct import of FolderSearchTermsIndex; test exercises lazy creation via FolderGroup.filter()

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

describe("FolderSearchTermsIndex", () => {
  it("searches across concatenated fields and updates after field change", () => {
    const g = new FolderGroup();
    const f1 = new FakeFolder({ id: "A1", title: "Alpha", notes: "red fox" });
    const f2 = new FakeFolder({
      id: "B1",
      title: "Bravo",
      notes: "blue whale"
    });
    g.items.push(f1, f2);
    g.filter("fox");
    expect(g.filteredItems!.length).toBe(1);
    expect(g.filteredItems![0]).toBe(f1);

    // change a field to include search term
    f2.properties.setText("notes", "giant fox hunter");
    // trigger a re-filter; since our current simple reaction in FolderSearchTermsIndex rebuilds
    // synchronously on observable changes, filtering again should now see both
    g.filter("fox");
    // Both should now match; order not guaranteed
    expect(g.filteredItems!.length).toBe(2);
  });
});
