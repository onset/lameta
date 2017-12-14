import * as React from "react";
import { Table, Column, Cell, Regions } from "@blueprintjs/table";
import { Folder, IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-submodule-imports
import { IRegion } from "@blueprintjs/table/dist/regions";
import { TextField } from "../model/Field";
const titleCase = require("title-case");

export interface IProps {
  folders: Folder[];
  selectedFolder: IFolderSelection;
  columns: string[];
}
@observer
export class FolderList extends React.Component<IProps> {
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

  private getSelectedSessionRow() {
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
      <div className={"sessionsList"}>
        <Table
          numRows={this.props.folders.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // selectionModes={SelectionModes.ROWS_ONLY} when set, the argument to onSelection is always emtpy!
          // selectionModes={[RegionCardinality.FULL_ROWS]} this doesn't work either
          selectedRegions={this.getSelectedSessionRow()}
          onSelection={e => this.onSelection(e)}
        >
          {this.props.columns.map(s => (
            <Column
              key={s}
              name={titleCase(s)}
              renderCell={rowIndex => this.makeCell(rowIndex, s)}
            />
          ))}
        </Table>
      </div>
    );
  }
}

export default FolderList;
