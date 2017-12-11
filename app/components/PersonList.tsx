import * as React from "react";
import { Table, Column, Cell, Regions } from "@blueprintjs/table";
import { IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-submodule-imports
import { IRegion } from "@blueprintjs/table/dist/regions";
import { TextField } from "../model/Field";
import { instanceOf } from "prop-types";
import { Person } from "../model/Person";

const styles = require("./Persons.scss");

export interface IProps {
  folders: Person[];
  selectedFolder: IFolderSelection;
}
@observer
export class PersonList extends React.Component<IProps> {
  private makeCell(rowIndex: number, key: string) {
    const p = this.props.folders[rowIndex].properties.getValue(key);
    if (p instanceof TextField) {
      return <Cell>{p.toString()}</Cell>;
    }
    if (p instanceof Date) {
      return <Cell>{(p as Date).toLocaleDateString()}</Cell>;
    }

    return <Cell />;
  }

  private getSelectedPersonRow() {
    return [Regions.row(this.props.selectedFolder.index)];
  }

  private onSelection(e: IRegion[]) {
    if (e.length > 0 && e[0] && e[0].rows && e[0].rows!.length > 0) {
      const selectedRow: number = e[0].rows![0];
      this.props.selectedFolder.index = selectedRow;
    }
  }

  public render() {
    return (
      <div className={"people"}>
        <Table
          numRows={this.props.folders.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // selectionModes={SelectionModes.ROWS_ONLY} when set, the argument to onSelection is always emtpy!
          // selectionModes={[RegionCardinality.FULL_ROWS]} this doesn't work either
          selectedRegions={this.getSelectedPersonRow()}
          onSelection={e => this.onSelection(e)}
        >
          <Column
            name="Name"
            renderCell={rowIndex => this.makeCell(rowIndex, "name")}
          />
        </Table>
      </div>
    );
  }
}

export default PersonList;
