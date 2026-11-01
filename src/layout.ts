import { Edge } from "./edge";
import { Buttons, Side, Stop } from "./settings";

/** Pixels between two buttons. Fixed, so two buttons look the same on every screen. */
export const GAP = 6;
/** Pixels between the buttons and the note's edges. */
export const INSET = 16;

/** Where each stop sits in the room the note leaves the buttons: 0 is its top, 1 its bottom. */
export const STOP_FRACTION: Record<Stop, number> = {
  top: 0,
  "upper-middle": 0.25,
  middle: 0.5,
  "lower-middle": 0.75,
  bottom: 1,
};

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** One button: px from the host's top, and px from the side the buttons are on. */
export interface Placed {
  edge: Edge;
  top: number;
  offset: number;
}

/** Where the buttons go, and the width and height every one of them has. */
export interface Layout {
  width: number;
  height: number;
  buttons: Placed[];
}

export interface LayoutInput {
  width: number;
  height: number;
  /** Pixels at the bottom of the host that something of Obsidian's covers. */
  cover: number;
  buttonWidth: number;
  /** Percent of the room for a button's height; 0 is as tall as wide. */
  heightPct: number;
  buttons: Buttons;
  upStop: Stop;
  downStop: Stop;
  sharedStop: Stop;
}

/**
 * Pure: where the buttons go in a host of the given size. A stop is measured on the room the host
 * leaves, so no stop can push a button out of it; two buttons are either at their own stops or
 * exactly one gap apart; and buttons too big for the host shrink until they fit.
 */
export function layout(input: LayoutInput): Layout {
  const { buttons, upStop, downStop, sharedStop } = input;
  const room = input.height - input.cover - 2 * INSET;
  const across = input.width - 2 * INSET;
  const stacked = buttons === "stacked";
  const row = buttons === "row";

  // Two buttons above one another, at one stop or pushed together from two, need two heights and a gap.
  const fitsDown = stacked ? (room - GAP) / 2 : room;
  const fitsAcross = row ? (across - GAP) / 2 : across;
  const width = Math.max(1, Math.floor(Math.min(input.buttonWidth, fitsDown, fitsAcross)));
  // A taller button takes its share of the room, never less than its width, never more than fits.
  // Not rounded: at 50 % the two halves must meet the room's edges exactly, whatever its height.
  const share = row || input.heightPct === 0 ? 0 : ((stacked ? room - GAP : room) * input.heightPct) / 100;
  const height = Math.max(width, Math.min(share, fitsDown));

  const at = (stop: Stop, extent: number): number => INSET + (room - extent) * STOP_FRACTION[stop];

  if (buttons === "up" || buttons === "down") {
    const edge: Edge = buttons === "up" ? "top" : "bottom";
    return { width, height, buttons: [{ edge, top: at(sharedStop, height), offset: INSET }] };
  }
  if (row) {
    const top = at(sharedStop, height);
    return {
      width,
      height,
      buttons: [
        { edge: "top", top, offset: INSET },
        { edge: "bottom", top, offset: INSET + width + GAP },
      ],
    };
  }
  const pitch = height + GAP;
  const together = upStop === downStop;
  let up = together ? at(upStop, height + pitch) : at(upStop, height);
  let down = together ? up + pitch : at(downStop, height);
  if (down - up < pitch) {
    const mid = (up + down) / 2;
    up = Math.min(Math.max(mid - pitch / 2, INSET), INSET + room - height - pitch);
    down = up + pitch;
  }
  return {
    width,
    height,
    buttons: [
      { edge: "top", top: up, offset: INSET },
      { edge: "bottom", top: down, offset: INSET },
    ],
  };
}

export interface PreviewInput {
  buttonWidth: number;
  heightPct: number;
  buttons: Buttons;
  /** The room a preview tile leaves its buttons. */
  tileRoom: number;
}

/**
 * Pure: how tall a Look preview draws a button. Not to scale: Height takes its share of the tile,
 * as it would of a note, so every height fits and the shape still reads.
 */
export function previewHeight(input: PreviewInput): number {
  const { buttonWidth, heightPct, buttons, tileRoom } = input;
  if (buttons === "row" || heightPct === 0) return buttonWidth;
  const room = buttons === "stacked" ? tileRoom - GAP : tileRoom;
  return Math.max(buttonWidth, (room * heightPct) / 100);
}

/** Pure: the side the buttons are on. Auto is where lines end, so they cover the least text. */
export function resolveSide(side: Side, rightToLeft: boolean): "left" | "right" {
  if (side !== "auto") return side;
  return rightToLeft ? "left" : "right";
}

/**
 * Pure: how many pixels at the bottom of the host the status bar covers, along the strip at the
 * host's `side` where the buttons are. Zero where the bar is hidden, elsewhere, or not over them.
 */
export function coveredBelow(host: Rect, bar: Rect | null, side: "left" | "right", strip: number): number {
  if (!bar || bar.right <= bar.left || bar.bottom <= bar.top) return 0;
  const from = side === "right" ? host.right - strip : host.left;
  const to = side === "right" ? host.right : host.left + strip;
  const across = bar.left < to && bar.right > from;
  const over = bar.top < host.bottom && bar.bottom > host.top;
  return across && over ? host.bottom - Math.max(bar.top, host.top) : 0;
}

/** Pure: whether two rectangles share any area. Only touching does not count. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}
