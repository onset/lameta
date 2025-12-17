// CSS Custom Highlight API TypeScript declarations
// https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API

interface Highlight extends Iterable<Range> {
  priority: number;
  type: "highlight" | "spelling-error" | "grammar-error";
  add(range: Range): Highlight;
  clear(): void;
  delete(range: Range): boolean;
  has(range: Range): boolean;
  forEach(
    callbackfn: (value: Range, key: Range, set: Highlight) => void,
    thisArg?: unknown
  ): void;
  readonly size: number;
}

interface HighlightConstructor {
  new (...ranges: Range[]): Highlight;
  prototype: Highlight;
}

declare var Highlight: HighlightConstructor;

interface HighlightRegistry {
  set(name: string, highlight: Highlight): void;
  get(name: string): Highlight | undefined;
  has(name: string): boolean;
  delete(name: string): boolean;
  clear(): void;
  forEach(
    callbackfn: (value: Highlight, key: string, map: HighlightRegistry) => void,
    thisArg?: unknown
  ): void;
  readonly size: number;
}

interface CSS {
  highlights: HighlightRegistry;
}
