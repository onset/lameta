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
          classNamePrefix="rs" // causes react-select to show you the parts of the control for styling, e.g. "rs-input"
          value={currentOption}
          placeholder=""
          /* This is a complete mystery, why I have to go in and do so much hand-styling to get a non-gargantuan react-select*/
          styles={{
            control: (provided, state) => ({
              ...provided,
              minHeight: "26px",
              height: "26px",
              borderStyle: "inset",
              borderRadius: 0,
              borderColor: "rgb(169, 169, 169)",
              boxShadow: state.isFocused
                ? "0 0 0 1px " + saymore_orange
                : "unset",
              "&:hover": { borderColor: saymore_orange }
            }),
            menu: provided => ({
              ...provided,
              marginTop: "0",
              marginBottom: "0"
            }),
            container: provided => ({
              ...provided,
              marginTop: "2px"
            }),
            valueContainer: provided => ({
              ...provided,
              paddingLeft: "2px",
              paddingTop: "0"
            }),
            input: provided => ({
              ...provided,
              height: "20px"
            }),
            indicatorsContainer: provided => ({
              ...provided,
              height: "26px"
            }),
            dropdownIndicator: provided => ({
              ...provided,
              height: "26px",
              padding: "1px"
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
