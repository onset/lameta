import * as React from "react";
import { t } from "@lingui/macro";
import { Project } from "../model/Project/Project";

export interface TranslationTooltipResult {
  /** The tooltip content to display, or null if not applicable */
  content: React.ReactNode;
  /** True if at least one language slot is missing a translation */
  hasMissing: boolean;
}

/**
 * Builds tooltip content showing translations in the project's metadata language slots.
 * Shows "missing" for languages that don't have translations.
 *
 * @param value - The value to translate (e.g., genre ID, role ID)
 * @param translateToLanguage - Function that takes (value, languageTag) and returns the translation or undefined
 * @returns Object with tooltip content and whether there are missing translations
 */
export const buildTranslationTooltip = (
  value: string,
  translateToLanguage: (value: string, lang: string) => string | undefined
): TranslationTooltipResult => {
  const slots = Project.getMetadataLanguageSlots();
  if (slots.length <= 1 || !value) {
    return { content: null, hasMissing: false };
  }

  const translations: { name: string; text: string; missing: boolean }[] = [];
  for (const slot of slots) {
    const translated = translateToLanguage(value, slot.tag);
    // Use autonym if available, otherwise fall back to name
    const displayName = slot.autonym || slot.name || slot.label;
    translations.push({
      name: displayName,
      text: translated || t`missing`,
      missing: !translated
    });
  }

  const hasMissing = translations.some((t) => t.missing);

  // If all are missing, don't show tooltip content
  if (translations.every((t) => t.missing)) {
    return { content: null, hasMissing: true };
  }

  const content = (
    <div>
      {translations.map((t, i) => (
        <div key={i}>
          <strong>{t.name}:</strong>{" "}
          {t.missing ? <em style={{ opacity: 0.7 }}>{t.text}</em> : t.text}
        </div>
      ))}
    </div>
  );

  return { content, hasMissing };
};
