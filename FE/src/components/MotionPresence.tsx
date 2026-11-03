import { Component, createRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  present: boolean;
  portal?: boolean;
  children: ReactNode;
}
interface State {
  rendered: boolean;
  content: ReactNode;
}

/** Keeps only the outgoing visual layer briefly. It is inert immediately on close. */
export default class MotionPresence extends Component<Props, State> {
  state: State = { rendered: this.props.present, content: this.props.present ? this.props.children : null };
  private layer = createRef<HTMLDivElement>();
  private exitTimer: ReturnType<typeof setTimeout> | undefined;

  static getDerivedStateFromProps(props: Props): Partial<State> | null {
    return props.present ? { rendered: true, content: props.children } : null;
  }

  componentDidUpdate(previous: Props) {
    if (previous.present === this.props.present) return;
    clearTimeout(this.exitTimer);
    if (!this.props.present) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = Number.parseFloat(this.layer.current
        ? getComputedStyle(this.layer.current).getPropertyValue("--motion-exit")
        : "160");
      this.exitTimer = setTimeout(() => {
        if (!this.props.present) this.setState({ rendered: false, content: null });
      }, reduced ? 0 : (Number.isFinite(duration) ? duration : 160));
    }
  }

  componentWillUnmount() { clearTimeout(this.exitTimer); }

  render() {
    if (!this.state.rendered) return null;
    const exiting = !this.props.present;
    const content = (
      <div ref={this.layer} className="foodie-motion-presence" data-phase={exiting ? "exit" : "enter"}
        inert={exiting} aria-hidden={exiting ? true : undefined}>
        {this.state.content}
      </div>
    );
    return this.props.portal ? createPortal(content, document.body) : content;
  }
}
