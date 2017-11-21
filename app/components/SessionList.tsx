import * as React from "react";
import { Table, Column, Cell,  Regions } from "@blueprintjs/table";
import {ISession, ISessionSelection} from "./SessionModel";
import { observer } from "mobx-react";
import { IRegion } from "@blueprintjs/table/dist/regions";

let styles = require("./Sessions.scss");

export interface SessionListProps {
  sessions: ISession[];
  selectedSession: ISessionSelection;
}
@observer
export class SessionList extends React.Component<SessionListProps> {
  renderTitle = (rowIndex: number) => {
    return <Cell>{this.props.sessions[rowIndex].title}</Cell>;
  }
  renderDate = (rowIndex: number) => {
    return <Cell>{this.props.sessions[rowIndex].date}</Cell>;
  }

  getSelectedSessionRow() {
    return [Regions.row(this.props.selectedSession.index)];
  }

  onSelection(e: IRegion[]) {
    console.log("SessionList:onSelection e:", e);
    if (e.length > 0 && e[0] && e[0].rows && e[0].rows!.length > 0) {
        var selectedRow : number = e[0].rows![0];
        this.props.selectedSession.index = selectedRow;
    }
  }

  render() {
    return (
            <div className={styles.sessionsList}>
              <Table numRows={this.props.sessions.length} isRowHeaderShown={false}
                        allowMultipleSelection={false}
                        // selectionModes={SelectionModes.ROWS_ONLY} when set, the argument to onSelection is always emtpy!
                        // selectionModes={[RegionCardinality.FULL_ROWS]} this doesn't work either
                        selectedRegions={this.getSelectedSessionRow()}
                        onSelection={e => this.onSelection(e)}>
                <Column name="Title" renderCell={this.renderTitle}/>
                <Column name="Date" renderCell={this.renderDate}/>
            </Table>
            </div>
      );
    }
}

export default SessionList;