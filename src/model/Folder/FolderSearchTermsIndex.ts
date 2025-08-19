import Fuse from "fuse.js";
import { Folder } from "./Folder";
import { FolderGroup } from "./FolderGroup";
import * as Path from "path";
import { reaction } from "mobx";
import { PersonMetadataFile } from "../Project/Person/Person";
import { SessionMetadataFile } from "../Project/Session/Session";
import { staticLanguageFinder } from "../../languageFinder/LanguageFinder";
import { NotifyException } from "../../components/Notify";
import { Project } from "../Project/Project";

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
        this.group!.items.map((f) => {
          // Folder-level properties signature (e.g., Session/Person fields)
          const folderPropsSig = f.properties
            .values()
            .map((fld: any) =>
              fld && typeof fld.text === "string" ? fld.text : ""
            )
            .join("|");

          // Files signature: include file names, file metadata field texts, and contributions
          const filesSig = (f.files || [])
            .map((file: any) => {
              const name =
                file && file.pathInFolderToLinkFileOrLocalCopy
                  ? Path.basename(file.pathInFolderToLinkFileOrLocalCopy)
                  : "";
              let propsText = "";
              try {
                if (file && file.properties && file.properties.values) {
                  propsText = file.properties
                    .values()
                    .map((p: any) =>
                      p && typeof p.text === "string" ? p.text : ""
                    )
                    .join("|");
                }
              } catch {}
              let contribText = "";
              try {
                if (file && Array.isArray(file.contributions)) {
                  contribText = file.contributions
                    .map((c: any) =>
                      [c?.personReference, c?.role, c?.comments]
                        .filter(Boolean)
                        .join("|")
                    )
                    .join(";");
                }
              } catch {}
              return [name, propsText, contribText].join("||");
            })
            .join(",");

          // Language-related signals for Person/Session (match makeBlob sources)
          let languageSig = "";
          try {
            if (f.metadataFile instanceof PersonMetadataFile) {
              languageSig = (f.metadataFile.languages || [])
                .map((lng: any) => lng?.code || "")
                .join("|");
            } else if (f.metadataFile instanceof SessionMetadataFile) {
              const subject = f.properties.getTextStringOrEmpty("languages");
              const working =
                f.properties.getTextStringOrEmpty("workingLanguages");
              languageSig = [subject, working].join("|");
            }
          } catch {}

          return [folderPropsSig, filesSig, languageSig].join("::");
        }).join("\n"),
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
    const fieldBits = f.properties
      .values()
      .map((field: any) =>
        field && typeof field.text === "string" ? field.text : ""
      );
    const fileBits: string[] = [];
    (f.files || []).forEach((file: any) => {
      try {
        if (file && file.pathInFolderToLinkFileOrLocalCopy) {
          fileBits.push(Path.basename(file.pathInFolderToLinkFileOrLocalCopy));
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
      } catch (e: any) {
        NotifyException(e, "Indexing file metadata failed");
      }
    });

    // Include person languages in search if this folder has a PersonMetadataFile
    const languageBits: string[] = [];
    if (f.metadataFile instanceof PersonMetadataFile) {
      for (const language of f.metadataFile.languages) {
        if (language.code) {
          // Include both the language code and the language name in the search
          languageBits.push(language.code);
          let languageName = "";
          try {
            languageName =
              staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
                language.code
              );
          } catch (e: any) {
            NotifyException(e, "Language name lookup failed");
          }
          if (languageName && languageName !== language.code) {
            languageBits.push(languageName);
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
            let name = "";
            try {
              name =
                staticLanguageFinder.findOneLanguageNameFromCode_Or_ReturnCode(
                  code
                );
            } catch (e: any) {
              NotifyException(e, "Language name lookup failed");
            }
            if (name && name !== code) {
              languageBits.push(name);
            }
          });
      };
      try {
        const subject = f.properties.getTextStringOrEmpty("languages");
        addLangFromCodes(subject);
      } catch (e: any) {
        NotifyException(e, "Reading subject languages failed");
      }
      try {
        const working = f.properties.getTextStringOrEmpty("workingLanguages");
        addLangFromCodes(working);
      } catch (e: any) {
        NotifyException(e, "Reading working languages failed");
      }
    }

    // If this is a Person folder, also include contribution roles/comments/session names
    // pulled from the current Project to allow role-based person search.
    const personContributionBits: string[] = [];
    if (f.metadataFile instanceof PersonMetadataFile) {
      const personId = (f as any).getIdToUseForReferences
        ? (f as any).getIdToUseForReferences()
        : f.displayName;
      try {
        const contribs = Project.getContributionsMatchingPersonStatic(personId);
        contribs.forEach((c) => {
          if (c.role) personContributionBits.push(c.role);
          if (c.comments) personContributionBits.push(c.comments);
          if ((c as any).sessionName)
            personContributionBits.push((c as any).sessionName);
        });
      } catch (e: any) {
        NotifyException(e, "Indexing person contributions failed");
      }
    }

    return [
      ...fieldBits,
      ...fileBits,
      ...languageBits,
      ...personContributionBits
    ].join(" | ");
  }
}

// Shared minimum search length for folder searches and highlights.
export const kMinimumSearchTermLength = 2;
