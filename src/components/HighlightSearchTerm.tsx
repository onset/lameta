import React, { useContext } from "react";
import { css } from "@emotion/react";
import { SearchContext } from "./SearchContext";
import { highlightReact } from "./highlighting";

// Renders text with inline <mark> elements for occurrences of the current SearchContext.searchTerm.
// Uses a consistent highlight color (#ffba8a) to match existing highlights.
export const HighlightSearchTerm: React.FC<{ text: string }> = ({ text }) => {
  const { searchTerm } = useContext(SearchContext);
  if (!searchTerm) return <>{text}</>;
  return <>{highlightReact(text, searchTerm, { background: "#ffba8a" })}</>;
};

export default HighlightSearchTerm;
