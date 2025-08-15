import { describe, it, expect } from "vitest";
import { Folder } from "./Folder";
import { FolderGroup } from "./FolderGroup";
import { FieldSet } from "../field/FieldSet";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import { PersonMetadataFile } from "../Project/Person/Person";

import * as temp from "temp";
import * as fs from "fs";

import { runInAction } from "mobx";
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

  it("searches person languages case-insensitively (LAM-18 regression test)", () => {
    // Test the fix for LAM-18 by creating a folder that mimics Person structure
    // and has a PersonMetadataFile with languages
    const g = new FolderGroup();

    // Create a temp directory for the PersonMetadataFile
    const tempDir = temp.mkdirSync("test-person");

    try {
      // Create a fake Person-like folder with actual PersonMetadataFile instance
      const personWithLanguage = new FakeFolder({
        id: "P1",
        name: "Test Person"
      });

      // Create an actual PersonMetadataFile instance with real temp directory
      const registry = new EncounteredVocabularyRegistry();
      const fakeMetadataFile = new PersonMetadataFile(tempDir, registry);

      // Add language using MobX action to avoid strict mode issues
      runInAction(() => {
        fakeMetadataFile.languages.push({ code: "dad", primary: true });
      });

      // Override the metadataFile property to use our PersonMetadataFile
      (personWithLanguage as any).metadataFile = fakeMetadataFile;

      // Override folderType to be "person" so our fix applies
      Object.defineProperty(personWithLanguage, "folderType", {
        value: "person",
        writable: false
      });

      // Override displayName so it shows up in debug output
      Object.defineProperty(personWithLanguage, "displayName", {
        value: "Test Person",
        writable: false
      });

      const personWithoutLanguage = new FakeFolder({
        id: "P2",
        name: "Other Person"
      });
      Object.defineProperty(personWithoutLanguage, "folderType", {
        value: "person",
        writable: false
      });

      // Override displayName so it shows up in debug output
      Object.defineProperty(personWithoutLanguage, "displayName", {
        value: "Other Person",
        writable: false
      });

      g.items.push(personWithLanguage as any, personWithoutLanguage as any);

      // Test the specific LAM-18 bug: "dad" worked but "dadi" didn't
      // The issue was that language name was not included in search at all (just the code)
      g.filter("dad");
      expect(g.filteredItems!.length).toBe(1); // partial match - worked before
      expect(g.filteredItems![0]).toBe(personWithLanguage);

      g.filter("dadi");
      expect(g.filteredItems!.length).toBe(1); // case-insensitive partial - THIS WAS BROKEN
      expect(g.filteredItems![0]).toBe(personWithLanguage);

      g.filter("Dadi");
      expect(g.filteredItems!.length).toBe(1); // case-insensitive exact
      expect(g.filteredItems![0]).toBe(personWithLanguage);

      // Note: "Dadi Dadi" (full language name) would work in real app but not in test
      // because staticLanguageFinder is not available in test environment

      g.filter("xyz");
      expect(g.filteredItems!.length).toBe(0); // no match
    } finally {
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
