import * as React from "react";
import { Table, Column, Cell, EditableCell } from "@blueprintjs/table";
import { observer } from "mobx-react";
import { Field, FieldType } from "../model/field/Field";
import { File, Contribution } from "../model/file/File";

export interface IProps {
  // contributions: Contribution[];
  file: File;
}
interface IState {
  unused: number;
}
@observer
export default class ContributorsTable extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    // this.state = {
    //   selectedContribution: this.props.file.contributions[
    //     this.props.file.contributions.length - 1
    //   ]
    // };
  }
  private ensureOneBlankRow() {
    console.log("contributors.file: " + this.props.file.describedFilePath);
    let i = this.props.file.contributions.length;
    while (i--) {
      const c = this.props.file.contributions[i];
      if (!c.name || c.name.length === 0) {
        console.log("removing blank contribution at " + i);
        this.props.file.contributions.splice(i, 1);
      }
    }
    console.log("Adding blank contribution");
    this.props.file.contributions.push(new Contribution());
  }
  public render() {
    //review: this seems wrong, having this data model change here in the render method...
    this.ensureOneBlankRow();
    const c = this.props.file.contributions;

    return (
      <div>
        <Table
          numRows={this.props.file.contributions.length}
          isRowHeaderShown={false}
          allowMultipleSelection={false}
          // columnWidths={[80, 200]}
        >
          <Column
            name="Name"
            renderCell={r => (
              <EditableCell
                value={c[r].name}
                onChange={value => {
                  c[r].name = value;
                }}
              />
            )}
          />
          <Column
            name="Role"
            renderCell={r => (
              <EditableCell
                value={c[r].role}
                onChange={value => {
                  c[r].role = value;
                }}
              />
            )}
          />
          <Column
            name="Date"
            renderCell={r => <EditableCell>{c[r].date}</EditableCell>}
          />
          <Column
            name="Comments"
            renderCell={r => <EditableCell>{c[r].comments}</EditableCell>}
          />
        </Table>
      </div>
    );
  }
}
