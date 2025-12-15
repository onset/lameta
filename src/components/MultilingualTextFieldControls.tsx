import { css } from "@emotion/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import { LanguageSlot } from "../model/field/TextHolder";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "./SingleLanguageChooser";
import { Project } from "../model/Project/Project";
import {
  languageSlotColors,
  unknownLanguageColor,
  nonMetadataLanguageColor,
  lameta_green,
  lameta_dark_green
} from "../containers/theme";
import userSettings from "../other/UserSettings";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MuiTooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AddIcon from "@mui/icons-material/Add";
import { ShowMessageDialog } from "./ShowMessageDialog/MessageDialog";

export const DEFAULT_LANGUAGE_TAG = "en";

/** Color for muted/secondary text elements like labels, cancel buttons, and disabled items */
const mutedTextColor = "#666";

/**
 * Check if a language tag represents an unknown language (from slash syntax migration).
 */
export function isUnknownLanguage(tag: string): boolean {
  return tag.startsWith("unknown");
}

/**
 * Determines the color for a language slot based on:
 * 1. Unknown languages (unknown2, etc.) → bright red
 * 2. Known languages not in metadata slots → LaMeta Orange
 * 3. Known languages in metadata slots → use the cycling palette colors
 */
function getSlotColor(
  tag: string,
  slotIndex: number,
  metadataSlotTags: Set<string>
): string {
  // Unknown languages get bright red
  if (isUnknownLanguage(tag)) {
    return unknownLanguageColor;
  }
  // Known languages not in metadata slots get LaMeta Orange
  if (!metadataSlotTags.has(tag)) {
    return nonMetadataLanguageColor;
  }
  // Metadata slot languages use the cycling palette
  return languageSlotColors[slotIndex % languageSlotColors.length];
}

/**
 * Normalize a language tag to BCP47 preferred format.
 * Uses the language finder if available to convert 3-letter to 2-letter codes.
 */
export function normalizeLanguageTag(tag?: string): string | undefined {
  if (!tag) return undefined;
  const trimmed = tag.trim().toLowerCase();
  if (trimmed.length === 0) return undefined;

  // Use language finder to normalize to BCP47 (prefers 2-letter codes)
  if (staticLanguageFinder) {
    return staticLanguageFinder.normalizeToBcp47(trimmed);
  }
  return trimmed;
}

/**
 * Create a basic LanguageSlot from a tag and optional color.
 * Use createSlotWithColor for slots that need proper color assignment.
 */
export function createLanguageSlot(tag: string, color?: string): LanguageSlot {
  const normalized = normalizeLanguageTag(tag) ?? DEFAULT_LANGUAGE_TAG;
  const displayCode =
    staticLanguageFinder?.findCodeFromCodeOrLanguageName(normalized) ??
    normalized;
  const languageName =
    staticLanguageFinder?.findOneLanguageNameFromCode_Or_ReturnCode(
      normalized
    ) ?? normalized.toUpperCase();
  return {
    tag: normalized,
    label: displayCode,
    name: languageName,
    color
  };
}

/**
 * Creates a LanguageSlot with the appropriate color based on:
 * - Unknown languages → bright red
 * - Non-metadata languages → LaMeta Orange
 * - Metadata languages → cycling palette colors
 *
 * This is the single source of truth for slot creation with colors.
 */
function createSlotWithColor(
  tag: string,
  slotIndex: number,
  metadataSlotTags: Set<string>
): LanguageSlot {
  const color = getSlotColor(tag, slotIndex, metadataSlotTags);

  if (isUnknownLanguage(tag)) {
    const num = tag.replace("unknown", "");
    return {
      tag,
      label: `?${num}`,
      name: `Unknown language ${num}`,
      color
    };
  }

  return createLanguageSlot(tag, color);
}

export interface UseMultilingualFieldResult {
  languageTags: string[];
  slots: LanguageSlot[];
  newlyAddedTag: string | null;
  handleAddLanguage: (tag: string) => void;
  handleRemoveLanguage: (tag: string) => void;
  /**
   * Change the language tag for a slot.
   * Returns an error message if the new tag is already in use (and non-empty), otherwise returns undefined.
   * Allows changing to a language that has an empty slot (the empty slot is removed).
   */
  handleChangeLanguage: (oldTag: string, newTag: string) => string | undefined;
  clearNewlyAddedTag: () => void;
  isProtectedSlot: (tag: string) => boolean;
  /**
   * True if there are multiple metadata language slots configured.
   * When false, multilingual fields should fall back to monolingual display
   * since there's no meaningful way to interpret slash syntax with only 1 language.
   */
  hasMultipleMetadataSlots: boolean;
}

/**
 * Hook for managing multilingual field language slots.
 *
 * Uses the project's metadataLanguageSlots as the base (always shown, even if empty).
 * Additional languages from existing text are shown after the metadata slots.
 * Protected slots (from metadataLanguageSlots) cannot be removed, only cleared.
 */
export function useMultilingualField(
  field: Field,
  isMultilingual: boolean
): UseMultilingualFieldResult {
  // Get metadata language slots from project - these are the required/protected slots
  const metadataSlots = useMemo(() => {
    if (!isMultilingual) return [];
    const slots = Project.getMetadataLanguageSlots();
    // console.log(
    //   `[useMultilingualField] field="${
    //     field.key
    //   }", isMultilingual=${isMultilingual}, metadataSlots=[${slots
    //     .map((s) => s.tag)
    //     .join(", ")}]`
    // );
    return slots;
  }, [isMultilingual, field.key]);

  const protectedTags = useMemo(
    () => new Set(metadataSlots.map((s) => s.tag)),
    [metadataSlots]
  );

  // Get metadata slot tags for use in getEffectiveSlotTags
  const metadataSlotTags = useMemo(
    () => metadataSlots.map((s) => s.tag),
    [metadataSlots]
  );

  // Initialize slots: metadata slots first, then any extra languages from existing text
  const getInitialSlots = useCallback((): LanguageSlot[] => {
    if (!isMultilingual) return [];

    // Start with all metadata slots (in order)
    const slots = [...metadataSlots];
    const existingTags = new Set(metadataSlots.map((s) => s.tag));

    // Get all effective tags (handles both tagged text and slash syntax)
    const effectiveTags = field.getEffectiveSlotTags(metadataSlotTags);
    effectiveTags.forEach((tag) => {
      if (!existingTags.has(tag)) {
        slots.push(createSlotWithColor(tag, slots.length, existingTags));
        existingTags.add(tag);
      }
    });

    return slots;
  }, [field, field.text, isMultilingual, metadataSlots, metadataSlotTags]);

  const [slots, setSlots] = useState<LanguageSlot[]>(getInitialSlots);
  const [newlyAddedTag, setNewlyAddedTag] = useState<string | null>(null);

  // Track the field key to detect when we switch to a genuinely different field
  const previousFieldKeyRef = React.useRef<string>(field.key);

  useEffect(() => {
    if (!isMultilingual) return;

    const fieldKeyChanged = previousFieldKeyRef.current !== field.key;
    previousFieldKeyRef.current = field.key;

    if (fieldKeyChanged) {
      // Switched to a different field - do a full re-initialization
      setSlots(getInitialSlots());
    } else {
      // Same field, possibly with updated content - merge to preserve user additions
      setSlots((previous) => {
        const existingTags = new Set(previous.map((s) => s.tag));
        let changed = false;
        const newSlots = [...previous];

        // Get all effective tags (handles both tagged text and slash syntax)
        const effectiveTags = field.getEffectiveSlotTags(metadataSlotTags);
        const metadataTagsSet = new Set(metadataSlotTags);
        effectiveTags.forEach((tag) => {
          if (!existingTags.has(tag)) {
            newSlots.push(
              createSlotWithColor(tag, newSlots.length, metadataTagsSet)
            );
            existingTags.add(tag);
            changed = true;
          }
        });

        return changed ? newSlots : previous;
      });
    }
  }, [isMultilingual, field, field.text, getInitialSlots, metadataSlotTags]);

  const languageTags = useMemo(() => slots.map((s) => s.tag), [slots]);

  const handleAddLanguage = useCallback(
    (tag: string) => {
      const normalized = normalizeLanguageTag(tag);
      if (!normalized) return;

      setSlots((previous) => {
        if (previous.some((s) => s.tag === normalized)) {
          return previous; // Already exists
        }
        // Manually added languages are not in metadata slots, so they get orange
        // (createSlotWithColor will assign nonMetadataLanguageColor for non-metadata tags)
        const metadataTagsSet = new Set(metadataSlotTags);
        return [
          ...previous,
          createSlotWithColor(normalized, previous.length, metadataTagsSet)
        ];
      });
      setNewlyAddedTag(normalized);
    },
    [metadataSlotTags]
  );

  const isProtectedSlot = useCallback(
    (tag: string): boolean => {
      const normalized = normalizeLanguageTag(tag);
      return normalized ? protectedTags.has(normalized) : false;
    },
    [protectedTags]
  );

  const handleRemoveLanguage = useCallback(
    (tag: string) => {
      const normalized = normalizeLanguageTag(tag);
      if (!normalized) return;

      if (isProtectedSlot(normalized)) {
        // Protected slot: only clear the text, don't remove the slot
        field.setTextAxis(normalized, "");
      } else {
        // Non-protected slot: remove the slot entirely
        setSlots((previous) => previous.filter((s) => s.tag !== normalized));
        field.setTextAxis(normalized, "");
      }
    },
    [field, isProtectedSlot]
  );

  const clearNewlyAddedTag = useCallback(() => {
    setNewlyAddedTag(null);
  }, []);

  /**
   * Change the language tag for a slot.
   * Returns an error message if the new tag is already in use (and non-empty), otherwise returns undefined.
   */
  const handleChangeLanguage = useCallback(
    (oldTag: string, newTag: string): string | undefined => {
      const normalizedOld = normalizeLanguageTag(oldTag);
      const normalizedNew = normalizeLanguageTag(newTag);
      if (!normalizedOld || !normalizedNew) return "Invalid language tag";
      if (normalizedOld === normalizedNew) return undefined; // No change

      // Check if the new tag is already in use and has content
      const existingText = field.getTextAxis(normalizedNew);
      if (existingText && existingText.trim() !== "") {
        const langName =
          staticLanguageFinder?.findOneLanguageNameFromCode_Or_ReturnCode(
            normalizedNew
          ) ?? normalizedNew;
        return `Lameta cannot change to ${langName} (${normalizedNew}) because that language is already used in this field.`;
      }

      // Move the text from old tag to new tag
      const oldText = field.getTextAxis(normalizedOld);
      field.setTextAxis(normalizedNew, oldText);
      field.setTextAxis(normalizedOld, "");

      // Re-compute slots from scratch - this ensures correct order and colors
      setSlots(getInitialSlots());

      return undefined;
    },
    [field, getInitialSlots]
  );

  const hasMultipleMetadataSlots = metadataSlots.length > 1;

  return {
    languageTags,
    slots,
    newlyAddedTag,
    handleAddLanguage,
    handleRemoveLanguage,
    handleChangeLanguage,
    clearNewlyAddedTag,
    isProtectedSlot,
    hasMultipleMetadataSlots
  };
}

type AddTranslationProps = {
  existingTags: string[];
  onAddLanguage: (tag: string) => void;
  showButton?: boolean;
  triggerAdd?: boolean;
  onTriggerAddHandled?: () => void;
};

export const AddTranslationControl: React.FunctionComponent<AddTranslationProps> =
  ({
    existingTags,
    onAddLanguage,
    showButton = true,
    triggerAdd,
    onTriggerAddHandled
  }) => {
    const [isAdding, setIsAdding] = useState(false);

    // Handle external trigger to start adding.
    // Intentionally only depends on triggerAdd: we want this to fire when triggerAdd
    // changes to true, reading the current isAdding as a guard. Adding isAdding would
    // cause unwanted re-runs when isAdding resets to false. onTriggerAddHandled is
    // excluded because it's a callback prop that may not be stable.
    useEffect(() => {
      if (triggerAdd && !isAdding) {
        setIsAdding(true);
        onTriggerAddHandled?.();
      }
    }, [triggerAdd]);

    const excluded = useMemo(
      () =>
        new Set(
          existingTags
            .map((t) => normalizeLanguageTag(t))
            .filter((t): t is string => !!t)
        ),
      [existingTags]
    );

    return (
      <>
        {isAdding ? (
          <div
            css={css`
              padding: 4px 2px;
              flex-shrink: 0;
              display: flex;
              gap: 6px;
              align-items: center;
              width: 100%;
            `}
          >
            <div
              css={css`
                flex: 1;
                .field {
                  margin: 0;
                }
              `}
            >
              <SingleLanguageChooser
                labelInUILanguage=""
                languageTag=""
                languageFinder={staticLanguageFinder}
                autoFocus
                onChange={(newTag) => {
                  const normalized = normalizeLanguageTag(newTag);
                  if (normalized && !excluded.has(normalized)) {
                    onAddLanguage(normalized);
                  }
                  setIsAdding(false);
                }}
              />
            </div>
            <button
              type="button"
              data-testid="cancel-add-translation"
              onClick={() => setIsAdding(false)}
              css={css`
                border: none;
                background: transparent;
                color: ${mutedTextColor};
                cursor: pointer;
                font-size: 0.85em;
              `}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </>
    );
  };

/** Common props for language slot menus. */
export interface LanguageSlotMenuProps {
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
            color: ${mutedTextColor};
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
            color: ${mutedTextColor};
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
          py: 0.5,
          minHeight: "auto",
          "&.Mui-disabled": { opacity: 1 }
        }}
      >
        <ListItemText
          sx={{ textAlign: "right", marginLeft: "auto" }}
          primaryTypographyProps={{
            sx: {
              fontSize: "0.75rem",
              fontWeight: "bold",
              color: mutedTextColor,
              opacity: 0.5
            }
          }}
        >
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
        <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
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
export const ColorBarWithMenu: React.FC<LanguageSlotMenuProps> = (props) => {
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
          background-color: ${slot.color || mutedTextColor};
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
export const LanguageTagWithKebab: React.FC<LanguageSlotMenuProps> =
  mobx.observer((props) => {
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
    const tagColor = isUnknown ? "#c73f1d" : mutedTextColor;
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
  });
