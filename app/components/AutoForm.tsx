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
  //private sortedKeys: string[];
  constructor(props: IProps) {
    super(props);
  }

  private makeEdit(field: Field) {
    //console.log("makeEdit(" + JSON.stringify(field));
    switch (field.type) {
      case FieldType.Text:
        const f = field as Field;
        if (f.choices && f.choices.length > 0) {
          return <ClosedChoiceEdit field={f} key={field.key} />;
        } else if (f.definition && f.definition.key === "access") {
          return (
            <AccessChooser
              key={f.key} // for some reason we get a key error without this
              field={f}
              authorityLists={this.props.authorityLists}
            />
          );
        } else if (
          f.definition &&
          f.definition.complexChoices &&
          f.definition.complexChoices.length > 0
        ) {
          return <GenreChooser field={f} key={field.key} />;
        } else {
          return (
            <TextFieldEdit
              className={field.cssClass}
              key={field.key}
              field={field as Field}
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
    const sortedKeys = this.props.fields
      .values()
      .sort(
        (a, b) =>
          (a.definition ? a.definition.order : 1000) -
          (b.definition ? b.definition.order : 1000)
      )
      .map(f => f.key);
    // console.log("---------");
    // sortedKeys.forEach(k => console.log("key: " + k));
    // sortedKeys
    //   .map(k => {
    //     console.log("key: " + k);
    //     return this.props.fields.getValue(k);
    //   })
    // .forEach(field => {
    //   console.log("field.form " + JSON.stringify(field));
    //   console.log("field.form " + field.key + "/" + field.form);
    // });
    return (
      <form className={"autoForm " + this.props.form}>
        {// this.props.fields
        // .values()
        // .filter(field => field.form === this.props.form)
        //   .map(field => this.makeEdit(field))

        sortedKeys
          .map(k => this.props.fields.getValue(k))

          .filter(field => field.form === this.props.form)
          .map(field => this.makeEdit(field))}
        {/* Items that don't come from fields are given to this component as children */}
        {this.props.children}
      </form>
    );
  }
}
