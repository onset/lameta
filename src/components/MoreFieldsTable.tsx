import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { Folder } from "../model/Folder/Folder";
import "./session/SessionForm.css";
import "./Form.css";
import ReactTable from "react-table-6";
import { TextFieldEdit } from "./TextFieldEdit";
import ClosedChoiceEdit from "./ClosedChoiceEdit";
import { i18n } from "../other/localization";
import { t, Trans } from "@lingui/macro";
import { useEffect, useState } from "react";

export interface IProps {
  folder: Folder;
}

const AdditionalFieldsTable: React.FC<IProps> = observer(({ folder }) => {
  const [fieldsForRows, setFieldsForRows] = useState<Field[]>([]);

  useEffect(() => {
    computeRows(folder);
  }, [folder]);

  const computeRows = (folder: Folder) => {
    const filteredFields = folder.properties
      .values()
      .filter((f) => (f.definition ? f.definition.isAdditional : false));
    setFieldsForRows(filteredFields);
  };

  const additionalFieldTableColumns = [
    {
      id: "name",
      Header: t`Field`,
      Cell: (cellInfo: any) => {
        const field = cellInfo.original as Field;
        return field.labelInUILanguage;
      }
    },
    {
      id: "value",
      Header: t`Value`,
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
      {/* In SayMore classic, the file format calls these fields "additional", but in the ui it calls them "more". So in lameta we
          too are using the 'additional' term internally, and 'more' in the English label. */}
      <label>
        <Trans>More Fields</Trans>
      </label>
      <ReactTable
        className="moreFieldsTable"
        noDataText=""
        showPagination={false}
        data={fieldsForRows}
        columns={additionalFieldTableColumns}
        minRows={1} //don't add extra blank rows
      />
    </div>
  );
});

export default AdditionalFieldsTable;
