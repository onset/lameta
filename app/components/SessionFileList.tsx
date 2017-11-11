import * as React from "react";
import { RouteComponentProps } from "react-router";
import { Table, Column, Cell, SelectionModes, Regions } from "@blueprintjs/table";

let styles = require("./Sessions.scss");

export interface IProps extends RouteComponentProps<any> {
}

export class SessionsFileList extends React.Component<any> {

  files = [["Community Members", "Session","11-10-17","690 B"],
            ["community_members.eaf","ELAN","11-10-17","111 KB"],
            ["community_members.mp3","Audio","11-10-17", "47kb"]];
  renderName = (rowIndex: number) => {
    return <Cell>{this.files[rowIndex][0]}</Cell>;
  }
  renderType = (rowIndex: number) => {
    return <Cell>{this.files[rowIndex][1]}</Cell>;
  }
  renderFileDate = (rowIndex: number) => {
    return <Cell>{this.files[rowIndex][2]}</Cell>;
  }
  renderSize = (rowIndex: number) => {
    return <Cell>{this.files[rowIndex][3]}</Cell>;
  }
  getSelectedFileRow() {
    return [Regions.row(0)];
  }
  render() {

  return (
      <div className={styles.fileList}>
        <Table numRows={this.files.length} isRowHeaderShown={false}
            allowMultipleSelection={false}
            selectionModes={SelectionModes.ROWS_ONLY}
            selectedRegions={this.getSelectedFileRow()}>
          <Column name="Name" renderCell={this.renderName}/>
          <Column name="Type" renderCell={this.renderType}/>
          <Column name="Date" renderCell={this.renderFileDate}/>
          <Column name="Size" renderCell={this.renderSize}/>
        </Table>
      </div>
    );
  }
}

export default SessionsFileList;