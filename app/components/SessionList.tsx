import * as React from "react";
import { Table, Column, Cell, SelectionModes, Regions } from "@blueprintjs/table";

let styles = require("./Sessions.scss");

export class SessionList extends React.Component<any> {

  sessions = [["Community Members","11-10-17"],["Flowers", "18-9-17"]];
  renderId = (rowIndex: number) => {
    return <Cell>{this.sessions[rowIndex][0]}</Cell>;
  }
  renderDate = (rowIndex: number) => {
    return <Cell>{this.sessions[rowIndex][1]}</Cell>;
  }

  getSelectedSessionRow() {
    return [Regions.row(0)];
  }
  render() {

  return (
          <div className={styles.sessionsList}>
            <Table numRows={this.sessions.length} isRowHeaderShown={false}
                       allowMultipleSelection={false}
                       selectionModes={SelectionModes.ROWS_ONLY}
                       selectedRegions={this.getSelectedSessionRow()}>
              <Column name="Id" renderCell={this.renderId}/>
              <Column name="Date" renderCell={this.renderDate}/>
          </Table>
          </div>
    );
  }
}

export default SessionList;