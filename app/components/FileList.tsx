const { ipcRenderer } = require("electron");
import * as React from "react";
import { default as ReactTable, RowInfo } from "react-table";
import { computed } from "mobx";
import { observer, Observer } from "mobx-react";
import { Folder } from "../model/Folder";
import { File } from "../model/file/File";
import * as Dropzone from "react-dropzone";
import { remote } from "electron";
const moment = require("moment");
import { Dictionary } from "typescript-collections";
import "./FileList.scss";

const { Menu } = require("electron");
const electron = require("electron");
export interface IProps {
  folder: Folder;
}

@observer
export default class FileList extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
    if (this.props.folder.selectedFile) {
      this.props.folder.couldPossiblyBecomeDirty();
    }
  }

  private onDrop(
    acceptedFiles: Dropzone.ImageFile[],
    rejectedFiles: Dropzone.ImageFile[]
  ) {
    //console.log(JSON.stringify(acceptedFiles));
    this.props.folder.addFiles(acceptedFiles);
  }
  private addFiles() {
    remote.dialog.showOpenDialog({}, paths => {
      if (paths) {
        this.props.folder.addFiles(paths.map(p => ({ path: p })));
      }
    });
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
        id: "name",
        Header: "Name",
        accessor: (d: any) => {
          const f: File = d;
          return f.getTextProperty("filename");
        }
      },
      {
        id: "type",
        Header: "Type",
        width: 72,
        accessor: (d: any) => {
          const f: File = d;
          return f.getTextProperty("type");
        }
      },
      {
        id: "date",
        Header: "Date",
        accessor: (d: any) => {
          const f: File = d;
          const date = f.getTextProperty("date");
          const locale = window.navigator.language;
          moment.locale(locale);
          return moment(date).format("L LT");
        }
      },
      {
        id: "size",
        Header: "Size",
        width: 75,
        style: { textAlign: "right" },
        accessor: (d: any) => {
          const f: File = d;
          return f.getTextProperty("size");
        }
      }
    ];
    return (
      <Dropzone
        activeClassName={"drop-active"}
        className={"fileList"}
        onDrop={this.onDrop.bind(this)}
        disableClick
      >
        <div className={"mask"}>Drop files here</div>
        <div className={"fileBar"}>
          <li className={"menu-open not-implemented"}>
            Open
            <ul className={"menu"}>
              <li className={"cmd-show-in-explorer"}>
                Show in File Explorer...
              </li>
            </ul>
          </li>
          <li className={"cmd-rename not-implemented"}>*Rename...</li>
          <li className={"cmd-convert not-implemented"}>*Convert...</li>
          <button className={"cmd-add-files"} onClick={() => this.addFiles()}>
            Add Files
          </button>
        </div>
        <ReactTable
          showPagination={false}
          data={this.props.folder.files.slice()} // slice is needed because this is a mobx observable array. See https://mobx.js.org/refguide/array.html#observable-arrays
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
              onClick: (e: any, t: any) => {
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
        label: "Show in File Explorer",
        click: () => {
          //https://github.com/electron/electron/issues/11617
          electron.shell.showItemInFolder(
            this.replaceall("/", "\\", file.describedFilePath)
          );
        }
      },
      {
        label: "Open in Program associate with this file",
        click: () => {
          electron.shell.openExternal(file.describedFilePath);
        }
      },
      { type: "separator" },
      {
        label: "Delete File...",
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

      remote.Menu.buildFromTemplate(items as any).popup(mainWindow);
    }
  }
  private replaceall(replaceThis: string, withThis: string, inThis: string) {
    withThis = withThis.replace(/\$/g, "$$$$");
    return inThis.replace(
      new RegExp(
        replaceThis.replace(
          /([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|<>\-\&])/g,
          "\\$&"
        ),
        "g"
      ),
      withThis
    );
  }
}
