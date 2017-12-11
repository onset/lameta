import * as React from "react";
import { Table, Column, Cell, Regions } from "@blueprintjs/table";
import { Session, ISessionSelection } from "../model/Session";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-submodule-imports
import { IRegion } from "@blueprintjs/table/dist/regions";
import { TextField } from "../model/Field";
import { instanceOf } from "prop-types";

const styles = require("./Sessions.scss");

export interface IProps {
  sessions: Session[];
  selectedSession: ISessionSelection;
}
@observer
export class SessionList extends React.Component<IProps> {
  private makeCell(rowIndex: number, key: string) {
    const p = this.props.sessions[rowIndex].properties.getValue(key);
    if (p instanceof TextField) {
      return <Cell>{p.toString()}</Cell>;
    }
    if (p instanceof Date) {
      return <Cell>{(p as Date).toLocaleDateString()}</Cell>;
    }

    return <Cell />;
  }

  private getSelectedSessionRow() {
    return [Regions.row(this.props.selectedSession.index)];
  }

  private onSelection(e: IRegion[]) {
    if (e.length > 0 && e[0] && e[0].rows && e[0].rows!.length > 0) {
      const selectedRow: number = e[0].rows![0];
      this.props.selectedSession.index = selectedRow;
    }
  }

  public render() {
    return (
      <div className={styles.sessionsList}>
        <Table
          numRows={this.props.sessions.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // selectionModes={SelectionModes.ROWS_ONLY} when set, the argument to onSelection is always emtpy!
          // selectionModes={[RegionCardinality.FULL_ROWS]} this doesn't work either
          selectedRegions={this.getSelectedSessionRow()}
          onSelection={e => this.onSelection(e)}
        >
          <Column
            name="Title"
            renderCell={rowIndex => this.makeCell(rowIndex, "title")}
          />
          <Column
            name="Date"
            renderCell={rowIndex => this.makeCell(rowIndex, "date")}
          />
        </Table>
      </div>
    );
  }
}

export default SessionList;
