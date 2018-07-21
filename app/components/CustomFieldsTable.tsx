import * as React from "react";
import { observer } from "mobx-react";
import {
  Field,
  FieldType,
  FieldVisibility,
  IFieldDefinition
} from "../model/field/Field";
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
export default class CustomFieldsTable extends React.Component<IProps> {
  private fieldsForRows: Field[];
  private focusField: Field;
  constructor(props: IProps) {
    super(props);
    this.state = { fieldsForRows: [] };
  }

  public componentWillMount() {
    this.computeRows();
  }
  public componentWillReceiveProps(nextProps: IProps) {
    //if <different className=""></different>
    this.computeRows();
  }
  private computeRows() {
    this.fieldsForRows = this.props.folder.properties
      .values()
      .filter(f => (f.definition ? f.definition.isCustom : false))
      .sort((a, b) => a.englishLabel.localeCompare(b.englishLabel)); // enhance: really we don't care about your locale, we care aobut the language of the label

    // add one blank row
    const placeHolder = this.makePlaceholderForNewCustomField();
    this.fieldsForRows.push(placeHolder);

    this.fieldsForRows.forEach(f =>
      console.log(`custom field row: ${f.key}= "${f.text}"`)
    );
  }

  private fieldLabelChanged(f: Field) {
    if (f.definition.persist) {
      // we're updating
      if (f.englishLabel.trim().length === 0) {
        this.props.folder.properties.remove(f.key);
        this.computeRows();
        this.forceUpdate();
      } else {
        this.props.folder.properties.changeKeyOfCustomField(f, f.englishLabel);
      }
    } else {
      if (f.englishLabel.trim().length === 0) {
        // ignore empty placehholders
        return;
      }
      // we're adding
      console.log(`adding custom field ${f.englishLabel}=${f.text}`);
      f.key = f.englishLabel;
      f.persist = f.definition.persist = true; // But what if it is empty? Let the saving code worry about that.
      this.props.folder.properties.addCustomProperty(f);
      // add a new placeholder
      this.focusField = f;
      this.computeRows();
      this.forceUpdate();
    }
    this.props.folder.wasChangeThatMobxDoesNotNotice();
  }

  private makePlaceholderForNewCustomField() {
    const definition: IFieldDefinition = {
      key: "placeholder",
      englishLabel: "",
      persist: false, // we'll change this if they make it real
      type: "Text",
      order: 0,
      isCustom: true
    };
    return Field.fromFieldDefinition(definition);
  }

  public render() {
    //const customFields = this.getCustomFields();

    const customFieldTableColumns = [
      {
        id: "name",
        Header: "Field",
        Cell: (cellInfo: any) => {
          const field = cellInfo.original as Field;
          return (
            <FieldNameEdit
              key={field.key}
              field={field as Field}
              onFieldNameChanged={() => {
                this.fieldLabelChanged(field);
              }}
            />
          );
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
              // if we go to the placeholder row and make it "real", then a new
              // row gets created underneath, which would normally
              // cause the cursor to go down there. Istead, we
              // want the focus to go to the value column of the newly created
              // custom field
              autoFocus={this.focusField === field}
            />
          );
        }
      }
    ];

    return (
      <div>
        <label>Custom Fields</label>
        <ReactTable
          className="customFieldsTable"
          noDataText=""
          minRows={1}
          showPagination={false}
          data={this.fieldsForRows}
          columns={customFieldTableColumns}
          //minRows={0} // don't show empty rows/>
        />
      </div>
    );
  }
}
