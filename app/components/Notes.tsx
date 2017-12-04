import * as React from "react";
import { observer } from "mobx-react";
import { TextField } from "../model/Fields";
import TextFieldEdit from "./TextFieldEdit";

export interface IProps {
  text: TextField;
}

@observer
export default class Notes extends React.Component<IProps> {
  public render() {
    return <TextFieldEdit text={this.props.text} className={"text-block"} />;
  }
}
