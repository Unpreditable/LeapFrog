/** Which end of the note a jump goes to. */
export type Edge = "top" | "bottom";

/** A line and column in the editor, the shape Obsidian's `EditorPosition` has. */
export interface Position {
  line: number;
  ch: number;
}

/**
 * Pure: where the cursor lands for a jump. The top is the start of the first line, the bottom the
 * end of the last, so typing after a jump to the bottom adds to the note rather than splitting its
 * last line.
 */
export function edgePosition(edge: Edge, lastLine: number, lastLineLength: number): Position {
  return edge === "top" ? { line: 0, ch: 0 } : { line: lastLine, ch: lastLineLength };
}

/** Pure: how far to scroll so a third of the view stays blank below the note's end, at `end` px down. */
export function scrollForEnd(end: number, viewHeight: number): number {
  return Math.max(0, end - (viewHeight * 2) / 3);
}

/** Pure: slow to start, fast in the middle, slow to stop. `t` runs from 0 to 1. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Pure: where a scroll from `from` to `to` is after `elapsed` of its `duration`. */
export function scrollPosition(from: number, to: number, elapsed: number, duration: number): number {
  if (elapsed >= duration) return to;
  return from + (to - from) * easeInOut(elapsed / duration);
}

/** Pure: whether a scroller is already as near its target as it can get, give or take a rounded pixel. */
export function isAtTarget(scrollTop: number, target: number, maxScroll: number): boolean {
  return Math.abs(scrollTop - Math.min(target, maxScroll)) <= 1;
}
