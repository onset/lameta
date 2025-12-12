import { css } from "@emotion/react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import Tooltip from "react-tooltip-lite";
import { FieldLabel } from "./FieldLabel";
import React, { useContext, useEffect, useRef, useState } from "react";
import { LanguageSlot } from "../model/field/TextHolder";
import { SearchContext } from "./SearchContext";
import { buildHighlightedHTML } from "./highlighting";
import {
  lameta_dark_green,
  lameta_green,
  tooltipBackground,
  unknownLanguageBackground
} from "../containers/theme";
import {
  AddTranslationControl,
  normalizeLanguageTag,
  useMultilingualField,
  isUnknownLanguage
} from "./MultilingualTextFieldControls";
import { hasSpellCheckSupport } from "../other/spellCheckLanguages";
import userSettings from "../other/UserSettings";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MuiTooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import { SingleLanguageChooser } from "./SingleLanguageChooser";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import { ShowMessageDialog } from "./ShowMessageDialog/MessageDialog";
import { Project } from "../model/Project/Project";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [triggerAddLanguage, setTriggerAddLanguage] = useState(false);
  const {
    languageTags,
    slots,
    newlyAddedTag,
    handleAddLanguage,
    handleRemoveLanguage,
    handleChangeLanguage,
    clearNewlyAddedTag,
    isProtectedSlot,
    hasMultipleMetadataSlots
  } = useMultilingualField(props.field, isMultilingual);

  // Only show multilingual UI if the field is marked multilingual AND
  // there are multiple metadata language slots configured.
  // With only 1 slot, there's no meaningful multilingual interpretation.
  const showMultilingualUI = isMultilingual && hasMultipleMetadataSlots;

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
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsFocusWithin(true)}
          onBlur={(e) => {
            // Only set false if focus is leaving the container entirely
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsFocusWithin(false);
            }
          }}
          css={css`
            background-color: white;
            border: ${props.borderless ? "none !important" : ""};
            position: relative;
            ${props.field.definition.multipleLines
              ? `min-height: 4em; display: flex; flex-direction: column; height: 100%;
                 ${showMultilingualUI ? "overflow-y: auto;" : ""}`
              : showMultilingualUI
              ? "overflow-y: auto;"
              : "max-height: 24px; overflow: hidden;"}
          `}
        >
          {showMultilingualUI ? (
            <>
              {slots.map((slot, index) => (
                <SingleLanguageTextFieldEdit
                  key={slot.tag}
                  {...props}
                  languageSlot={slot}
                  isProtected={isProtectedSlot(slot.tag)}
                  canRemoveSlot={slots.length > 1}
                  onRemoveSlot={handleRemoveLanguage}
                  onChangeLanguage={handleChangeLanguage}
                  onAddLanguage={handleAddLanguage}
                  shouldFocusOnMount={slot.tag === newlyAddedTag}
                  onFocused={clearNewlyAddedTag}
                  allLanguageTags={languageTags}
                  existingLanguageTags={languageTags}
                  isLastSlot={index === slots.length - 1}
                  showAddButton={isHovered || isFocusWithin}
                  onTriggerAddLanguage={() => setTriggerAddLanguage(true)}
                />
              ))}
              {/* Language chooser on its own row when adding */}
              <AddTranslationControl
                existingTags={languageTags}
                onAddLanguage={handleAddLanguage}
                showButton={false}
                triggerAdd={triggerAddLanguage}
                onTriggerAddHandled={() => setTriggerAddLanguage(false)}
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
      onChangeLanguage?: (oldTag: string, newTag: string) => string | undefined;
      onAddLanguage?: (tag: string) => void;
      shouldFocusOnMount?: boolean;
      onFocused?: () => void;
      /** All language tags in order, for virtual slash syntax interpretation */
      allLanguageTags?: string[];
      /** All existing language tags for duplicate checking */
      existingLanguageTags?: string[];
      /** Whether this is the last slot in the list (controls + button visibility) */
      isLastSlot?: boolean;
      /** Whether the add button should be shown (on hover) */
      showAddButton?: boolean;
      /** Callback to trigger the add language UI (from menu items on any row) */
      onTriggerAddLanguage?: () => void;
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
    else
      field.setTextAxis(props.languageSlot.tag, value, props.allLanguageTags);
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
        props.field.setTextAxis(
          props.languageSlot.tag,
          newValue,
          props.allLanguageTags
        );
      }
    }

    if (props.onBlurWithValue) props.onBlurWithValue(newValue);
    if (props.onBlur) props.onBlur(event as any);

    if (!validateValue(newValue)) {
      // revert
      if (props.languageSlot === undefined) {
        props.field.setValueFromString(previous);
      } else {
        props.field.setTextAxis(
          props.languageSlot.tag,
          previous,
          props.allLanguageTags
        );
      }
      el.textContent = previous;
    } else {
      setPrevious(newValue);
    }

    if (props.attemptFileChanges && !props.attemptFileChanges()) {
      if (props.languageSlot === undefined) {
        props.field.setValueFromString(previous);
      } else {
        props.field.setTextAxis(
          props.languageSlot.tag,
          previous,
          props.allLanguageTags
        );
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

    // If we have all language tags and the field looks like slash syntax,
    // use virtual interpretation to show the correct segment for this slot
    if (props.allLanguageTags && props.allLanguageTags.length > 0) {
      return field.getTextAxisVirtual(
        props.languageSlot.tag,
        props.allLanguageTags
      );
    }
    // Fallback to regular axis retrieval
    return field.getTextAxis(props.languageSlot.tag);
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
        padding-right: 2px; /* buttons are now inline flex items */
        padding-bottom: ${props.languageSlot ? "2px" : "0"};
        padding-left: ${props.languageSlot ? "5px" : "0"};
        background: ${props.languageSlot &&
        isUnknownLanguage(props.languageSlot.tag)
          ? unknownLanguageBackground
          : "transparent"};
        ${props.showAffordancesAfter &&
        props.field.definition.separatorWithCommaInstructions
          ? "padding-right: 2px;" // leave a little space after the icon
          : ""};
        position: relative;
        /* Show kebab menu on hover */
        .kebab-menu-icon {
          opacity: 0;
          transition: opacity 150ms ease-in-out;
        }
        &:hover .kebab-menu-icon,
        .kebab-menu-icon.menu-open {
          opacity: 1;
        }
      `}
    >
      {/* Color bar for language slot - clickable with menu */}
      {props.languageSlot && (
        <ColorBarWithMenu
          slot={props.languageSlot}
          isProtected={props.isProtected ?? false}
          canRemove={props.canRemoveSlot ?? false}
          onRemove={() => props.onRemoveSlot?.(props.languageSlot!.tag)}
          onAddLanguage={props.onTriggerAddLanguage}
          onChangeLanguage={props.onChangeLanguage}
          existingTags={props.existingLanguageTags ?? []}
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
                ? props.languageSlot.autonym || props.languageSlot.name
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
              background: transparent;
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

      {/* Combined language tag and kebab menu - tag shows by default, kebab on hover */}
      {props.languageSlot && (
        <LanguageTagWithKebab
          slot={props.languageSlot}
          isProtected={props.isProtected ?? false}
          canRemove={props.canRemoveSlot ?? false}
          onRemove={() => props.onRemoveSlot?.(props.languageSlot!.tag)}
          onAddLanguage={props.onTriggerAddLanguage}
          onChangeLanguage={props.onChangeLanguage}
          existingTags={props.existingLanguageTags ?? []}
        />
      )}
    </div>
  );
});

/** Common props for language slot menus. */
interface LanguageSlotMenuProps {
  slot: LanguageSlot;
  isProtected: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onAddLanguage?: () => void;
  onChangeLanguage?: (oldTag: string, newTag: string) => string | undefined;
  existingTags: string[];
}

/** Shared menu items for language slot menus (color bar and kebab). */
const LanguageSlotMenuItems: React.FC<
  LanguageSlotMenuProps & {
    testIdPrefix: string;
    onClose: () => void;
  }
> = ({
  slot,
  isProtected,
  canRemove,
  onRemove,
  onAddLanguage,
  onChangeLanguage,
  existingTags,
  testIdPrefix,
  onClose
}) => {
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const handleAddLanguage = () => {
    onClose();
    onAddLanguage?.();
  };

  const handleDelete = () => {
    onClose();
    onRemove();
  };

  const handleStartChangeLanguage = () => {
    setIsChangingLanguage(true);
  };

  const handleLanguageSelected = (newTag: string) => {
    const normalized = normalizeLanguageTag(newTag);
    if (normalized && onChangeLanguage) {
      const error = onChangeLanguage(slot.tag, normalized);
      if (error) {
        ShowMessageDialog({ title: "Cannot Change Language", text: error });
      }
    }
    setIsChangingLanguage(false);
    onClose();
  };

  if (isChangingLanguage) {
    return (
      <div
        css={css`
          padding: 8px 12px;
          min-width: 200px;
        `}
      >
        <div
          css={css`
            font-size: 0.875rem;
            color: #666;
            margin-bottom: 8px;
          `}
        >
          Change language for this slot:
        </div>
        <SingleLanguageChooser
          labelInUILanguage=""
          languageTag={slot.tag}
          languageFinder={staticLanguageFinder}
          autoFocus
          onChange={(newTag) => handleLanguageSelected(newTag)}
        />
        <button
          type="button"
          onClick={() => {
            setIsChangingLanguage(false);
            onClose();
          }}
          css={css`
            margin-top: 8px;
            border: none;
            background: transparent;
            color: #555;
            cursor: pointer;
            font-size: 0.85em;
          `}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <MenuItem
        disabled
        sx={{
          fontSize: "0.87rem",
          color: lameta_green,
          py: 0.5,
          minHeight: "auto",
          "&.Mui-disabled": { opacity: 1 }
        }}
      >
        <ListItemText sx={{ textAlign: "right" }}>
          Slot: {slot.name} ({slot.tag})
        </ListItemText>
      </MenuItem>
      <MenuItem
        onClick={handleStartChangeLanguage}
        data-testid={`change-language-${testIdPrefix}-${slot.tag}`}
        sx={{ fontSize: "0.875rem", py: 0.5, minHeight: "auto" }}
      >
        <ListItemIcon sx={{ minWidth: 32 }} />
        <ListItemText>Change Language...</ListItemText>
      </MenuItem>
      <MuiTooltip
        title={
          isProtected
            ? "You cannot remove slots that are part of the project's working languages"
            : ""
        }
        placement="right"
      >
        <span>
          <MenuItem
            onClick={handleDelete}
            disabled={isProtected || !canRemove}
            data-testid={`delete-slot-${testIdPrefix}-${slot.tag}`}
            sx={{
              fontSize: "0.875rem",
              py: 0.5,
              minHeight: "auto"
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Slot</ListItemText>
          </MenuItem>
        </span>
      </MuiTooltip>
      <hr
        css={css`
          border: none;
          border-top: 1px solid #ddd;
          margin: 4px 0;
        `}
      />
      <MenuItem
        onClick={handleAddLanguage}
        data-testid={`add-language-slot-${testIdPrefix}-${slot.tag}`}
        sx={{ fontSize: "0.875rem", py: 0.5, minHeight: "auto" }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <AddIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Add Language Slot...</ListItemText>
      </MenuItem>
    </>
  );
};

/**
 * Color bar component with click-to-show menu containing language name and delete option.
 */
const ColorBarWithMenu: React.FC<LanguageSlotMenuProps> = (props) => {
  const { slot } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <div
        title={`${slot.name}. Click for menu`}
        data-testid={`slot-color-bar-${slot.tag}`}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        css={css`
          width: 4px;
          min-height: 1.5em;
          border-radius: 2px;
          background-color: ${slot.color || "#888"};
          margin-right: 6px;
          flex-shrink: 0;
          cursor: pointer;
        `}
      />
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { minWidth: "auto", py: 0.5 } } }}
      >
        <LanguageSlotMenuItems
          {...props}
          testIdPrefix="menu"
          onClose={() => setAnchorEl(null)}
        />
      </Menu>
    </>
  );
};

/**
 * Combined language tag and kebab menu component.
 * Shows the language tag by default; on hover, switches to show the kebab menu icon.
 * The kebab menu is only visible when the parent container is hovered.
 * Language tags are visible based on user settings or unknown language status.
 */
const LanguageTagWithKebab: React.FC<LanguageSlotMenuProps> = mobx.observer(
  (props) => {
    const { slot } = props;
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const open = Boolean(anchorEl);

    const isUnknown = slot.tag.startsWith("unknown");
    // Show tags if user setting is enabled, or if multilingual migration is pending
    const showTags =
      userSettings.ShowLanguageTags ||
      Project.getMultilingualConversionPending();

    // Determine if language tag should be visible
    const showLanguageTag = isUnknown || showTags;

    const displayText = isUnknown ? "????" : slot.label;
    const tagColor = isUnknown ? "#c73f1d" : "#888";
    const tooltipText = isUnknown
      ? `Unknown language. Click for more information.`
      : `${slot.name}. Hover for menu`;

    const handleUnknownClick = () => {
      if (isUnknown) {
        const match = slot.tag.match(/unknown(\d+)?/);
        const slotNumber = match && match[1] ? parseInt(match[1], 10) + 1 : 1;

        ShowMessageDialog({
          title: "Unknown Language",
          text: `lameta does not know what language this is. You can use the menu on this field to set the language, or go to Project > Languages and set the correct language for slot ${slotNumber}.`
        });
      }
    };

    // When hovering over this element or menu is open, show kebab
    // Otherwise show language tag if it should be visible
    const showKebab = isHovered || open;

    // If neither language tag nor kebab should show, render just the invisible kebab
    // which becomes visible on parent hover via the kebab-menu-icon class
    if (!showLanguageTag && !showKebab) {
      return (
        <>
          <div
            data-testid={`language-tag-kebab-${slot.tag}`}
            className={`kebab-menu-icon${open ? " menu-open" : ""}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              padding: 0 2px;
              min-width: 20px;
              cursor: pointer;
              color: ${lameta_green};
              &:hover {
                color: ${lameta_dark_green};
              }
              &:active {
                transform: scale(0.95);
              }
            `}
            title={`${slot.name}. Click for menu`}
          >
            <MoreVertIcon
              fontSize="small"
              data-testid={`slot-kebab-menu-${slot.tag}`}
            />
          </div>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { minWidth: "auto", py: 0.5 } } }}
          >
            <LanguageSlotMenuItems
              {...props}
              testIdPrefix="kebab-menu"
              onClose={() => setAnchorEl(null)}
            />
          </Menu>
        </>
      );
    }

    // When language tag should be visible: show tag normally, switch to kebab on hover
    return (
      <>
        <div
          data-testid={`language-tag-kebab-${slot.tag}`}
          // No kebab-menu-icon class here - this should always be visible when showLanguageTag is true
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            if (showKebab) {
              setAnchorEl(e.currentTarget);
            } else if (isUnknown) {
              handleUnknownClick();
            }
          }}
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            padding: 0 2px;
            min-width: 20px;
            cursor: pointer;
            ${showKebab
              ? `
              color: ${lameta_green};
              &:hover {
                color: ${lameta_dark_green};
              }
              &:active {
                transform: scale(0.95);
              }
            `
              : `
              font-size: 0.75em;
              color: ${tagColor};
              font-weight: ${isUnknown ? "bold" : "normal"};
              ${isUnknown ? "&:hover { text-decoration: underline; }" : ""}
            `}
          `}
          title={showKebab ? `${slot.name}. Click for menu` : tooltipText}
        >
          {showKebab ? (
            <MoreVertIcon
              fontSize="small"
              data-testid={`slot-kebab-menu-${slot.tag}`}
            />
          ) : (
            <span data-testid={`language-tag-${slot.tag}`}>{displayText}</span>
          )}
        </div>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { minWidth: "auto", py: 0.5 } } }}
        >
          <LanguageSlotMenuItems
            {...props}
            testIdPrefix="kebab-menu"
            onClose={() => setAnchorEl(null)}
          />
        </Menu>
      </>
    );
  }
);
