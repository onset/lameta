import React from "react";
import { css } from "@emotion/react";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildHighlightedHTML(value: string, query: string): string {
  if (!query || !query.trim()) return escapeHtml(value);
  const q = query.trim();
  const lower = value.toLowerCase();
  const lowerQ = q.toLowerCase();
  let i = 0;
  let html = "";
  while (i < value.length) {
    const found = lower.indexOf(lowerQ, i);
    if (found === -1) {
      html += escapeHtml(value.slice(i));
      break;
    }
    if (found > i) html += escapeHtml(value.slice(i, found));
    const match = value.slice(found, found + q.length);
    html += `<mark data-testid="inline-highlight" style="background:#ffba8a;padding:0 1px;">${escapeHtml(
      match
    )}</mark>`;
    i = found + q.length;
  }
  return html;
}

export function highlightReact(
  text: string,
  query: string,
  options?: { testId?: string; background?: string }
): React.ReactNode {
  if (!query || !query.trim()) return text;
  const testId = options?.testId || "inline-highlight";
  const background = options?.background || "#ffba8a";
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    const parts = text.split(re);
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === query.toLowerCase() ? (
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
