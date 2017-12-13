import * as React from "react";
import { observer, Provider } from "mobx-react";
import TextFieldEdit from "../TextFieldEdit";
import { TextField } from "../../model/Field";
import DateFieldEdit from "../DateFieldEdit";
import { Project } from "../../model/Project";

export interface IProps {
  project: Project;
}
@observer
export default class ProjectAbout extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <form className={"projectAboutForm"}>
        <TextFieldEdit text={this.props.project.getTextField("title")} />
        <TextFieldEdit text={this.props.project.getTextField("iso639Code")} />
        <TextFieldEdit
          className={"text-block"}
          text={this.props.project.getTextField("projectDescription")}
        />
      </form>
    );
  }
}
