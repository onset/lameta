import * as React from "react";
import { Session } from "../model/Project/Session/Session";
import { observer } from "mobx-react";
import TextFieldEdit from "./TextFieldEdit";
import DateFieldEdit from "./DateFieldEdit";
import { FieldSet } from "../model/field/FieldSet";

export interface IProps {
  session: Session;
}
@observer
export default class SessionForm extends React.Component<IProps> {
  protected fields: FieldSet;
  constructor(props: IProps) {
    super(props);
    this.fields = props.session.properties;
    console.log(
      "SessionForm constructor: " + this.fields.getValue("title").toString()
    );
  }

  public render() {
    return (
      <form className={"sessionForm"}>
        <TextFieldEdit text={this.fields.getTextField("title")} />
        <TextFieldEdit text={this.fields.getTextField("people")} />
        <TextFieldEdit text={this.fields.getTextField("genre")} />
        <TextFieldEdit
          text={this.fields.getTextField("situation")}
          className={"text-block"}
        />
        <DateFieldEdit date={this.fields.getDateField("date")} />
        <TextFieldEdit text={this.fields.getTextField("setting")} />
        <TextFieldEdit text={this.fields.getTextField("location")} />
        <TextFieldEdit text={this.fields.getTextField("access")} />
        <TextFieldEdit
          text={this.fields.getTextField("description")}
          className={"text-block"}
        />
      </form>
    );
  }
}
