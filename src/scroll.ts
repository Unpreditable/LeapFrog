import { Edge, isAtTarget, scrollPosition } from "./edge";
import { ScrollStyle } from "./settings";

const DURATION: Record<ScrollStyle, number> = { instant: 0, quick: 150, smooth: 500 };

/** Frames to keep correcting after arriving: a long note only knows its true height once its end is drawn. */
const SETTLE_FRAMES = 3;

/** The scroll in progress on each scroller: where it is heading, and what stops it so a new jump can take over. */
const running = new WeakMap<HTMLElement, { edge: Edge; stop: () => void }>();

/** Whether a jump to `edge` would do nothing: the scroller is there already, or on its way. */
export function isAlreadyAt(scroller: HTMLElement, target: () => number, edge: Edge): boolean {
  if (running.get(scroller)?.edge === edge) return true;
  return isAtTarget(scroller.scrollTop, target(), scroller.scrollHeight - scroller.clientHeight);
}

/**
 * Moves a scroller to `target`, read again on every frame because a long note's height shifts as it
 * is drawn. The user's own wheel, touch or key stops it. Someone who asked their system to reduce
 * motion gets no animation.
 */
export function moveScroller(scroller: HTMLElement, target: () => number, style: ScrollStyle, edge: Edge): void {
  running.get(scroller)?.stop();
  const win = scroller.win;
  const doc = scroller.doc;
  const ms = win.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DURATION[style];
  const from = scroller.scrollTop;
  const started = win.performance.now();
  let settling = SETTLE_FRAMES;
  let frame = 0;

  const stop = (): void => {
    win.cancelAnimationFrame(frame);
    scroller.removeEventListener("wheel", stop);
    scroller.removeEventListener("pointerdown", stop);
    scroller.removeEventListener("touchstart", stop);
    doc.removeEventListener("keydown", stop, true);
    running.delete(scroller);
  };
  const step = (now: number): void => {
    const elapsed = now - started;
    if (elapsed < ms) {
      scroller.scrollTop = scrollPosition(from, target(), elapsed, ms);
      frame = win.requestAnimationFrame(step);
      return;
    }
    scroller.scrollTop = target();
    if (settling-- > 0) frame = win.requestAnimationFrame(step);
    else stop();
  };

  scroller.addEventListener("wheel", stop, { passive: true });
  scroller.addEventListener("pointerdown", stop);
  scroller.addEventListener("touchstart", stop, { passive: true });
  doc.addEventListener("keydown", stop, true);
  running.set(scroller, { edge, stop });
  if (ms === 0) scroller.scrollTop = target();
  frame = win.requestAnimationFrame(step);
}
