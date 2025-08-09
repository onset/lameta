import React from "react";

export interface ISearchContext {
  query: string;
}

export const SearchContext = React.createContext<ISearchContext>({ query: "" });
