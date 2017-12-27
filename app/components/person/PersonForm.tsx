import * as React from "react";
import { Person } from "../../model/Project/Person/Person";
import { observer } from "mobx-react";
import TextFieldEdit from "../TextFieldEdit";
import ImageField from "../ImageField";
import { FieldSet } from "../../model/field/FieldSet";
import LanguageEdit from "./LanguageEdit";
import ClosedChoiceEdit from "../ClosedChoiceEdit";
import * as Dropzone from "react-dropzone";
import * as fs from "fs-extra";
import { MugshotPlaceholder } from "../MugshotPlaceholder";

export interface IProps {
  person: Person;
  fields: FieldSet;
}
@observer
export default class PersonForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  private onMugShotDrop(
    acceptedFiles: Dropzone.ImageFile[],
    rejectedFiles: Dropzone.ImageFile[]
  ) {
    if (acceptedFiles.length > 0) {
      this.props.person.photoPath = acceptedFiles[0].path;
    }
  }

  public render() {
    const father = this.props.fields.getTextField("fathersLanguage");
    const mother = this.props.fields.getTextField("mothersLanguage");
    console.log("Render person");
    return (
      <form className={"personForm"}>
        <div className={"first-column"}>
          <TextFieldEdit field={this.props.fields.getTextField("name")} />
          <div className={"nickname-and-code"}>
            <TextFieldEdit field={this.props.fields.getTextField("nickName")} />
            <TextFieldEdit field={this.props.fields.getTextField("code")} />
          </div>
          <div>
            <label>
              {this.props.fields.getTextField("primaryLanguage").englishLabel}
            </label>
            <LanguageEdit
              language={this.props.fields.getTextField("primaryLanguage")}
              fatherLanguage={this.props.fields.getTextField("fathersLanguage")}
              motherLanguage={this.props.fields.getTextField("mothersLanguage")}
            />
          </div>
          <label>Other Languages</label>
          <LanguageEdit
            language={this.props.fields.getTextField("otherLanguage0")}
            fatherLanguage={father}
            motherLanguage={mother}
          />
          <LanguageEdit
            language={this.props.fields.getTextField("otherLanguage1")}
            fatherLanguage={father}
            motherLanguage={mother}
          />
          <LanguageEdit
            language={this.props.fields.getTextField("otherLanguage2")}
            fatherLanguage={father}
            motherLanguage={mother}
          />
          <LanguageEdit
            language={this.props.fields.getTextField("otherLanguage3")}
            fatherLanguage={father}
            motherLanguage={mother}
          />

          {/* uncomment for testing that the parent buttons are working
          <TextFieldEdit className={"language-name"} field={mother} />
          <TextFieldEdit className={"language-name"} field={father} /> */}

          <TextFieldEdit field={this.props.fields.getTextField("education")} />
        </div>
        <div className={"second-column"}>
          <div className={"upper-right-cluster"}>
            <TextFieldEdit
              className={"birth"}
              field={this.props.fields.getTextField("birthYear")}
            />
            <ClosedChoiceEdit
              className={"gender"}
              field={this.props.fields.getTextField("gender")}
            />
            <Dropzone
              className={"mugshot"}
              activeClassName={"drop-active"}
              onDrop={this.onMugShotDrop.bind(this)}
              accept="image/jpg,image/jpeg,image/png"
            >
              <div className={"mask"}>Drop here</div>
              {this.props.person.photoPath &&
              this.props.person.photoPath.length > 0 &&
              fs.existsSync(this.props.person.photoPath) ? (
                <ImageField path={this.props.person.photoPath} />
              ) : (
                <MugshotPlaceholder />
              )}
            </Dropzone>
          </div>
          <TextFieldEdit
            className={"text-block"}
            field={this.props.fields.getTextField("howToContact")}
          />{" "}
          <TextFieldEdit
            field={this.props.fields.getTextField("ethnicGroup")}
          />{" "}
          <TextFieldEdit
            field={this.props.fields.getTextField("primaryOccupation")}
          />
        </div>
      </form>
    );
  }
}
