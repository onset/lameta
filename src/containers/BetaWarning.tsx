import { css } from "@emotion/react";
import "@fontsource/caveat/700.css";
import * as React from "react";

// Like the alpha startup dialog on master (AlphaWarning.tsx): a handwritten note with an arrow
// that points at the word "beta".
export const BetaWarning: React.FunctionComponent<{ version: string }> = (
  props
) => (
  <div>
    <div
      css={css`
        display: flex;
        align-items: center;
        column-gap: 2px;
        margin-top: 40px;
      `}
    >
      <h1
        css={css`
          margin: 0;
          font-size: 32px;
          line-height: 1.1;
          font-weight: 800;
          white-space: nowrap;
        `}
      >
        lameta {props.version.replace(/-beta$/, "")}{" "}
        <span
          css={css`
            color: #e69664;
          `}
        >
          beta
        </span>
      </h1>
      <div
        css={css`
          display: flex;
          align-items: center;
          color: #b84000;
          transform: translate(-12px, -18px);
        `}
      >
        <svg
          viewBox="0 0 64 44"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          css={css`
            width: 44px;
            height: 30px;
            flex: none;
            margin-top: 14px;
          `}
        >
          <path d="M60 6 C 42 2, 18 10, 6 32" />
          <path d="M4 20 L 6 33 L 17 27" />
        </svg>
        <span
          css={css`
            font: 700 22px/1 Caveat, "Segoe Print", "Bradley Hand", cursive;
            transform: rotate(-4deg);
            margin-bottom: 12px;
            white-space: nowrap;
          `}
        >
          Test version
        </span>
      </div>
    </div>
    <p>
      Thank you for helping to test this beta-test version. As always, make sure
      you have a backup of your work.
    </p>
  </div>
);
