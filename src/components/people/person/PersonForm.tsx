import * as React from "react";
import { Trans } from "@lingui/macro";
import { Person } from "../../../model/Project/Person/Person";
import { observer } from "mobx-react";
import { TextFieldEdit } from "../../TextFieldEdit";
import { FieldSet } from "../../../model/field/FieldSet";
import { OldPersonLanguagesEditor } from "./OldPersonLanguagesEditor";
import ClosedChoiceEdit from "../../ClosedChoiceEdit";
import { MugShot } from "./MugShot";
import "./PersonForm.scss";
import CustomFieldsTable from "../../CustomFieldsTable";
import { OtherLanguageEdit } from "./OtherLanguageEdit";
import { LanguageFinder } from "../../../languageFinder/LanguageFinder";
import { PersonLanguageList } from "./PersonLanguageList";

export interface IProps {
  person: Person;
  languageFinder: LanguageFinder;
  fields: FieldSet;
  validateFullName: (value: string) => boolean;
  validateCode: (value: string) => boolean;
}

class PersonForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <form className={"personForm"}>
        {/* <div className={"first-column"}> */}
        <TextFieldEdit
          validate={(value: string) => this.props.validateFullName(value)}
          field={this.props.fields.getTextField("name")}
          onBlur={() => {
            if (this.props.person.getNeedRenameOfFolder()) {
              // todo: show a dialog that says we're working
              setTimeout(() => {
                this.props.person.nameMightHaveChanged();
                // ID is s function of the name and the code
                this.props.person.IdMightHaveChanged();
              }, 100);
            }
          }}
          className="full-name left-side"
        />
        <TextFieldEdit
          className="nickname"
          field={this.props.fields.getTextField("nickname")}
        />
        <TextFieldEdit
          validate={(value: string) => this.props.validateCode(value)}
          className="code"
          field={this.props.fields.getTextField("code")}
          onBlur={() => {
            // ID is s function of the name and the code
            this.props.person.IdMightHaveChanged();
          }}
        />

        {/* uncomment for testing that the parent buttons are working
          <TextFieldEdit className={"language-name"} field={mother} />
          <TextFieldEdit className={"language-name"} field={father} /> */}
        <TextFieldEdit
          className="education"
          field={this.props.fields.getTextField("education")}
        />
        {/* </div> */}
        {/* <div className={"second-column"}> */}
        {/* <div className={"upper-right-cluster"}> */}
        <TextFieldEdit
          className={"birth"}
          field={this.props.fields.getTextField("birthYear")}
        />
        <ClosedChoiceEdit
          includeLabel={true}
          className={"gender"}
          field={this.props.fields.getTextField("gender")}
        />
        <MugShot
          person={this.props.person}
          unused={this.props.person.displayName}
        />
        {/* </div> */}
        <TextFieldEdit
          className="howToContact multiline full-right-side"
          field={this.props.fields.getTextField("howToContact")}
        />
        <TextFieldEdit
          field={this.props.fields.getTextField("ethnicGroup")}
          className="ethnicGroup"
        />
        <TextFieldEdit
          field={this.props.fields.getTextField("primaryOccupation")}
          className="primaryOccupation"
        />
        <TextFieldEdit
          field={this.props.fields.getTextField("description")}
          className="description"
        />
        <CustomFieldsTable file={this.props.person.metadataFile!} />

        <PersonLanguageList
          person={this.props.person}
          languageFinder={this.props.languageFinder}
        />
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
