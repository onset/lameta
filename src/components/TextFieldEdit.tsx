import { css } from "@emotion/react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import Tooltip from "react-tooltip-lite";
import { FieldLabel } from "./FieldLabel";
import React, { useContext, useEffect, useRef, useState } from "react";
import { LanguageSlot } from "../model/field/TextHolder";
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
    slots,
    newlyAddedTag,
    handleAddLanguage,
    handleRemoveLanguage,
    clearNewlyAddedTag,
    isProtectedSlot
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
              {slots.map((slot) => (
                <SingleLanguageTextFieldEdit
                  key={slot.tag}
                  {...props}
                  languageSlot={slot}
                  isProtected={isProtectedSlot(slot.tag)}
                  canRemoveSlot={slots.length > 1}
                  onRemoveSlot={handleRemoveLanguage}
                  shouldFocusOnMount={slot.tag === newlyAddedTag}
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
              languageSlot={undefined}
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
      languageSlot?: LanguageSlot;
      editorId?: string;
      isProtected?: boolean;
      canRemoveSlot?: boolean;
      onRemoveSlot?: (tag: string) => void;
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
    if (props.languageSlot === undefined) field.setValueFromString(value);
    else field.setTextAxis(props.languageSlot.tag, value);
    validateValue(value);
  }

  //
  function finishEditing(event: React.FocusEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    // Preserve leading spaces the user intentionally adds; only trim trailing newline noise.
    const newValue = el.innerText.replace(/\n+$/g, "");

    if (props.languageSlot === undefined) {
      if (newValue !== props.field.text) {
        props.field.setValueFromString(newValue);
      }
    } else {
      if (newValue !== props.field.getTextAxis(props.languageSlot.tag)) {
        props.field.setTextAxis(props.languageSlot.tag, newValue);
      }
    }

    if (props.onBlurWithValue) props.onBlurWithValue(newValue);
    if (props.onBlur) props.onBlur(event as any);

    if (!validateValue(newValue)) {
      // revert
      if (props.languageSlot === undefined) {
        props.field.setValueFromString(previous);
      } else {
        props.field.setTextAxis(props.languageSlot.tag, previous);
      }
      el.textContent = previous;
    } else {
      setPrevious(newValue);
    }

    if (props.attemptFileChanges && !props.attemptFileChanges()) {
      if (props.languageSlot === undefined) {
        props.field.setValueFromString(previous);
      } else {
        props.field.setTextAxis(props.languageSlot.tag, previous);
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
    if (props.languageSlot === undefined) return field.text;
    // review should this be "monolingual" os some such?
    else return field.getTextAxis(props.languageSlot.tag);
  }

  const currentValue = getValue(props.field);
  const isEmpty = !currentValue || currentValue.trim() === "";

  return (
    <div
      ref={containerRef}
      key={props.languageSlot?.tag || "monolingual"}
      data-testid={
        props.languageSlot
          ? `translation-slot-${props.languageSlot.tag}`
          : `field-${props.field.key}-container`
      }
      css={css`
        display: flex;
        flex-direction: row;
        min-height: ${props.languageSlot ? "auto" : "1.2em"};
        flex-shrink: 0; /* prevent individual fields from shrinking */
        padding-top: ${props.languageSlot ? "2px" : "2px"};
        padding-right: 2px;
        padding-bottom: ${props.languageSlot ? "2px" : "0"};
        ${props.showAffordancesAfter &&
        props.field.definition.separatorWithCommaInstructions
          ? "padding-right: 2px;" // leave a little space after the icon
          : ""};
      `}
    >
      {/* Color bar for language slot */}
      {props.languageSlot && (
        <div
          title={props.languageSlot.name}
          data-testid={`slot-color-bar-${props.languageSlot.tag}`}
          css={css`
            width: 4px;
            min-height: 1.5em;
            background-color: ${props.languageSlot.color || "#888"};
            margin-right: 6px;
            flex-shrink: 0;
            cursor: help;
          `}
        />
      )}

      {/* Text content area */}
      <div
        css={css`
          flex: 1;
          display: flex;
          flex-direction: column;
        `}
      >
        <Tooltip
          content={validationMessage || ""}
          isOpen={!!validationMessage}
          direction="down"
          color="white"
          background={tooltipBackground}
          css={css`
            width: 100%;
            height: 100%;
          `}
        >
          <div
            id={props.editorId ?? props.field.key}
            ref={contentRef}
            tabIndex={props.tabIndex}
            autoFocus={props.autoFocus}
            lang={props.languageSlot?.tag}
            spellCheck={
              !props.languageSlot ||
              hasSpellCheckSupport(props.languageSlot.tag)
            }
            data-testid={`field-${props.field.key}-edit`}
            data-placeholder={
              props.languageSlot && isEmpty
                ? props.languageSlot.name
                : undefined
            }
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
              event.preventDefault();
              const text = event.clipboardData?.getData("text/plain") || "";
              document.execCommand("insertText", false, text);
            }}
            onBlur={finishEditing}
            css={css`
              height: 100%;
              min-height: 1.2em;
              outline: none;
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
              /* Placeholder text for empty slots */
              &:empty::before {
                content: attr(data-placeholder);
                color: #aaa;
                font-style: italic;
                pointer-events: none;
              }
            `}
          />
        </Tooltip>
      </div>

      {/* Remove button - only show for non-protected slots */}
      {props.languageSlot && props.canRemoveSlot && !props.isProtected && (
        <button
          type="button"
          className="remove-translation-btn"
          data-testid={`remove-slot-${props.languageSlot.tag}`}
          aria-label={`Remove ${props.languageSlot.name} translation`}
          onClick={() => props.onRemoveSlot!(props.languageSlot!.tag)}
          css={css`
            border: none;
            background: transparent;
            color: #6b6b6b;
            cursor: pointer;
            padding: 0 4px;
            line-height: 1;
            font-size: 0.75em;
            opacity: 0;
            transition: opacity 200ms ease-in-out;
            display: flex;
            align-items: center;
            align-self: center;
            &:hover {
              color: #c73f1d;
            }
            *:hover > & {
              opacity: 1;
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
    </div>
  );
});
