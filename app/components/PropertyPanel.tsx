import * as React from "react";
import { observer } from "mobx-react";
import { File } from "../model/file/File";
import { MediaStats } from "./MediaStats";
import "./PropertyPanel.scss";
import CustomFieldsTable from "./CustomFieldsTable";
import { i18n } from "../localization";
import { t } from "@lingui/macro";

@observer
export default class PropertyPanel extends React.Component<{
  file: File;
}> {
  public render() {
    return (
      <div className="propertyPanel">
        <div className="propertiesColumn">
          {this.props.file.isMedia ? <MediaStats file={this.props.file} /> : ""}
        </div>
        <div className="propertiesColumn customPropertiesColumn">
          <CustomFieldsTable
            firstColumnHeaderText={i18n._(t`Custom Field`)}
            file={this.props.file}
          />
        </div>
      </div>
    );
  }
}
