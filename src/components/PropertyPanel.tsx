import * as React from "react";
import { observer } from "mobx-react";
import { File } from "../model/file/File";
import { MediaStats } from "./MediaStats";
import "./PropertyPanel.css";
import CustomFieldsTable from "./CustomFieldsTable";
import { i18n } from "../other/localization";
import { t, Trans } from "@lingui/macro";
import AccessChooser from "./session/AccessChooser";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import { TextFieldEdit } from "./TextFieldEdit";

interface IProps {
  file: File;
  authorityLists?: AuthorityLists;
}

class PropertyPanel extends React.Component<IProps> {
  public render() {
    const hasAccessField =
      this.props.file.properties.getHasValue("access") &&
      this.props.authorityLists;

    return (
      <div className="propertyPanel">
        <div className="propertiesColumn">
          {this.props.file.isMedia ? <MediaStats file={this.props.file} /> : ""}
          {hasAccessField && (
            <div className="document-access-section">
              <AccessChooser
                field={this.props.file.properties.getTextField("access")}
                authorityLists={this.props.authorityLists!}
              />
              {this.props.file.properties.getHasValue("accessDescription") && (
                <TextFieldEdit
                  field={this.props.file.properties.getTextField(
                    "accessDescription"
                  )}
                />
              )}
            </div>
          )}
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
