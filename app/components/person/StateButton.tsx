import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import TextFieldEdit from "./../TextFieldEdit";
import { Button } from "@blueprintjs/core";

export class ObservableBoolean {
  public value: boolean;
}

export interface IProps {
  on: ObservableBoolean;
}

@observer
export default class StateButton extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <button
        className={this.props.on.value ? "on" : ""}
        onClick={() => (this.props.on.value = !this.props.on.value)}
      >
        {this.props.children}
      </button>
    );
  }
}

/* <button className={this.props.on.value ? "on" : ""}
        onClick={this.props.on.value = !this.props.on.value}>
        {this.props.children}
      </button>*/
