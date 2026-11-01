/** How a jump moves the note. */
export type ScrollStyle = "instant" | "quick" | "smooth";

/** What a jump does. Kept apart from the look, so picking a preset never changes how a note scrolls. */
export interface Behaviour {
  scroll: ScrollStyle;
  /** Whether a second click on a button goes back to where the first one left. */
  jumpBack: boolean;
}

export const DEFAULT_BEHAVIOUR: Behaviour = { scroll: "instant", jumpBack: true };

/** Which buttons show, and how two of them sit together. */
export type Buttons = "stacked" | "row" | "up" | "down";

/** The five spots down the side of a note, top first. */
export const STOPS = ["top", "upper-middle", "middle", "lower-middle", "bottom"] as const;
export type Stop = (typeof STOPS)[number];

export type Side = "auto" | "left" | "right";
export type ButtonStyle = "outline" | "background" | "both" | "none";
export const ARROW_STYLES = ["arrow", "thick", "chevron", "triangle"] as const;
export type ArrowStyle = (typeof ARROW_STYLES)[number];
export type Visibility = "always" | "shape" | "hover";
/** What pointing at one button reveals: that one, or both arrows. */
export type HoverShows = "one" | "both";

/**
 * Everything a preset sets. Stacked uses `upStop` and `downStop`; side by side, ↑ only and ↓ only
 * all use `sharedStop`, so switching among those three never moves the buttons.
 */
export interface Look {
  buttons: Buttons;
  upStop: Stop;
  downStop: Stop;
  sharedStop: Stop;
  /** Percent of the room the note leaves; 0 is Auto, as tall as wide. */
  height: number;
  side: Side;
  width: number;
  roundness: number;
  style: ButtonStyle;
  arrow: ArrowStyle;
  visibility: Visibility;
  hoverShows: HoverShows;
}

/** `preset` names the marked chip — a built-in id or `user:<id>` — or is null once anything changed. */
export interface LeapFrogSettings extends Look {
  preset: string | null;
}

export interface UserPreset {
  id: string;
  name: string;
  values: Look;
}

export const BUILT_IN_IDS = ["classic", "minimal", "middle-rail", "bottom-bar", "up-only", "apart"] as const;
export type BuiltInId = (typeof BUILT_IN_IDS)[number];

export const WIDTH_RANGE = { min: 20, max: 56, step: 2 } as const;
export const ROUNDNESS_RANGE = { min: 0, max: 100, step: 5 } as const;
export const HEIGHT_RANGE = { min: 0, max: 50, step: 5 } as const;
export const NAME_MAX = 20;

const CLASSIC: Look = {
  buttons: "stacked",
  upStop: "bottom",
  downStop: "bottom",
  sharedStop: "bottom",
  height: 0,
  side: "auto",
  width: 32,
  roundness: 100,
  style: "background",
  arrow: "arrow",
  visibility: "always",
  hoverShows: "one",
};

/** Every preset carries every setting, so applying one never depends on what came before. */
export const BUILT_IN: Record<BuiltInId, Look> = {
  classic: CLASSIC,
  minimal: { ...CLASSIC, width: 26, style: "none", visibility: "hover" },
  "middle-rail": { ...CLASSIC, upStop: "middle", downStop: "middle", sharedStop: "middle", width: 30, style: "outline" },
  "bottom-bar": { ...CLASSIC, buttons: "row", width: 34, roundness: 30 },
  "up-only": { ...CLASSIC, buttons: "up", width: 38 },
  apart: { ...CLASSIC, upStop: "top", width: 30, style: "outline", visibility: "shape" },
};

export const DEFAULT_SETTINGS: LeapFrogSettings = { preset: "classic", ...CLASSIC };

const USER = "user:";

/** The values behind a chip, or null for a chip that does not exist. */
export function presetValues(key: string, user: UserPreset[]): Look | null {
  if (key.startsWith(USER)) return user.find((p) => USER + p.id === key)?.values ?? null;
  return BUILT_IN_IDS.includes(key as BuiltInId) ? BUILT_IN[key as BuiltInId] : null;
}

export function applyPreset(key: string, user: UserPreset[]): LeapFrogSettings {
  const values = presetValues(key, user);
  return values ? { preset: key, ...values } : DEFAULT_SETTINGS;
}

const index = (stop: Stop): number => STOPS.indexOf(stop);

/**
 * Pure: the settings after one change on a settings page. Any change unmarks the preset. A handle
 * never passes the other: it stops at the other's stop, and the other stays where it is.
 */
export function withChange<K extends keyof Look>(s: LeapFrogSettings, key: K, value: Look[K]): LeapFrogSettings {
  const next: LeapFrogSettings = { ...s, [key]: value, preset: null };
  if (key === "upStop" && index(next.upStop) > index(next.downStop)) next.upStop = next.downStop;
  if (key === "downStop" && index(next.downStop) < index(next.upStop)) next.downStop = next.upStop;
  // Show Shape needs a shape: whichever of the two was just set wins, and the other gives way.
  if (key === "style" && value === "none" && next.visibility === "shape") next.visibility = "hover";
  if (key === "visibility" && value === "shape" && next.style === "none") next.style = "both";
  return next;
}

/** Pure: what is wrong with a preset's name, after trimming. */
export function nameError(name: string): "empty" | "long" | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "empty";
  return trimmed.length > NAME_MAX ? "long" : null;
}

function lookOf(s: LeapFrogSettings): Look {
  const { preset: _preset, ...look } = s;
  return look;
}

/** Adds the current settings as a preset and marks it. Names and values may repeat others. */
export function savePreset(s: LeapFrogSettings, name: string, user: UserPreset[], id: string): { settings: LeapFrogSettings; presets: UserPreset[] } {
  const preset: UserPreset = { id, name: name.trim(), values: lookOf(s) };
  return { settings: { ...s, preset: USER + id }, presets: [...user, preset] };
}

/** Removes a saved preset. The settings stay; only a mark on the deleted chip goes. */
export function deletePreset(s: LeapFrogSettings, id: string, user: UserPreset[]): { settings: LeapFrogSettings; presets: UserPreset[] } {
  const presets = user.filter((p) => p.id !== id);
  return { settings: s.preset === USER + id ? { ...s, preset: null } : s, presets };
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function inRange(value: unknown, range: { min: number; max: number; step: number }, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const snapped = range.min + Math.round((value - range.min) / range.step) * range.step;
  return Math.min(range.max, Math.max(range.min, snapped));
}

function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** Pure: saved values, from any version or edited by hand, as a valid look. */
export function mergeLook(raw: unknown): Look {
  const saved = asRecord(raw);
  const d = CLASSIC;
  let upStop = pick(saved.upStop, STOPS, d.upStop);
  let downStop = pick(saved.downStop, STOPS, d.downStop);
  if (index(upStop) > index(downStop)) [upStop, downStop] = [downStop, upStop];
  const style = pick(saved.style, ["outline", "background", "both", "none"], d.style);
  // Shape with no shape shows nothing until hovered, which is On hover.
  const visibility = pick(saved.visibility, ["always", "shape", "hover"], d.visibility);
  return {
    buttons: pick(saved.buttons, ["stacked", "row", "up", "down"], d.buttons),
    upStop,
    downStop,
    sharedStop: pick(saved.sharedStop, STOPS, d.sharedStop),
    height: inRange(saved.height, HEIGHT_RANGE, d.height),
    side: pick(saved.side, ["auto", "left", "right"], d.side),
    width: inRange(saved.width, WIDTH_RANGE, d.width),
    roundness: inRange(saved.roundness, ROUNDNESS_RANGE, d.roundness),
    style,
    arrow: pick(saved.arrow, ARROW_STYLES, d.arrow),
    visibility: style === "none" && visibility === "shape" ? "hover" : visibility,
    hoverShows: pick(saved.hoverShows, ["one", "both"], d.hoverShows),
  };
}

/** Pure: the behaviour saved in the plugin's data.json, under `behaviour`, as valid values. */
export function loadBehaviour(raw: unknown): Behaviour {
  const saved = asRecord(asRecord(raw).behaviour);
  const d = DEFAULT_BEHAVIOUR;
  return {
    scroll: pick(saved.scroll, ["instant", "quick", "smooth"], d.scroll),
    jumpBack: typeof saved.jumpBack === "boolean" ? saved.jumpBack : d.jumpBack,
  };
}

function sameLook(a: Look, b: Look): boolean {
  return (Object.keys(a) as (keyof Look)[]).every((k) => a[k] === b[k]);
}

/**
 * Pure: the plugin's data.json — the settings at its top level, saved presets under `presets`. A
 * preset with no valid name is dropped; one with odd values keeps its name and gets valid ones. The
 * mark stays only on a chip that exists and whose values are still the settings'.
 */
export function loadData(raw: unknown): { settings: LeapFrogSettings; presets: UserPreset[] } {
  const saved = asRecord(raw);
  const presets: UserPreset[] = [];
  for (const entry of Array.isArray(saved.presets) ? saved.presets : []) {
    const p = asRecord(entry);
    if (typeof p.id !== "string" || typeof p.name !== "string" || nameError(p.name) !== null) continue;
    presets.push({ id: p.id, name: p.name.trim(), values: mergeLook(p.values) });
  }
  const look = mergeLook(saved);
  const named = "preset" in saved ? saved.preset : DEFAULT_SETTINGS.preset;
  const values = typeof named === "string" ? presetValues(named, presets) : null;
  const preset = values && sameLook(values, look) ? (named as string) : null;
  return { settings: { preset, ...look }, presets };
}
