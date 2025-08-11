import React from "react";

export interface ISearchContext {
  // The raw search term exactly as entered by the user (for echoing back in the UI, input boxes, etc.).
  rawSearchTerm: string;
  // Normalized (trimmed + lowercased) search string for matching/highlighting.
  searchTerm: string;
}

export const normalizeSearchTerm = (q: string | undefined | null): string =>
  (q || "").trim().toLowerCase();

export const SearchContext = React.createContext<ISearchContext>({
  rawSearchTerm: "",
  searchTerm: ""
});
