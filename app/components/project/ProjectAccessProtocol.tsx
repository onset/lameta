import * as React from "react";
import { observer, Provider } from "mobx-react";
import TextFieldEdit from "../TextFieldEdit";
import {
  Field,
  FieldType,
  TextField,
  FieldVisibility
} from "../../model/Field";
import { Project } from "../../model/Project";
import { FieldSet } from "../../model/FieldSet";

export interface IProps {
  project: Project;
  fields: FieldSet;
}
@observer
export default class ProjectAccessProtocol extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <form className={"projectAccessProtocolForm"}>
        <TextFieldEdit
          text={this.props.fields.getTextField("accessProtocol")}
        />
      </form>
    );
  }
}
