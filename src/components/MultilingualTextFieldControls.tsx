import { css } from "@emotion/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Field } from "../model/field/Field";
import { LanguageAxis } from "../model/field/TextHolder";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";
import { SingleLanguageChooser } from "./SingleLanguageChooser";

export const DEFAULT_LANGUAGE_TAG = "en";

export function normalizeLanguageTag(tag?: string): string | undefined {
  if (!tag) return undefined;
  const trimmed = tag.trim().toLowerCase();
  return trimmed.length === 0 ? undefined : trimmed;
}

export function getInitialLanguageTags(field: Field): string[] {
  const axes = field
    .getAllNonEmptyTextAxes()
    .map((t) => normalizeLanguageTag(t))
    .filter((t): t is string => !!t);
  if (axes.length === 0) {
    return [DEFAULT_LANGUAGE_TAG];
  }
  return Array.from(new Set(axes));
}

export function mergeLanguageTags(
  existing: string[],
  incoming: string[]
): string[] {
  const merged = new Set(
    existing
      .map((tag) => normalizeLanguageTag(tag))
      .filter((tag): tag is string => !!tag)
  );
  incoming.forEach((tag) => {
    const normalized = normalizeLanguageTag(tag);
    if (normalized) {
      merged.add(normalized);
    }
  });
  if (merged.size === 0) {
    merged.add(DEFAULT_LANGUAGE_TAG);
  }
  return Array.from(merged);
}

export function createLanguageAxis(tag: string): LanguageAxis {
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
    name: languageName
  };
}

export interface UseMultilingualFieldResult {
  languageTags: string[];
  axes: LanguageAxis[];
  newlyAddedTag: string | null;
  handleAddLanguage: (tag: string) => void;
  handleRemoveLanguage: (tag: string) => void;
  clearNewlyAddedTag: () => void;
}

export function useMultilingualField(
  field: Field,
  isMultilingual: boolean
): UseMultilingualFieldResult {
  const [languageTags, setLanguageTags] = useState<string[]>(() =>
    isMultilingual ? getInitialLanguageTags(field) : []
  );

  const [newlyAddedTag, setNewlyAddedTag] = useState<string | null>(null);

  useEffect(() => {
    if (!isMultilingual) return;
    setLanguageTags(getInitialLanguageTags(field));
  }, [isMultilingual, field]);

  useEffect(() => {
    if (!isMultilingual) return;
    const tagsFromField = field.getAllNonEmptyTextAxes();
    setLanguageTags((previous) => mergeLanguageTags(previous, tagsFromField));
  }, [isMultilingual, field.text]);

  const axes = useMemo<LanguageAxis[]>(() => {
    if (!isMultilingual) return [];
    return languageTags.map(createLanguageAxis);
  }, [isMultilingual, languageTags]);

  const handleAddLanguage = useCallback((tag: string) => {
    const normalized = normalizeLanguageTag(tag);
    if (!normalized) {
      return;
    }
    setLanguageTags((previous) =>
      previous.includes(normalized) ? previous : [...previous, normalized]
    );
    setNewlyAddedTag(normalized);
  }, []);

  const handleRemoveLanguage = useCallback(
    (tag: string) => {
      const normalized = normalizeLanguageTag(tag);
      if (!normalized) return;
      setLanguageTags((previous) => {
        const filtered = previous.filter((t) => t !== normalized);
        return filtered.length === 0 ? [DEFAULT_LANGUAGE_TAG] : filtered;
      });
      field.setTextAxis(normalized, "");
    },
    [field]
  );

  const clearNewlyAddedTag = useCallback(() => {
    setNewlyAddedTag(null);
  }, []);

  return {
    languageTags,
    axes,
    newlyAddedTag,
    handleAddLanguage,
    handleRemoveLanguage,
    clearNewlyAddedTag
  };
}

type AddTranslationProps = {
  existingTags: string[];
  onAddLanguage: (tag: string) => void;
};

export const AddTranslationControl: React.FunctionComponent<AddTranslationProps> =
  ({ existingTags, onAddLanguage }) => {
    const [isAdding, setIsAdding] = useState(false);
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
      <div
        css={css`
          border-top: 1px solid #e8e8e8;
          padding: 4px 2px;
          flex-shrink: 0;
          display: flex;
          justify-content: flex-end;
        `}
      >
        {isAdding ? (
          <div
            css={css`
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
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            css={css`
              background: none;
              border: none;
              color: #81c21e;
              cursor: pointer;
              font-size: 0.85em;
              font-weight: 500;
              padding: 0;
            `}
          >
            + Add translation
          </button>
        )}
      </div>
    );
  };
