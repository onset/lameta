import * as React from "react";
import { Table, Column, Cell, Regions } from "@blueprintjs/table";
import { Session, ISessionSelection } from "../model/Session";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-submodule-imports
import { IRegion } from "@blueprintjs/table/dist/regions";
import { ComponentFile } from "../model/ComponentFile";
import { computed } from "mobx";

//const styles = require("./Sessions.scss");

export interface IProps {
  file: ComponentFile;
}
interface IState {
  selectedRow: number;
}

@observer
export default class PropertyTable extends React.Component<IProps, IState> {
  private getPropertyNameCell(rowIndex: number) {
    return <Cell>{this.props.file.properties[rowIndex].englishLabel}</Cell>;
  }
  private getPropertyValueCell(rowIndex: number) {
    return <Cell>{this.props.file.properties[rowIndex].default()}</Cell>;
  }
  public render() {
    return (
      <div>
        <Table
          numRows={this.props.file.properties.length}
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
