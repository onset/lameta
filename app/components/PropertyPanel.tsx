import * as React from "react";
import ReactTable from "react-table";
import { observer } from "mobx-react";
import { Field, FieldType } from "../model/field/Field";
import { File } from "../model/file/File";
import MediaStats from "./MediaStats";
import "./PropertyPanel.scss";

export interface IProps {
  file: File;
}
interface IState {
  selectedRow: number;
}

@observer
export default class PropertyPanel extends React.Component<IProps, IState> {
  public render() {
    const columns = [
      {
        id: "property",
        Header: "Name",
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
            return f.asDateDisplayString();
          }
          return "(This type not currently handled in property table)";
        }
      }
    ];

    return (
      <div className="propertyPanel">
        <div className="propertiesColumn">
          <h1>Auto Properties</h1>
          {MediaStats.isMedia(this.props.file) ? (
            <MediaStats file={this.props.file} />
          ) : (
            ""
          )}
        </div>
        <div className="propertiesColumn customPropertiesColumn">
          <h1>Custom Properties</h1>
          <ReactTable
            className={"customPropertiesTable"}
            showPagination={false}
            data={this.props.file.properties
              .values()
              .filter(f => f.definition && f.definition.isCustom)}
            columns={columns}
          />
        </div>
      </div>
    );
  }
}
