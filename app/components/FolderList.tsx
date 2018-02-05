import * as React from "react";
import { Table, Column, Cell, Regions } from "@blueprintjs/table";
import { Folder, IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-submodule-imports
import { IRegion } from "@blueprintjs/table/dist/regions";
import { Field, FieldType } from "../model/field/Field";
const titleCase = require("title-case");

export interface IProps {
  folders: Folder[];
  selectedFolder: IFolderSelection;
  columns: string[];
  columnWidths: number[];
}
@observer
export class FolderList extends React.Component<IProps> {
  private makeCell(rowIndex: number, key: string) {
    const p = this.props.folders[rowIndex].properties.getValue(key);
    if (p.type === FieldType.Text) {
      return <Cell>{p.toString()}</Cell>;
    }
    if (p.type === FieldType.Date) {
      return <Cell>{p.asLocaleDateString()}</Cell>;
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
    // What this mobxDummy is about:
    // What happens inside the component blueprintjs's cells is invisible to mobx; it doesn't
    // have a way of knowing that these are reliant on the filename of the file.
    // See https://mobx.js.org/best/react.html#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    // However the <Observer> wrapper suggested by that link messes up the display of the table.
    // So for now, we just access every filename right here, while mobx is watching. That's enough to get it to trigger a re-render
    // when the user does something that causes a rename.
    const mobxDummy = this.props.folders.map(f => f.displayName);

    return (
      <div className={"folderList"}>
        <Table
          numRows={this.props.folders.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // selectionModes={SelectionModes.ROWS_ONLY} when set, the argument to onSelection is always emtpy!
          // selectionModes={[RegionCardinality.FULL_ROWS]} this doesn't work either
          selectedRegions={this.getSelectedSessionRow()}
          onSelection={e => this.onSelection(e)}
          columnWidths={this.props.columnWidths}
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
