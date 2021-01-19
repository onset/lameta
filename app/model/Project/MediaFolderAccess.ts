import { NotifyWarning } from "../../components/Notify";
import {
  getMediaFolderOrEmptyForProjectAndMachine,
  setMediaFolderOrEmptyForProjectAndMachine,
} from "../../other/UserSettings";

let sCurrentProjectId: string = "";
export function getCurrentProjectId(): string {
  return sCurrentProjectId;
}
export function setCurrentProjectId(projectId: string) {
  sCurrentProjectId = projectId;
}
// We store the media folder in a way that is unique to the title of the
// project and the machine we are on.
export function getMediaFolderOrEmptyForThisProjectAndMachine() {
  if (sCurrentProjectId === null) {
    throw new Error(
      "getMediaFolderOrEmptyForThisProjectAndMachine() called when sCurrentProject is null"
    );
  }
  // Note, we'd rather have an id that cannot change, but don't have one to
  // work with at the moment.

  if (!sCurrentProjectId) {
    NotifyWarning("The title for this project is empty.");
    return "";
  }
  return getMediaFolderOrEmptyForProjectAndMachine(sCurrentProjectId);
}

export function setMediaFolderOrEmptyForThisProjectAndMachine(path: string) {
  if (!path) {
    throw new Error(
      "setMediaFolderOrEmptyForThisProjectAndMachine() called with empty path"
    );
  }

  if (!sCurrentProjectId) {
    NotifyWarning("The title for this project is empty.");
  }
  setMediaFolderOrEmptyForProjectAndMachine(sCurrentProjectId, path);
}
