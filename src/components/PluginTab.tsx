import React from "react";
import { Tab } from "react-tabs";
import { css } from "@emotion/react";
import pluginIcon from "@assets/plugin.svg";

// A tab-strip entry contributed by a plugin. Thin wrapper over react-tabs' Tab so we can add
// a stable data-testid and (later) plugin-specific styling. Like HighlightableTab, we set
// tabsRole so react-tabs treats this wrapper as a Tab and forwards the props it injects
// (selected state, id, etc.) down to the real Tab.
export interface PluginTabProps {
  label: string;
  testId?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export const PluginTab = React.forwardRef<HTMLLIElement, PluginTabProps>(
  ({ label, testId, className, children, ...rest }, ref) => {
    const baseClass = ["react-tabs__tab", className].filter(Boolean).join(" ");
    return (
      <Tab
        ref={ref as any}
        {...rest}
        className={baseClass}
        data-testid={testId || "plugin-tab"}
      >
        <img
          src={pluginIcon}
          alt=""
          css={css`
            /* 1em so the icon fits inside the text's line box; anything taller grows the
               whole tab strip. */
            width: 1em;
            height: 1em;
            margin-right: 4px;
            vertical-align: -0.15em;
            opacity: 0.5;
          `}
        />
        <span className="plugin-tab-label">{label}</span>
      </Tab>
    );
  }
);

// Let react-tabs know this component represents a Tab.
(PluginTab as any).tabsRole = "Tab";

export default PluginTab;
