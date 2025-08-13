import { describe, it, expect } from "vitest";
import { buildHighlightedHTML } from "./highlighting";

describe("buildHighlightedHTML", () => {
  it("escapes HTML in value and wraps matches", () => {
    const html = buildHighlightedHTML('<b>a&b</b>', 'b');
    // Expect original tags to be escaped and the 'b' characters wrapped in mark
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    // There are two 'b' letters in the string; ensure marked segments exist
    expect(html).toMatch(/<mark[^>]*>b<\/mark>/);
  });

  it("escapes HTML in value when no search term", () => {
    const html = buildHighlightedHTML('<script>alert(1)</script>', '');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it("does not interpret regex metacharacters in search term", () => {
    const html = buildHighlightedHTML('a.c a*c a+c', 'a.c');
    // Should only wrap the literal 'a.c'
    expect(html).toMatch(/<mark[^>]*>a\.c<\/mark>/);
  });
});
