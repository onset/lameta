import React from "react";
import { Tab } from "react-tabs";

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
        <span className="plugin-tab-label">{label}</span>
      </Tab>
    );
  }
);

// Let react-tabs know this component represents a Tab.
(PluginTab as any).tabsRole = "Tab";

export default PluginTab;
