import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder/Folder";
import { FolderGroup } from "../model/Folder/FolderGroup";
import { File } from "../model/file/File";
import { NavigationTarget } from "./NavigationTarget";
import { FileTabId, NavigationState, navigationState, ProjectTabId } from "./NavigationState";
import { findVocabularyTranslationRow, revealElement, revealField } from "./revealField";
import { kProjectTabOfForm } from "../components/project/projectTabOfForm";
import { getFileTabOfField } from "../components/fileTabOfField";

export type NavigationResult =
  | { found: true }
  // "folder": no session or person has that id any more
  // "file": the folder has no file with that name
  // "field": the file has no field with that key
  | { found: false; missing: "folder" | "file" | "field" }
  // the field exists, but no tab shows fields of its `form`
  | { found: false; missing: "tab"; form: string };

// Takes the user to the target: switches tabs, selects the folder and file, then
// scrolls to the field, focuses it, and highlights it. The highlight stays until the
// user selects another tab, folder or file, or `keepHighlightWhile` turns false.
export async function navigateTo(
  project: Project,
  target: NavigationTarget,
  keepHighlightWhile: () => boolean = () => true,
): Promise<NavigationResult> {
  const result = selectTarget(project, target);
  if (result.found && target.folderType === "project" && target.vocabularyTranslation) {
    const { fieldKey, value } = target.vocabularyTranslation;
    const selection = currentSelection(project, target);
    await revealElement(
      () => findVocabularyTranslationRow(fieldKey, value),
      `the translations of ${fieldKey} "${value}"`,
      () =>
        currentSelection(project, target).every((s, i) => s === selection[i]) &&
        keepHighlightWhile(),
      // the Translations tab scans the sessions before it lists a value new to it
      10000,
    );
  } else if (result.found && target.fieldKey) {
    const selection = currentSelection(project, target);
    await revealField(
      target.folderType === "project"
        ? "project"
        : target.folderType === "session"
          ? "sessions"
          : "people",
      target.fieldKey,
      () =>
        currentSelection(project, target).every((s, i) => s === selection[i]) &&
        keepHighlightWhile(),
    );
  }
  return result;
}

// What the user is looking at, as far as MobX can see it. When this changes, the
// element that navigateTo() highlighted may now show the same field of another
// folder or file, because React reuses elements.
function currentSelection(project: Project, target: NavigationTarget): unknown[] {
  if (target.folderType === "project")
    return [
      navigationState.topTab,
      navigationState.projectTab,
      target.documents && documentsFolder(project, target.documents).selectedFile,
    ];
  const group = target.folderType === "session" ? project.sessions : project.persons;
  const folder = group.items[group.selectedIndex];
  return [navigationState.topTab, folder, folder?.selectedFile];
}

// The part of navigateTo() that changes the model and NavigationState. React then
// renders the target; nothing here touches the DOM. If the result is not found,
// nothing has changed.
export function selectTarget(
  project: Project,
  target: NavigationTarget,
  state: NavigationState = navigationState,
): NavigationResult {
  if (target.folderType === "project" && target.documents) {
    const folder = documentsFolder(project, target.documents);
    const file = folder.files.find((f) => f.getTextProperty("filename", "") === target.fileName);
    if (!file) return { found: false, missing: "file" };
    if (target.fieldKey && !file.properties.getValue(target.fieldKey))
      return { found: false, missing: "field" };
    folder.selectedFile = file;
    // a document's fields are on its Access tab
    state.requestFileTab(target.fieldKey ? { folder, file, fileTab: "access" } : undefined);
    state.setProjectTab(target.documents === "description" ? "description-docs" : "other-docs");
    state.setTopTab("project");
    return { found: true };
  }
  if (target.folderType === "project" && target.vocabularyTranslation) {
    state.setProjectTab("translations");
    state.setTopTab("project");
    return { found: true };
  }
  if (target.folderType === "project") {
    if (target.fieldKey) {
      const tab = findProjectTab(project, target.fieldKey);
      if (typeof tab !== "string") return tab;
      state.setProjectTab(tab);
    }
    state.setTopTab("project");
    return { found: true };
  }

  const group: FolderGroup = target.folderType === "session" ? project.sessions : project.persons;
  const folder = group.items.find((f) => f.importIdMatchesThisFolder(target.folderId));
  if (!folder) return { found: false, missing: "folder" };
  const file = target.fileName
    ? folder.files.find((f) => f.getTextProperty("filename", "") === target.fileName)
    : folder.metadataFile;
  if (!file) return { found: false, missing: "file" };
  let fileTab: FileTabId | undefined;
  if (target.fieldKey) {
    const tab = findFileTab(target.folderType, folder, file, target.fieldKey);
    if (typeof tab !== "string") return tab;
    fileTab = tab;
  }

  selectFolder(group, folder);
  folder.selectedFile = file;
  state.requestFileTab(fileTab ? { folder, file, fileTab } : undefined);
  state.setTopTab(target.folderType === "session" ? "sessions" : "people");
  return { found: true };
}

function documentsFolder(project: Project, documents: "description" | "other"): Folder {
  return documents === "description" ? project.descriptionFolder : project.otherDocsFolder;
}

function findProjectTab(project: Project, fieldKey: string): ProjectTabId | NavigationResult {
  const field = project.properties.getValue(fieldKey);
  if (!field) return { found: false, missing: "field" };
  const tab = kProjectTabOfForm[field.form];
  return tab ?? { found: false, missing: "tab", form: field.form };
}

function findFileTab(
  folderType: "session" | "person",
  folder: Folder,
  file: File,
  fieldKey: string,
): FileTabId | NavigationResult {
  const fileKind = file === folder.metadataFile ? folderType : "other";
  const field = file.properties.getValue(fieldKey);
  // "contributions" is a list on session and media files, not a field
  const isContributions = fieldKey === "contributions" && fileKind !== "person";
  if (!field && !isContributions) return { found: false, missing: "field" };
  const tab = getFileTabOfField(fileKind, fieldKey, field?.form);
  if (tab) return tab;
  return { found: false, missing: "tab", form: field?.form ?? "" };
}

function selectFolder(group: FolderGroup, folder: Folder) {
  const index = group.items.indexOf(folder);
  if (group.selectedIndex === index) return;
  // same as clicking a row in FolderList
  if (group.selectedIndex > -1 && group.items[group.selectedIndex]) {
    group.items[group.selectedIndex].saveAllFilesInFolder();
  }
  // a search filter that hides the folder would leave the user looking at a folder that isn't in the list
  if (group.filteredItems && !group.filteredItems.includes(folder)) {
    group.filter(undefined);
  }
  group.selectedIndex = index;
}
