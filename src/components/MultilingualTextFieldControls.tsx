import { css } from "@emotion/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Field } from "../model/field/Field";
import { LanguageSlot } from "../model/field/TextHolder";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "./SingleLanguageChooser";
import { Project } from "../model/Project/Project";
import { languageSlotColors } from "../containers/theme";

export const DEFAULT_LANGUAGE_TAG = "en";

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

export interface UseMultilingualFieldResult {
  languageTags: string[];
  slots: LanguageSlot[];
  newlyAddedTag: string | null;
  handleAddLanguage: (tag: string) => void;
  handleRemoveLanguage: (tag: string) => void;
  clearNewlyAddedTag: () => void;
  isProtectedSlot: (tag: string) => boolean;
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
    return Project.getMetadataLanguageSlots();
  }, [isMultilingual]);

  const protectedTags = useMemo(
    () => new Set(metadataSlots.map((s) => s.tag)),
    [metadataSlots]
  );

  // Initialize slots: metadata slots first, then any extra languages from existing text
  const getInitialSlots = useCallback((): LanguageSlot[] => {
    if (!isMultilingual) return [];

    // Start with all metadata slots (in order)
    const slots = [...metadataSlots];
    const existingTags = new Set(metadataSlots.map((s) => s.tag));

    console.log(
      "[getInitialSlots] metadataSlots:",
      metadataSlots.map((s) => ({ tag: s.tag, color: s.color }))
    );

    // Add any extra languages from existing text data (not in metadata slots)
    // Extra languages get colors starting after the metadata slots' colors
    let extraColorIndex = metadataSlots.length;
    const textTags = field.getAllNonEmptyTextAxes();
    textTags.forEach((tag) => {
      const normalized = normalizeLanguageTag(tag);
      if (normalized && !existingTags.has(normalized)) {
        const color =
          languageSlotColors[extraColorIndex % languageSlotColors.length];
        extraColorIndex++;
        slots.push(createLanguageSlot(normalized, color));
        existingTags.add(normalized);
      }
    });

    console.log(
      "[getInitialSlots] final slots:",
      slots.map((s) => ({ tag: s.tag, color: s.color }))
    );

    return slots;
  }, [field, isMultilingual, metadataSlots]);

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
      const textTags = field.getAllNonEmptyTextAxes();
      if (textTags.length > 0) {
        setSlots((previous) => {
          const existingTags = new Set(previous.map((s) => s.tag));
          let changed = false;
          const newSlots = [...previous];

          textTags.forEach((tag) => {
            const normalized = normalizeLanguageTag(tag);
            if (normalized && !existingTags.has(normalized)) {
              // Use current slots length to determine next color
              const color =
                languageSlotColors[newSlots.length % languageSlotColors.length];
              newSlots.push(createLanguageSlot(normalized, color));
              existingTags.add(normalized);
              changed = true;
            }
          });

          return changed ? newSlots : previous;
        });
      }
    }
  }, [isMultilingual, field, field.text, getInitialSlots]);

  const languageTags = useMemo(() => slots.map((s) => s.tag), [slots]);

  const handleAddLanguage = useCallback((tag: string) => {
    const normalized = normalizeLanguageTag(tag);
    if (!normalized) return;

    setSlots((previous) => {
      if (previous.some((s) => s.tag === normalized)) {
        return previous; // Already exists
      }
      // Use current slots length to determine next color
      const color =
        languageSlotColors[previous.length % languageSlotColors.length];
      return [...previous, createLanguageSlot(normalized, color)];
    });
    setNewlyAddedTag(normalized);
  }, []);

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

  return {
    languageTags,
    slots,
    newlyAddedTag,
    handleAddLanguage,
    handleRemoveLanguage,
    clearNewlyAddedTag,
    isProtectedSlot
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

    // Handle external trigger to start adding
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
              position: absolute;
              bottom: 5px;
              right: 4px;
              background: none;
              border: none;
              color: #81c21e;
              cursor: pointer;
              font-size: 1.2em;
              font-weight: 600;
              padding: 0;
              line-height: 1;
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
