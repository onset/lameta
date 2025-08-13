import { css } from "@emotion/react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import Tooltip from "react-tooltip-lite";
import { FieldLabel } from "./FieldLabel";
import React, { useContext, useEffect, useRef, useState } from "react";
import { LanguageAxis } from "src/model/field/TextHolder";
import { SearchContext } from "./SearchContext";
import { buildHighlightedHTML } from "./highlighting";
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
  // When true, omit the default border around the editable container
  borderless?: boolean;
  //LanguageAxes?: LanguageAxis[];
}

export const TextFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = mobx.observer((props) => {
  const { current: fieldId } = useRef(
    "textfield-" +
      (Math.random().toString(36) + "00000000000000000").slice(2, 7)
  );

  // TODO: we need a way to define what languages to use in these fields (e.g. Description). The Project's working Language doesn't seem quit right.
  const testAxes: LanguageAxis[] = [
    { tag: "en", label: "eng", name: "English" }
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
          flex-grow: 1;
        `}
      >
        {props.visibleInstructions && <div>{props.visibleInstructions}</div>}
        <div
          css={css`
            background-color: white;
            border: ${props.borderless ? "none" : "1px solid black"};
            height: -webkit-fill-available;
            ${props.field.definition.multilingual
              ? "min-height: 4em; display: flex; flex-direction: column;"
              : ""}
          `}
        >
          {props.field.definition.multilingual ? (
            testAxes.map((axis) => (
              <SingleLanguageTextFieldEdit
                key={axis.tag}
                {...props}
                axis={axis}
              />
            ))
          ) : (
            <SingleLanguageTextFieldEdit
              {...props}
              axis={undefined}
              editorId={fieldId}
            />
          )}
        </div>
      </div>
    </div>
  );
});

const SingleLanguageTextFieldEdit: React.FunctionComponent<
  IProps &
    React.HTMLAttributes<HTMLDivElement> & {
      axis?: LanguageAxis;
      editorId?: string;
    }
> = mobx.observer((props) => {
  const [validationMessage, setValidationMessage] = useState<string>();
  const { searchTerm } = useContext(SearchContext);
  const [previous, setPrevious] = useState<string>(() => getValue(props.field));
  const [editing, setEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    validateValue(props.field.text);
  }, []); // run once on mount

  // initial highlight after mount
  useEffect(() => {
    applyHighlight();
  }, []);

  // re-highlight when search changes or underlying value changes (and not editing)
  useEffect(() => {
    if (!editing) applyHighlight();
  }, [searchTerm, getValue(props.field), editing]);

  function applyHighlight() {
    const el = contentRef.current;
    if (!el) return;
    const value = getValue(props.field);
    if (!searchTerm) {
      el.textContent = value;
      return;
    }
    el.innerHTML = buildHighlightedHTML(value, searchTerm);
  }

  function beginEditing() {
    const el = contentRef.current;
    if (!el) return;
    setEditing(true);
    // Replace markup with plain text for a clean editing surface
    const plain = el.innerText; // preserves line breaks
    el.textContent = plain;
  }

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

  function onChange(event: React.FormEvent<HTMLDivElement>, field: Field) {
    // NB: Don't trim value here. It is tempting, because at the end of the day we'd
    // like it trimmed, but if you do it here, it's not possible to even
    // type a space.
    const value = event.currentTarget.innerText || "";
    if (props.axis === undefined) field.setValueFromString(value);
    else field.setTextAxis(props.axis.tag, value);
    validateValue(value);
  }

  //
  function finishEditing(event: React.FocusEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    // Preserve leading spaces the user intentionally adds; only trim trailing newline noise.
    const newValue = el.innerText.replace(/\n+$/g, "");

    if (props.axis === undefined) {
      if (newValue !== props.field.text) {
        props.field.setValueFromString(newValue);
      }
    } else {
      if (newValue !== props.field.getTextAxis(props.axis.tag)) {
        props.field.setTextAxis(props.axis.tag, newValue);
      }
    }

    if (props.onBlurWithValue) props.onBlurWithValue(newValue);
    if (props.onBlur) props.onBlur(event as any);

    if (!validateValue(newValue)) {
      // revert
      if (props.axis === undefined) {
        props.field.setValueFromString(previous);
      } else {
        props.field.setTextAxis(props.axis.tag, previous);
      }
      el.textContent = previous;
    } else {
      setPrevious(newValue);
    }

    if (props.attemptFileChanges && !props.attemptFileChanges()) {
      if (props.axis === undefined) {
        props.field.setValueFromString(previous);
      } else {
        props.field.setTextAxis(props.axis.tag, previous);
      }
      el.textContent = previous;
    }

    setEditing(false);
    // highlight will re-apply via effect
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
        height: ${props.axis ? "auto" : "100%"};
        min-height: ${props.axis ? "2em" : "1.2em"};
        flex: ${props.axis ? "1" : "none"};
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
          id={props.editorId ?? props.field.key}
          ref={contentRef}
          tabIndex={props.tabIndex}
          autoFocus={props.autoFocus}
          className={validationMessage ? "invalid" : ""}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={
            props.field.definition.multipleLines ? "true" : "false"
          }
          onFocus={beginEditing}
          onInput={(event) => onChange(event, props.field)}
          onKeyDown={(event) => {
            if (
              !props.field.definition.multipleLines &&
              event.key === "Enter"
            ) {
              event.preventDefault();
              (event.currentTarget as HTMLDivElement).blur();
            }
          }}
          onPaste={(event) => {
            // Force plain-text paste into contentEditable
            event.preventDefault();
            const text = event.clipboardData?.getData("text/plain") || "";
            // execCommand is deprecated but still the simplest cross-browser way in contentEditable
            document.execCommand("insertText", false, text);
          }}
          onBlur={finishEditing}
          css={css`
            height: 100%;
            min-height: 1.2em;
            outline: none;
            /* white-space: ${props.field.definition.multipleLines
              ? "pre-wrap"
              : "nowrap"};
            /* overflow: ${props.field.definition.multipleLines
              ? "auto"
              : "hidden"}; */
            font: inherit;
            word-wrap: break-word;
            width: 100%;
            padding: 2px;
            box-sizing: border-box;
            background: white;
            border: none;
            display: block;
            cursor: text;
          `}
        />
      </Tooltip>
    </div>
  );
});
