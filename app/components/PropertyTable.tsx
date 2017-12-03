import * as React from "react";
import { Table, Column, Cell, Regions } from "@blueprintjs/table";
import { Session, ISessionSelection } from "../model/Session";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-submodule-imports
import { IRegion } from "@blueprintjs/table/dist/regions";
import { Polytext } from "../model/BaseModel";
import { Dictionary } from "typescript-collections";

//const styles = require("./Sessions.scss");

export interface IProps {
  properties: Dictionary<string, Polytext>;
}
interface IState {
  selectedRow: number;
}

@observer
export default class PropertyTable extends React.Component<IProps, IState> {
  private getPropertyNameCell(rowIndex: number) {
    const v = this.props.properties.values();
    const p: Polytext = v[rowIndex];
    return <Cell>{p.englishLabel}</Cell>;
  }
  private getPropertyValueCell(rowIndex: number) {
    return <Cell>{this.props.properties.values()[rowIndex].english}</Cell>;
  }
  public render() {
    return (
      <div>
        <Table
          numRows={this.props.properties.keys().length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          columnWidths={[80, 200]}
        >
          <Column
            name="Property"
            renderCell={r => this.getPropertyNameCell(r)}
          />
          <Column name="Value" renderCell={r => this.getPropertyValueCell(r)} />
        </Table>
      </div>
    );
  }
}
