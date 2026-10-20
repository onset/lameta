import { action, makeObservable, observable } from "mobx";
import { Folder } from "../model/Folder/Folder";
import { File } from "../model/file/File";

// Tab ids are internal to navigation and the components that render the tabs.
// NavigationTarget does not use them; navigateTo() works them out from the data.

export type TopTab = "project" | "sessions" | "people";

// The tabs inside the Project tab. ProjectTab maps these to its own tab order.
export type ProjectTabId =
  | "archive"
  | "project"
  | "grant"
  | "languages"
  | "translations"
  | "location"
  | "description-docs"
  | "other-docs"
  | "imdi"
  | "paradisec"
  | "lameta"
  | "rocrate";

// The tabs under the file list of a session or person. Which ones exist depends on
// the type of the selected file; FileTabs (in FolderPane) maps these to its own tab order.
export type FileTabId =
  | "session"
  | "person"
  | "contributions"
  | "contributors"
  | "status"
  | "notes"
  | "properties"
  | "access"
  | "main" // the first tab of a media or other file: Audio, Video, Image, Text, PDF, ELAN, File
  | "imdi"
  | "paradisec"
  | "rocrate";

export interface IFileTabRequest {
  folder: Folder;
  file: File;
  fileTab: FileTabId;
}

// Which tabs are showing. Workspace and ProjectTab render from this, so changing it
// (from a click or from navigateTo()) switches tabs.
// Which folder and file are selected is not here; that lives in FolderGroup.selectedIndex
// and Folder.selectedFile.
export class NavigationState {
  public topTab: TopTab = "project";
  public projectTab: ProjectTabId = "archive";
  // FileTabs keeps its own tab index, because whether it resets depends on the kind of
  // file. navigateTo() leaves a request here, and the FileTabs showing that folder and
  // file applies it and clears it.
  public fileTabRequest: IFileTabRequest | undefined = undefined;

  constructor() {
    makeObservable(this, {
      topTab: observable,
      projectTab: observable,
      fileTabRequest: observable.ref,
      setTopTab: action,
      setProjectTab: action,
      requestFileTab: action,
      takeFileTabRequest: action,
    });
  }

  public setTopTab(tab: TopTab) {
    this.topTab = tab;
  }
  public setProjectTab(tab: ProjectTabId) {
    this.projectTab = tab;
  }
  public requestFileTab(request: IFileTabRequest | undefined) {
    this.fileTabRequest = request;
  }
  // Returns the pending request if it is for this folder and file, and clears it.
  public takeFileTabRequest(folder: Folder, file: File): FileTabId | undefined {
    const request = this.fileTabRequest;
    if (!request || request.folder !== folder || request.file !== file) return undefined;
    this.fileTabRequest = undefined;
    return request.fileTab;
  }
}

export const navigationState = new NavigationState();
