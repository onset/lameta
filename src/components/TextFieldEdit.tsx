import { css } from "@emotion/react";
import * as mobx from "mobx-react";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Field } from "../model/field/Field";
import { FieldLabel } from "./FieldLabel";
import { SearchContext } from "./SearchContext";
import { buildHighlightedHTML } from "./highlighting";

export interface IProps {
  field: Field;
  autoFocus?: boolean;
  hideLabel?: boolean;
  visibleInstructions?: string;
  attemptFileChanges?: () => boolean; // return false to cancel
  onBlurWithValue?: (currentValue: string) => void;
  validate?: (value: string) => string | undefined; // returns validation message if invalid
  tooltip?: string;
  showAffordancesAfter?: boolean;
}

// highlighting logic moved to highlighting.tsx helper

export const TextFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = mobx.observer((props) => {
  const { query } = useContext(SearchContext);
  const [validationMessage, setValidationMessage] = useState<string>();
  const [previous, setPrevious] = useState(props.field.text);
  const [editing, setEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { current: fieldId } = useRef(
    "textfield-" +
      (Math.random().toString(36) + "00000000000000000").slice(2, 7)
  );

  // initial highlight after mount
  useEffect(() => {
    applyHighlight();
  }, []);

  // re-highlight when query changes or underlying value changes (and not editing)
  useEffect(() => {
    if (!editing) applyHighlight();
  }, [query, props.field.text, editing]);

  function validateValue(value: string): boolean {
    if (props.validate) {
      const message = props.validate(value);
      if (message) {
        setValidationMessage(message);
        return false;
      }
    }
    setValidationMessage(undefined);
    return true;
  }

  function applyHighlight() {
    const el = contentRef.current;
    if (!el) return;
    const value = props.field.text;
    if (!query.trim()) {
      el.textContent = value;
      return;
    }
    el.innerHTML = buildHighlightedHTML(value, query);
  }

  function beginEditing() {
    const el = contentRef.current;
    if (!el) return;
    setEditing(true);
    // Replace markup with plain text for a clean editing surface
    const plain = el.innerText; // preserves line breaks
    el.textContent = plain;
  }

  function finishEditing(e: React.FocusEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    // Preserve leading spaces the user intentionally adds; only trim trailing newline noise.
    const newValue = el.innerText.replace(/\n+$/g, "");
    if (newValue !== props.field.text) {
      props.field.setValueFromString(newValue);
    }
    if (props.onBlurWithValue) props.onBlurWithValue(newValue);
    if (!validateValue(newValue)) {
      // revert
      props.field.text = previous;
      el.textContent = previous;
    } else {
      setPrevious(newValue);
    }
    if (props.attemptFileChanges && !props.attemptFileChanges()) {
      props.field.text = previous;
      el.textContent = previous;
    }
    setEditing(false);
    // highlight will re-apply via effect
  }

  return (
    <div
      className={
        "field " +
        (props.className || "") +
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
      {!props.hideLabel && (
        <FieldLabel
          htmlFor={fieldId}
          fieldDef={props.field.definition}
          omitInfoAffordances={props.showAffordancesAfter}
        />
      )}
      <div
        css={css`
          display: flex;
          flex-direction: column;
          padding: 2px;
          ${props.showAffordancesAfter &&
          props.field.definition.separatorWithCommaInstructions
            ? "padding-right: 2px;"
            : ""};
        `}
      >
        <div
          id={fieldId}
          ref={contentRef}
          tabIndex={props.tabIndex}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={
            props.field.definition.multipleLines ? "true" : "false"
          }
          onFocus={beginEditing}
          onInput={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            const plain = el.innerText; // keep as user types
            props.field.setValueFromString(plain);
          }}
          onKeyDown={(event) => {
            if (
              !props.field.definition.multipleLines &&
              event.key === "Enter"
            ) {
              event.preventDefault();
              (event.currentTarget as HTMLDivElement).blur();
            }
          }}
          onBlur={finishEditing}
          css={css`
            font: inherit;
            white-space: pre-wrap;
            word-wrap: break-word;
            outline: none;
            width: 100%;
            min-height: 2.2em;
            padding: 2px;
            box-sizing: border-box;
            background: white;
            border: none;
          `}
        />
        {validationMessage && (
          <div
            css={css`
              color: #b00020;
              font-size: 0.8em;
              margin-top: 2px;
            `}
            data-testid="validation-message"
          >
            {validationMessage}
          </div>
        )}
      </div>
    </div>
  );
});
