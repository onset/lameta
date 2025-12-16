import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { css } from "@emotion/react";
import { Trans, t } from "@lingui/macro";
import { observer } from "mobx-react";
import { Project } from "../../model/Project/Project";
import {
  scanProjectForVocabulary,
  updateTranslationsFromScan,
  getGenreEnglishLabel,
  getRoleEnglishLabel,
  ScanResult
} from "../../model/Project/VocabularyScanner";
import { FieldVocabularyTranslations } from "../../model/Project/VocabularyTranslations";
import {
  translateGenreToLanguage,
  translateRoleToLanguage
} from "../../other/localization";
import {
  lameta_orange,
  lameta_dark_blue,
  lameta_light_orange_background
} from "../../containers/theme";
import LinearProgress from "@mui/material/LinearProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import IcecreamIcon from "@mui/icons-material/Icecream";
import Tooltip from "@mui/material/Tooltip";
import {
  getFieldDefinition,
  getCommonFieldDefinition
} from "../../model/field/ConfiguredFieldDefinitions";
import { NotifyError } from "../Notify";

interface VocabularyTranslationsTabProps {
  project: Project;
}

interface TranslationRowProps {
  value: string;
  source: "project" | "builtin";
  translations: Record<string, string>;
  languageCodes: string[];
  englishLabel: string;
  onTranslationChange: (languageCode: string, translation: string) => void;
  getBuiltInTranslation: (value: string, lang: string) => string | undefined;
}

// Local state for controlled inputs
interface TranslationInputProps {
  initialValue: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

const TranslationInput: React.FC<TranslationInputProps> = ({
  initialValue,
  placeholder,
  disabled,
  onChange
}) => {
  const [value, setValue] = useState(initialValue);

  // Update local state when initialValue changes (e.g., after rescan)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Show orange border when field is empty and editable (needs translation)
  const needsTranslation = !disabled && value.trim() === "";

  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      onBlur={() => {
        if (value !== initialValue) {
          onChange(value);
        }
      }}
      css={css`
        width: 100%;
        padding: 6px;
        border: ${needsTranslation
          ? `2px solid ${lameta_orange}`
          : `1px solid ${disabled ? "transparent" : "#ccc"}`};
        border-radius: 4px;
        background: transparent;
        color: inherit;
        &:focus {
          outline: none;
          border-color: ${lameta_dark_blue};
        }
      `}
    />
  );
};

const TranslationRow: React.FC<TranslationRowProps> = ({
  value,
  source,
  translations,
  languageCodes,
  englishLabel,
  onTranslationChange,
  getBuiltInTranslation
}) => {
  // Custom values (source === "project") get an ice cream icon
  const isCustomValue = source === "project";

  // Filter out English from the language codes for the translation columns
  // since English is already shown in the first column
  const nonEnglishCodes = languageCodes.filter(
    (code) => code !== "en" && code !== "eng"
  );

  return (
    <tr
      css={css`
        background-color: white;
        &:hover {
          background-color: #f5f5f5;
        }
      `}
    >
      <td
        css={css`
          padding: 8px;
          border-bottom: 1px solid #ddd;
          background-color: white;
        `}
      >
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
          `}
        >
          <span>{englishLabel}</span>
          {isCustomValue && (
            <Tooltip title={t`Custom vocabulary item`} arrow>
              <IcecreamIcon
                css={css`
                  color: ${lameta_orange};
                  font-size: 16px;
                  cursor: help;
                `}
              />
            </Tooltip>
          )}
        </div>
      </td>
      {nonEnglishCodes.map((code) => {
        const projectTranslation = translations[code] || "";
        const builtInTranslation = getBuiltInTranslation(value, code);
        const displayValue = projectTranslation || builtInTranslation || "";
        const isFromBuiltIn = !projectTranslation && !!builtInTranslation;

        return (
          <td
            key={code}
            css={css`
              padding: 4px;
              border-bottom: 1px solid #ddd;
            `}
          >
            <TranslationInput
              initialValue={displayValue}
              placeholder={""}
              disabled={isFromBuiltIn}
              onChange={(newValue) => onTranslationChange(code, newValue)}
            />
          </td>
        );
      })}
      {/* Filler column to absorb remaining space */}
      <td
        css={css`
          border-bottom: 1px solid #ddd;
        `}
      />
    </tr>
  );
};

interface FieldSectionProps {
  title: string;
  fieldData: FieldVocabularyTranslations | undefined;
  languageCodes: string[];
  languageNames: Record<string, string>;
  onTranslationChange: (
    value: string,
    languageCode: string,
    translation: string
  ) => void;
  getBuiltInTranslation: (value: string, lang: string) => string | undefined;
  getEnglishLabel: (value: string) => string;
}

const FieldSection: React.FC<FieldSectionProps> = ({
  title,
  fieldData,
  languageCodes,
  languageNames,
  onTranslationChange,
  getBuiltInTranslation,
  getEnglishLabel
}) => {
  const nonEnglishCodes = languageCodes.filter(
    (code) => code !== "en" && code !== "eng"
  );

  // Helper to check if an entry has missing translations
  const hasMissingTranslations = (
    value: string,
    entry: { translations: Record<string, string> }
  ) => {
    return nonEnglishCodes.some((code) => {
      const projectTranslation = entry.translations[code];
      const builtInTranslation = getBuiltInTranslation(value, code);
      return (
        (!projectTranslation || projectTranslation.trim().length === 0) &&
        (!builtInTranslation || builtInTranslation.trim().length === 0)
      );
    });
  };

  // Sort entries: first those with missing translations, then alphabetically by English label
  const entries = fieldData
    ? Object.entries(fieldData).sort(([valueA, entryA], [valueB, entryB]) => {
        const aMissing = hasMissingTranslations(valueA, entryA);
        const bMissing = hasMissingTranslations(valueB, entryB);
        if (aMissing !== bMissing) {
          return aMissing ? -1 : 1; // Missing translations come first
        }
        // Then sort alphabetically by English label
        const labelA = getEnglishLabel(valueA).toLowerCase();
        const labelB = getEnglishLabel(valueB).toLowerCase();
        return labelA.localeCompare(labelB);
      })
    : [];

  if (entries.length === 0) {
    return (
      <div
        css={css`
          margin-bottom: 24px;
        `}
      >
        <h3
          css={css`
            margin-bottom: 8px;
            color: #333;
          `}
        >
          {title}
        </h3>
        <p
          css={css`
            color: #888;
            font-style: italic;
          `}
        >
          <Trans>No custom values found</Trans>
        </p>
      </div>
    );
  }

  return (
    <div
      css={css`
        margin-bottom: 24px;
      `}
    >
      <h3
        css={css`
          margin-bottom: 8px;
          color: #333;
        `}
      >
        {title}
      </h3>
      <table
        css={css`
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #ddd;
          background-color: white;
        `}
      >
        <thead>
          <tr
            css={css`
              background-color: ${lameta_light_orange_background};
            `}
          >
            <th
              css={css`
                padding: 8px;
                text-align: left;
                border-bottom: 2px solid #ddd;
                width: 200px;
              `}
            >
              {languageNames["en"] || languageNames["eng"] || "English"}
            </th>
            {languageCodes
              .filter((code) => code !== "en" && code !== "eng")
              .map((code) => (
                <th
                  key={code}
                  css={css`
                    padding: 8px;
                    text-align: left;
                    border-bottom: 2px solid #ddd;
                    width: 250px;
                    max-width: 250px;
                  `}
                >
                  {languageNames[code] || code.toUpperCase()}
                </th>
              ))}
            {/* Filler column to absorb remaining space */}
            <th
              css={css`
                border-bottom: 2px solid #ddd;
              `}
            />
          </tr>
        </thead>
        <tbody>
          {entries.map(([value, entry]) => (
            <TranslationRow
              key={value}
              value={value}
              source={entry.source}
              translations={entry.translations}
              languageCodes={languageCodes}
              englishLabel={getEnglishLabel(value)}
              onTranslationChange={(lang, translation) =>
                onTranslationChange(value, lang, translation)
              }
              getBuiltInTranslation={getBuiltInTranslation}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const VocabularyTranslationsTab: React.FC<VocabularyTranslationsTabProps> =
  observer(({ project }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [scanMessage, setScanMessage] = useState("");
    const [scanError, setScanError] = useState<string | null>(null);
    const [hasScanned, setHasScanned] = useState(false);
    const [lastScanResult, setLastScanResult] =
      useState<ScanResult | null>(null);

    // Check if genre and role fields are multilingual in the current archive config.
    // Note: We explicitly check genre and role because they are the only vocabulary fields
    // with built-in translation files (genres.csv, roles.csv) and custom value support.
    // If future fields need similar treatment, they would need:
    // 1. A translation CSV file in locale/
    // 2. A translateXxxToLanguage function in localization.ts
    // 3. Scanner and storage updates in VocabularyScanner.ts and VocabularyTranslations.ts
    const genreFieldDef = getFieldDefinition("session", "genre");
    const roleFieldDef = getCommonFieldDefinition("role");
    const isGenreMultilingual = genreFieldDef?.multilingual ?? false;
    const isRoleMultilingual = roleFieldDef?.multilingual ?? false;
    const hasAnyMultilingualVocab = isGenreMultilingual || isRoleMultilingual;

    // Get metadata language codes from project
    const metadataLanguages = Project.getMetadataLanguageSlots();
    const languageCodes = metadataLanguages.map((slot) => slot.tag);

    const translations = project.vocabularyTranslations;

    // Auto-scan on first visit
    useEffect(() => {
      if (!hasScanned && languageCodes.length > 0) {
        performScan();
      }
    }, [hasScanned, languageCodes.length]);

    const performScan = useCallback(async () => {
      if (isScanning || languageCodes.length === 0) return;

      setScanError(null);
      setIsScanning(true);
      setScanProgress(0);
      setScanMessage(t`Starting scan...`);

      let hadError = false;
      try {
        const result = await scanProjectForVocabulary(
          project,
          languageCodes,
          (progress, message) => {
            setScanProgress(progress);
            setScanMessage(message);
          }
        );

        updateTranslationsFromScan(translations, result, languageCodes);
        // Save after scan to persist the new entries
        translations.save();
        setLastScanResult(result);
        setHasScanned(true);
      } catch (error) {
        hadError = true;
        console.error("Error scanning project:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : t`Unknown error while scanning vocabulary`;
        setScanError(errorMessage);
        setScanProgress(0);
        setScanMessage(t`Scan failed`);
        NotifyError(t`Vocabulary scan failed`, errorMessage);
      } finally {
        setIsScanning(false);
        if (!hadError) {
          setScanProgress(100);
          setScanMessage(t`Scan complete`);
        }
      }
    }, [project, languageCodes, translations, isScanning]);

    const handleGenreTranslationChange = useCallback(
      (value: string, languageCode: string, translation: string) => {
        translations.updateGenreTranslation(value, languageCode, translation);
        translations.save();
      },
      [translations]
    );

    const handleRoleTranslationChange = useCallback(
      (value: string, languageCode: string, translation: string) => {
        translations.updateRoleTranslation(value, languageCode, translation);
        translations.save();
      },
      [translations]
    );

    const genreMissingCount = isGenreMultilingual
      ? translations.getGenreMissingCount(languageCodes, (value, lang) =>
          translateGenreToLanguage(value, lang)
        )
      : 0;
    const roleMissingCount = isRoleMultilingual
      ? translations.getRoleMissingCount(languageCodes, (value, lang) =>
          translateRoleToLanguage(value, lang)
        )
      : 0;
    const totalMissing = genreMissingCount + roleMissingCount;

    // If no vocabulary fields are multilingual, show a message
    if (!hasAnyMultilingualVocab) {
      return (
        <div
          data-testid="vocabulary-translations-panel"
          css={css`
            padding: 20px;
          `}
        >
          <h2>
            <Trans>Vocabulary Translations</Trans>
          </h2>
          <p
            css={css`
              color: #888;
              margin-top: 16px;
            `}
          >
            <Trans>
              This archive configuration does not have any multilingual
              vocabulary fields.
            </Trans>
          </p>
        </div>
      );
    }

    if (languageCodes.length < 2) {
      return (
        <div
          data-testid="vocabulary-translations-panel"
          css={css`
            padding: 20px;
          `}
        >
          <h2>
            <Trans>Vocabulary Translations</Trans>
          </h2>
          <p
            css={css`
              color: #888;
              margin-top: 16px;
            `}
          >
            <Trans>
              You need at least two metadata languages defined to use vocabulary
              translations. Please add metadata languages in the Languages tab.
            </Trans>
          </p>
        </div>
      );
    }

    return (
      <div
        data-testid="vocabulary-translations-panel"
        css={css`
          padding: 20px;
          max-width: 900px;
        `}
      >
        <h2
          css={css`
            margin: 0 0 16px 0;
          `}
        >
          <Trans>Vocabulary Translations</Trans>
        </h2>

        <div
          css={css`
            margin-bottom: 16px;
            padding: 12px;
            background: ${lameta_light_orange_background};
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          `}
        >
          {isScanning ? (
            <>
              <span
                css={css`
                  color: #000;
                `}
              >
                <Trans>Scanning...</Trans>
              </span>
              <LinearProgress variant="determinate" value={scanProgress} />
            </>
          ) : hasScanned ? (
            <div
              css={css`
                display: flex;
                align-items: center;
                gap: 8px;
              `}
            >
              {totalMissing > 0 ? (
                <span>
                  <Trans>{totalMissing} items need translation</Trans>
                </span>
              ) : (
                <>
                  <CheckCircleIcon
                    css={css`
                      color: ${lameta_orange};
                    `}
                  />
                  <span>
                    <Trans>All translations complete</Trans>
                  </span>
                </>
              )}
            </div>
          ) : (
            <span
              css={css`
                color: #666;
              `}
            >
              <Trans>Ready to scan...</Trans>
            </span>
          )}
          {scanMessage && (
            <span
              css={css`
                color: #333;
              `}
            >
              {scanMessage}
            </span>
          )}
          {scanError && (
            <span
              css={css`
                color: #b00020;
                font-weight: 600;
                overflow-wrap: anywhere;
              `}
            >
              {scanError}
            </span>
          )}
        </div>

        <p
          css={css`
            color: #333;
            margin: 0 0 16px 0;
          `}
        >
          <Trans>
            The columns here are based on your project's metadata languages.
          </Trans>
        </p>

        {isGenreMultilingual && (
          <FieldSection
            title={t`Genres`}
            fieldData={translations.genres}
            languageCodes={languageCodes}
            languageNames={Object.fromEntries(
              metadataLanguages.map((slot) => [
                slot.tag,
                slot.name || slot.tag.toUpperCase()
              ])
            )}
            onTranslationChange={handleGenreTranslationChange}
            getBuiltInTranslation={(value, lang) =>
              translateGenreToLanguage(value, lang)
            }
            getEnglishLabel={getGenreEnglishLabel}
          />
        )}

        {isRoleMultilingual && (
          <FieldSection
            title={t`Roles`}
            fieldData={translations.roles}
            languageCodes={languageCodes}
            languageNames={Object.fromEntries(
              metadataLanguages.map((slot) => [
                slot.tag,
                slot.name || slot.tag.toUpperCase()
              ])
            )}
            onTranslationChange={handleRoleTranslationChange}
            getBuiltInTranslation={(value, lang) =>
              translateRoleToLanguage(value, lang)
            }
            getEnglishLabel={getRoleEnglishLabel}
          />
        )}
      </div>
    );
  });
