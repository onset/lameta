import React from "react";
import { Tab } from "react-tabs";
import { css } from "@emotion/react";
import { SearchContext } from "./SearchContext";
import SearchIcon from "@mui/icons-material/Search";
import { lameta_orange } from "../containers/theme";

export interface HighlightableTabProps {
  // Optional supplier returning strings to search; if provided (and shouldHighlight not explicitly true),
  // the tab will highlight when any returned string contains the current search query (case-insensitive).
  getSearchStrings?: () =>
    | Iterable<string | undefined | null>
    | ArrayLike<string | undefined | null>;
  testId?: string;
  children: React.ReactNode;
  // Allow any other props react-tabs injects (selectedClassName, disabled, id, etc.)
  // We'll pass them through to the underlying Tab element.
  [key: string]: any; // pragmatic typing; refine later if desired
}

// Wraps react-tabs Tab and conditionally wraps its label in a highlighted span.
export const HighlightableTab = React.forwardRef<
  HTMLDivElement,
  HighlightableTabProps
>(({ getSearchStrings, testId, children, className, ...rest }, ref) => {
  const { query } = React.useContext(SearchContext);

  // If no search strings are supplied, just behave like a normal Tab without extra DOM
  if (!getSearchStrings) {
    const baseClass = ["react-tabs__tab", className].filter(Boolean).join(" ");
    return (
      <Tab
        ref={ref as any}
        {...rest}
        className={baseClass}
        data-testid={testId}
      >
        <span className="ht-label">{children}</span>
      </Tab>
    );
  }

  let highlight = false;

  if (getSearchStrings && query.length > 0) {
    const q = query; // normalized already
    for (const raw of getSearchStrings() as any) {
      const text = raw == null ? "" : String(raw);
      if (text && text.toLowerCase().includes(q)) {
        highlight = true;
        break;
      }
    }
  }

  // Ensure the base react-tabs class is always present even if cloning fails
  const mergedClassName = ["react-tabs__tab", className, "highlightable-tab"]
    .filter(Boolean)
    .join(" ");

  return (
    <Tab
      ref={ref as any}
      {...rest}
      className={mergedClassName}
      css={css`
        /* Ensure selected tab text still renders bold even with nested spans */
        &.react-tabs__tab--selected span.ht-label {
          font-weight: 600;
        }
        /* Provide inline layout in case upstream stylesheet load order changes */
        &.react-tabs__tab {
          display: inline-block;
        }
      `}
    >
      <span
        css={css`
          display: inline-flex;
          align-items: center;
          gap: 4px;
        `}
      >
        {highlight && (
          <span
            data-testid={testId}
            css={css`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: ${lameta_orange};
              color: white;
              flex-shrink: 0;
            `}
          >
            <SearchIcon
              fontSize="inherit"
              css={css`
                font-size: 12px; /* ensure fits inside 16px circle */
              `}
            />
          </span>
        )}
        <span className="ht-label">{children}</span>
      </span>
    </Tab>
  );
});

// Let react-tabs know this component represents a Tab
(HighlightableTab as any).tabsRole = "Tab";

export default HighlightableTab;
