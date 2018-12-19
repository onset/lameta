import * as React from "react";
import { default as ReactTable, RowInfo } from "react-table";
import { observer, Observer } from "mobx-react";
import { Folder } from "../model/Folder";
import { File } from "../model/file/File";
import Dropzone from "react-dropzone";
import { remote } from "electron";
import "./FileList.scss";
import { showInExplorer } from "../crossPlatformUtilities";
import RenameFileDialog from "./RenameFileDialog/RenameFileDialog";
import { i18n, translateFileType } from "../localization";
import { t } from "@lingui/macro";
import { Trans } from "@lingui/react";

const electron = require("electron");
export interface IProps {
  folder: Folder;
  extraButtons?: object[];
}

interface IState {
  inRenameMode: boolean;
}
export interface IProps {
  folder: Folder;
  extraButtons?: object[];
}

@observer
export default class FileList extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { inRenameMode: false };
  }

  private onDrop(
    acceptedFiles: Dropzone.ImageFile[],
    rejectedFiles: Dropzone.ImageFile[]
  ) {
    if (acceptedFiles.length > 0) {
      // if there is an error in here, it leave the drop zone in an active state, and you have to restart
      // so we catch the error
      try {
        //console.log(JSON.stringify(acceptedFiles));
        this.props.folder.addFiles(acceptedFiles);
      } catch (error) {
        console.log(error);
      }
    }
  }
  private addFiles() {
    remote.dialog.showOpenDialog({}, paths => {
      if (paths) {
        this.props.folder.addFiles(paths.map(p => ({ path: p })));
      }
    });
  }
  public componentDidUpdate() {
    // scroll to top whenever we change to a new folder
    document
      .getElementsByClassName("fileList")[0]
      .getElementsByClassName("rt-tbody")[0].scrollTop = 0;
  }
  public render() {
    // REVIEW: we're now using react-table instead of blueprintjs; is this still needed?
    // What this mobxDummy is about:
    // What happens inside the component blueprintjs's cells is invisible to mobx; it doesn't
    // have a way of knowing that these are reliant on the filename of the file.
    // See https://mobx.js.org/best/react.html#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    // However the <Observer> wrapper suggested by that link messes up the display of the table.
    // So for now, we just access every filename right here, while mobx is watching. That's enough to get it to trigger a re-render
    // when the user does something that causes a rename.
    const mobxDummy = this.props.folder.files.map(f =>
      f.getTextProperty("filename")
    );
    // tslint:disable-next-line:no-this-assignment
    const tableObject = this;
    const columns = [
      {
        id: "icon",
        Header: "",
        width: 30,
        accessor: (d: any) => {
          const f: File = d;
          return f.getIconName();
        },
        Cell: props => <img src={props.value} />
      },
      {
        id: "name",
        Header: i18n._(t`Name`),
        accessor: (d: any) => {
          const f: File = d;
          return f.getTextProperty("filename");
        }
      },
      {
        id: "type",
        Header: i18n._(t`Type`),
        width: 72,
        accessor: (d: any) => {
          const f: File = d;
          return translateFileType(f.getTextProperty("type"));
        }
      },
      {
        id: "modifiedDate",
        Header: i18n._(t`Modified`),
        accessor: (d: any) => {
          //const f: File = d;
          // const date = f.getTextProperty("modifiedDate");
          // const locale = window.navigator.language;
          // moment.locale(locale);
          // return moment(date).format("L LT");
          return d.properties
            .getValueOrThrow("modifiedDate")
            .asDateTimeDisplayString();
        }
      },
      {
        id: "size",
        Header: i18n._(t`Size`),
        width: 75,
        style: { textAlign: "right" },
        accessor: (d: any) => {
          const f: File = d;
          return f.getTextProperty("size");
        }
      }
    ];
    const canRenameCurrentFile =
      this.props.folder.selectedFile !== this.props.folder.metadataFile;

    return (
      <Dropzone
        activeClassName={"drop-active"}
        className={"fileList"}
        onDrop={(acepted, rejected) => this.onDrop(acepted, rejected)}
        disableClick
      >
        <div className={"mask"}>Drop files here</div>
        <div className={"fileBar"}>
          <button className={"menu-open not-implemented"} disabled={true}>
            <Trans>Open</Trans>
            {/* <ul className={"menu"}>
              <li className={"cmd-show-in-explorer"}>
                Show in File Explorer...
              </li>
            </ul> */}
          </button>
          <button
            className={"cmd-rename"}
            disabled={!canRenameCurrentFile}
            onClick={() =>
              RenameFileDialog.show(
                this.props.folder.selectedFile!,
                this.props.folder
              )
            }
          >
            <Trans>Rename...</Trans>
          </button>
          {this.props.extraButtons
            ? this.props.extraButtons.map(c => (
                <button
                  key={(c as any).label}
                  disabled={!(c as any).enabled(this.props.folder.selectedFile)}
                  onClick={() =>
                    (c as any).onClick(this.props.folder.selectedFile)
                  }
                >
                  {(c as any).label}
                </button>
              ))
            : null}
          <button className={"cmd-add-files"} onClick={() => this.addFiles()}>
            <Trans> Add Files</Trans>
          </button>
        </div>
        <ReactTable
          //key={this.props.folder.directory}
          className="fileList"
          showPagination={false}
          data={this.props.folder.files}
          columns={columns}
          getTrProps={(state: any, rowInfo: any, column: any) => {
            //NB: "rowInfo.row" is a subset of things that are mentioned with an accessor. "original" is the original.
            return {
              onContextMenu: (e: any) => {
                e.preventDefault();
                //First select the row
                this.props.folder.selectedFile = rowInfo.original;
                this.setState({}); // trigger re-render so that the following style: takes effect
                //this event doesn't want to be accessed in the timeout, so store the coordinates
                const x = e.clientX;
                const y = e.clientY;
                // then after it is selected, show the context menu
                window.setTimeout(
                  () => tableObject.showContextMenu(x, y, rowInfo.original),
                  0
                );
              },
              onClick: (e: any, x: any) => {
                if (this.props.folder.selectedFile != null) {
                  // will only save if it thinks it is dirty
                  this.props.folder.selectedFile.save();
                }
                this.props.folder.selectedFile = rowInfo.original;
                this.setState({}); // trigger re-render so that the following style: takes effect
              },
              className:
                rowInfo && rowInfo.original === this.props.folder.selectedFile
                  ? "selected"
                  : ""
            };
          }}
        />
      </Dropzone>
    );
  }
  // This is from an old implementation of the table... so far with react-table
  // it seems to work to just do the setTimeout in the click handler, but i'm
  // leaving this code for a bit in case I find a need for it after all.
  // public componentDidUpdate(prevProps: IProps): void {
  //   if (globalPropertiesForPendingContextMenu) {
  //     // row wasn't selected first
  //     // window.requestAnimationFrame(() => {
  //     //        this.showPendingContextMenu();
  //     //    });
  //     window.setTimeout(() => {
  //       const eventProperties = globalPropertiesForPendingContextMenu;
  //       globalPropertiesForPendingContextMenu = null; // this is now handled
  //       this.showContextMenu(eventProperties);
  //     }, 100);
  //   }
  // }

  private showContextMenu(x: number, y: number, file: File) {
    const mainWindow = remote.getCurrentWindow(); // as any;
    if (!file) {
      return;
    }
    let items = [
      {
        label:
          process.platform === "darwin"
            ? i18n._(t`Show in Finder`)
            : i18n._(t`Show in File Explorer`),
        click: () => {
          showInExplorer(file.describedFilePath);
        }
      },
      {
        label: i18n._(t`Open in program associated with this file type`),
        click: () => {
          // the "file://" prefix is required on mac, works fine on windows
          electron.shell.openExternal("file://" + file.describedFilePath);
        }
      },
      {
        label: i18n._(t`Rename...`),
        click: () => {
          RenameFileDialog.show(file, this.props.folder);
        }
      },
      { type: "separator" },
      {
        label: i18n._(t`Delete File...`),
        enabled: file.canDelete,
        click: () => {
          this.props.folder.moveFileToTrash(file);
        }
      }
    ];

    if (process.env.NODE_ENV === "development") {
      items = items.concat([
        { type: "separator" },
        {
          label: "Inspect element",
          click() {
            (mainWindow as any).inspectElement(x, y);
          }
        }
      ]);
    }
    remote.Menu.buildFromTemplate(items as any).popup({ window: mainWindow });
  }
}
