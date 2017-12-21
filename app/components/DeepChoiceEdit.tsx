import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { Creatable, Option, OptionValues } from "react-select";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { observable } from "mobx";

const titleCase = require("title-case");

export interface IProps {
  field: Field;
  closed: boolean;
}

/* This is for choices that have a distinct id vs. name, definitions, examples, etc.
  Maybe just genre & access.
  */
@observer
export default class DeepChoiceEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
    this.getLabel = this.getLabel.bind(this);
  }

  // The label for the field, e.g. "Genre"
  private getLabel() {
    if (this.props.field === undefined) {
      return "Null Text";
    }
    return titleCase(this.props.field.englishLabel);
  }

  public render() {
    const choices = this.props.field.definition.complexChoices
      ? this.props.field.definition.complexChoices
      : [];
    const options = choices.map(
      c => new Object({ value: c.id, label: c.label })
    );

    return (
      <div className={"field " + this.props.className}>
        <label>{this.getLabel()}</label>
        <ReactSelectClass
          name={this.props.field.englishLabel}
          value={this.props.field.text}
          onChange={(s: any) => {
            this.props.field.text = (s && s.value ? s.value : "") as string;

            // react-select doesn't automatically change this, and I haven't
            // figured out why mobx doesn't cause a re-render, so we change
            // it here, manually. But really all that is happening is this
            // is forcing a re-render; we don't actually use this state at
            // the moment... the props are up-to-date.
            this.setState({}); //hack to force a re-rendering
          }}
          options={options}
        />
      </div>
    );
  }
}
