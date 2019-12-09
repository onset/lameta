import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";

// tslint:disable-next-line: no-submodule-imports
import CreateableSelect from "react-select/creatable";
import { translateFieldLabel, translateGenre } from "../../localization";
const saymore_orange = "#e69664";

export interface IProps {
  field: Field;
}

/* This is for choices that have a distinct id vs. name, definitions, examples, etc.
  Maybe just genre & access.
  */
@observer
export default class GenreChooser extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  public render() {
    const label = this.props.field.labelInUILanguage;
    const choices = this.props.field.definition.complexChoices
      ? this.props.field.definition.complexChoices
      : [];

    const options = choices
      .map(c => {
        let tip = c.definition;
        if (c.examples && c.examples.length > 0) {
          tip += "\nExamples: " + c.examples;
        }
        return new Object({
          value: c.id,
          label: translateGenre(c.label),
          title: tip
        });
      })
      .sort((a: any, b: any) => (a.label as string).localeCompare(b.label));

    let currentOption: object | null = null;
    if (this.props.field.text.trim().length > 0) {
      const matchingOption = options.find(
        (o: any) =>
          o.value.toLowerCase() === this.props.field.text.toLowerCase()
      );
      currentOption = matchingOption
        ? matchingOption
        : {
            value: this.props.field.text,
            label: this.props.field.text
          };
    }
    return (
      <div className={"field " + this.props.className}>
        <label>{label}</label>
        <CreateableSelect
          value={currentOption}
          placeholder=""
          styles={{
            control: (styles, state) => ({
              ...styles,

              height: "2em",
              "min-height": "2em",
              borderStyle: "inset",
              borderRadius: 0,
              borderColor: "rgb(169, 169, 169)",
              boxShadow: state.isFocused
                ? "0 0 0 1px " + saymore_orange
                : "unset",
              "&:hover": { borderColor: saymore_orange }
            })
          }}
          onChange={(s: any) => {
            this.props.field.text = (s && s.value ? s.value : "") as string;
          }}
          options={options}
        />
      </div>
    );
  }
}
