import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import TextFieldEdit from "./../TextFieldEdit";
import { Button } from "@blueprintjs/core";
import { observable } from "mobx";

export class ObservableBoolean {
  @observable public value: boolean;
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
        type="button"
        className={"state " + (this.props.on.value ? "on" : "")}
        onClick={() =>
          console.log((this.props.on.value = !this.props.on.value))
        }
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

//
