import * as React from "react";

import { Person } from "../../../model/Project/Person/Person";
import { observer } from "mobx-react";
import { TextFieldEdit } from "../../TextFieldEdit";
import { FieldSet } from "../../../model/field/FieldSet";

import ClosedChoiceEdit from "../../ClosedChoiceEdit";
import { MugShot } from "./MugShot";
import "./PersonForm.css";
import CustomFieldsTable from "../../CustomFieldsTable";

import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { PersonLanguageList } from "./PersonLanguageList";

export interface IProps {
  person: Person;
  languageFinder: LanguageFinder;
  fields: FieldSet;
  validateFullName: (value: string) => string | undefined;
  validateCode: (value: string) => string | undefined;
}

class PersonForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  private renderIfVisible(key: string, element: React.ReactNode) {
    return this.props.fields.getFieldDefinition(key).visibility !== "never"
      ? element
      : null;
  }

  public render() {
    // this is a bit of a hack to move these fields up if the large "how to contact" field isn't being shown. Possibly with more grid-foo this could be done with pure CSS?
    const howToContactVisible =
      this.props.fields.getFieldDefinition("howToContact").visibility !==
      "never";
    const rightColumnFieldsVisible = [
      "education",
      "ethnicGroup",
      "primaryOccupation"
    ].some(
      (key) => this.props.fields.getFieldDefinition(key).visibility !== "never"
    );

    return (
      <form className={"personForm"}>
        {/* <div className={"first-column"}> */}
        {this.renderIfVisible(
          "name",
          <TextFieldEdit
            validate={(value: string) => this.props.validateFullName(value)}
            field={this.props.fields.getTextField("name")}
            onBlur={() => {
              if (this.props.person.getNeedRenameOfFolder()) {
                // todo: show a dialog that says we're working
                setTimeout(() => {
                  this.props.person.nameMightHaveChanged();
                }, 100);
              }
              // LAM-112: Call IdMightHaveChanged unconditionally on name blur.
              // The ID (used for references) is derived from the raw name, while the folder
              // name uses the sanitized name. When only special characters change (e.g.,
              // "John" -> "John!"), the folder doesn't need renaming but the ID does change.
              // Previously, IdMightHaveChanged was only called inside the if block above,
              // causing external references to become stale when the folder name stayed the same.
              // https://linear.app/lameta/issue/LAM-112
              this.props.person.IdMightHaveChanged();
            }}
            className="full-name left-side"
          />
        )}
        {this.renderIfVisible(
          "nickname",
          <TextFieldEdit
            className="nickname"
            field={this.props.fields.getTextField("nickname")}
          />
        )}
        {this.renderIfVisible(
          "code",
          <TextFieldEdit
            validate={(value: string) => this.props.validateCode(value)}
            className="code"
            field={this.props.fields.getTextField("code")}
            onBlur={() => {
              // ID is s function of the name and the code
              this.props.person.IdMightHaveChanged();
            }}
          />
        )}
        {this.renderIfVisible(
          "birthYear",
          <TextFieldEdit
            className={"birth"}
            field={this.props.fields.getTextField("birthYear")}
          />
        )}
        {this.renderIfVisible(
          "gender",
          <ClosedChoiceEdit
            includeLabel={true}
            className={"gender"}
            field={this.props.fields.getTextField("gender")}
          />
        )}
        <MugShot person={this.props.person} />

        {this.renderIfVisible(
          "description",
          <TextFieldEdit
            field={this.props.fields.getTextField("description")}
            className="description multiline full-right-side"
          />
        )}
        {howToContactVisible ? (
          <>
            {this.renderIfVisible(
              "howToContact",
              <TextFieldEdit
                className="howToContact multiline full-right-side"
                field={this.props.fields.getTextField("howToContact")}
              />
            )}
            {this.renderIfVisible(
              "education",
              <TextFieldEdit
                className="education"
                field={this.props.fields.getTextField("education")}
              />
            )}
            {this.renderIfVisible(
              "ethnicGroup",
              <TextFieldEdit
                field={this.props.fields.getTextField("ethnicGroup")}
                className="ethnicGroup"
              />
            )}
            {this.renderIfVisible(
              "primaryOccupation",
              <TextFieldEdit
                field={this.props.fields.getTextField("primaryOccupation")}
                className="primaryOccupation"
              />
            )}
          </>
        ) : rightColumnFieldsVisible ? (
          <div className="howToContact-hidden">
            {this.renderIfVisible(
              "education",
              <TextFieldEdit
                className="education"
                field={this.props.fields.getTextField("education")}
              />
            )}
            {this.renderIfVisible(
              "ethnicGroup",
              <TextFieldEdit
                field={this.props.fields.getTextField("ethnicGroup")}
                className="ethnicGroup"
              />
            )}
            {this.renderIfVisible(
              "primaryOccupation",
              <TextFieldEdit
                field={this.props.fields.getTextField("primaryOccupation")}
                className="primaryOccupation"
              />
            )}
          </div>
        ) : null}
        {this.props.person.metadataFile?.properties.shouldShow(
          "customFields"
        ) ? (
          <CustomFieldsTable file={this.props.person.metadataFile!} />
        ) : null}
        {this.renderIfVisible(
          "languages",
          <PersonLanguageList
            person={this.props.person}
            languageFinder={this.props.languageFinder}
          />
        )}
        {/* 
        <div className="primary-language">
          <label className="languageGroup">
            {
              this.props.fields.getTextField("primaryLanguage").definition
                .englishLabel
            }
          </label>

          <OldPersonLanguagesEditor
            language={this.props.fields.getTextField("primaryLanguage")}
            fatherLanguage={this.props.fields.getTextField("fathersLanguage")}
            motherLanguage={this.props.fields.getTextField("mothersLanguage")}
            languageFinder={this.props.languageFinder}
          />
          <TextFieldEdit
            className="primaryLanguageLearnedIn left-side"
            field={this.props.fields.getTextField("primaryLanguageLearnedIn")}
          />
        </div>

        <div className="other-languages">
          <label className="languageGroup">
            <Trans>Other Languages</Trans>
          </label>
          <OtherLanguageEdit
            person={this.props.person}
            languageFinder={this.props.languageFinder}
          />
        </div> */}
      </form>
    );
  }
}

export default observer(PersonForm);
