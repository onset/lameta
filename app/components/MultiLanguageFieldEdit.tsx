import * as React from "react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import { Creatable } from "react-select";
import { useState, useEffect } from "react";
import { reaction } from "mobx";

export interface IProps {
  field: Field;
}
function useObservable(cb, deps = []) {
  const [val, setState] = useState(cb);
  useEffect(() => {
    setState(cb());
    return reaction(cb, v => setState(v));
  }, deps);
  return val;
}
// automatically update when the value changes

// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export const MultiLanguageFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = props => {
  //this.state = { invalid: false };

  // private onChange(event: React.FormEvent<HTMLTextAreaElement>, text: Field) {
  //   // NB: Don't trim here. It is tempting, because at the end of the day we'd
  //   // like it trimmed, but if you do it here, it's not possible to even
  //   // type a space.
  //   // NO: text.text = event.currentTarget.value.trim();
  //   text.text = event.currentTarget.value;
  //   this.setState({ invalid: false });
  // }

  // private static getValue(text: Field): string {
  //   if (text === undefined) {
  //     return "Null Text";
  //   }
  //   return text.text;
  // }

  // public render() {
  //    const label: string = this.props.field.labelInUILanguage;

  // const choices = this.props.getPeopleNames().map(c => {
  //   return new Object({
  //     value: c,
  //     label: c
  //   });
  // });

  const choices = [{ value: "en", label: "English" }];

  const [val, setVal] = useState(props.field.text);

  //return useObservable(() => (
  return (
    <div className={"field " + (props.className ? props.className : "")}>
      <label>{props.field.labelInUILanguage}</label>
      <Creatable
        name={props.field.labelInUILanguage}
        value={val}
        onChange={v => {
          const s: string = v as any;
          // NB: haven't worked out how to use mbox with functional components yet, so we
          // set the value
          props.field.setValueFromString(s);
          // and explicitly change the state so that we redraw
          setVal(s);
        }}
        options={choices}
        simpleValue
      />
      <div>{"-->" + props.field.text + "<--"}</div>
    </div>
  );
};
