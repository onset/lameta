import * as React from "react";
import { Table, Column, Cell, Regions, IRegion } from "@blueprintjs/table";
import { observer } from "mobx-react";
import { Folder } from "../model/Folder";
import * as Dropzone from "react-dropzone";

export interface IProps {
  folder: Folder;
}

@observer
export default class FileList extends React.Component<IProps> {
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

  constructor(props: IProps) {
    super(props);
  }

  private onDrop(
    acceptedFiles: Dropzone.ImageFile[],
    rejectedFiles: Dropzone.ImageFile[]
  ) {
    console.log(JSON.stringify(acceptedFiles));
    this.props.folder.addFiles(acceptedFiles);
  }

  public render() {
    // console.log(
    //   "Render Session " +
    //     this.props.directoryObject.properties.getValue("title").default
    // );
    return (
      <Dropzone
        activeClassName={"drop-active"}
        className={"fileList"}
        onDrop={this.onDrop.bind(this)}
        disableClick
      >
        <div className={"mask"}>Drop files here</div>
        <Table
          numRows={this.props.folder.files.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // selectionModes={SelectionModes.ROWS_ONLY}
          selectedRegions={this.getSelectedFileRow()}
          onSelection={e => this.onSelection(e)}
          columnWidths={[200, 80, 150, 70]}
        >
          <Column
            name="Name"
            renderCell={row => {
              return this.makeCell(row, "filename");
            }}
          />
          <Column name="Type" renderCell={r => this.makeCell(r, "type")} />
          <Column name="Date" renderCell={r => this.makeCell(r, "date")} />
          <Column name="Size" renderCell={r => this.makeCell(r, "size")} />
        </Table>
      </Dropzone>
    );
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
