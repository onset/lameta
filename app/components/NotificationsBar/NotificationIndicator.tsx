import * as React from "react";
import "./NotificationBar.scss";

// tslint:disable-next-line:no-empty-interface
export interface IState {}
// tslint:disable-next-line:no-empty-interface
export interface IProps {
  onClick: () => void;
}

export default class NotificationIndicator extends React.Component<
  IProps,
  IState
> {
  public constructor(props: IProps) {
    super(props);
    this.state = { open: true };
  }

  public render() {
    return (
      <button
        className="notificationsIndicator"
        onClick={() => this.props.onClick()}
      >
        0 Notifications
      </button>
    );
  }
}
