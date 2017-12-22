import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import TextFieldEdit from "./TextFieldEdit";

export interface IProps {
  text: Field;
}

@observer
export default class Notes extends React.Component<IProps> {
  public render() {
    return <TextFieldEdit field={this.props.text} className={"text-block"} />;
  }
}
