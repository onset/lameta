import * as React from "react";
import { observer } from "mobx-react";
import { File } from "../model/file/File";
import MediaStats from "./MediaStats";
import "./PropertyPanel.scss";
import CustomFieldsTable from "./CustomFieldsTable";

export interface IProps {
  file: File;
}

@observer
export default class PropertyPanel extends React.Component<IProps> {
  public render() {
    return (
      <div className="propertyPanel">
        <div className="propertiesColumn">
          {MediaStats.isMedia(this.props.file) ? (
            <MediaStats file={this.props.file} />
          ) : (
            ""
          )}
        </div>
        <div className="propertiesColumn customPropertiesColumn">
          <CustomFieldsTable
            firstColumnHeaderText="Custom Field"
            file={this.props.file}
          />
        </div>
      </div>
    );
  }
}
