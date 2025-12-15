import { makeObservable, observable, runInAction } from "mobx";
import {
  parseSlashSyntax,
  assignLanguagesToSegments,
  parseCommaSeparatedSlashSyntax
} from "./TextHolderMigration";

/**
 * Holds text that can be either monolingual or multilingual.
 *
 * Monolingual: plain text, typically English or language-agnostic.
 * Multilingual: same content translated into one or more languages.
 *
 * When there is more than one language, the strings are stored in tagged format:
 *   [[en]]This is the English text[[es]]Este es el texto en español[[fr]]C'est le texte en français
 *
 * The implementation uses a simple split/join approach for clarity. Performance could be improved
 * with regex if needed, but the current approach keeps the serialization format transparent.
 *
 * Slash syntax migration:
 *   Text like "casa/house/maison" can be virtually interpreted as multilingual
 *   without modifying the stored text. Use `looksLikeSlashSyntax()` to detect,
 *   `getTextAxisVirtual()` to read virtually, and `commitSlashSyntaxConversion()`
 *   to permanently convert when the user confirms.
 */

export class TextHolder {
  public _text: string = "";
  constructor() {
    makeObservable(this, {
      _text: observable
    });
  }

  public get monoLingualText(): string {
    // Return raw text even if it contains language tags
    // This allows mono→multi→mono transitions without data loss
    return this._text;
  }
  public getSerialized(): string {
    return this._text;
  }
  public getFirstNonEmptyText(tags: string[]): string {
    const axes = this.deserializeMultiAxisText();
    for (const tag of tags) {
      const text = axes[tag];
      if (text !== undefined && text.trim() !== "") {
        return text;
      }
    }
    return "";
  }
  public set monoLingualText(value: string) {
    // Accept any value, even if it contains language tags
    // This allows preservation of multilingual data when field is temporarily monolingual
    this._text = value;
  }
  public get combinedText(): string {
    return this.getSerialized();
  }
  public set combinedText(value: string) {
    runInAction(() => (this._text = value));
  }
  public setTextAxis(tag: string, textForAxis: string): void {
    if (tag === "") throw new Error("Cannot set text for empty language tag");
    const axisTextDictionary = this.deserializeMultiAxisText();
    axisTextDictionary[tag] = textForAxis;
    this._text = TextHolder.serializedMultAxisText(axisTextDictionary);
  }
  public getTextAxis(tag: string): string {
    const axisTextDictionary = this.deserializeMultiAxisText();
    return axisTextDictionary[tag] || "";
  }

  /**
   * Check if the stored text looks like slash syntax that could be
   * virtually interpreted as multilingual.
   *
   * Returns true if:
   * - Text contains " / " (space-slash-space delimiter)
   * - Text does NOT start with "[[" (not already tagged format)
   * - Text is not empty
   *
   * Note: This avoids false positives on dates (01/01/2029) and paths (a/b/c)
   */
  public looksLikeSlashSyntax(): boolean {
    if (this._text === "" || this._text.startsWith("[[")) {
      return false;
    }
    return this._text.includes(" / ");
  }

  /**
   * Get a virtual interpretation of the text as a multilingual axis,
   * WITHOUT modifying the stored text.
   *
   * If the text looks like slash syntax, parses it and returns the
   * segment corresponding to the tag's position in languageTags.
   * Otherwise, falls back to the normal getTextAxis behavior.
   *
   * @param tag The language tag to get text for
   * @param languageTags The ordered list of language tags for slash interpretation
   * @param isCommaSeparated If true, treat as comma-separated items where each item has slash syntax
   * @returns The text for the given tag (virtual or actual)
   */
  public getTextAxisVirtual(
    tag: string,
    languageTags: string[],
    isCommaSeparated: boolean = false
  ): string {
    if (!this.looksLikeSlashSyntax()) {
      // Not slash syntax - use normal behavior
      return this.getTextAxis(tag);
    }

    if (isCommaSeparated) {
      // Comma-separated items with per-item slash syntax
      const { assignments } = parseCommaSeparatedSlashSyntax(
        this._text,
        languageTags
      );
      return assignments.get(tag) ?? "";
    }

    // Parse slash syntax virtually (whole field as one multilingual value)
    const { segments } = parseSlashSyntax(this._text);
    const { assignments } = assignLanguagesToSegments(segments, languageTags);
    return assignments.get(tag) ?? "";
  }

  /**
   * Get a virtual view of all language axes from slash syntax,
   * WITHOUT modifying the stored text.
   *
   * @param languageTags The ordered list of language tags for interpretation
   * @param isCommaSeparated If true, treat as comma-separated items where each item has slash syntax
   * @returns Map of language tag to text content, or null if not slash syntax
   */
  public getVirtualMultiAxisView(
    languageTags: string[],
    isCommaSeparated: boolean = false
  ): Map<string, string> | null {
    if (!this.looksLikeSlashSyntax()) {
      return null; // Not slash syntax
    }

    if (isCommaSeparated) {
      const { assignments } = parseCommaSeparatedSlashSyntax(
        this._text,
        languageTags
      );
      return assignments;
    }

    const { segments } = parseSlashSyntax(this._text);
    const { assignments } = assignLanguagesToSegments(segments, languageTags);
    return assignments;
  }

  /**
   * Get all effective slot tags for the text, including any "unknown" tags
   * that would be created for extra segments in slash syntax.
   *
   * For tagged text: returns the actual language tags from the stored data.
   * For slash syntax: returns the ordered tags including any unknown1, unknown2, etc.
   *
   * @param metadataSlotTags The metadata slot tags (for slash syntax interpretation)
   * @param isCommaSeparated If true, treat as comma-separated items where each item has slash syntax
   * @returns Array of all effective slot tags
   */
  public getEffectiveSlotTags(
    metadataSlotTags: string[],
    isCommaSeparated: boolean = false
  ): string[] {
    if (this.looksLikeSlashSyntax()) {
      if (isCommaSeparated) {
        const { orderedTags } = parseCommaSeparatedSlashSyntax(
          this._text,
          metadataSlotTags
        );
        return orderedTags;
      }
      const { segments } = parseSlashSyntax(this._text);
      const { orderedTags } = assignLanguagesToSegments(
        segments,
        metadataSlotTags
      );
      return orderedTags;
    }
    // For tagged text, return the actual axes
    return this.getAllNonEmptyTextAxes();
  }

  /**
   * Result of previewing a slash syntax conversion.
   */
  public static readonly PreviewResult = class {
    constructor(
      public readonly wouldConvert: boolean,
      public readonly unknownCount: number,
      public readonly unknownTags: string[]
    ) {}
  };

  /**
   * Preview what would happen if we converted this field's slash syntax.
   * Does NOT modify the stored text.
   *
   * @param languageTags The ordered list of language tags for conversion
   * @param isCommaSeparated If true, treat as comma-separated items where each item has slash syntax
   * @returns Preview result with info about unknowns
   */
  public previewSlashSyntaxConversion(
    languageTags: string[],
    isCommaSeparated: boolean = false
  ): {
    wouldConvert: boolean;
    unknownCount: number;
    unknownTags: string[];
  } {
    if (!this.looksLikeSlashSyntax()) {
      return { wouldConvert: false, unknownCount: 0, unknownTags: [] };
    }

    let orderedTags: string[];
    if (isCommaSeparated) {
      const result = parseCommaSeparatedSlashSyntax(this._text, languageTags);
      orderedTags = result.orderedTags;
    } else {
      const { segments } = parseSlashSyntax(this._text);
      const result = assignLanguagesToSegments(segments, languageTags);
      orderedTags = result.orderedTags;
    }

    // Find unknown tags
    const unknownTags = orderedTags.filter((tag) => tag.startsWith("unknown"));

    return {
      wouldConvert: true,
      unknownCount: unknownTags.length,
      unknownTags
    };
  }

  /**
   * Permanently convert slash syntax to tagged multilingual format.
   * Call this when the user confirms the virtual interpretation is correct.
   *
   * @param languageTags The ordered list of language tags for conversion
   * @param isCommaSeparated If true, treat as comma-separated items where each item has slash syntax
   * @returns true if conversion happened, false if text wasn't slash syntax
   */
  public commitSlashSyntaxConversion(
    languageTags: string[],
    isCommaSeparated: boolean = false
  ): boolean {
    if (!this.looksLikeSlashSyntax()) {
      return false;
    }

    let assignments: Map<string, string>;
    let orderedTags: string[];

    if (isCommaSeparated) {
      const result = parseCommaSeparatedSlashSyntax(this._text, languageTags);
      assignments = result.assignments;
      orderedTags = result.orderedTags;
    } else {
      const { segments } = parseSlashSyntax(this._text);
      const result = assignLanguagesToSegments(segments, languageTags);
      assignments = result.assignments;
      orderedTags = result.orderedTags;
    }

    // Build tagged format
    const parts: string[] = [];
    for (const tag of orderedTags) {
      const text = assignments.get(tag) ?? "";
      if (text.length > 0) {
        parts.push(`[[${tag}]]${text}`);
      }
    }

    runInAction(() => {
      this._text = parts.join("");
    });
    return true;
  }

  private deserializeMultiAxisText(): MultiAxisText {
    // we store multiple languages in a single field in this format:
    // [[en]]This is the Enlish text[[es]]Este es el texto en español[[fr]]C'est le texte en français
    // We want to divide this into an array of {tag, text} pairs

    // if there are no language tags, return a dictionary with "en" set to the string
    if (!this._text.includes("[[")) {
      return { en: this._text };
    }

    // Check if this looks like multilingual format (starts with [[)
    // If not, treat as plain text even if it contains [[ somewhere
    if (!this._text.startsWith("[[")) {
      return { en: this._text };
    }

    // first divide the text into an array of axis/text pairs
    const axisTextPairsWithExtra = this._text.split("[[");

    if (axisTextPairsWithExtra[0] !== "")
      throw new Error(
        `Cannot have text before the first langauge tag. Found when deserializing: ${this._text}`
      );
    // remove the first element, which is the text before the first tag, which is not valid
    axisTextPairsWithExtra.shift();
    // now split each pair into tag and text
    const axisTextPairsArrayOfArrays = axisTextPairsWithExtra.map((s) =>
      s.split("]]")
    );

    const result: MultiAxisText = {};
    // add each pair to result
    axisTextPairsArrayOfArrays.forEach((pair) => {
      if (pair.length != 2) {
        throw new Error(
          `Invalid axis/text pair when deserializing: ${this._text}`
        );
      }
      result[pair[0]] = pair[1];
    });
    return result;
  }
  public getAllNonEmptyTextAxes(): string[] {
    return TextHolder.getNonEmptyLanguageAxesStatic(
      this.deserializeMultiAxisText()
    );
  }

  private static getNonEmptyLanguageAxesStatic(axes: MultiAxisText): string[] {
    return Object.keys(axes).filter(
      (language) => axes[language] !== undefined && axes[language].trim() !== ""
    );
  }

  private static serializedMultAxisText(axes: MultiAxisText): string {
    const nonEmptyAxes = this.getNonEmptyLanguageAxesStatic(axes);

    if (nonEmptyAxes.length === 0) {
      return ""; // No languages
    }

    if (nonEmptyAxes.length === 1 && nonEmptyAxes[0] === "en") {
      return axes["en"]!; // Only English
    }

    const serializedParts = nonEmptyAxes.map((language) => {
      const text = axes[language]; // can't trim because then you can't type a space !.trim();  Trim whitespace
      return text.length > 0 ? `[[${language}]]${text}` : "";
    });

    return serializedParts.join("");
  }
}

export interface LanguageSlot {
  tag: string;
  label: string;
  name: string;
  autonym?: string; // The language name in its own script/language (e.g., "Español" for Spanish)
  color?: string;
}

//  a dictionary of language tags to text
// keep private
interface MultiAxisText {
  [key: string]: string;
}
