import * as React from "react";
import { observer } from "mobx-react";
import TextFieldEdit from "../TextFieldEdit";
import {
  Field,
  FieldType,
  TextField,
  FieldVisibility,
  DateField
} from "../../model/Field";
import DateFieldEdit from "../DateFieldEdit";
import { Project } from "../../model/Project";
import { FieldSet } from "../../model/FieldSet";
import ClosedChoiceEdit from "../ClosedChoiceEdit";

export interface IProps {
  project: Project;
  fields: FieldSet;
}
@observer
export default class ProjectAbout extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  private makeEdit(field: Field) {
    console.log("makeEdit(" + JSON.stringify(field));
    switch (field.type) {
      case FieldType.Text:
        const f = field as TextField;
        if (f.choices.length > 0) {
          return <ClosedChoiceEdit text={f} key={field.key} />;
        } else {
          return (
            <TextFieldEdit
              className={field.cssClass}
              key={field.key}
              text={field as TextField}
            />
          );
        }
      case FieldType.Date:
        return (
          <DateFieldEdit
            className={field.cssClass}
            key={field.key}
            date={field as DateField}
          />
        );
      default:
        return "unknown type: " + field.type.toString();
    }
  }

  public render() {
    return (
      <form className={"projectAboutForm"}>
        {this.props.fields
          .values()
          .filter(field => field.visibility === FieldVisibility.MainForm)
          .map(field => this.makeEdit(field))}
      </form>
    );
  }

  // public render() {
  //   return (
  //     <form className={"projectAboutForm"}>
  //       <TextFieldEdit text={this.props.fields.getTextField("title")} />
  //       <TextFieldEdit text={this.props.fields.getTextField("iso639Code")} />
  //       <TextFieldEdit
  //         className={"text-block"}
  //         text={this.props.fields.getTextField("projectDescription")}
  //       />
  //     </form>
  //   );
  // }
}
