import * as React from "react";
import { Table, Column, Cell, Regions, IRegion } from "@blueprintjs/table";
import { observer } from "mobx-react";
import { Folder } from "../model/Folder";
import { File } from "../model/file/File";
import * as Dropzone from "react-dropzone";
import { remote } from "electron";
const { Menu } = require("electron");
const electron = require("electron");

export interface IProps {
  folder: Folder;
}
let globaltable: Table | null;
let globalPropertiesForPendingContextMenu: any;
@observer
export default class FileList extends React.Component<IProps> {
  public table: Table | null;
  //private propertiesForPendingContextMenu: any;

  constructor(props: IProps) {
    super(props);

    //https://github.com/electron/electron/blob/master/docs/api/web-contents.md#event-context-menu
    //https://nodejs.org/api/events.html#events_class_eventemitter
    const webContents = remote.getCurrentWebContents();
    webContents.removeAllListeners("context-menu");
    webContents.on("context-menu", (e: any, eventProperties: any) => {
      const file = this.getFileFromClick(eventProperties);
      if (file) {
        if (this.props.folder.selectedFile === file) {
          this.showContextMenu(eventProperties);
        } else {
          //handling the event can wait until we make sure the row we're going to operate on is highlighted
          // didn't really go to this: this.propertiesForPendingContextMenu = properties;
          globalPropertiesForPendingContextMenu = eventProperties;
          //this will cause a re-render with the proper highlighting
          this.props.folder.selectedFile = file;
        }
      }
    });
  }

  private makeCell(rowIndex: number, property: string) {
    const p = this.props.folder.files[rowIndex].getTextProperty(property);
    const x = p ? p.toString() : "no " + property;
    //console.log(rowIndex + ":" + property + "=" + x);
    return <Cell>{x}</Cell>;
  }
  private getSelectedFileRow() {
    if (!this.props.folder.selectedFile) {
      return [];
    }
    const i = this.props.folder.files.indexOf(this.props.folder.selectedFile);
    return [Regions.row(i)];
  }

  private onSelection(e: IRegion[]) {
    //console.log("FileList:onSelection e:", e);
    if (e.length > 0 && e[0] && e[0].rows && e[0].rows!.length > 0) {
      const selectedRow: number = e[0].rows![0];
      this.props.folder.selectedFile = this.props.folder.files[selectedRow];
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
  private getFileFromClick(eventProperties: any): File | null {
    if (!globaltable) {
      return null;
    }
    const { x, y } = eventProperties;
    const rowNumber = globaltable.locator.convertPointToRow(y);
    if (rowNumber < 0) {
      return null;
    }
    if (rowNumber > this.props.folder.files.length - 1) {
      return null;
    }
    return this.props.folder.files[rowNumber];
  }

  private onDrop(
    acceptedFiles: Dropzone.ImageFile[],
    rejectedFiles: Dropzone.ImageFile[]
  ) {
    console.log(JSON.stringify(acceptedFiles));
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
        <Table
          numRows={this.props.folder.files.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // selectionModes={SelectionModes.ROWS_ONLY}
          selectedRegions={this.getSelectedFileRow()}
          onSelection={e => this.onSelection(e)}
          columnWidths={[200, 80, 150, 70]}
          ref={input => {
            // the this wasn't bound correctly, despite being in a fat arrow function:  this.table = input;
            globaltable = input;
          }}
        >
          <Column
            name="Name"
            renderCell={rowIndex => {
              return this.makeCell(rowIndex, "filename");
            }}
          />
          <Column name="Type" renderCell={r => this.makeCell(r, "type")} />
          <Column name="Date" renderCell={r => this.makeCell(r, "date")} />
          <Column name="Size" renderCell={r => this.makeCell(r, "size")} />
        </Table>
      </Dropzone>
    );
  }
  public componentDidUpdate(prevProps: IProps): void {
    if (globalPropertiesForPendingContextMenu) {
      // row wasn't selected first
      // window.requestAnimationFrame(() => {
      //        this.showPendingContextMenu();
      //    });
      window.setTimeout(() => {
        const eventProperties = globalPropertiesForPendingContextMenu;
        globalPropertiesForPendingContextMenu = null; // this is now handled
        this.showContextMenu(eventProperties);
      }, 100);
    }
  }
  //NB: I settled on this approach after a bewildering stuggle in which a simpler approach,
  // renderCell={this.renderName}, would actually give us a "this.session" in the renderName that
  // was a *different session*. And yet within the element declaration, the "this.session" was
  // correct. So presumably a different "this" altogether. Binding, arrow functions, etc. didn't help.
  // So now makeCell is static and the element has to give it everthing.
  /*  private static makeCellStatic = (
    directoryObject: DirectoryObject,
    rowIndex: number,
    property: string
  ) => {
    const p = directoryObject.files[rowIndex].properties.getValue(property);
    const x = p ? p.default : "no " + property;
    //console.log(rowIndex + ":" + property + "=" + x);
    return <Cell>{x}</Cell>;
  };*/

  private showContextMenu(eventProperties: any) {
    const mainWindow = remote.getCurrentWindow(); // as any;
    const { x, y } = eventProperties;
    const file = this.getFileFromClick(eventProperties);
    if (!file) {
      return;
    }
    remote.Menu.buildFromTemplate([
      process.env.NODE_ENV === "development"
        ? {
            label: "Inspect element",
            click() {
              (mainWindow as any).inspectElement(x, y);
            }
          }
        : {},
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
    ]).popup(mainWindow);
  }
}
