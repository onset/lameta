import * as React from "react";
import { observer } from "mobx-react";
import { File } from "../model/file/File";
import { MediaStats } from "./MediaStats";
import "./PropertyPanel.css";
import CustomFieldsTable from "./CustomFieldsTable";
import { i18n } from "../other/localization";
import { t } from "@lingui/macro";

class PropertyPanel extends React.Component<{ file: File }> {
  public render() {
    return (
      <div className="propertyPanel">
        <div className="propertiesColumn">
          {this.props.file.isMedia ? <MediaStats file={this.props.file} /> : ""}
        </div>
        <div className="propertiesColumn customPropertiesColumn">
          <CustomFieldsTable
            firstColumnHeaderText={t`Custom Field`}
            file={this.props.file}
          />
        </div>
      </div>
    );
  }
}

export default observer(PropertyPanel);
