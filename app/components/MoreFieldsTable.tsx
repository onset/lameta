import * as React from "react";
import { observer } from "mobx-react";
import { Field, FieldDefinition } from "../model/field/Field";
import { Folder } from "../model/Folder";
import "./session/SessionForm.scss";
import "./Form.scss";
import ReactTable from "react-table";
import TextFieldEdit from "./TextFieldEdit";
import FieldNameEdit from "./FieldNameEdit";

export interface IProps {
  folder: Folder;
}

@observer
export default class MoreFieldsTable extends React.Component<IProps> {
  private fieldsForRows: Field[];
  private focusField: Field;
  constructor(props: IProps) {
    super(props);
    this.state = { fieldsForRows: [] };
  }

  public componentWillMount() {
    this.computeRows(this.props);
  }
  public componentWillReceiveProps(nextProps: IProps) {
    // for the bug that prompted using this, see https://trello.com/c/9keiiGFA
    this.computeRows(nextProps);
  }
  private computeRows(nextProps: IProps) {
    this.fieldsForRows = nextProps.folder.properties
      .values()
      .filter(f => (f.definition ? f.definition.extra : false));
    //     .sort((a, b) => a.englishLabel.localeCompare(b.englishLabel)); // enhance: really we don't care about your locale, we care about the language of the label
  }

  public render() {
    const customFieldTableColumns = [
      {
        id: "name",
        Header: "Field",
        Cell: (cellInfo: any) => {
          const field = cellInfo.original as Field;
          return field.englishLabel;
        }
      },
      {
        id: "value",
        Header: "Value",
        Cell: (cellInfo: any) => {
          const field = cellInfo.original as Field;
          return (
            <TextFieldEdit
              hideLabel={true}
              className={field.cssClass}
              key={field.key}
              field={field as Field}
            />
          );
        }
      }
    ];

    return (
      <div className="moreFieldsBlock">
        <label>More Fields</label>
        <ReactTable
          className="moreFieldsTable"
          noDataText=""
          showPagination={false}
          data={this.fieldsForRows}
          columns={customFieldTableColumns}
          minRows={1} //don't add extra blank rows
        />
      </div>
    );
  }
}
