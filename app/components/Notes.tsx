import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { TextFieldEdit } from "./TextFieldEdit";

export interface IProps {
  field: Field;
}

class Notes extends React.Component<IProps> {
  public render() {
    return (
      <form className={"notesForm"}>
        <TextFieldEdit
          hideLabel={true}
          field={this.props.field}
          className={"fill-form"}
        />
      </form>
    );
  }
}

export default observer(Notes);
