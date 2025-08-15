import Fuse from "fuse.js";
import { Folder } from "./Folder";
import { FolderGroup } from "./FolderGroup";
import * as Path from "path";
import { reaction } from "mobx";
import { PersonMetadataFile } from "../Project/Person/Person";
import { SessionMetadataFile } from "../Project/Session/Session";
import { staticLanguageFinder } from "../../languageFinder/LanguageFinder";

interface IndexedFolder {
  folder: Folder;
  blob: string; // concatenation of all field texts, file names, and file metadata fields
}

// Each FolderGroup owns one FolderSearchTermsIndex
export class FolderSearchTermsIndex {
  private group?: FolderGroup;
  private index?: Fuse<IndexedFolder>;

  constructor(group: FolderGroup) {
    this.group = group;
    this.build();
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
    // This gives us exact matches only. "Fuzzy", while conceivably helpful,
    // is too confusing for a user that is trying to filter down to a set
    // of folders to work with.
    this.index = new Fuse(items, {
      keys: ["blob"],
      includeScore: false,
      threshold: 0.0,
      ignoreLocation: true,
      minMatchCharLength: kMinimumSearchTermLength
    });
  }

  public search(query: string): Folder[] {
    if (!this.group) return [];
    if (!this.index) this.build();
    if (!query.trim()) return this.group.items;
    const results = this.index!.search(query.trim());
    return results.map((r) => r.item.folder);
  }

  private makeBlob(f: Folder): string {
    try {
      const fieldBits = f.properties
        .values()
        .map((field: any) =>
          field && typeof field.text === "string" ? field.text : ""
        );
      const fileBits: string[] = [];
      (f.files || []).forEach((file: any) => {
        try {
          if (file && file.pathInFolderToLinkFileOrLocalCopy) {
            fileBits.push(
              Path.basename(file.pathInFolderToLinkFileOrLocalCopy)
            );
          }
          // include all metadata field texts
          if (file && file.properties && file.properties.values) {
            const props = file.properties.values();
            for (const p of props) {
              if (p && typeof p.text === "string") fileBits.push(p.text);
            }
          }
          // include contributions (personReference, role, comments)
          if (file && Array.isArray(file.contributions)) {
            for (const c of file.contributions) {
              if (c.personReference) fileBits.push(c.personReference);
              if (c.role) fileBits.push(c.role);
              if (c.comments) fileBits.push(c.comments);
            }
          }
        } catch {}
      });

      // Include person languages in search if this folder has a PersonMetadataFile
      const languageBits: string[] = [];
      if (f.metadataFile instanceof PersonMetadataFile) {
        for (const language of f.metadataFile.languages) {
          if (language.code) {
            // Include both the language code and the language name in the search
            languageBits.push(language.code);
            try {
              const languageName =
                staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
                  language.code
                );
              if (languageName && languageName !== language.code) {
                languageBits.push(languageName);
              }
            } catch (e) {
              // Skip language name resolution if staticLanguageFinder is not available
            }
          }
        }
      }

      // Include session languages (subject and working) if this folder has a SessionMetadataFile
      if (f.metadataFile instanceof SessionMetadataFile) {
        const addLangFromCodes = (codes: string) => {
          codes
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .forEach((code) => {
              languageBits.push(code);
              try {
                const name =
                  staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
                    code
                  );
                if (name && name !== code) {
                  languageBits.push(name);
                }
              } catch {}
            });
        };
        try {
          const subject = f.properties.getTextStringOrEmpty("languages");
          addLangFromCodes(subject);
        } catch {}
        try {
          const working = f.properties.getTextStringOrEmpty("workingLanguages");
          addLangFromCodes(working);
        } catch {}
      }

      return [...fieldBits, ...fileBits, ...languageBits].join(" | ");
    } catch {
      return "";
    }
  }
}

// Shared minimum search length for folder searches and highlights.
export const kMinimumSearchTermLength = 2;
