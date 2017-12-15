import * as React from "react";
import { Person } from "../model/Person";
import { observer } from "mobx-react";
import TextFieldEdit from "./TextFieldEdit";
import ImageField from "./ImageField";
import { FieldSet } from "../model/field/FieldSet";

export interface IProps {
  person: Person;
  fields: FieldSet;
}
@observer
export default class PersonForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <form className={"personForm"}>
        <TextFieldEdit text={this.props.fields.getTextField("name")} />
        <TextFieldEdit
          text={this.props.fields.getTextField("primaryLanguage")}
        />
        <TextFieldEdit
          text={this.props.fields.getTextField("otherLanguage0")}
        />
        <TextFieldEdit
          text={this.props.fields.getTextField("fathersLanguage")}
        />
        <TextFieldEdit
          text={this.props.fields.getTextField("mothersLanguage")}
        />
        <ImageField path={this.props.person.photoPath} />
        <TextFieldEdit
          text={this.props.fields.getTextField("otherLanguage1")}
        />
        <TextFieldEdit text={this.props.fields.getTextField("birthYear")} />
        <TextFieldEdit text={this.props.fields.getTextField("gender")} />
        <TextFieldEdit text={this.props.fields.getTextField("education")} />
        <TextFieldEdit
          text={this.props.fields.getTextField("primaryOccupation")}
        />
      </form>
    );
  }
}
