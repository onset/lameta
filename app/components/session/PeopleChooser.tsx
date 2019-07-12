import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelect from "react-select";
import { useState } from "react";

export interface IProps {
  field: Field;
  getPeopleNames: () => string[];
}

export const PeopleChooser: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = props => {
  const [val, setVal] = useState(props.field.text);
  const peopleColor = "#becde4";
  const customStyles = {
    control: styles => ({ ...styles, backgroundColor: "white" }),
    multiValue: styles => {
      return {
        ...styles,
        fontSize: "12pt",
        fontWeight: 600,
        border: "solid thin " + peopleColor,
        backgroundColor: "white",
        color: "lightgray" // for the "x"
      };
    }
  };

  const label: string = props.field.labelInUILanguage;
  const choices = props.getPeopleNames().map(c => {
    return new Object({
      value: c,
      label: c
    });
  });

  const currentValueArray = val
    .split(";")
    .filter(c => c.length > 0)
    .map(l => ({ value: l, label: l }));

  return (
    <div className={"field " + props.className}>
      <label>{label}</label>
      <ReactSelect
        styles={customStyles}
        name={props.field.englishLabel}
        defaultValue={currentValueArray}
        delimiter=";"
        noOptionsMessage={() =>
          "Person not found. To add people, go to the People tab."
        }
        isClearable={false} // don't need the extra "x" button
        onChange={(v: any[]) => {
          // if you delete the last member, you get null instead of []
          const newChoices = v ? v : [];
          const s: string = newChoices.map(o => o.value).join(";");
          // NB: haven't worked out how to use mbox with functional components yet, so we
          // set the value
          props.field.setValueFromString(s);
          // and explicitly change the state so that we redraw
          setVal(s);
        }}
        options={choices}
        isMulti
        simpleValue // causes it to be split up by our delimeter
        removeSelected={false}
      />
    </div>
  );
};
