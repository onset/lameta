import { css } from "@emotion/react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import { FieldInfoAffordances, FieldLabel } from "./FieldLabel";
import React, { useRef, useState } from "react";
import { LanguageAxis } from "src/model/field/TextHolder";

export interface IProps {
  field: Field;
  autoFocus?: boolean;
  hideLabel?: boolean;
  attemptFileChanges?: () => boolean;
  onBlurWithValue?: (currentValue: string) => void;
  // this one will prevent the user from moving on
  validate?: (value: string) => boolean;
  tooltip?: string;
  showAffordancesAfter?: boolean;
  LanguageAxes?: LanguageAxis[];
}

export const TextFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = mobx.observer((props) => {
  const { current: fieldId } = useRef(
    "textfield-" +
      (Math.random().toString(36) + "00000000000000000").slice(2, 7)
  );

  const testAxes: LanguageAxis[] = [
    { tag: "en", label: "eng", name: "English" },
    { tag: "es", label: "esp", name: "Español" }
  ];
  return (
    <div
      className={
        "field " +
        props.className +
        (props.field.definition.multipleLines ? " multiline" : "")
      }
      title={props.tooltip}
    >
      {props.hideLabel ? (
        ""
      ) : (
        <FieldLabel
          htmlFor={fieldId}
          fieldDef={props.field.definition}
          omitInfoAffordances={props.showAffordancesAfter}
        />
      )}

      <div
        css={css`
          background-color: white;
          border: 1px solid black;
        `}
      >
        {["title", "description"].includes(props.field.key) ? (
          testAxes.map((axis) => (
            <>
              <SingleLanguageTextFieldEdit {...props} axis={axis} />
            </>
          ))
        ) : (
          <SingleLanguageTextFieldEdit {...props} axis={undefined} />
        )}
      </div>
    </div>
  );
});

const SingleLanguageTextFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement> & { axis?: LanguageAxis }
> = mobx.observer((props) => {
  const [invalid, setInvalid] = React.useState(false);
  const [previous, setPrevious] = useState(props.field.text);
  const { current: fieldId } = useRef(
    "textfield-" +
      (Math.random().toString(36) + "00000000000000000").slice(2, 7)
  );

  function onChange(event: React.FormEvent<HTMLTextAreaElement>, field: Field) {
    // NB: Don't trim value here. It is tempting, because at the end of the day we'd
    // like it trimmed, but if you do it here, it's not possible to even
    // type a space.
    if (props.axis === undefined)
      field.setValueFromString(event.currentTarget.value);
    else field.setTextAxis(props.axis.tag, event.currentTarget.value);
    setInvalid(false);
  }

  function getValue(field: Field): string {
    if (field === undefined) {
      return "Null Text";
    }
    if (props.axis === undefined) return field.text;
    // review should this be "monolingual" os some such?
    else return field.getTextAxis(props.axis.tag);
  }
  return (
    <div
      key={props.axis?.tag || "monolingual"}
      css={css`
        display: flex;
        padding-left: 5px;
        padding-top: 2px;
      `}
    >
      {props.axis && (
        <span
          css={css`
            color: #81c21e; // todo use theme with colors to match the form
          `}
        >
          {props.axis.label}
        </span>
      )}
      <textarea
        css={css`
          border: none;
          padding-top: 0;
        `}
        id={fieldId}
        tabIndex={props.tabIndex}
        autoFocus={props.autoFocus}
        className={invalid ? "invalid" : ""}
        name={props.field.definition.englishLabel} //what does this do? Maybe accessibility?
        value={getValue(props.field)}
        onChange={(event) => onChange(event, props.field)}
        onKeyDown={(event) => {
          if (!props.field.definition.multipleLines && event.key === "Enter") {
            event.preventDefault();
          }
        }}
        onBlur={(event: React.FocusEvent<HTMLTextAreaElement>) => {
          if (props.onBlurWithValue) {
            props.onBlurWithValue(event.currentTarget.value);
          }
          if (props.onBlur) {
            props.onBlur(event as any);
          }
          if (props.validate && !props.validate(event.currentTarget.value)) {
            event.preventDefault();
            const textarea = event.currentTarget;
            window.setTimeout(() => {
              textarea.focus();
              setInvalid(true);
            });
          } else {
            setInvalid(false);
            if (props.attemptFileChanges) {
              if (!props.attemptFileChanges()) {
                props.field.text = previous;
              }
            }
          }
        }}
      />
      {props.showAffordancesAfter && (
        <FieldInfoAffordances fieldDef={props.field.definition} />
      )}
    </div>
  );
});
