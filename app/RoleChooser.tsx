import * as React from "react";
import * as MobxReact from "mobx-react";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { IChoice } from "./model/Project/AuthorityLists/AuthorityLists";
import { Contribution } from "./model/file/File";
import { translateRole } from "./localization";
import { titleCase } from "title-case";

export interface IProps {
  contribution: Contribution;
  choices: IChoice[];
}

const RoleChooser = MobxReact.observer(
  class RoleChooserC extends React.Component<IProps> {
    constructor(props: IProps) {
      super(props);
    }

    public render() {
      const choices = this.props.choices ? this.props.choices : [];

      const options = choices.map((c) => {
        const label = translateRole(c.label);
        return new Object({
          value: c.id,
          label,
          title: c.description,
        });
      });
      const currentValueWrappedForSelect = {
        value: this.props.contribution.role,
        label: titleCase(translateRole(this.props.contribution.role)),
      };
      return (
        <ReactSelectClass
          name={"select role"}
          value={currentValueWrappedForSelect}
          onChange={(s: any) => {
            this.props.contribution.role = (s && s.value
              ? s.value
              : "") as string;
            this.setState({});
          }}
          options={options}
        />
      );
    }
  }
);

export default RoleChooser;
