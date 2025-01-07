import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import { FieldLabel } from "./FieldLabel";
import React, { useRef, useState, useEffect } from "react";
import Tooltip from "react-tooltip-lite";

export interface IProps {
  field: Field;
  autoFocus?: boolean;
  hideLabel?: boolean;
  attemptFileChanges?: () => boolean;
  onBlurWithValue?: (currentValue: string) => void;
  // returns validation message if invalid, undefined if valid
  validate?: (value: string) => string | undefined;
  tooltip?: string;
}

export const TextFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = mobx.observer((props) => {
  const [validationMessage, setValidationMessage] = useState<string>();
  const [previous, setPrevious] = useState(props.field.text);
  const { current: fieldId } = useRef(
    "textfield-" +
      (Math.random().toString(36) + "00000000000000000").slice(2, 7)
  );

  useEffect(() => {
    validateValue(props.field.text);
  }, []); // run once on mount

  const validateValue = (value: string) => {
    if (props.validate) {
      const message = props.validate(value);
      if (message) {
        setValidationMessage(message);
        return false;
      }
    }
    setValidationMessage(undefined);
    return true;
  };

  function onChange(event: React.FormEvent<HTMLTextAreaElement>, text: Field) {
    // NB: Don't trim here. It is tempting, because at the end of the day we'd
    // like it trimmed, but if you do it here, it's not possible to even
    // type a space.
    const newValue = event.currentTarget.value;
    text.text = newValue;
    setPrevious(newValue);
    validateValue(newValue);
  }

  function getValue(text: Field): string {
    if (text === undefined) {
      return "Null Text";
    }
    return text.text;
  }

  return (
    <div
      className={"field " + (props.className ? props.className : "")}
      title={props.tooltip}
    >
      {props.hideLabel ? (
        ""
      ) : (
        <FieldLabel htmlFor={fieldId} fieldDef={props.field.definition} />
      )}

      <Tooltip
        content={validationMessage || ""}
        isOpen={!!validationMessage}
        direction="down"
        background="red"
        color="white"
      >
        <textarea
          id={fieldId}
          tabIndex={props.tabIndex}
          autoFocus={props.autoFocus}
          className={validationMessage ? "invalid" : ""}
          name={props.field.definition.englishLabel} //what does this do? Maybe accessibility?
          value={getValue(props.field)}
          onChange={(event) => onChange(event, props.field)}
          onKeyDown={(event) => {
            if (!props.field.definition.multipleLines && event.keyCode === 13) {
              event.preventDefault();
            }
          }}
          onBlur={(event: React.FocusEvent<HTMLTextAreaElement>) => {
            const trimmed = event.currentTarget.value.trim();
            // put the trimmed value back into the the html element
            event.currentTarget.value = trimmed;

            if (props.onBlurWithValue) {
              props.onBlurWithValue(trimmed);
            }
            if (props.onBlur) {
              props.onBlur(event as any);
            }

            if (!validateValue(trimmed)) {
              event.preventDefault();
              return false;
            }

            if (props.attemptFileChanges) {
              if (!props.attemptFileChanges()) {
                props.field.text = previous;
              }
            }
            return true;
          }}
        />
      </Tooltip>
    </div>
  );
});
