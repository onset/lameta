import { css } from "@emotion/react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import Tooltip from "react-tooltip-lite";
import { FieldInfoAffordances, FieldLabel } from "./FieldLabel";
import React, { useEffect, useRef, useState, useContext } from "react";
import { SearchContext } from "./SearchContext";
import { LanguageAxis } from "src/model/field/TextHolder";
import { valid } from "semver";

export interface IProps {
  field: Field;
  autoFocus?: boolean;
  hideLabel?: boolean;
  visibleInstructions?: string;
  attemptFileChanges?: () => boolean;
  onBlurWithValue?: (currentValue: string) => void;
  // returns validation message if invalid, undefined if valid
  validate?: (value: string) => string | undefined;
  tooltip?: string;
  showAffordancesAfter?: boolean;
  //LanguageAxes?: LanguageAxis[];
}

export const TextFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = mobx.observer((props) => {
  const { query } = useContext(SearchContext);
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
      data-has-highlight={
        query.trim() &&
        props.field.text.toLowerCase().includes(query.toLowerCase())
          ? "true"
          : undefined
      }
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
          flex-grow: 1;
        `}
      >
        {props.visibleInstructions && <div>{props.visibleInstructions}</div>}
        <div
          css={css`
            background-color: white;
            border: 1px solid black;
            height: -webkit-fill-available;
          `}
        >
          {props.field.definition.multilingual ? (
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
    </div>
  );
});

const SingleLanguageTextFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement> & { axis?: LanguageAxis }
> = mobx.observer((props) => {
  const { query } = useContext(SearchContext);
  const [validationMessage, setValidationMessage] = useState<string>();
  const [previous, setPrevious] = useState(props.field.text);
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
  // const { current: fieldId } = useRef(
  //   "textfield-" +
  //     (Math.random().toString(36) + "00000000000000000").slice(2, 7)
  // );

  function onChange(event: React.FormEvent<HTMLTextAreaElement>, field: Field) {
    // NB: Don't trim value here. It is tempting, because at the end of the day we'd
    // like it trimmed, but if you do it here, it's not possible to even
    // type a space.
    if (props.axis === undefined)
      field.setValueFromString(event.currentTarget.value);
    else field.setTextAxis(props.axis.tag, event.currentTarget.value);
    validateValue(event.currentTarget.value);
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
        height: 100%;
        padding-left: 2px;
        padding-top: 2px;
        padding-right: 2px;
        padding-bottom: 0;
        ${props.showAffordancesAfter &&
        props.field.definition.separatorWithCommaInstructions
          ? "padding-right: 2px;" // leave a little space after the icon
          : ""};
      `}
    >
      {props.axis && (
        <span
          css={css`
            width: 2em; // it's important to nail down the width so that the following text blocks are aligned
            color: #81c21e; // todo use theme with colors to match the form
          `}
        >
          {props.axis.label}
        </span>
      )}

      <Tooltip
        content={validationMessage || ""}
        isOpen={!!validationMessage}
        direction="down"
        background="red"
        color="white"
        css={css`
          width: 100%; // this for the div that this unfortunately wraps the textarea with
          height: 100%;
        `}
      >
        <div
          css={css`
            position: relative;
            width: 100%;
            height: 100%;
          `}
        >
          <div
            id={props.field.key}
            tabIndex={props.tabIndex}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline={
              props.field.definition.multipleLines ? "true" : "false"
            }
            onInput={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              // strip out mark tags to get plain text
              const plain = el.innerText; // innerText keeps line breaks
              if (props.axis === undefined)
                props.field.setValueFromString(plain);
              else props.field.setTextAxis(props.axis.tag, plain);
            }}
            onKeyDown={(event) => {
              if (
                !props.field.definition.multipleLines &&
                event.key === "Enter"
              ) {
                event.preventDefault();
              }
            }}
            onBlur={(event: React.FocusEvent<HTMLDivElement>) => {
              const el = event.currentTarget;
              const trimmed = el.innerText.trim();
              if (props.axis === undefined)
                props.field.setValueFromString(trimmed);
              else props.field.setTextAxis(props.axis.tag, trimmed);
              if (props.onBlurWithValue) props.onBlurWithValue(trimmed);
              if (props.onBlur) props.onBlur(event as any);
              if (!validateValue(trimmed)) {
                event.preventDefault();
                return false;
              }
              if (props.attemptFileChanges) {
                if (!props.attemptFileChanges()) {
                  props.field.text = previous;
                  el.innerText = previous;
                }
              }
              return true;
            }}
            css={css`
              font: inherit;
              white-space: pre-wrap;
              word-wrap: break-word;
              outline: none;
              width: 100%;
              min-height: 3em;
              padding: 2px;
              box-sizing: border-box;
              background: white;
              border: none;
              resize: none;
            `}
          >
            {renderHighlighted(getValue(props.field), query)}
          </div>
        </div>
      </Tooltip>
    </div>
  );
});

function renderHighlighted(value: string, query: string) {
  if (!query.trim()) return value;
  const q = query.trim();
  const lower = value.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let index = 0;
  while (true) {
    const found = lower.indexOf(lowerQ, index);
    if (found === -1) {
      parts.push(value.slice(index));
      break;
    }
    if (found > index) parts.push(value.slice(index, found));
    const matchText = value.slice(found, found + q.length);
    parts.push(
      <mark
        key={found}
        data-testid="inline-highlight"
        css={css`
          background: #ffba8a; /* updated highlight color */
          padding: 0;
        `}
      >
        {matchText}
      </mark>
    );
    index = found + q.length;
  }
  return parts;
}
