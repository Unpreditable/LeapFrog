export interface PillOption<T extends string> {
  value: T;
  /** The pill's text; for a pill that `draw` makes a picture, its tooltip and screen-reader name. */
  name: string;
  /** Draws the pill's face instead of its name, for pills that are pictures. */
  draw?: (el: HTMLElement) => void;
}

/**
 * A row of option pills: every value in view, the chosen one highlighted, one click to change.
 * Used for every choice of two to four values, in place of a dropdown.
 */
export function renderPills<T extends string>(
  parent: HTMLElement,
  options: PillOption<T>[],
  value: T,
  onChange: (value: T) => void,
): HTMLElement {
  const group = parent.createDiv({ cls: "leapfrog-pills", attr: { role: "radiogroup" } });
  for (const option of options) {
    const pill = group.createEl("button", {
      cls: "leapfrog-pill",
      attr: { role: "radio", "aria-checked": String(option.value === value), "data-value": option.value },
    });
    // A picture needs its name as a label, which Obsidian also shows on hover; words are their own
    // label, and a tooltip repeating them would say nothing.
    if (option.draw) {
      option.draw(pill);
      pill.setAttribute("aria-label", option.name);
    } else {
      pill.setText(option.name);
    }
    pill.toggleClass("is-active", option.value === value);
    pill.addEventListener("click", () => {
      if (option.value !== value) onChange(option.value);
    });
  }
  return group;
}
