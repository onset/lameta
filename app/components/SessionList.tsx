import * as React from "react";
import { Table, Column, Cell, SelectionModes, Regions } from "@blueprintjs/table";
import {ISession} from "./SessionModel";

let styles = require("./Sessions.scss");

export interface SessionListProps {
  sessions: ISession[];
  selectedSessionIndex: number;
}
export class SessionList extends React.Component<SessionListProps> {
  renderId = (rowIndex: number) => {
    return <Cell>{this.props.sessions[rowIndex].title}</Cell>;
  }
  renderDate = (rowIndex: number) => {
    return <Cell>{this.props.sessions[rowIndex].date}</Cell>;
  }

  getSelectedSessionRow() {
    return [Regions.row(this.props.selectedSessionIndex)];
  }
  render() {

  return (
          <div className={styles.sessionsList}>
            <Table numRows={this.props.sessions.length} isRowHeaderShown={false}
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