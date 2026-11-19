import { Component, createRef, type RefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  present: boolean;
  portal?: boolean;
  dialogLabel?: string;
  returnFocusTo?: RefObject<HTMLElement | null>;
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

  private opener: HTMLElement | null = null;
  private previousOverflow = "";
  private managingDialog = false;

  getSnapshotBeforeUpdate(previous: Props) {
    if (!previous.present && this.props.present && this.props.dialogLabel) {
      this.opener = this.props.returnFocusTo?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    }
    return null;
  }

  private controls() {
    return Array.from(this.layer.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]'
    ) ?? []).filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
  }

  private handleKeys = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.layer.current?.querySelector<HTMLButtonElement>("button[data-dialog-close]:not(:disabled)")?.click();
    } else if (event.key === "Tab") {
      const controls = this.controls();
      const first = controls[0];
      const last = controls.at(-1);
      const inside = this.layer.current?.contains(document.activeElement);
      if (!first || !inside || (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    }
  };

  private enterDialog() {
    if (!this.props.dialogLabel || this.managingDialog) return;
    this.managingDialog = true;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", this.handleKeys);
    if (!this.layer.current?.contains(document.activeElement)) {
      const target = this.controls()[0] ?? this.layer.current?.querySelector<HTMLElement>('[tabindex="-1"]');
      target?.focus();
    }
  }

  private leaveDialog() {
    if (!this.managingDialog) return;
    this.managingDialog = false;
    document.removeEventListener("keydown", this.handleKeys);
    document.body.style.overflow = this.previousOverflow;
    if (this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    this.opener = null;
  }

  componentDidMount() {
    if (this.props.present) this.enterDialog();
  }

  static getDerivedStateFromProps(props: Props): Partial<State> | null {
    return props.present ? { rendered: true, content: props.children } : null;
  }

  componentDidUpdate(previous: Props) {
    if (previous.present === this.props.present) return;
    clearTimeout(this.exitTimer);
    if (this.props.present) this.enterDialog();
    else {
      this.leaveDialog();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const duration = Number.parseFloat(this.layer.current
        ? getComputedStyle(this.layer.current).getPropertyValue("--motion-exit")
        : "160");
      this.exitTimer = setTimeout(() => {
        if (!this.props.present) this.setState({ rendered: false, content: null });
      }, reduced ? 0 : (Number.isFinite(duration) ? duration : 160));
    }
  }

  componentWillUnmount() { clearTimeout(this.exitTimer); this.leaveDialog(); }

  render() {
    if (!this.state.rendered) return null;
    const exiting = !this.props.present;
    const content = (
      <div ref={this.layer} className="foodie-motion-presence" data-phase={exiting ? "exit" : "enter"}
        tabIndex={this.props.dialogLabel ? -1 : undefined}
        role={this.props.dialogLabel ? "dialog" : undefined} aria-modal={this.props.dialogLabel ? true : undefined}
        aria-label={this.props.dialogLabel}
        inert={exiting} aria-hidden={exiting ? true : undefined}>
        {this.state.content}
      </div>
    );
    return this.props.portal ? createPortal(content, document.body) : content;
  }
}
