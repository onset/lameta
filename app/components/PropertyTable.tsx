import * as React from "react";
import ReactTable from "react-table";
import { observer } from "mobx-react";
import { Field, FieldType } from "../model/field/Field";
import { FieldSet } from "../model/field/FieldSet";
import "./PropertyTable.scss";

//const styles = require("./Sessions.scss");

export interface IProps {
  fields: FieldSet;
}
interface IState {
  selectedRow: number;
}

@observer
export default class PropertyTable extends React.Component<IProps, IState> {
  public render() {
    const columns = [
      {
        id: "property",
        Header: "Property",
        width: 120,
        accessor: (f: Field) => {
          return f.englishLabel;
        }
      },
      {
        id: "value",
        Header: "Value",
        //width: 200,
        accessor: (f: Field) => {
          if (f.type === FieldType.Text) {
            return f.toString();
          }
          if (f.type === FieldType.Date) {
            return f.asLocaleDateString();
          }
          return "(This type not currently handled in property table)";
        }
      }
    ];

    return (
      <ReactTable
        className={"properties"}
        showPagination={false}
        data={this.props.fields.values()}
        columns={columns}
      />
    );
  }
}
