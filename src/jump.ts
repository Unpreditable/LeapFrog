import { MarkdownView } from "obsidian";
import { Edge, edgePosition } from "./edge";

/**
 * Moves a note to one of its ends. In the editor the cursor goes there too, so the next keystroke
 * lands where the note is now showing; reading view has no cursor and only scrolls.
 */
export function jump(view: MarkdownView, edge: Edge): void {
  if (view.getMode() === "source") {
    const editor = view.editor;
    const last = editor.lastLine();
    const at = edgePosition(edge, last, editor.getLine(last).length);
    editor.setCursor(at);
    editor.scrollIntoView({ from: at, to: at }, false);
    editor.focus();
    return;
  }
  // Not `applyScroll`: it counts in rendered blocks, so lines without a blank one between them all
  // read as the first, and a note that is one long paragraph never moves.
  const scroller = view.previewMode.containerEl.querySelector<HTMLElement>(".markdown-preview-view");
  scroller?.scrollTo({ top: edge === "top" ? 0 : scroller.scrollHeight });
}
