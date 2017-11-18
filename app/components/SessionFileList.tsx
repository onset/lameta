import * as React from "react";
import { Table, Column, Cell, SelectionModes, Regions } from "@blueprintjs/table";
import { IFile } from "./SessionModel";
import { observer } from "mobx-react";
let styles = require("./Sessions.scss");

export interface ISessionFileListProps {
  files: IFile[];
}

@observer
export class SessionsFileList extends React.Component<ISessionFileListProps> {

  renderName = (rowIndex: number) => {
    return <Cell>{this.props.files[rowIndex].name}</Cell>;
  }
  renderType = (rowIndex: number) => {
    return <Cell>{this.props.files[rowIndex].type}</Cell>;
  }
  renderFileDate = (rowIndex: number) => {
    return <Cell>{this.props.files[rowIndex].date}</Cell>;
  }
  renderSize = (rowIndex: number) => {
    return <Cell>{this.props.files[rowIndex].size}</Cell>;
  }
  getSelectedFileRow() {
    return [Regions.row(0)];
  }
  render() {

  return (
      <div className={styles.fileList}>
        <Table numRows={this.props.files.length} isRowHeaderShown={false}
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