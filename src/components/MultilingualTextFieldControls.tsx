import { css } from "@emotion/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Field } from "../model/field/Field";
import { LanguageSlot } from "../model/field/TextHolder";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "./SingleLanguageChooser";
import { Project } from "../model/Project/Project";
import {
  languageSlotColors,
  unknownLanguageColor,
  nonMetadataLanguageColor
} from "../containers/theme";

export const DEFAULT_LANGUAGE_TAG = "en";

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
   * Returns an error message if the new tag is already in use, otherwise returns undefined.
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
    console.log(
      `[useMultilingualField] field="${
        field.key
      }", isMultilingual=${isMultilingual}, metadataSlots=[${slots
        .map((s) => s.tag)
        .join(", ")}]`
    );
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
   * Returns an error message if the new tag is already in use, otherwise returns undefined.
   */
  const handleChangeLanguage = useCallback(
    (oldTag: string, newTag: string): string | undefined => {
      const normalizedOld = normalizeLanguageTag(oldTag);
      const normalizedNew = normalizeLanguageTag(newTag);
      if (!normalizedOld || !normalizedNew) return "Invalid language tag";
      if (normalizedOld === normalizedNew) return undefined; // No change

      // Check if the new tag is already in use
      const existingSlot = slots.find((s) => s.tag === normalizedNew);
      if (existingSlot) {
        return `Cannot change to ${existingSlot.name} (${normalizedNew}) because that language is already used in this field.`;
      }

      // Move the text from old tag to new tag
      const oldText = field.getTextAxis(normalizedOld);
      field.setTextAxis(normalizedNew, oldText);
      field.setTextAxis(normalizedOld, "");

      // Update the slots array
      setSlots((previous) =>
        previous.map((s) => {
          if (s.tag === normalizedOld) {
            return createLanguageSlot(normalizedNew, s.color);
          }
          return s;
        })
      );

      return undefined;
    },
    [field, slots]
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
                color: #555;
                cursor: pointer;
                font-size: 0.85em;
              `}
            >
              Cancel
            </button>
          </div>
        ) : showButton ? (
          <button
            type="button"
            title="Add language slot"
            data-testid="add-translation-button"
            onClick={() => setIsAdding(true)}
            css={css`
              background: none;
              border: none;
              color: #81c21e;
              cursor: pointer;
              font-size: 1.2em;
              font-weight: 600;
              padding: 0 4px;
              line-height: 1;
              flex-shrink: 0;
              transition: all 150ms ease-in-out;
              &:hover {
                color: #c73f1d;
                transform: scale(1.15);
              }
              &:active {
                transform: scale(0.95);
              }
            `}
          >
            +
          </button>
        ) : null}
      </>
    );
  };
