import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { File } from "../model/file/File";
import "./session/SessionForm.scss";
import "./Form.scss";
import ReactTable from "react-table-6";
import { TextFieldEdit } from "./TextFieldEdit";
import FieldNameEdit from "./FieldNameEdit";
import { t } from "@lingui/macro";
import { i18n } from "../other/localization";
import { FieldLabel } from "./FieldLabel";
import { EncounteredVocabularyRegistry } from "../model/Project/EncounteredVocabularyRegistry";

export interface IProps {
  file: File;
  firstColumnHeaderText?: string;
}

class CustomFieldsTable extends React.Component<IProps> {
  private fieldsForRows: Field[];
  private focusField: Field;
  constructor(props: IProps) {
    super(props);
    this.state = { fieldsForRows: [] };
  }

  public UNSAFE_componentWillMount() {
    this.computeRows(this.props.file);
  }
  public UNSAFE_componentWillReceiveProps(nextProps: IProps) {
    // for the bug that prompted using this, see https://trello.com/c/9keiiGFA
    this.computeRows(nextProps.file);
  }
  private computeRows(file: File) {
    const customFieldsInThisFileAlready = file.properties
      .values()
      .filter((f) => (f.definition ? f.definition.isCustom : false));

    let didAddOneOrMoreFields = false;
    //figure out what custom fields are out there on other files of this
    // type that we should make place for
    file.encounteredVocabularyRegistry
      .getChoices(file.type + EncounteredVocabularyRegistry.kCustomFieldSuffix)
      .filter((n) => !customFieldsInThisFileAlready.some((f) => f.key === n))
      .forEach((n) => {
        didAddOneOrMoreFields = true;
        //actually add this field to the file, empty for now. When saving,
        // empty ones are not going to be saved to disk anyhow.
        file.properties.addCustomProperty(
          this.makeFieldForUnusedCustomField(n, n)
        );
      });

    // When the file set up its dirty detection, this field did not exist on this file.
    // Now we have added it, and if the user does decide to type something in there,
    // it would not not be noticed by the dirty detection. So just have it reset
    // based on the fields it has now.
    // NOTE that this will be called basically every time they run SayMore on every
    // file that they display which can have custom fields, unless all custom fields
    // are non-empty. I expect this to be very fast, though... the time it takes is
    // roughly the time to construct the xml string that we would save if we were writing
    // to disk.
    if (didAddOneOrMoreFields) {
      file.recomputedChangeWatcher();
    }

    this.fieldsForRows = file.properties
      .values()
      .filter((f) => (f.definition ? f.definition.isCustom : false))
      .sort((a, b) =>
        a.definition.englishLabel.localeCompare(b.definition.englishLabel)
      ); // enhance: really we don't care about your locale, we care aobut the language of the label

    // add one blank row
    const placeHolder = this.makePlaceholderForCustomField();
    this.fieldsForRows.push(placeHolder);
  }

  private fieldLabelChanged(f: Field) {
    //review: what should happen if we have a couple instances of a custom field
    // and we change the name of one of the instances?

    if (f.definition.persist) {
      // we're updating
      if (f.definition.englishLabel.trim().length === 0) {
        this.props.file.properties.remove(f.key);
        this.computeRows(this.props.file);
        this.forceUpdate();
      } else {
        this.props.file.properties.changeKeyOfCustomField(
          f,
          f.definition.englishLabel
        );
      }
    } else {
      if (f.definition.englishLabel.trim().length === 0) {
        // ignore empty placehholders
        return;
      }
      // we're adding a new field because the user typed in a field name
      console.log(`adding custom field ${f.definition.englishLabel}=${f.text}`);

      f.key = f.definition.englishLabel;

      // add the name of this field to the list of names shared with all files of this type (e.g. Sessions)
      //review do this here?
      this.props.file.encounteredVocabularyRegistry.encountered(
        this.props.file.type + EncounteredVocabularyRegistry.kCustomFieldSuffix,
        f.key
      );

      f.persist = f.definition.persist = true; // But what if it is empty? Let the saving code worry about that.
      this.props.file.properties.addCustomProperty(f);
      // add a new placeholder
      this.focusField = f;
      this.computeRows(this.props.file);
      this.forceUpdate();
    }
    this.props.file.wasChangeThatMobxDoesNotNotice();
  }

  private makeFieldForUnusedCustomField(key: string, englishLabel: string) {
    const definition: FieldDefinition = {
      key,
      englishLabel,
      persist: true,
      type: "Text",
      tabIndex: 0,
      isCustom: true,
      showOnAutoForm: false, // we do show it, but in the custom table,
      multilingual: false // REVIEW
    };
    return Field.fromFieldDefinition(definition);
  }

  private makePlaceholderForCustomField() {
    const definition: FieldDefinition = {
      key: "placeholder",
      englishLabel: "",
      persist: false, // we'll change this if they make it real
      type: "Text",
      tabIndex: 0,
      isCustom: true,
      showOnAutoForm: false, // we do show it, but in the custom table
      multilingual: false // REVIEW
    };
    return Field.fromFieldDefinition(definition);
  }

  public render() {
    //console.log(`Rendering Custom fields of ${this.props.folder.displayName}`);
    //const customFields = this.getCustomFields();

    const customFieldTableColumns = [
      {
        id: "name",
        Header: this.props.firstColumnHeaderText
          ? this.props.firstColumnHeaderText
          : t`Field`,
        maxWidth: 150,
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
        Header: t`Value`,
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
              // cause the cursor to go down there. Instead, we
              // want the focus to go to the value column of the newly created
              // custom field
              autoFocus={this.focusField === field}
            />
          );
        }
      }
    ];
    const customFieldsDef =
      this.props.file.properties.getFieldDefinition("customFields");

    return (
      <div className="customFieldsBlock">
        <FieldLabel fieldDef={customFieldsDef} />
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

export default observer(CustomFieldsTable);
