import React, { Component } from "react";

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
