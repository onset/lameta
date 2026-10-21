import { reaction } from "mobx";
import { TopTab } from "./NavigationState";
import "./navigation.css";

const kHighlightClass = "navigation-highlight";

// Waits for React to render the field, then scrolls it into view, focuses it, and
// highlights it so the eye finds it. The highlight stays while `keepHighlightWhile`
// (a MobX-observable condition) is true and the field is showing. Returns false if
// the field never appeared.
//
// A field is found by, in order:
//  - data-field-key="<key>" on the editor's outer element (the way to make any editor findable)
//  - data-testid="field-<key>-edit", which TextFieldEdit puts on its text box
export async function revealField(
  topTab: TopTab,
  fieldKey: string,
  keepHighlightWhile: () => boolean = () => true,
  timeoutMilliseconds = 3000,
): Promise<boolean> {
  // Until React renders the change, the DOM may still show the same field of the
  // previously selected folder, which would then be the one we focus.
  await nextFrame();
  await nextFrame();
  const element = await waitFor(() => findFieldElement(topTab, fieldKey), timeoutMilliseconds);
  if (!element) {
    console.warn(`navigation: could not find field "${fieldKey}"`);
    return false;
  }
  // smooth, so that the user sees where the field is in the form
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  const focusable = findFocusable(element);
  focusable?.focus({ preventScroll: true });
  highlight(element, keepHighlightWhile);
  return true;
}

export function findFieldElement(topTab: TopTab, fieldKey: string): HTMLElement | undefined {
  const panel = document.querySelector(`.react-tabs__tab-panel--selected.tab-panel-${topTab}`);
  if (!panel) return undefined;
  // Sessions and People also have a folder list, whose columns are not editors
  const scope =
    topTab === "project" ? panel : (panel.querySelector(".folder-bottom-pane") ?? panel);
  const key = CSS.escape(fieldKey);
  const marked = visible(scope.querySelectorAll(`[data-field-key="${key}"]`));
  if (marked) return marked;
  const textBox = visible(scope.querySelectorAll(`[data-testid="field-${key}-edit"]`));
  if (textBox) return (textBox.closest(".field") as HTMLElement) ?? textBox;
  return undefined;
}

// Inactive tab panels stay in the DOM, so the first match may be hidden
function visible(elements: NodeListOf<Element>): HTMLElement | undefined {
  return Array.from(elements).find((e) => (e as HTMLElement).offsetParent !== null) as
    | HTMLElement
    | undefined;
}

function findFocusable(element: HTMLElement): HTMLElement | undefined {
  const selector =
    "[contenteditable='true'], input:not([type='hidden']), textarea, select, [tabindex]:not([tabindex='-1'])";
  if (element.matches(selector)) return element;
  return (element.querySelector(selector) as HTMLElement) ?? undefined;
}

// only one field is highlighted at a time
let removeHighlight: (() => void) | undefined;

function highlight(element: HTMLElement, keepWhile: () => boolean) {
  removeHighlight?.();
  element.classList.add(kHighlightClass);
  const stopWatching = reaction(keepWhile, (keep) => {
    if (!keep) remove();
  });
  // A tab that the user switches away from stays in the DOM, hidden, so its size
  // drops to zero. That counts as leaving the field's screen.
  const resizeObserver = new ResizeObserver(() => {
    if (element.offsetParent === null) remove();
  });
  resizeObserver.observe(element);
  const remove = () => {
    stopWatching();
    resizeObserver.disconnect();
    element.classList.remove(kHighlightClass);
    if (removeHighlight === remove) removeHighlight = undefined;
  };
  removeHighlight = remove;
}

function waitFor<T>(
  find: () => T | undefined,
  timeoutMilliseconds: number,
): Promise<T | undefined> {
  const start = performance.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const found = find();
      if (found) resolve(found);
      else if (performance.now() - start > timeoutMilliseconds) resolve(undefined);
      else window.requestAnimationFrame(attempt);
    };
    attempt();
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}
