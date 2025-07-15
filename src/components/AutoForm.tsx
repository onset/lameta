import * as React from "react";
import { observer } from "mobx-react";
import { TextFieldEdit } from "./TextFieldEdit";
import { Field, FieldType, FieldVisibility } from "../model/field/Field";
import DateFieldEdit from "./DateFieldEdit";
import ClosedChoiceEdit from "./ClosedChoiceEdit";
import { Folder } from "../model/Folder/Folder";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import AccessChooser from "./session/AccessChooser";
import { PeopleChooser } from "./session/PeopleChooser";
import "./session/SessionForm.scss";
import "./Form.scss";
import CustomFieldsTable from "./CustomFieldsTable";
import AdditionalFieldsTable from "./MoreFieldsTable";
import IsoLanguageEdit from "./IsoLanguageEdit";
import { LanguageChoicesEditor } from "./LanguageChoicesEditor";
import { Contribution } from "../model/file/File";
import { LanguageFinder } from "../languageFinder/LanguageFinder";
import { translateGenre } from "../other/localization";
import FieldOpenChoiceChooser from "./session/FieldOpenChoiceChooser";

export interface IProps {
  folder: Folder;
  form: string; // only fields with this "form" property will show

  formClass: string; // used to activate the right stylesheet
  authorityLists: AuthorityLists;
  //customFieldNames: string[];
  fieldThatControlsFileNames?: string;
  fieldThatControlsFileNamesMightHaveChanged?: (fieldName: string) => boolean;
  validateFieldThatControlsFileNames?: (value: string) => string | undefined;
  onShowContributorsTab?: (contributions: Contribution) => void;
  languageFinder: LanguageFinder;
  rowStyle?: boolean; // like used in the Properties tab
}

class AutoForm extends React.Component<IProps> {
  private sortedKeys: string[];

  constructor(props: IProps) {
    super(props);
  }

  private makeEdit(field: Field, props: IProps): JSX.Element {
    //console.log("makeEdit(" + JSON.stringify(field));
    switch (field.type) {
      case FieldType.Text:
        const f = field as Field;
        if (f.choices && f.choices.length > 0) {
          return (
            <ClosedChoiceEdit
              includeLabel={true}
              field={f}
              key={field.key}
              className={field.cssClass}
              tabIndex={field.definition.tabIndex}
            />
          );
        } else if (f.definition && f.definition.key === "access") {
          return (
            <AccessChooser
              key={f.key} // for some reason we get a key error without this
              field={f}
              authorityLists={this.props.authorityLists}
              tabIndex={field.definition.tabIndex}
            />
          );
        } else if (f.definition.key === "participants") {
          return (
            <PeopleChooser
              key={f.key} // for some reason we get a key error without this
              folder={props.folder}
              className={field.cssClass}
              getPeopleNames={this.props.authorityLists.getPeopleNames}
              onShowContributorsTab={this.props.onShowContributorsTab!}
              tabIndex={field.definition.tabIndex}
            />
          );
        } else if (f.definition && f.definition.key === "genre") {
          console.assert(
            f.definition!.complexChoices &&
              f.definition!.complexChoices!.length > 0
          );
          return (
            <FieldOpenChoiceChooser
              field={f}
              key={field.key}
              className={field.cssClass}
              tabIndex={field.definition.tabIndex}
              translateChoice={translateGenre}
            />
          );
        } else if (
          this.props.fieldThatControlsFileNamesMightHaveChanged &&
          this.props.fieldThatControlsFileNames &&
          field.key === this.props.fieldThatControlsFileNames
        ) {
          return (
            <TextFieldEdit
              className={field.cssClass}
              key={field.key}
              field={field as Field}
              tabIndex={field.definition.tabIndex}
              attemptFileChanges={() => {
                if (
                  !this.props.fieldThatControlsFileNamesMightHaveChanged!(
                    this.props.fieldThatControlsFileNames || ""
                  )
                ) {
                  return false;
                }
                return true;
              }}
              validate={(value) =>
                this.props.validateFieldThatControlsFileNames
                  ? this.props.validateFieldThatControlsFileNames(value)
                  : undefined
              }
            />
          );
        } else {
          return (
            <TextFieldEdit
              tabIndex={field.definition.tabIndex}
              className={field.cssClass}
              key={field.key}
              field={field as Field}
              showAffordancesAfter={props.rowStyle}
            />
          );
        }

      case FieldType.Date:
        return (
          <DateFieldEdit
            tabIndex={field.definition.tabIndex}
            className={field.cssClass}
            key={field.key}
            field={field as Field}
          />
        );
      case FieldType.Language:
        return (
          <IsoLanguageEdit
            key={field.key}
            className={field.cssClass}
            field={field}
          />
        );
      case FieldType.LanguageChoices:
        return (
          <LanguageChoicesEditor
            className={field.cssClass}
            key={field.key}
            field={field as Field}
            languageFinder={props.languageFinder}
            tabIndex={field.definition.tabIndex}
            {...field.definition.controlProps}
          />
        );

      default:
        throw Error("unknown type: " + field.type.toString());
    }
  }

  public render() {
    this.sortedKeys = this.props.folder.properties
      .values()
      .filter(
        (f) =>
          f.definition &&
          f.definition.visibility !== "never" &&
          f.definition.showOnAutoForm &&
          !f.definition.isCustom &&
          !f.definition.isAdditional &&
          f.definition.key !== "customFields" // this is handled special, below
      )
      .sort((a, b) => {
        const x =
          (a.definition && a.definition.tabIndex !== undefined
            ? a.definition.tabIndex
            : 1000) -
          (b.definition && b.definition.tabIndex !== undefined
            ? b.definition.tabIndex
            : 1000);

        return x;
      })
      .map((f) => f.key);

    return (
      <form
        className={"autoForm " + this.props.form + " " + this.props.formClass}
      >
        {this.sortedKeys
          .map((k) => this.props.folder.properties.getValueOrThrow(k))

          .filter((field) => field.form === this.props.form)
          .map((field) => this.makeEdit(field, this.props))}
        {this.props.folder.hasMoreFieldsTable ? (
          <AdditionalFieldsTable folder={this.props.folder} />
        ) : (
          ""
        )}
        {this.props.folder.properties.shouldShow("customFields") ? (
          <CustomFieldsTable file={this.props.folder.metadataFile!} />
        ) : (
          ""
        )}
      </form>
    );
  }
}

export default observer(AutoForm);
