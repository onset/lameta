import {
  ErrorBoundary as ErrorBoundary_,
  FallbackProps
} from "react-error-boundary";
import React, { ReactNode } from "react";
import { sentryException } from "../other/errorHandling";

interface IProps {
  children: ReactNode;
  context?: string;
  // When any value in this array changes, a boundary that is currently showing
  // its fallback resets and re-renders its children. Pass something that
  // identifies the current subject (e.g. the selected file's path) so that a
  // render error caused by one item cannot wedge the pane for every other item
  // until the app is restarted.
  resetKeys?: unknown[];
}

interface IState {
  error: any;
  hasError: boolean;
  showError: boolean;
}

const Notice = (props: FallbackProps) => {
  return (
    <div>
      <h1>There was an error 😞</h1>
      <p>
        We apologize for the inconvenience. We'd like to help you and improve
        Lameta. You can either seek help through your archiving institution, or
        tell us directly via "Help:Report a problem". We'll need a screenshot of
        showing what happened, maybe a copy of the files that make this happen.
      </p>
      <pre>
        <code>{props.error.message}</code>
      </pre>
    </div>
  );
};
const handleError = (error: Error, info: any) => {
  sentryException(error);
};
// react functional component
export const ErrorBoundary = (props: IProps) => {
  return (
    // todo: there is props.context that we are not using yet
    <ErrorBoundary_
      FallbackComponent={Notice}
      onError={handleError}
      resetKeys={props.resetKeys}
    >
      {props.children}
    </ErrorBoundary_>
  );
};
