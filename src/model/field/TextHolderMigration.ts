/**
 * Migration utilities for converting between text formats.
 *
 * Supports converting "slash syntax" (e.g., "casa/house/maison") to
 * tagged multilingual format (e.g., "[[es]]casa[[en]]house[[fr]]maison").
 */

/**
 * Result of parsing slash syntax text.
 * Each segment preserves whitespace exactly as provided.
 */
export interface SlashSyntaxParseResult {
  /** The individual text segments split by "/" */
  segments: string[];
  /** Whether the input contained any slashes */
  hasSlashes: boolean;
}

/**
 * Parse slash-separated text into segments.
 * Does NOT assign languages - just splits on "/".
 *
 * Rules:
 * - Empty string returns empty segments array
 * - No slashes returns single segment with original text
 * - Empty segments between slashes are preserved (e.g., "a//b" → ["a", "", "b"])
 * - Whitespace is preserved exactly as provided
 *
 * @param input The slash-separated text to parse
 * @returns Parse result with segments and metadata
 */
export function parseSlashSyntax(input: string): SlashSyntaxParseResult {
  if (input === "") {
    return { segments: [], hasSlashes: false };
  }

  const hasSlashes = input.includes("/");
  if (!hasSlashes) {
    return { segments: [input], hasSlashes: false };
  }

  const segments = input.split("/");
  return { segments, hasSlashes: true };
}

/**
 * Result of assigning languages to parsed segments.
 */
export interface LanguageAssignmentResult {
  /** Map of language tag to text content */
  assignments: Map<string, string>;
  /** Language tags in order of assignment */
  orderedTags: string[];
  /** Any warnings about the assignment (e.g., mismatched counts) */
  warnings: string[];
}

/**
 * Assign language tags to parsed text segments.
 *
 * Rules:
 * - Tags are assigned in order to segments
 * - If more segments than tags, extra segments get "unknown1", "unknown2", etc.
 * - If more tags than segments, extra tags get empty strings
 * - Empty segments are assigned (allows explicit empty translations)
 *
 * @param segments The text segments from parseSlashSyntax
 * @param languageTags The language tags to assign, in order
 * @returns Assignment result with language-to-text mapping
 */
export function assignLanguagesToSegments(
  segments: string[],
  languageTags: string[]
): LanguageAssignmentResult {
  const assignments = new Map<string, string>();
  const orderedTags: string[] = [];
  const warnings: string[] = [];

  if (segments.length === 0) {
    // No segments - assign empty string to each tag
    for (const tag of languageTags) {
      assignments.set(tag, "");
      orderedTags.push(tag);
    }
    return { assignments, orderedTags, warnings };
  }

  // Assign known tags first
  const tagCount = languageTags.length;
  const segmentCount = segments.length;

  for (let i = 0; i < Math.max(tagCount, segmentCount); i++) {
    let tag: string;
    let text: string;

    if (i < tagCount) {
      tag = languageTags[i];
    } else {
      // More segments than tags - use unknown1, unknown2, etc.
      const unknownIndex = i - tagCount + 1;
      tag = `unknown${unknownIndex}`;
      warnings.push(
        `Segment ${i + 1} has no language tag, assigned to "${tag}"`
      );
    }

    if (i < segmentCount) {
      text = segments[i];
    } else {
      // More tags than segments - assign empty string
      text = "";
      warnings.push(`Language "${tag}" has no corresponding segment`);
    }

    assignments.set(tag, text);
    orderedTags.push(tag);
  }

  return { assignments, orderedTags, warnings };
}

/**
 * Convert slash syntax text to tagged multilingual format.
 * Convenience function combining parse and assign.
 *
 * @param input The slash-separated text (e.g., "casa/house")
 * @param languageTags The language tags in order (e.g., ["es", "en"])
 * @returns Tagged format string (e.g., "[[es]]casa[[en]]house")
 */
export function slashSyntaxToTaggedText(
  input: string,
  languageTags: string[]
): string {
  const { segments, hasSlashes } = parseSlashSyntax(input);

  // If no slashes, don't convert - return as-is
  if (!hasSlashes) {
    return input;
  }

  const { assignments, orderedTags } = assignLanguagesToSegments(
    segments,
    languageTags
  );

  // Build tagged format
  const parts: string[] = [];
  for (const tag of orderedTags) {
    const text = assignments.get(tag) ?? "";
    // Include all tags, even empty ones, to preserve structure
    parts.push(`[[${tag}]]${text}`);
  }

  return parts.join("");
}
