import React from "react";

export interface ISearchContext {
  // Primary normalized (trimmed + lowercased) search string for matching/highlighting.
  searchTerm: string;
}

export const normalizeQuery = (q: string | undefined | null): string =>
  (q || "").trim().toLowerCase();

export const SearchContext = React.createContext<ISearchContext>({
  searchTerm: ""
});
