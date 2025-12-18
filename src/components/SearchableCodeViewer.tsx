import React, { useRef, useState, useEffect, useCallback } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { css } from "@emotion/react";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SyntaxHighlighter, {
  registerLanguage
} from "react-syntax-highlighter/light";
import xmlLang from "react-syntax-highlighter/languages/hljs/xml";
import jsonLang from "react-syntax-highlighter/languages/hljs/json";

// Register languages
registerLanguage("xml", xmlLang);
registerLanguage("json", jsonLang);

// Check if CSS Custom Highlight API is supported
const supportsHighlightAPI = typeof CSS !== "undefined" && "highlights" in CSS;

interface SearchableCodeViewerProps {
  /** The code/text content to display */
  content: string;
  /** Language for syntax highlighting hints (currently just affects styling) */
  language?: "xml" | "json" | "text";
  /** Whether to auto-focus the search input */
  autoFocusSearch?: boolean;
  /** Optional content to display in the header bar (e.g., validation results) */
  headerContent?: React.ReactNode;
}

interface MatchInfo {
  range: Range;
  index: number;
}

/**
 * A code viewer with built-in search functionality using CSS Custom Highlight API.
 * Highlights all matches and allows navigation between them with distinct styling
 * for the current match.
 */
export const SearchableCodeViewer: React.FC<SearchableCodeViewerProps> = ({
  content,
  language = "xml",
  autoFocusSearch = true,
  headerContent
}) => {
  const [searchText, setSearchText] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Clear highlights when component unmounts or content changes
  useEffect(() => {
    return () => {
      if (supportsHighlightAPI) {
        CSS.highlights.delete("search-results");
        CSS.highlights.delete("current-match");
      }
    };
  }, []);

  // Auto-focus search input
  useEffect(() => {
    if (autoFocusSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocusSearch]);

  // Find all text nodes in the content element
  const getTextNodes = useCallback((element: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }
    return textNodes;
  }, []);

  // Search and highlight matches
  const performSearch = useCallback(
    (query: string) => {
      if (!supportsHighlightAPI || !contentRef.current) {
        return;
      }

      // Clear existing highlights
      CSS.highlights.delete("search-results");
      CSS.highlights.delete("current-match");

      if (!query.trim()) {
        setMatches([]);
        setCurrentMatchIndex(0);
        return;
      }

      const textNodes = getTextNodes(contentRef.current);
      const foundMatches: MatchInfo[] = [];
      const queryLower = query.toLowerCase();
      let matchIndex = 0;

      // Build a map of text content with positions
      for (const textNode of textNodes) {
        const text = textNode.textContent || "";
        const textLower = text.toLowerCase();
        let startPos = 0;

        while (startPos < text.length) {
          const matchPos = textLower.indexOf(queryLower, startPos);
          if (matchPos === -1) break;

          const range = document.createRange();
          range.setStart(textNode, matchPos);
          range.setEnd(textNode, matchPos + query.length);

          foundMatches.push({
            range,
            index: matchIndex++
          });

          startPos = matchPos + 1;
        }
      }

      setMatches(foundMatches);

      if (foundMatches.length > 0) {
        // Create highlight for all matches
        const allMatchesHighlight = new Highlight(
          ...foundMatches.map((m) => m.range)
        );
        CSS.highlights.set("search-results", allMatchesHighlight);

        // Set current match to first one
        setCurrentMatchIndex(0);
      } else {
        setCurrentMatchIndex(0);
      }
    },
    [getTextNodes]
  );

  // Update current match highlight
  useEffect(() => {
    if (!supportsHighlightAPI || matches.length === 0) {
      CSS.highlights.delete("current-match");
      return;
    }

    const currentMatch = matches[currentMatchIndex];
    if (currentMatch) {
      const currentHighlight = new Highlight(currentMatch.range);
      CSS.highlights.set("current-match", currentHighlight);

      // Scroll the current match into view
      // Use getBoundingClientRect to check visibility and scroll if needed
      try {
        const rangeRect = currentMatch.range.getBoundingClientRect();
        const container = contentRef.current;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const isVisible =
            rangeRect.top >= containerRect.top &&
            rangeRect.bottom <= containerRect.bottom;

          if (!isVisible) {
            // Calculate scroll position to center the match
            const scrollTop =
              container.scrollTop +
              (rangeRect.top - containerRect.top) -
              containerRect.height / 2;
            container.scrollTo({ top: scrollTop, behavior: "smooth" });
          }
        }
      } catch (e) {
        console.warn("Could not scroll to match:", e);
      }
    }
  }, [currentMatchIndex, matches]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchText);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchText, performSearch, content]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        goToPreviousMatch();
      } else {
        goToNextMatch();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClear();
    }
  };

  const goToNextMatch = () => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  };

  const goToPreviousMatch = () => {
    if (matches.length === 0) return;
    setCurrentMatchIndex(
      (prev) => (prev - 1 + matches.length) % matches.length
    );
  };

  const handleClear = () => {
    setSearchText("");
    setMatches([]);
    setCurrentMatchIndex(0);
    if (supportsHighlightAPI) {
      CSS.highlights.delete("search-results");
      CSS.highlights.delete("current-match");
    }
    searchInputRef.current?.focus();
  };

  const showMatchCount = searchText.trim().length > 0;
  const hasMatches = matches.length > 0;

  // Custom style for syntax highlighter - lameta theme
  // lameta_orange (#e69664) for XML elements/tags
  // lameta_green (#cff09f) for attributes
  // lameta_blue (#becde4) for attribute values and links
  // white for text content
  const syntaxStyle: { [key: string]: React.CSSProperties } = {
    hljs: {
      display: "block",
      overflowX: "auto",
      padding: "12px",
      background: "#2d2d2d",
      color: "white"
    },
    "hljs-tag": { color: "#e69664" }, // lameta_orange
    "hljs-name": { color: "#e69664" }, // lameta_orange
    "hljs-attr": { color: "#cff09f" }, // lameta_green
    "hljs-string": { color: "#becde4" }, // lameta_blue - attribute values
    "hljs-number": { color: "#becde4" }, // lameta_blue
    "hljs-literal": { color: "#becde4" }, // lameta_blue
    "hljs-keyword": { color: "#e69664" }, // lameta_orange
    "hljs-comment": { color: "#888888", fontStyle: "italic" },
    "hljs-doctag": { color: "#888888" },
    "hljs-meta": { color: "#becde4" }, // lameta_blue
    "hljs-link": { color: "#becde4" } // lameta_blue
  };

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;

        /* CSS Custom Highlight API styles */
        ::highlight(search-results) {
          background-color: #fff59d; /* Light yellow for all matches */
          color: black;
        }
        ::highlight(current-match) {
          background-color: #ff9800; /* Orange for current match */
          color: black;
        }
      `}
    >
      {/* Search bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 0.5,
          p: 0.5,
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0
        }}
      >
        {headerContent}
        <Box sx={{ flex: 1 }} /> {/* Spacer to push search to the right */}
        {showMatchCount && (
          <Typography
            variant="body2"
            css={css`
              color: ${hasMatches ? "inherit" : "#d32f2f"};
              font-size: 0.8rem;
              min-width: 70px;
              text-align: right;
            `}
          >
            {hasMatches
              ? `${currentMatchIndex + 1} of ${matches.length}`
              : "No matches"}
          </Typography>
        )}
        <input
          ref={searchInputRef}
          type="text"
          value={searchText}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          css={css`
            width: 140px;
            padding: 4px 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 0.875rem;
            outline: none;
            &:focus {
              border-color: #1976d2;
            }
          `}
          data-testid="searchable-code-viewer-input"
        />
        <IconButton
          onClick={goToPreviousMatch}
          disabled={!hasMatches}
          size="small"
          title="Previous match (Shift+Enter)"
          css={css`
            padding: 4px;
          `}
        >
          <KeyboardArrowUpIcon fontSize="small" />
        </IconButton>
        <IconButton
          onClick={goToNextMatch}
          disabled={!hasMatches}
          size="small"
          title="Next match (Enter)"
          css={css`
            padding: 4px;
          `}
        >
          <KeyboardArrowDownIcon fontSize="small" />
        </IconButton>
        {searchText && (
          <IconButton
            onClick={handleClear}
            size="small"
            title="Clear search (Escape)"
            css={css`
              padding: 4px;
            `}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton
          onClick={() => navigator.clipboard.writeText(content)}
          size="small"
          title="Copy to clipboard"
          css={css`
            padding: 4px;
            margin-left: 15px;
          `}
        >
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content area with syntax highlighting */}
      <div
        ref={contentRef}
        css={css`
          flex: 1;
          overflow: auto;

          /* Make the SyntaxHighlighter fill the container */
          & > pre {
            margin: 0 !important;
            min-height: 100%;
            font-family: "Consolas", "Monaco", "Courier New", monospace !important;
            font-size: 0.85rem !important;
            line-height: 1.5 !important;
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
          }
        `}
      >
        <SyntaxHighlighter
          language={language}
          style={syntaxStyle}
          wrapLines={true}
          wrapLongLines={true}
        >
          {content}
        </SyntaxHighlighter>
      </div>

      {!supportsHighlightAPI && (
        <Typography
          variant="caption"
          color="warning.main"
          css={css`
            padding: 4px;
          `}
        >
          Note: Your browser doesn't support the CSS Custom Highlight API.
          Search highlighting may not work.
        </Typography>
      )}
    </div>
  );
};
