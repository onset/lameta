import * as React from "react";
import { Table, Column, Cell, Regions, IRegion } from "@blueprintjs/table";
//import { Session } from "../model/Session";
import { observer } from "mobx-react";
import { DirectoryObject } from "../model/BaseModel";
const styles = require("./Sessions.scss");

export interface IProps {
  directoryObject: DirectoryObject;
}

@observer
export class SessionsFileList extends React.Component<IProps> {
  //NB: I settled on this approach after a bewildering stuggle in which a simpler approach,
  // renderCell={this.renderName}, would actually give us a "this.session" in the renderName that
  // was a *different session*. And yet within the element declaration, the "this.session" was
  // correct. So presumably a different "this" altogether. Binding, arrow functions, etc. didn't help.
  // So now makeCell is static and the element has to give it everthing.
  private static makeCell = (
    directoryObject: DirectoryObject,
    rowIndex: number,
    property: string
  ) => {
    const p = directoryObject.files[rowIndex].properties.getValue(property);
    const x = p ? p.default() : "no " + property;
    console.log(rowIndex + ":" + property + "=" + x);
    return <Cell>{x}</Cell>;
  };

  private getSelectedFileRow() {
    const i = this.props.directoryObject.files.indexOf(
      this.props.directoryObject.selectedFile
    );
    return [Regions.row(i)];
  }

  private onSelection(e: IRegion[]) {
    console.log("SessionList:onSelection e:", e);
    if (e.length > 0 && e[0] && e[0].rows && e[0].rows!.length > 0) {
      const selectedRow: number = e[0].rows![0];
      this.props.directoryObject.selectedFile = this.props.directoryObject.files[
        selectedRow
      ];
    }
  }

  constructor(props: IProps) {
    super(props);
  }

  public render() {
    console.log(
      "Render Session " +
        this.props.directoryObject.properties.getValue("title").default()
    );
    return (
      <div className={styles.fileList}>
        <Table
          numRows={this.props.directoryObject.files.length}
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
              return SessionsFileList.makeCell(
                this.props.directoryObject,
                row,
                "name"
              );
            }}
          />
          <Column
            name="Type"
            renderCell={r =>
              SessionsFileList.makeCell(this.props.directoryObject, r, "type")
            }
          />
          <Column
            name="Date"
            renderCell={r =>
              SessionsFileList.makeCell(this.props.directoryObject, r, "date")
            }
          />
          <Column
            name="Size"
            renderCell={r =>
              SessionsFileList.makeCell(this.props.directoryObject, r, "size")
            }
          />
        </Table>
      </div>
    );
  }
}

export default SessionsFileList;
