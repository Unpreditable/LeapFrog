import { Edge } from "./edge";

export interface JumpBackClick {
  /** What the user scrolls; touching it means they have moved on. */
  watched: HTMLElement;
  enabled: boolean;
  /** Whether a jump has anywhere to go. */
  canGo: () => boolean;
  go: () => void;
  /** Takes note of where things are now, and returns what brings them back. */
  place: () => () => void;
  /** Whether going back still means anything: not on another note, or in another view of it. */
  stillHere: () => boolean;
}

interface Pending {
  edge: Edge;
  restore: () => void;
  stillHere: () => boolean;
  unwatch: () => void;
}

/**
 * The second click on a button takes the note back to where the first one left. It only listens for
 * the user moving on while there is somewhere to go back to, so at other times it costs nothing.
 */
export class JumpBack {
  private pending: Pending | null = null;

  constructor(private readonly show: (edge: Edge | null) => void) {}

  click(edge: Edge, on: JumpBackClick): void {
    this.check();
    if (this.pending?.edge === edge) {
      const { restore } = this.pending;
      this.clear();
      restore();
      return;
    }
    if (!on.canGo()) return;
    const restore = on.enabled ? on.place() : null;
    this.clear();
    on.go();
    if (!restore) return;
    this.pending = { edge, restore, stillHere: on.stillHere, unwatch: this.watch(on.watched) };
    this.show(edge);
  }

  /** Forgets the way back if it no longer means anything. */
  check(): void {
    if (this.pending && !this.pending.stillHere()) this.clear();
  }

  clear(): void {
    if (!this.pending) return;
    this.pending.unwatch();
    this.pending = null;
    this.show(null);
  }

  /** Scrolling by hand, clicking into the note or pressing a key all mean the user has moved on. */
  private watch(scroller: HTMLElement): () => void {
    const moved = (): void => this.clear();
    const doc = scroller.doc;
    scroller.addEventListener("wheel", moved, { passive: true });
    scroller.addEventListener("pointerdown", moved);
    scroller.addEventListener("touchstart", moved, { passive: true });
    doc.addEventListener("keydown", moved, true);
    return () => {
      scroller.removeEventListener("wheel", moved);
      scroller.removeEventListener("pointerdown", moved);
      scroller.removeEventListener("touchstart", moved);
      doc.removeEventListener("keydown", moved, true);
    };
  }
}
