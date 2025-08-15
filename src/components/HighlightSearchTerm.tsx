import React, { useContext } from "react";
import { css } from "@emotion/react";
import { SearchContext } from "./SearchContext";
import { highlightMatches } from "./highlighting";
import { searchHighlight } from "../containers/theme";

// Renders text with inline <mark> elements for occurrences of the current SearchContext.searchTerm.
// Uses a consistent highlight color (#ffba8a) to match existing highlights.
export const HighlightSearchTerm: React.FC<{ text: string }> = ({ text }) => {
  const { searchTerm } = useContext(SearchContext);
  if (!searchTerm) return <>{text}</>;
  return (
    <>{highlightMatches(text, searchTerm, { background: searchHighlight })}</>
  );
};

export default HighlightSearchTerm;
