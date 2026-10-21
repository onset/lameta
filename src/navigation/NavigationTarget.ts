// A place in lameta's data that the user can be taken to, described as plain data so
// that a check can say where a problem is without knowing anything about lameta's UI.
// navigateTo() works out which tab shows it.
// It names things by the ids a user sees, not by object references, so a target can
// outlive the folder it points at (navigateTo() then reports that it is gone).

export type NavigationTarget =
  | {
      folderType: "project";
      // A file in the Description Documents or Other Documents tab. If omitted, the
      // target is a field of the project itself.
      documents?: "description" | "other";
      fileName?: string;
      // the `key` from fields.json5. If omitted, the Project tab is just selected.
      fieldKey?: string;
    }
  | {
      folderType: "session" | "person";
      // Session.id or Person.getIdToUseForReferences()
      folderId: string;
      // a file in the folder; if omitted, the folder's own metadata file (.session/.person)
      fileName?: string;
      // The `key` from fields.json5, a custom field's key, "notes", or "contributions"
      // (the list of people who contributed to the file).
      // If omitted, the folder or file is just selected.
      fieldKey?: string;
    };
