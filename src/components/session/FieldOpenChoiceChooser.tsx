import * as React from "react";
import { Field } from "../../model/field/Field";
import { observer } from "mobx-react";
// tslint:disable-next-line: no-submodule-imports
import CreatableSelect from "react-select/creatable";
import Tooltip from "react-tooltip-lite";
import { capitalCase } from "capital-case";
import { lameta_orange } from "../../containers/theme";
import { observable } from "mobx";

//const Choices = new Dictionary<string, Array<string>>();

// For fields where there are choices but the user can enter new ones.
const FieldOpenChoiceChooser: React.FunctionComponent<{
  field: Field;
  className?: string;
  tabIndex?: number;
  translateChoice: (english: string) => string;
}> = (props) => {
  const label = props.field.labelInUILanguage;
  // enhance: "complex" here means there is more than just a phrase associated with
  // this. Genres have definitions and examples too. It seems that this code is
  // conflating "open" with "complex"; we could certainly have a field where you
  // can add new things but there is no definition or examples. The code here
  // works because the only "open" chooser at the moment is for genres.
  const choices = props.field.definition.complexChoices
    ? props.field.definition.complexChoices
    : [];

  const options = choices
    .map((c) => {
      let tip = c.description || "";
      if (c.examples && c.examples.length > 0) {
        tip += "\nExamples: " + c.examples;
      }
      if (c.source) {
        tip += "\nSource: " + c.source;
      }
      return new Object({
        value: c.id,
        label: props.translateChoice(c.label),
        title: tip,
        source: c.source
      });
    })
    .sort((a: any, b: any) => (a.label as string).localeCompare(b.label));

  let currentOption: object | null = null;
  if (props.field.text.trim().length > 0) {
    const matchingOption = options.find(
      (o: any) => o.value.toLowerCase() === props.field.text.toLowerCase()
    );
    currentOption = matchingOption
      ? matchingOption
      : {
          value: props.field.text,
          label: props.field.text
        };
  }
  return (
    <div className={"field " + props.className}>
      <label>{label}</label>
      <CreatableSelect
        tabIndex={props.tabIndex ? props.tabIndex.toString() : ""}
        //classNamePrefix="rs" // causes react-select to show you the parts of the control for styling, e.g. "rs-input"
        value={currentOption}
        placeholder=""
        /* This is a complete mystery, why I have to go in and do so much hand-styling to get a non-gargantuan react-select*/
        styles={{
          control: (provided, state) => ({
            ...provided,
            minHeight: "2em",
            height: "2em",
            borderStyle: "inset",
            borderRadius: 0,
            borderColor: "rgb(169, 169, 169)",
            boxShadow: state.isFocused ? "0 0 0 1px " + lameta_orange : "unset",
            "&:hover": { borderColor: lameta_orange }
          }),
          menu: (provided) => ({
            ...provided,
            marginTop: "0",
            marginBottom: "0"
          }),
          container: (provided) => ({
            ...provided,
            marginTop: "2px"
          }),
          valueContainer: (provided) => ({
            ...provided,
            paddingLeft: "2px",
            paddingTop: "0"
          }),
          input: (provided) => ({
            ...provided,
            height: "20px"
          }),
          indicatorsContainer: (provided) => ({
            ...provided,
            height: "26px"
          }),
          dropdownIndicator: (provided) => ({
            ...provided,
            height: "26px",
            padding: "1px"
          })
        }}
        onChange={(s: any) => {
          props.field.setValueFromString(
            capitalCase((s && s.value ? s.value : "") as string)
          );
        }}
        components={{ Option: CustomOption }}
        options={options}
      />
    </div>
  );
};

export default observer(FieldOpenChoiceChooser);

const CustomOption = (optionProps) => {
  const {
    cx,
    data,
    className,
    isDisabled,
    isFocused,
    isSelected,
    innerRef,
    innerProps,
    getStyles
  } = optionProps;
  return (
    <Tooltip
      direction="down"
      content={<div style={{ overflowWrap: "break-word" }}>{data.title}</div>}
      styles={{ display: "inline" }}
      background={"#486BAD"}
      color={"white"}
    >
      <div
        {...innerProps}
        style={{
          ...getStyles("option", optionProps),
          backgroundColor: optionProps.isFocused ? lameta_orange : "white",
          fontWeight: optionProps.isSelected ? "bold" : "normal",
          fontStyle: optionProps.data.source === "custom" ? "italic" : "",
          color: "black"
        }}
        className={cx(
          {
            option: true,
            "option--is-disabled": isDisabled,
            "option--is-focused": isFocused,
            "option--is-selected": isSelected
          },
          className
        )}
        ref={innerRef}
      >
        {data.label}
      </div>
    </Tooltip>
  );
};
