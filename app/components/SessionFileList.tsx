import * as React from "react";
import { Table, Column, Cell, Regions, IRegion } from "@blueprintjs/table";
import { ISession } from "../model/SessionModel";
import { observer } from "mobx-react";
const styles = require("./Sessions.scss");

export interface ISessionFileListProps {
  session: ISession;
}

@observer
export class SessionsFileList extends React.Component<ISessionFileListProps> {
  private renderName = (rowIndex: number) => {
    return <Cell>{this.props.session.files[rowIndex].name}</Cell>;
  };
  private renderType = (rowIndex: number) => {
    return <Cell>{this.props.session.files[rowIndex].type}</Cell>;
  };
  private renderFileDate = (rowIndex: number) => {
    return <Cell>{this.props.session.files[rowIndex].date}</Cell>;
  };
  private renderSize = (rowIndex: number) => {
    return <Cell>{this.props.session.files[rowIndex].size}</Cell>;
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

  public render() {
    return (
      <div className={styles.fileList}>
        <Table
          numRows={this.props.session.files.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // selectionModes={SelectionModes.ROWS_ONLY}
          selectedRegions={this.getSelectedFileRow()}
          onSelection={e => this.onSelection(e)}
        >
          <Column name="Name" renderCell={this.renderName} />
          <Column name="Type" renderCell={this.renderType} />
          <Column name="Date" renderCell={this.renderFileDate} />
          <Column name="Size" renderCell={this.renderSize} />
        </Table>
      </div>
    );
  }
}

export default SessionsFileList;
