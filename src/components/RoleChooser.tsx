import * as React from "react";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { Contribution } from "../model/file/File";
import { translateRole } from "../other/localization";
import { titleCase } from "title-case";
import { IChoice } from "../model/field/Field";

export interface IProps {
  contribution: Contribution;
  choices: IChoice[];
}

class RoleChooser extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const choices = this.props.choices ? this.props.choices : [];

    const options = choices.map((c) => {
      const label = translateRole(c.id);
      return new Object({
        value: c.id, // this is snake case, as that's what we get from olac-roles.xml
        label,
        title: c.description
      });
    });
    const currentValueWrappedForSelect = {
      value: this.props.contribution.role,
      label: titleCase(translateRole(this.props.contribution.role))
    };
    return (
      <ReactSelectClass
        name={"select role"}
        value={currentValueWrappedForSelect}
        onChange={(s: any) => {
          this.props.contribution.role = (
            s && s.value ? s.value : ""
          ) as string;
          this.setState({});
        }}
        options={options}
      />
    );
  }
}

export default observer(RoleChooser);
