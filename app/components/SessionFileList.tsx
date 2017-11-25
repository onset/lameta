import * as React from "react";
import { Table, Column, Cell, Regions, IRegion } from "@blueprintjs/table";
import { Session } from "../model/Session";
import { observer } from "mobx-react";
const styles = require("./Sessions.scss");

export interface IProps {
  session: Session;
}

@observer
export class SessionsFileList extends React.Component<IProps> {
  //NB: I settled on this approach after a bewildering stuggle in which a simpler approach,
  // renderCell={this.renderName}, would actually give us a "this.session" in the renderName that
  // was a *different session*. And yet within the element declaration, the "this.session" was
  // correct. So presumably a different "this" altogether. Binding, arrow functions, etc. didn't help.
  // So now makeCell is static and the element has to give it everthing.
  private static makeCell = (
    session: Session,
    rowIndex: number,
    property: string
  ) => {
    return <Cell>{session.files[rowIndex].get(property)}</Cell>;
  };

  private getSelectedFileRow() {
    const i = this.props.session.files.indexOf(this.props.session.selectedFile);
    return [Regions.row(i)];
  }

  private onSelection(e: IRegion[]) {
    console.log("SessionList:onSelection e:", e);
    if (e.length > 0 && e[0] && e[0].rows && e[0].rows!.length > 0) {
      const selectedRow: number = e[0].rows![0];
      this.props.session.selectedFile = this.props.session.files[selectedRow];
    }
  }

  constructor(props: IProps) {
    super(props);
  }

  public render() {
    console.log("Render Session " + this.props.session.title.default());
    return (
      <div className={styles.fileList}>
        <Table
          numRows={this.props.session.files.length}
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
              return SessionsFileList.makeCell(this.props.session, row, "name");
            }}
          />
          <Column
            name="Type"
            renderCell={r =>
              SessionsFileList.makeCell(this.props.session, r, "type")
            }
          />
          <Column
            name="Date"
            renderCell={r =>
              SessionsFileList.makeCell(this.props.session, r, "date")
            }
          />
          <Column
            name="Size"
            renderCell={r =>
              SessionsFileList.makeCell(this.props.session, r, "size")
            }
          />
        </Table>
      </div>
    );
  }
}

export default SessionsFileList;
