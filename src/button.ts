import { MarkdownView, setIcon } from "obsidian";
import { t } from "./i18n/i18n";
import { Edge } from "./edge";
import { jump } from "./jump";

const CLS = "leapfrog-buttons";

const ICONS: Record<Edge, string> = { top: "arrow-up", bottom: "arrow-down" };

/** Gives a note its floating buttons, once: a view that already has them is left alone. */
export function addButtons(view: MarkdownView): void {
  if (view.contentEl.querySelector(`:scope > .${CLS}`)) return;
  const bar = view.contentEl.createDiv({ cls: CLS });
  for (const edge of ["top", "bottom"] as const) {
    const label = t(`button.${edge}`);
    const button = bar.createEl("button", { cls: "clickable-icon leapfrog-button", attr: { "aria-label": label } });
    setIcon(button, ICONS[edge]);
    button.addEventListener("click", () => jump(view, edge));
  }
}

/** Takes the buttons back out of every note they were added to. */
export function removeButtons(doc: Document): void {
  doc.querySelectorAll(`.${CLS}`).forEach((el) => el.remove());
}
