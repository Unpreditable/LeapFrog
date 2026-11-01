import { drawArrow } from "../arrows";
import { t } from "../i18n/i18n";
import { Buttons, LeapFrogSettings, Stop, STOPS } from "../settings";

/** A handle on the Position slider: ↑ or ↓ when stacked or alone, the pair when side by side. */
export type Handle = "up" | "down" | "pair";

export interface PositionChange {
  handle: Handle;
  stop: Stop;
  /** False while a handle is still being dragged; the page redraws only once it lets go. */
  done: boolean;
}


/** The handles the Buttons choice shows. */
function handlesOf(s: LeapFrogSettings): Handle[] {
  if (s.buttons === "stacked") return ["up", "down"];
  if (s.buttons === "row") return ["pair"];
  return [s.buttons];
}

/**
 * The Position slider: a thin track with the five stops, and a handle for each arrow. A dragged
 * handle stops at the other's stop and never pushes it; two handles on one stop sit side by side,
 * touching, so either can still be grabbed.
 */
export function renderPositionSlider(
  parent: HTMLElement,
  s: LeapFrogSettings,
  onChange: (change: PositionChange) => void,
  focus: Handle | null,
): void {
  const slider = parent.createDiv({ cls: "leapfrog-position" });
  const track = slider.createDiv({ cls: "leapfrog-position-track" });
  STOPS.forEach((stop, i) => {
    track.createDiv({ cls: "leapfrog-position-mark", attr: { "data-stop": stop } }).setCssProps({ "--leapfrog-at": `${percent(i)}%` });
  });
  // Only the ends and the middle are named: names for the stops between would be hard to translate.
  const labels = slider.createDiv({ cls: "leapfrog-position-labels" });
  for (const stop of ["top", "middle", "bottom"] as const) labels.createSpan({ text: t(`settings.position.stops.${stop}`) });

  const handles = handlesOf(s);
  const at = (handle: Handle): number => STOPS.indexOf(s[keyOf(handle, s.buttons)]);
  // How far a handle may go: ↑ no further down than ↓, ↓ no further up than ↑.
  const limits = (handle: Handle): [number, number] => {
    if (handle === "up" && handles.length === 2) return [0, at("down")];
    if (handle === "down" && handles.length === 2) return [at("up"), STOPS.length - 1];
    return [0, STOPS.length - 1];
  };

  const els = new Map<Handle, HTMLElement>();
  const setTogether = (together: boolean): void => {
    els.get("up")?.toggleClass("is-before", together);
    els.get("down")?.toggleClass("is-after", together);
  };

  for (const handle of handles) {
    const el = track.createDiv({
      cls: "leapfrog-handle",
      attr: {
        tabindex: "0",
        role: "slider",
        "data-handle": handle,
        "aria-label": t(`settings.position.handle.${handle}`),
        "aria-valuemin": "1",
        "aria-valuemax": String(STOPS.length),
        "aria-valuenow": String(at(handle) + 1),
        "aria-valuetext": t("settings.position.at", { n: at(handle) + 1, of: STOPS.length }),
      },
    });
    el.setCssProps({ "--leapfrog-at": `${percent(at(handle))}%` });
    if (handle !== "down") drawArrow(el.createSpan(), s.arrow, "top");
    if (handle !== "up") drawArrow(el.createSpan(), s.arrow, "bottom");
    els.set(handle, el);

    const [min, max] = limits(handle);
    const clamp = (i: number): number => Math.min(max, Math.max(min, i));

    el.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const next = clamp(at(handle) + step);
      if (next !== at(handle)) onChange({ handle, stop: STOPS[next], done: true });
    });

    el.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      // On the document, not captured by the handle: the pointer may leave the track while dragging.
      const doc = el.ownerDocument;
      let last = at(handle);
      const move = (e: PointerEvent): void => {
        const next = clamp(nearest(track, e.clientX));
        if (next === last) return;
        last = next;
        el.setCssProps({ "--leapfrog-at": `${percent(next)}%` });
        el.setAttribute("aria-valuenow", String(next + 1));
        const other = handles.find((h) => h !== handle);
        if (other) setTogether(next === at(other));
        onChange({ handle, stop: STOPS[next], done: false });
      };
      const up = (): void => {
        doc.removeEventListener("pointermove", move);
        doc.removeEventListener("pointerup", up);
        doc.removeEventListener("pointercancel", up);
        onChange({ handle, stop: STOPS[last], done: true });
      };
      doc.addEventListener("pointermove", move);
      doc.addEventListener("pointerup", up);
      doc.addEventListener("pointercancel", up);
    });
  }

  if (handles.length === 2) setTogether(at("up") === at("down"));

  // A click on the track moves the nearer handle there, as far as it may go.
  track.addEventListener("pointerdown", (event) => {
    if (event.target !== track && !(event.target as HTMLElement).hasClass("leapfrog-position-mark")) return;
    const to = nearest(track, event.clientX);
    // The nearer handle; between two on one stop, the one on the side of the click.
    const handle = handles.reduce((best, h) => {
      const gap = Math.abs(at(h) - to) - Math.abs(at(best) - to);
      if (gap !== 0) return gap < 0 ? h : best;
      return to > at(h) ? (h === "down" ? h : best) : h === "up" ? h : best;
    });
    const [min, max] = limits(handle);
    const stop = STOPS[Math.min(max, Math.max(min, to))];
    if (stop !== s[keyOf(handle, s.buttons)]) onChange({ handle, stop, done: true });
  });

  if (focus) track.querySelector<HTMLElement>(`[data-handle='${focus}']`)?.focus();
}

/** The setting a handle moves: only stacked handles have stops of their own. */
export function keyOf(handle: Handle, buttons: Buttons): "upStop" | "downStop" | "sharedStop" {
  if (buttons !== "stacked") return "sharedStop";
  return handle === "up" ? "upStop" : "downStop";
}

function percent(index: number): number {
  return (index / (STOPS.length - 1)) * 100;
}

function nearest(track: HTMLElement, x: number): number {
  const r = track.getBoundingClientRect();
  const ratio = r.width > 0 ? (x - r.left) / r.width : 0;
  return Math.min(STOPS.length - 1, Math.max(0, Math.round(ratio * (STOPS.length - 1))));
}
