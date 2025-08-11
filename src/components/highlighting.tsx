import React from "react";
import { css } from "@emotion/react";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHighlightedHTML(
  value: string,
  searchTerm: string
): string {
  if (!searchTerm) return escapeHtml(value);
  const lower = value.toLowerCase();
  let i = 0;
  let html = "";
  while (i < value.length) {
    const found = lower.indexOf(searchTerm, i);
    if (found === -1) {
      html += escapeHtml(value.slice(i));
      break;
    }
    if (found > i) html += escapeHtml(value.slice(i, found));
    const match = value.slice(found, found + searchTerm.length);
    html += `<mark data-testid="inline-highlight" style="background:#ffba8a;padding:0 1px;">${escapeHtml(
      match
    )}</mark>`;
    i = found + searchTerm.length;
  }
  return html;
}

export function highlightMatches(
  text: string,
  searchTerm: string,
  options?: { testId?: string; background?: string }
): React.ReactNode {
  if (!searchTerm) return text;
  const testId = options?.testId || "inline-highlight";
  const background = options?.background || "#ffba8a";
  try {
    // Escape any regex metacharacters in the user-supplied searchTerm so it is treated literally.
    // Example: if searchTerm is "a.b" we want to match the 3-character string a.b, not any char between a and b.
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Build a case-insensitive, global regex that captures the term. The capturing parentheses are
    // intentional: String.split() will INCLUDE the captured delimiters (the matches) in the returned array.
    // That lets us avoid re-running another regex to know which pieces are matches vs plain text.
    // Flags:
    //  i => case-insensitive match
    //  g => find all matches (so split processes the whole string)
    const re = new RegExp(`(${escaped})`, "ig");
    // After splitting we get an array like: [unmatched, match, unmatched, match, ...].
    // Each matched segment is exactly the user's original casing from the source text (because split preserves it),
    // so we can render it directly while still doing a case-insensitive comparison.
    const parts = text.split(re);
    return (
      <>
        {parts.map((p, i) =>
          // Compare lower-cased part to the (un-lowercased) searchTerm for a case-insensitive equality test.
          // (If searchTerm might not already be lower case, using searchTerm.toLowerCase() would be slightly safer.)
          p.toLowerCase() === searchTerm ? (
            <mark
              key={i}
              data-testid={testId}
              css={css`
                background: ${background};
                padding: 0 1px;
              `}
            >
              {p}
            </mark>
          ) : (
            p
          )
        )}
      </>
    );
  } catch {
    return text;
  }
}
