import * as React from "react";
import { Person } from "../../model/Project/Person/Person";
import { observer } from "mobx-react";
import TextFieldEdit from "../TextFieldEdit";
import ImageField from "../ImageField";
import { FieldSet } from "../../model/field/FieldSet";

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
        <TextFieldEdit field={this.props.fields.getTextField("name")} />
        <TextFieldEdit
          field={this.props.fields.getTextField("primaryLanguage")}
        />
        <TextFieldEdit
          field={this.props.fields.getTextField("otherLanguage0")}
        />
        <TextFieldEdit
          field={this.props.fields.getTextField("fathersLanguage")}
        />
        <TextFieldEdit
          field={this.props.fields.getTextField("mothersLanguage")}
        />
        <ImageField path={this.props.person.photoPath} />
        <TextFieldEdit
          field={this.props.fields.getTextField("otherLanguage1")}
        />
        <TextFieldEdit field={this.props.fields.getTextField("birthYear")} />
        <TextFieldEdit field={this.props.fields.getTextField("gender")} />
        <TextFieldEdit field={this.props.fields.getTextField("education")} />
        <TextFieldEdit
          field={this.props.fields.getTextField("primaryOccupation")}
        />
      </form>
    );
  }
}
