import { css } from "@emotion/react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import Tooltip from "react-tooltip-lite";
import { FieldLabel } from "./FieldLabel";
import React, { useContext, useEffect, useRef, useState } from "react";
import { LanguageAxis } from "../model/field/TextHolder";
import { SearchContext } from "./SearchContext";
import { buildHighlightedHTML } from "./highlighting";
import { tooltipBackground } from "../containers/theme";
import {
  AddTranslationControl,
  normalizeLanguageTag,
  useMultilingualField
} from "./MultilingualTextFieldControls";
import { hasSpellCheckSupport } from "../other/spellCheckLanguages";
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

  const isMultilingual = props.field.definition.multilingual;
  const {
    languageTags,
    axes,
    newlyAddedTag,
    handleAddLanguage,
    handleRemoveLanguage,
    clearNewlyAddedTag
  } = useMultilingualField(props.field, isMultilingual);

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
          // we have one or more children that will scroll as needed
          overflow-y: hidden;
        `}
      >
        {props.visibleInstructions && <div>{props.visibleInstructions}</div>}
        <div
          className="field-value-border"
          css={css`
            background-color: white;
            border: ${props.borderless ? "none !important" : ""};
            ${props.field.definition.multipleLines
              ? `min-height: 4em; display: flex; flex-direction: column; height: 100%;
                 ${isMultilingual ? "overflow-y: auto;" : ""}`
              : // improve: the height part here is a hack
                "max-height: 24px; overflow: hidden;"}
          `}
        >
          {isMultilingual ? (
            <>
              {axes.map((axis) => (
                <SingleLanguageTextFieldEdit
                  key={axis.tag}
                  {...props}
                  axis={axis}
                  canRemoveAxis={axes.length > 1}
                  onRemoveAxis={handleRemoveLanguage}
                  shouldFocusOnMount={axis.tag === newlyAddedTag}
                  onFocused={clearNewlyAddedTag}
                />
              ))}
              <AddTranslationControl
                existingTags={languageTags}
                onAddLanguage={handleAddLanguage}
              />
            </>
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
      canRemoveAxis?: boolean;
      onRemoveAxis?: (tag: string) => void;
      onChangeLanguage?: (oldTag: string, newTag: string) => void;
      shouldFocusOnMount?: boolean;
      onFocused?: () => void;
    }
> = mobx.observer((props) => {
  const [validationMessage, setValidationMessage] = useState<string>();
  const { searchTerm } = useContext(SearchContext);
  const [previous, setPrevious] = useState<string>(() => getValue(props.field));
  const [editing, setEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    validateValue(props.field.text);
  }, []); // run once on mount

  // initial highlight after mount
  useEffect(() => {
    applyHighlight();
  }, []);

  // Focus and scroll into view when newly added
  useEffect(() => {
    if (props.shouldFocusOnMount && contentRef.current) {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
      contentRef.current.focus();
      props.onFocused?.();
    }
  }, [props.shouldFocusOnMount]);

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
      // clear any previous highlight flag
      el.removeAttribute("data-has-highlight");
      return;
    }
    const html = buildHighlightedHTML(value, searchTerm);
    el.innerHTML = html;
    // If any inline highlight mark exists, expose a data attribute for tests
    const has = html.indexOf('data-testid="inline-highlight"') !== -1;
    if (has) {
      el.setAttribute("data-has-highlight", "true");
    } else {
      el.removeAttribute("data-has-highlight");
    }
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
      ref={containerRef}
      key={props.axis?.tag || "monolingual"}
      data-testid={
        props.axis
          ? `translation-axis-${props.axis.tag}`
          : `field-${props.field.key}-container`
      }
      css={css`
        display: flex;
        flex-direction: column;
        min-height: ${props.axis ? "auto" : "1.2em"};
        flex-shrink: 0; /* prevent individual fields from shrinking */
        padding-left: 2px;
        padding-top: ${props.axis ? "4px" : "2px"};
        padding-right: 2px;
        padding-bottom: ${props.axis ? "4px" : "0"};
        ${props.axis ? "border-top: 1px solid #e8e8e8;" : ""}
        &:first-of-type {
          border-top: none;
        }
        ${props.showAffordancesAfter &&
        props.field.definition.separatorWithCommaInstructions
          ? "padding-right: 2px;" // leave a little space after the icon
          : ""};
      `}
    >
      {props.axis && (
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 2px;
            justify-content: flex-end;
            &:hover .remove-translation-btn {
              opacity: 1;
            }
          `}
        >
          {props.canRemoveAxis && props.onRemoveAxis && (
            <button
              type="button"
              className="remove-translation-btn"
              data-testid={`remove-translation-${props.axis.tag}`}
              aria-label={`Remove ${props.axis.name} translation`}
              onClick={() => props.onRemoveAxis!(props.axis!.tag)}
              css={css`
                border: none;
                background: transparent;
                color: #6b6b6b;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                font-size: 0.75em;
                opacity: 0;
                transition: opacity 200ms ease-in-out;
                display: flex;
                align-items: center;
                &:hover {
                  color: #c73f1d;
                }
              `}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
          <span
            data-testid={`translation-language-label-${props.axis.tag}`}
            css={css`
              color: #81c21e;
              font-size: 0.85em;
              font-weight: 500;
            `}
          >
            {props.axis.name}
          </span>
        </div>
      )}

      <Tooltip
        content={validationMessage || ""}
        isOpen={!!validationMessage}
        direction="down"
        color="white"
        background={tooltipBackground}
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
          lang={props.axis?.tag}
          spellCheck={!props.axis || hasSpellCheckSupport(props.axis.tag)}
          // Provide stable selectors for E2E tests, e.g., field-id-edit, field-notes-edit
          data-testid={`field-${props.field.key}-edit`}
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
            height: ${props.field.definition.multipleLines
              ? "-webkit-fill-available"
              : "auto"};
          `}
        />
      </Tooltip>
    </div>
  );
});
