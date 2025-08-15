import React, { useContext } from "react";

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

// Returns true when the given value contains the normalized search term.
// - Accepts either a plain string search term or an ISearchContext to ease use in class components.
// - For function components, prefer the hook `useHasSearchHighlight` below.
export const hasSearchMatch = (
  value: unknown,
  search: string | ISearchContext
): boolean => {
  const searchTerm =
    typeof search === "string"
      ? normalizeSearchTerm(search)
      : search.searchTerm;
  return (
    typeof value === "string" &&
    !!searchTerm &&
    value.toLowerCase().includes(searchTerm)
  );
};

// React hook variant that reads the current search term from context.
export const useHasSearchMatch = (value: unknown): boolean => {
  const { searchTerm } = useContext(SearchContext);
  return hasSearchMatch(value, searchTerm);
};
