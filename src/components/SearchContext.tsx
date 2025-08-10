import React from "react";

export interface ISearchContext {
  // A normalized (trimmed + lowercased) query string for matching/highlighting.
  query: string;
}

export const normalizeQuery = (q: string | undefined | null): string =>
  (q || "").trim().toLowerCase();

export const SearchContext = React.createContext<ISearchContext>({ query: "" });
