import * as React from "react";
import "./NotificationBar.css";

export interface IState {
  open: boolean;
}
// tslint:disable-next-line:no-empty-interface
export interface IProps {}

export default class NotificationBar extends React.Component<IProps, IState> {
  public constructor(props: IProps) {
    super(props);
    this.state = { open: true };
  }

  public toggle() {
    this.setState({ open: !this.state.open });
  }
  public render() {
    return (
      <div className={"sidebar " + (this.state.open ? "open" : "closed")}>
        inside the sidebar
      </div>
    );
  }
}
