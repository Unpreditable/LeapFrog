import { MarkdownView } from "obsidian";
import { Edge, edgePosition, scrollForEnd } from "./edge";
import { isAlreadyAt, moveScroller } from "./scroll";
import { ScrollStyle } from "./settings";

/**
 * Moves a note to one of its ends. In the editor the cursor goes there at once, so the next keystroke
 * lands where the note is heading; reading view has no cursor and only scrolls. The top shows
 * everything above the first line, such as the title; the bottom leaves room below the last.
 */
export function jump(view: MarkdownView, edge: Edge, style: ScrollStyle): void {
  if (view.getMode() === "source") {
    const editor = view.editor;
    const last = editor.lastLine();
    editor.setCursor(edgePosition(edge, last, editor.getLine(last).length));
    editor.focus();
  }
  const move = scrollerFor(view, edge);
  if (move) moveScroller(move.scroller, move.target, style, edge);
}

/** What scrolls in the view's current mode. */
export function noteScroller(view: MarkdownView): HTMLElement | null {
  return view.contentEl.querySelector<HTMLElement>(view.getMode() === "source" ? ".markdown-source-view .cm-scroller" : ".markdown-preview-view");
}

/** Takes note of where the view is now: its scroll and its cursor. The result goes back there, heading `towards`. */
export function placeIn(view: MarkdownView, style: () => ScrollStyle, towards: Edge): () => void {
  const scroller = noteScroller(view);
  const top = scroller?.scrollTop ?? 0;
  const cursor = view.getMode() === "source" ? view.editor.getCursor() : null;
  return () => {
    if (cursor) {
      view.editor.setCursor(cursor);
      view.editor.focus();
    }
    if (scroller) moveScroller(scroller, () => top, style(), towards);
  };
}

/** Whether a click on a button has anything to do: not when the note is already there, or on its way. */
export function canJump(view: MarkdownView, edge: Edge): boolean {
  const move = scrollerFor(view, edge);
  return move !== null && !isAlreadyAt(move.scroller, move.target, edge);
}

/**
 * What scrolls in the view's current mode, and where it should end up.
 * Not the editor's `scrollIntoView`: it stops once the first line shows, leaving the title hidden.
 * Not reading view's `applyScroll`: it counts in rendered blocks, so lines without a blank one
 * between them all read as the first, and a note that is one long paragraph never moves.
 */
function scrollerFor(view: MarkdownView, edge: Edge): { scroller: HTMLElement; target: () => number } | null {
  const source = view.getMode() === "source";
  const scroller = noteScroller(view);
  if (!scroller) return null;
  // In the editor the last line, not the content: that stretches to fill the pane, so a short note
  // would move. While the end is not drawn yet, the last child is the gap standing in for it.
  const end = source ? ".cm-content > :last-child" : ".markdown-preview-sizer";
  return { scroller, target: edge === "top" ? () => 0 : () => targetForEnd(scroller, end) };
}

function targetForEnd(scroller: HTMLElement, contentSelector: string): number {
  const content = scroller.querySelector<HTMLElement>(contentSelector);
  if (!content) return scroller.scrollTop;
  // Reading view keeps blank padding of its own below the last line, which is not part of the note.
  const padding = parseFloat(scroller.win.getComputedStyle(content).paddingBottom) || 0;
  const end = content.getBoundingClientRect().bottom - padding - scroller.getBoundingClientRect().top + scroller.scrollTop;
  return scrollForEnd(end, scroller.clientHeight);
}
