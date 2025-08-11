import { makeObservable, observable } from "mobx";
import { Folder } from "./Folder";
import { FolderSearchTermsIndex } from "./FolderSearchTermsIndex";

// There are two `FolderGroup` instances, one for people and one for sessions.

export class FolderGroup {
  public items: Folder[];
  // if set (even to empty array), UI should show only these instead of items
  public filteredItems: Folder[] | undefined;
  // increments each time an external caller clears the filter (filter(undefined)).
  // UI components (e.g. FolderList) can observe this to know they should also clear their search input state.
  public searchResetCounter: number;
  // holds the current (last non-empty) search string so that UI components can persist it across unmounts/mounts
  public searchTerm: string;
  private searchIndex?: FolderSearchTermsIndex; // lazily instantiated per FolderGroup; never a singleton

  public selectedIndex: number;

  constructor() {
    makeObservable(this, {
      items: observable,
      selectedIndex: observable,
      filteredItems: observable,
      searchResetCounter: observable,
      searchTerm: observable
    });

    this.items = new Array<Folder>();
    this.selectedIndex = -1;
    this.searchResetCounter = 0;
    this.searchTerm = "";
  }
  // index is now directly assigned by the caller (FolderGroup.filter) when lazily creating it.
  public selectFirstMarkedFolder() {
    const foundIndex = this.items.findIndex((f) => f.marked);
    if (foundIndex >= 0) this.selectedIndex = foundIndex;
  }

  public unMarkAll() {
    this.items.forEach((f) => {
      f.marked = false;
    });
  }
  public countOfMarkedFolders(): number {
    return this.items.filter((f) => f.marked).length;
  }

  // Sets filteredItems based on a case-insensitive substring match across all text fields of each folder.
  // If search is undefined or empty string after trimming, clears the filter (filteredItems becomes undefined).
  public filter(search: string | undefined) {
    // Preserve original user-entered (trimmed) query for UI (tests expect original casing/symbols)
    this.searchTerm = search ? search.trim() : "";
    const normalized = this.searchTerm.toLowerCase();
    if (normalized === "") {
      this.filteredItems = undefined;
      // signal to any observers (e.g. FolderList) that the filter was programmatically cleared
      this.searchResetCounter++;
      return;
    }

    // Lazily build the index the first time we actually filter with a non-empty string.
    // Review: Might this be too slow, and happen as the person is typing?
    if (!this.searchIndex) {
      try {
        this.searchIndex = new FolderSearchTermsIndex(this);
      } catch {
        // ignore if dynamic load fails; we'll use fallback
      }
    }
    if (this.searchIndex) {
      try {
        this.filteredItems = this.searchIndex.search(normalized);
        this.adjustSelectionAfterFilter();
        return;
      } catch {
        // fall back
      }
    }
    this.filteredItems = this.items.filter((folder) => {
      try {
        const fields = folder.properties.values();
        for (const field of fields) {
          if (
            field &&
            typeof field.text === "string" &&
            field.text.toLowerCase().includes(normalized)
          ) {
            return true;
          }
        }
        // also search files: names + metadata fields + contributions
        if (folder.files) {
          for (const file of folder.files as any[]) {
            try {
              if (
                (file.pathInFolderToLinkFileOrLocalCopy || "")
                  .toLowerCase()
                  .includes(normalized)
              )
                return true;
              if (file.properties && file.properties.values) {
                for (const p of file.properties.values()) {
                  if (
                    p &&
                    typeof p.text === "string" &&
                    p.text.toLowerCase().includes(normalized)
                  )
                    return true;
                }
              }
              if (Array.isArray(file.contributions)) {
                for (const c of file.contributions) {
                  if (
                    (c.personReference &&
                      c.personReference.toLowerCase().includes(normalized)) ||
                    (c.role && c.role.toLowerCase().includes(normalized)) ||
                    (c.comments &&
                      c.comments.toLowerCase().includes(normalized))
                  )
                    return true;
                }
              }
            } catch {}
          }
        }
      } catch {}
      return false;
    });
    this.adjustSelectionAfterFilter();
  }

  private adjustSelectionAfterFilter() {
    if (this.filteredItems === undefined) return; // no filtering
    if (this.filteredItems.length === 0) {
      this.selectedIndex = -1;
      return;
    }
    if (this.selectedIndex < 0) {
      this.selectedIndex = 0;
      return;
    }
    const currentlySelected = this.items[this.selectedIndex];
    if (!this.filteredItems.includes(currentlySelected)) {
      // pick first filtered item
      const first = this.filteredItems[0];
      const newIndexInAll = this.items.indexOf(first);
      this.selectedIndex = newIndexInAll;
    }
  }
}
