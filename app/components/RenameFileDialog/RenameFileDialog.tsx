import * as React from "react";
import * as fs from "fs";
import * as Path from "path";
import ReactModal from "react-modal";
import "./RenameFileDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { File, kLinkExtensionWithFullStop } from "../../model/file/File";
import { Folder } from "../../model/Folder/Folder";
import { Trans } from "@lingui/react";
import _ from "lodash";
import { sanitizeForArchive } from "../../other/sanitizeForArchive";
import userSettingsSingleton from "../../other/UserSettings";
const sanitizeFilename = require("sanitize-filename");

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
  file?: File;
  filename: string;
  core: string;
  folder?: Folder; // serves as a prefix on files which should not be modified by the user in this dialog
}

export default class RenameFileDialog extends React.Component<IProps, IState> {
  private static singleton: RenameFileDialog;

  constructor(props: IProps) {
    super(props);

    this.state = {
      isOpen: false,
      file: undefined,
      core: "",
      folder: undefined,
      filename: "",
    };
    RenameFileDialog.singleton = this;
  }
  private handleCloseModal(doRename: boolean) {
    if (doRename) {
      console.log("Attempting rename to " + this.getNewFileName());
      if (
        !this.state.folder!.renameChildWithFilenameMinusExtension(
          this.state.file!,
          this.getNewFileName(false)
        )
      ) {
        return; // don't close if it failed
      }
    }
    this.setState({ isOpen: false, file: undefined, core: "" });
  }

  public static async show(file: File, folder: Folder) {
    RenameFileDialog.singleton.setState({
      file,
      filename: Path.basename(file.pathInFolderToLinkFileOrLocalCopy),
      folder,
      core: this.getCore(
        file.pathInFolderToLinkFileOrLocalCopy,
        folder.filePrefix
      ),
      isOpen: true,
    });
  }
  public render() {
    if (!this.state.isOpen) {
      return null;
    }
    const haveValidPath = this.getValidationProblemsMessage() === ""; // review: could do this when state changes
    const pathUnchanged =
      Path.normalize(this.getNewPath()) ===
      Path.normalize(this.state.file!.pathInFolderToLinkFileOrLocalCopy);
    const canRenameNow = !pathUnchanged && haveValidPath;
    return (
      <CloseOnEscape
        onEscape={() => {
          this.handleCloseModal(false);
        }}
      >
        <ReactModal
          ariaHideApp={false}
          className="renameFileDialog"
          isOpen={this.state.isOpen}
          shouldCloseOnOverlayClick={true}
          onRequestClose={() => this.handleCloseModal(false)}
        >
          <div className={"dialogTitle"}>
            <Trans>Rename File</Trans>
          </div>
          <div className="dialogContent">
            <div className="row">
              <h1>
                <Trans>Change Name To:</Trans>
              </h1>
            </div>
            <div className="row">
              <span className="affix">
                {RenameFileDialog.getUneditablePrefix(
                  this.state.filename,
                  this.state.folder!.filePrefix
                )}
              </span>
              <input
                autoFocus
                onKeyDown={(e) => {
                  if (e.keyCode === 13 && canRenameNow) {
                    // doesn't close if we do this right away
                    window.setTimeout(() => this.handleCloseModal(true), 0);
                  }
                }}
                value={this.state.core}
                onChange={(e) => this.setState({ core: e.target.value })}
              />

              {/* many hassles with this, not worth it
              <ContentEditable
                className="core"
                onChange={e => {                
                  this.setState({ core: e.target.value });
                }
                html={this.state.core}
              /> */}
              <span className="affix">
                {RenameFileDialog.getUneditableSuffix(this.state.filename)}
              </span>
            </div>
            <div className="validationMessage">
              {pathUnchanged ? "" : this.getValidationProblemsMessage()}
            </div>
            {this.state.file?.isLinkFile() && (
              <p>
                Note that this is a link to a file in your Media Files
                directory. Here, you are renaming this link, not the original
                file that it points to. If you later create an export that
                includes this file, the export will use this name.
              </p>
            )}
          </div>

          <div className={"bottomButtonRow"}>
            <div className={"okCancelGroup"}>
              {/* List as default last (in the corner). */}
              {/* The actual order of these will be platform-specific, controlled by
          a flex-direction rule in app.global.scss because this is has class okCancelButtonRow*/}
              <button onClick={() => this.handleCloseModal(false)}>
                <Trans>Cancel</Trans>
              </button>
              <button
                id="okButton"
                disabled={!canRenameNow}
                onClick={() => this.handleCloseModal(true)}
              >
                <Trans>Rename</Trans>
              </button>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
  private static stringMatchOrEmptyString(s: string, regexp: RegExp): string {
    console.assert(s);
    console.assert(regexp);
    const m = s.match(regexp);
    return m && m.length > 0 ? m[0] : "";
  }

  // Keeping with how Windows Saymore Classic worked, if the prefix is missing,
  // we assert it here, so any renamed file will get the prefix
  private static getUneditablePrefix(
    filename: string,
    folderID: string
  ): string {
    // if instead, we wanted to only recognize the prefix pattern if it is there, we'd do this:
    //return filename.startsWith(folderID + "_") ? folderID + "_" : "";
    return folderID + "_";
  }

  private static getUneditableSuffix(path: string): string {
    let p = path;
    const isLink = path.endsWith(kLinkExtensionWithFullStop);
    if (isLink) {
      p = p.replace(kLinkExtensionWithFullStop, "");
    }

    const matchExtension = /\.([0-9a-z]+)(?:[\?#]|$)/i;
    // if it's a link file, this will give us ".link"
    const sfx = RenameFileDialog.stringMatchOrEmptyString(p, matchExtension);

    return isLink ? sfx + kLinkExtensionWithFullStop : sfx;
  }

  private static getCore(filePath: string, folderId: string): string {
    const fileName = Path.basename(filePath);
    const prefix = RenameFileDialog.getUneditablePrefix(fileName, folderId);
    const startAt = fileName.startsWith(prefix) ? prefix.length : 0;
    const suffixLength = RenameFileDialog.getUneditableSuffix(fileName).length;
    return fileName.substr(startAt, fileName.length - (startAt + suffixLength));
  }
  private getNewFileName(includeExtension: boolean = true): string {
    const pfx = RenameFileDialog.getUneditablePrefix(
      this.state.filename,
      this.state.folder!.filePrefix
    );

    return (
      _.trimEnd(pfx + this.state.core, "_") +
      (includeExtension
        ? RenameFileDialog.getUneditableSuffix(
            this.state.file!.pathInFolderToLinkFileOrLocalCopy
          )
        : "")
    );
  }
  private getNewPath(): string {
    return Path.join(
      Path.dirname(this.state.file!.pathInFolderToLinkFileOrLocalCopy),

      this.getNewFileName()
    );
  }

  private getValidationProblemsMessage(): string {
    const pendingNewName = this.getNewFileName();
    const sanitizedForArchive = sanitizeForArchive(
      pendingNewName,
      userSettingsSingleton.IMDIMode
    );
    if (pendingNewName !== sanitizeFilename(pendingNewName)) {
      return "Some operating systems would not allow that name.";
    }

    if (pendingNewName !== sanitizedForArchive) {
      return "There are characters not allowed by the Archive Settings.";
    }
    if (pendingNewName.indexOf("/") > -1 || pendingNewName.indexOf("\\") > -1) {
      return "Sorry, no slashes are allowed";
    }
    if (fs.existsSync(this.getNewPath())) {
      return "A file with the same name already exists at that location.";
    }
    return "";
  }
}
