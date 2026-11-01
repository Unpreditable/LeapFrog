import { Platform } from "obsidian";
import { drawArrow, drawBack } from "./arrows";
import { Edge } from "./edge";
import { t } from "./i18n/i18n";
import { coveredBelow, GAP, INSET, Layout, layout, overlaps, previewHeight, Rect, resolveSide } from "./layout";
import { Buttons, LeapFrogSettings } from "./settings";

export interface ButtonHostOptions {
  /** Whether the status bar can cover the host. Off for the settings, which it never covers. */
  measureStatusBar?: boolean;
  /** Off for the Look previews: both buttons in a row or a column, with no placement. */
  placed?: boolean;
  /** What an unplaced preview shows, whatever the settings place: both arrows, or one alone. */
  look?: Buttons;
  /** Whether Obsidian's text runs right to left, which Side Auto follows. */
  rightToLeft?: () => boolean;
}

/**
 * The jump buttons of one host: a note, the swatch or the sample note. Every one is drawn here, so
 * the preview in the settings cannot look different from a note.
 */
export class ButtonHost {
  private readonly el: HTMLElement;
  private readonly observer: ResizeObserver | null = null;
  private readonly placed: boolean;
  private readonly measureStatusBar: boolean;
  private readonly look: Buttons;
  private readonly rightToLeft: () => boolean;
  /** What the buttons were last drawn from; the same again draws nothing. */
  private drawn = "";
  /** The button that goes back rather than to its end, if any. */
  private back: Edge | null = null;
  /** Whether the buttons as drawn hide what is behind them. Kept, as it is asked on every keystroke. */
  private hidesText = false;

  constructor(
    private readonly hostEl: HTMLElement,
    private readonly settings: () => LeapFrogSettings,
    private readonly onJump: (edge: Edge) => void,
    opts: ButtonHostOptions = {},
  ) {
    this.placed = opts.placed ?? true;
    this.measureStatusBar = opts.measureStatusBar ?? true;
    this.look = opts.look ?? "row";
    this.rightToLeft = opts.rightToLeft ?? (() => false);
    this.el = hostEl.createDiv({ cls: "leapfrog-buttons" });
    if (this.placed) hostEl.addClass("leapfrog-has-buttons");
    // The host's size moves the buttons — a pane resized or split, a preview tile laid out — and so
    // does the status bar's, a theme or font making it taller. The host's own window's observer: a
    // note in a popout is laid out by the popout.
    const Observer = (this.hostEl.win as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver;
    this.observer = new Observer(() => this.redraw());
    this.observer.observe(hostEl);
    const bar = this.placed && this.measureStatusBar ? this.statusBar() : null;
    if (bar) this.observer.observe(bar);
    this.redraw();
  }

  redraw(): void {
    const s = this.settings();
    const side = resolveSide(s.side, this.rightToLeft());
    const drawing = this.placed ? this.measure(s, side) : this.unplaced(s);
    const visibility = this.visibility(s);
    // The status bar changes width as its counts change. Rebuilding the buttons for that would make
    // a revealed arrow flicker under the pointer, so only a real change draws again.
    const key = JSON.stringify([drawing, s, side, visibility]);
    if (key === this.drawn) return;
    this.drawn = key;
    const { width, height, buttons } = drawing;
    // Outline and None leave the text readable, and On hover shows nothing until pointed at.
    this.hidesText = (s.style === "background" || s.style === "both") && visibility !== "hover";
    this.el.empty();
    this.el.className = "leapfrog-buttons";
    this.el.addClasses([
      `is-${side}`,
      `leapfrog-style-${s.style}`,
      `leapfrog-visibility-${visibility}`,
    ]);
    this.el.toggleClass("is-inline", !this.placed);
    this.el.toggleClass("is-stacked", !this.placed && this.look === "stacked");
    for (const placed of buttons) {
      const button = this.el.createEl("button", {
        cls: "leapfrog-button",
        attr: { "data-edge": placed.edge },
      });
      this.drawFace(button, placed.edge, s);
      button.setCssProps({
        "--leapfrog-top": `${placed.top}px`,
        "--leapfrog-offset": `${placed.offset}px`,
        "--leapfrog-width": `${width}px`,
        "--leapfrog-height": `${height}px`,
        "--leapfrog-roundness": `${s.roundness}`,
      });
      button.addEventListener("click", () => this.onJump(placed.edge));
      const revealed = s.hoverShows === "both" ? this.el : button;
      button.addEventListener("pointerenter", () => revealed.addClass("is-revealed"));
      button.addEventListener("pointerleave", () => revealed.removeClass("is-revealed"));
    }
  }

  /** Turns a button into the way back, or all of them back to their arrows. In place: one may be under the pointer. */
  setBack(edge: Edge | null): void {
    this.back = edge;
    const s = this.settings();
    for (const button of Array.from(this.el.children as HTMLCollectionOf<HTMLElement>)) {
      button.empty();
      this.drawFace(button, button.getAttribute("data-edge") as Edge, s);
    }
  }

  private drawFace(button: HTMLElement, edge: Edge, s: LeapFrogSettings): void {
    if (this.back === edge) {
      drawBack(button, edge === "top" ? "bottom" : "top");
      button.setAttribute("aria-label", t("button.back"));
    } else {
      drawArrow(button, s.arrow, edge);
      button.setAttribute("aria-label", t(`button.${edge}`));
    }
  }

  canHideText(): boolean {
    return this.hidesText;
  }

  /** The buttons covering a rectangle on screen. Reads the layout, so call it while the editor measures. */
  buttonsOver(rect: Rect): HTMLElement[] {
    return Array.from(this.el.children as HTMLCollectionOf<HTMLElement>).filter((button) => overlaps(button.getBoundingClientRect(), rect));
  }

  /** Fades exactly these buttons. Hovering one shows it in full again. */
  setFaded(faded: HTMLElement[]): void {
    for (const button of Array.from(this.el.children)) button.toggleClass("is-over-caret", faded.includes(button as HTMLElement));
  }

  destroy(): void {
    this.observer?.disconnect();
    this.el.remove();
    this.hostEl.removeClass("leapfrog-has-buttons");
  }

  private measure(s: LeapFrogSettings, side: "left" | "right"): Layout {
    const host = this.hostEl.getBoundingClientRect();
    const bar = this.measureStatusBar ? this.statusBar()?.getBoundingClientRect() ?? null : null;
    const strip = INSET + 2 * s.width + GAP;
    return layout({
      // Inside any border: the buttons are placed against the padding box, as absolute children are.
      width: this.hostEl.clientWidth,
      height: this.hostEl.clientHeight,
      cover: coveredBelow(host, bar, side, strip),
      buttonWidth: s.width,
      heightPct: s.height,
      buttons: s.buttons,
      upStop: s.upStop,
      downStop: s.downStop,
      sharedStop: s.sharedStop,
    });
  }

  /** The Look previews: the arrows `look` names, Height as a share of the tile. */
  private unplaced(s: LeapFrogSettings): Layout {
    const edges: Edge[] = this.look === "up" ? ["top"] : this.look === "down" ? ["bottom"] : ["top", "bottom"];
    const height = previewHeight({
      buttonWidth: s.width,
      heightPct: s.height,
      buttons: this.look,
      tileRoom: tileRoom(this.hostEl),
    });
    return { width: s.width, height, buttons: edges.map((edge) => ({ edge, top: 0, offset: 0 })) };
  }

  /** A touch screen has no hover, so a button that waits for one would be found only by a jump. */
  private visibility(s: LeapFrogSettings): LeapFrogSettings["visibility"] {
    return isTouch(this.hostEl) ? "always" : s.visibility;
  }

  private statusBar(): HTMLElement | null {
    return this.hostEl.doc.querySelector<HTMLElement>(".status-bar");
  }
}

/** The height a preview tile leaves its buttons: inside its padding. */
/** Whether the screen `el` is on has no hover, so Shape and On hover draw as Arrow + Shape there. */
export function isTouch(el: HTMLElement): boolean {
  return Platform.isMobile || el.win.matchMedia("(pointer: coarse)").matches;
}

export function tileRoom(el: HTMLElement): number {
  const style = el.win.getComputedStyle(el);
  return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
}
