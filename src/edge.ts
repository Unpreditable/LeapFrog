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
