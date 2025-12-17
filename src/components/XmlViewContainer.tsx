import * as React from "react";
import { css } from "@emotion/react";

/**
 * Shared container component for XML/code view panels.
 * Provides consistent layout styling.
 * Used by ImdiView, RoCrateView, LametaXmlView, etc.
 *
 * Note: For views that need search functionality, consider using
 * SearchableCodeViewer directly instead.
 */
export const XmlViewContainer: React.FunctionComponent<{
  /** Children to render inside the container */
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div
      css={css`
        height: 500px;
        width: 100%;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
        code,
        code * {
          font-family: sans-serif;
          white-space: pre-wrap;
        }
        pre {
          flex: 1;
        }
      `}
    >
      {children}
    </div>
  );
};
