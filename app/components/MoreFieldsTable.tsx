import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { Folder } from "../model/Folder";
import "./session/SessionForm.scss";
import "./Form.scss";
import ReactTable from "react-table";
import TextFieldEdit from "./TextFieldEdit";
import ClosedChoiceEdit from "./ClosedChoiceEdit";
import { Trans } from "@lingui/react";
import { i18n } from "../localization";
import { t } from "@lingui/macro";

export interface IProps {
  folder: Folder;
}

@observer
export default class AdditionalFieldsTable extends React.Component<IProps> {
  private fieldsForRows: Field[];
  constructor(props: IProps) {
    super(props);
    this.state = { fieldsForRows: [] };
  }

  public UNSAFE_componentWillMount() {
    this.computeRows(this.props);
  }
  public UNSAFE_componentWillReceiveProps(nextProps: IProps) {
    // for the bug that prompted using this, see https://trello.com/c/9keiiGFA
    this.computeRows(nextProps);
  }
  private computeRows(nextProps: IProps) {
    this.fieldsForRows = nextProps.folder.properties
      .values()
      .filter(f => (f.definition ? f.definition.isAdditional : false));
    //     .sort((a, b) => a.englishLabel.localeCompare(b.englishLabel)); // enhance: really we don't care about your locale, we care about the language of the label
  }

  public render() {
    const additionalFieldTableColumns = [
      {
        id: "name",
        Header: i18n._(t`Field`),
        Cell: (cellInfo: any) => {
          const field = cellInfo.original as Field;
          return field.labelInUILanguage;
        }
      },
      {
        id: "value",
        Header: i18n._(t`Value`),
        Cell: (cellInfo: any) => {
          const field = cellInfo.original as Field;

          const f = field as Field;
          if (f.choices && f.choices.length > 0) {
            return (
              <ClosedChoiceEdit
                includeLabel={false}
                field={f}
                key={field.key}
                className={field.cssClass}
              />
            );
          } else {
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
      }
    ];

    return (
      <div className="moreFieldsBlock">
        {/* In SayMore classic, the file format calls these fields "additional", but in the ui it calls them "more". So in laMeta we
          too are using the 'additional' term internally, and 'more' in the English label. */}
        <label>
          <Trans>More Fields</Trans>
        </label>
        <ReactTable
          className="moreFieldsTable"
          noDataText=""
          showPagination={false}
          data={this.fieldsForRows}
          columns={additionalFieldTableColumns}
          minRows={1} //don't add extra blank rows
        />
      </div>
    );
  }
}
