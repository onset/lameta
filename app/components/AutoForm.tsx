import * as React from "react";
import { observer } from "mobx-react";
import TextFieldEdit from "./TextFieldEdit";
import { Field, FieldType, FieldVisibility } from "../model/field/Field";
import DateFieldEdit from "./DateFieldEdit";
import { Project } from "../model/Project/Project";
import { FieldSet } from "../model/field/FieldSet";
import ClosedChoiceEdit from "./ClosedChoiceEdit";
import { Folder } from "../model/Folder";
import GenreChooser from "./session/GenreChooser";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import AccessChooser from "./session/AccessChooser";

export interface IProps {
  fields: FieldSet;
  form: string; // only fields with this "form" property will show
  authorityLists: AuthorityLists;
}

/** Constructs a form by looking at the properties of the given fields */
@observer
export default class AutoForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  private makeEdit(field: Field) {
    //console.log("makeEdit(" + JSON.stringify(field));
    switch (field.type) {
      case FieldType.Text:
        const f = field as Field;
        if (f.choices && f.choices.length > 0) {
          return <ClosedChoiceEdit text={f} key={field.key} />;
        } else if (f.definition.key === "access") {
          return (
            <AccessChooser
              field={f}
              authorityLists={this.props.authorityLists}
            />
          );
        } else if (
          f.definition.complexChoices &&
          f.definition.complexChoices.length > 0
        ) {
          return <GenreChooser field={f} key={field.key} />;
        } else {
          return (
            <TextFieldEdit
              className={field.cssClass}
              key={field.key}
              text={field as Field}
            />
          );
        }
      case FieldType.Date:
        return (
          <DateFieldEdit
            className={field.cssClass}
            key={field.key}
            date={field as Field}
          />
        );
      default:
        throw Error("unknown type: " + field.type.toString());
    }
  }

  public render() {
    return (
      <form className={"autoForm " + this.props.form}>
        {this.props.fields
          .values()
          .filter(field => field.form === this.props.form)
          .map(field => this.makeEdit(field))}
      </form>
    );
  }
}
