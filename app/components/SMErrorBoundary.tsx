import React, { Component } from "react";
import * as Sentry from "@sentry/electron";

interface IProps {
  context?: string;
}

interface IState {
  error: any;
  hasError: boolean;
  showError: boolean;
}

class SMErrorBoundary extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { error: null, hasError: false, showError: false };
  }

  public componentDidCatch(e) {
    this.setState({ hasError: true, error: e.message });
    if (!process.env.HOT) {
      //see comment in index.tsx
      const sentryId = Sentry.captureException(e);
      console.log("sentry id = " + sentryId);
    }
  }

  public render() {
    return this.state.hasError ? (
      <div>
        <h1>There was an error 😞</h1>
        <p>{this.props.context}</p>
        <pre>
          <code>{this.state.error}</code>
        </pre>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default SMErrorBoundary;
