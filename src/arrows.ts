import { setIcon } from "obsidian";
import { Edge } from "./edge";
import { ArrowStyle } from "./settings";

/** Obsidian's built-in icons. It has only an upward triangle, so ↓ draws that one turned over. */
const ICONS: Record<ArrowStyle, Record<Edge, string>> = {
  arrow: { top: "arrow-up", bottom: "arrow-down" },
  thick: { top: "arrow-big-up", bottom: "arrow-big-down" },
  chevron: { top: "chevron-up", bottom: "chevron-down" },
  triangle: { top: "triangle", bottom: "triangle" },
};

/** The way back: one icon for every Arrow style, as only this one has the shape. Turned to point where it goes. */
export function drawBack(el: HTMLElement, towards: Edge): void {
  setIcon(el, "undo-2");
  el.querySelector("svg")?.addClass(towards === "top" ? "leapfrog-back-up" : "leapfrog-back-down");
}

/** Draws one arrow into `el`, in the chosen style: on the buttons, and wherever the settings picture them. */
export function drawArrow(el: HTMLElement, style: ArrowStyle, edge: Edge): void {
  setIcon(el, ICONS[style][edge]);
  if (style === "triangle" && edge === "bottom") el.querySelector("svg")?.addClass("leapfrog-arrow-flipped");
}
