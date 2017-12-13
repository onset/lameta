import * as React from "react";
import { DateInput } from "@blueprintjs/datetime";
import { Person } from "../model/Person";
import { observer, Provider } from "mobx-react";
import TextFieldEdit from "./TextFieldEdit";
import { TextField } from "../model/Field";
import DateFieldEdit from "./DateFieldEdit";
import ImageField from "./ImageField";

export interface IProps {
  person: Person;
}
@observer
export default class PersonForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  private renderDatePicker = () => (
    <div>
      <DateInput />
    </div>
  );

  public render() {
    return (
      <form className={"personForm"}>
        <TextFieldEdit text={this.props.person.getTextField("name")} />
        <TextFieldEdit
          text={this.props.person.getTextField("primaryLanguage")}
        />
        <TextFieldEdit
          text={this.props.person.getTextField("otherLanguage0")}
        />
        <TextFieldEdit
          text={this.props.person.getTextField("fathersLanguage")}
        />
        <TextFieldEdit
          text={this.props.person.getTextField("mothersLanguage")}
        />
        <ImageField path={this.props.person.photoPath} />
        <TextFieldEdit
          text={this.props.person.getTextField("otherLanguage1")}
        />
        <TextFieldEdit text={this.props.person.getTextField("birthYear")} />
        <TextFieldEdit text={this.props.person.getTextField("gender")} />
        <TextFieldEdit text={this.props.person.getTextField("education")} />
        <TextFieldEdit
          text={this.props.person.getTextField("primaryOccupation")}
        />
      </form>
    );
  }
}
