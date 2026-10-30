# Button settings: design

Date: 2026-10-29

## Goal

Make the floating jump buttons configurable: where they sit, how they are arranged, how they look
and when they show. A few presets set everything at once, and a preview in the settings shows the
result without leaving the settings window.

LeapFrog is meant to be simple, convenient and nice to look at. The settings may be many, but each
one must be obvious from its name and from the preview; nothing here should need explaining.

The interactive mockup this design was agreed on is
`.superpowers/brainstorm/5077-1793243389/content/playground-v5.html` (not committed). It predates the five spots and still uses free
percentages; where this document and the mockup differ, this document wins.

## Non-goals (this round)

- Colour choices. Planned next; the settings and styling should leave room for them.
- Fun icons (a cat), hover or click animations. Planned later.
- Jumping by heading, or by heading level. Planned later.
- Per-note or per-folder settings. One set of settings applies to every note.

## Anti-goals

- Buttons that leave the note, overlap each other, or cover each other at any setting or pane size.
- Buttons hidden under Obsidian's own interface, such as the status bar.
- Buttons that grow, shrink or move when hovered. Hover only reveals or tints.
- A preview that looks different from the real buttons. The one allowed difference: a pane too small
  for the chosen size shrinks its buttons (see Small panes).
- Two buttons whose gap differs from one screen size to another.

## Settings

All changes apply immediately to every open note, with no reload.

| Setting | Values | Notes |
|---|---|---|
| Preset | the presets below, or Custom | See Presets |
| Arrows | Both · Only ↑ · Only ↓ | Comes before Position |
| Position | a slider with five stops; two handles, ↑ and ↓, for Both, one handle otherwise | See Positions |
| Arrangement | One above another · Next to each other | Shown only while both handles share a stop |
| Side | Left · Right | Left suits right-to-left languages |
| Size | slider, px | Range is the builder's call; the mockup used 20–56 |
| Roundness | 0 % (square) – 100 % (circle) | |
| Style | Outline · Faint background · Nothing | |
| Visibility | Always · Hint · On hover | See Visibility |
| Reveal on hover | This button only · All buttons | Shown only for Hint and On hover |

Settings hidden by another setting keep their values, so switching back restores them.

### Order of the rows

Preset first, then the swatch and Try it (see Preview), then the settings in the order of the table.
Grouping under headings is the builder's call.

### Positions

There are five spots down the side of the note: **Top**, **Upper middle**, **Middle**, **Lower
middle**, **Bottom**. Position is a slider that snaps to them.

- With Arrows set to Both, the slider has two handles, ↑ and ↓. ↑ can share ↓'s stop or sit above
  it, never below: the handles cannot cross.
- **Handles on the same stop** put the two buttons together at that spot, side by side or one above
  the other as Arrangement says. This is the only case Arrangement applies to, so it is shown only
  then.
- **Handles on different stops** put each button at its own spot.
- With only one arrow, the slider has one handle.

The spots are measured on the room the note leaves the buttons, so none can push a button out of
the note: Top is flush with the top edge (less a small inset), Bottom flush with the bottom edge,
Middle centred, and the other two halfway between. The builder may tune the in-between spots.

The gap between two buttons is fixed. When two buttons at different spots would come closer than
that gap — neighbouring spots in a short pane — both move away from their midpoint until they are
exactly one gap apart, and the pair slides back inside the note if that pushed one past an edge.
Two buttons are therefore either at their own spots or exactly one gap apart, on every screen.

Saved data is validated without knowing any note's height: an unknown stop falls back to the
default, and ↑ below ↓ is swapped.

### Obsidian's status bar

On desktop, Obsidian's status bar floats over the bottom-right corner of the workspace, on top of
whichever note sits there, and today it covers the ↓ button. The room the buttons are placed in
excludes whatever part of the note the status bar covers, so Bottom sits just above it.

This is measured, not a fixed margin: the status bar's height and width vary with theme, plugins
and font size, it can be hidden, and it covers only the note under it — a note in a left pane, or
with the buttons on the left side clear of the bar, keeps its full room. The room is measured again
whenever the buttons are redrawn and when the status bar changes size.

The same rule extends to any other Obsidian element found floating over a note's corner during the
build; the builder lists those found.

### Small panes

When a pane is too small to hold the buttons at the chosen size — shorter than two buttons, their
gap and the insets, or narrower than a side-by-side pair — the buttons shrink until they fit, and
return to the chosen size when the pane grows again. Their gap and insets stay as they are.

### Visibility

- **Always** — buttons fully visible.
- **Hint** — the button's shape (its outline or faint background) shows, with no arrow. Hovering
  reveals the arrow. With Style set to Nothing, Hint shows nothing until hovered, the same as On
  hover; that combination is allowed.
- **On hover** — nothing shows until hovered, then the whole button appears.

**Reveal on hover** decides what hovering one button reveals: that button only, or every button of
the note (both arrows, including when they are at different spots).

On touch screens there is no hover. What Hint and On hover do there is the builder's call, within
the anti-goals; the first tap must not trigger a jump the user could not see.

## Presets

A preset sets every setting at once, including the ones it hides: each preset carries a value for
every setting (*builder's call, settled in review*), so the result never depends on what was picked
before. Changing any setting afterwards switches the Preset row to
**Custom** and keeps the values as they are. Picking a preset again overwrites them. Custom is not a
saved slot: picking a preset loses the custom values.

The first set, from the mockup, as a starting point (the builder may tune values). Every preset
carries an Arrangement, even where its handles are apart, and both handles' stops, even where only
one arrow shows.

| Preset | Arrows | ↑ stop | ↓ stop | Arrangement | Side | Size | Roundness | Style | Visibility |
|---|---|---|---|---|---|---|---|---|---|
| Classic | Both | Bottom | Bottom | One above another | Right | 32 | 100 | Faint background | Always |
| Minimal | Both | Bottom | Bottom | One above another | Right | 26 | 100 | Nothing | On hover |
| Middle rail | Both | Middle | Middle | One above another | Right | 30 | 100 | Outline | Always |
| Bottom bar | Both | Bottom | Bottom | Next to each other | Right | 34 | 30 | Faint background | Always |
| Up only | Only ↑ | Bottom | Bottom | One above another | Right | 38 | 100 | Faint background | Always |
| Apart | Both | Top | Bottom | One above another | Right | 30 | 100 | Outline | Hint |

Reveal on hover is "This button only" in every preset.

**Defaults** for a new install: the Classic preset. That differs slightly from the current release
(a pill around both buttons in the bottom-right corner): the buttons become separate circles.

## Preview

Two parts, both inside the settings window, which never closes for them.

### Swatch

A small strip at the top of the LeapFrog settings showing the ↑ and ↓ buttons only — no note, no
placement. It shows everything about a button's look: size, roundness, style, visibility, and
Reveal on hover. Hovering it behaves as it would in a note. It shows only the arrows the Arrows
setting allows, side by side or one above the other as Arrangement says (side by side when the
handles are apart). It updates on every change.

It stays pinned to the top of the settings tab while the rows below scroll, so it is in view while a
slider moves.

### Try it

A **Try it** button beside the swatch swaps the settings rows for a full-size sample note, inside
the settings tab. The note has enough sample text to scroll, and shows the real buttons in their
real placement. Clicking ↑ or ↓ scrolls the sample note to its top or bottom.

*Builder's call, settled in review:* the sample note is a scrollable page styled like reading view,
not a real Obsidian editor: it has no cursor and cannot be edited. The button-drawing code therefore
takes "what to jump in" as a callback rather than a `MarkdownView`, so real notes and the sample
note share it.

A **Back to settings** button swaps the rows back, scrolled to where the user left them.

### One drawing

The swatch, the sample note and real notes draw the buttons with the same code and the same CSS.
This is what keeps the preview truthful.

## Constraints

- Obsidian 1.13 declarative settings (`getSettingDefinitions`), as Littera Nexa and Kalendae use;
  rows the built-in types cannot express (the five-stop slider with two handles, the swatch, the sample note) are
  drawn by hand, as those plugins do for theirs. `minAppVersion` stays 1.13.0.
- The CSS rules in CLAUDE.md: Obsidian variables for every colour, size and spacing that a theme
  should control; no `!important`; no inline styles, except computed positions and sizes, which
  have no static value (set as CSS custom properties on the element, read by `styles.css`).
- Every user-visible string goes through `t()`, with English only until the end (CLAUDE.md).
- Works in reading view, live preview and source mode, in popout windows, and on mobile.
- Saved settings from an older version, or hand-edited ones, are validated: anything unknown or out
  of range falls back to its default.

## Testing

- Unit tests (Jest) for the pure parts: settings validation, the preset/Custom rule, the position
  maths (where each stop lands in a given room, push-apart to exactly one gap, sliding back inside,
  shrinking in a small pane).
- End-to-end tests for what only exists in Obsidian: each setting changes the buttons in an open
  note; buttons at neighbouring stops never overlap in a short pane; buttons shrink in a pane too
  small for them and grow back; Hint and Reveal on hover; Try it and Back to settings; jumping from
  the sample note.

## Left to the builder

- Size range and step; the inset from the note's edge; the gap between buttons.
- Grouping and headings in the settings tab; the swatch's exact size.
- The sample note's text.
- Touch-screen behaviour of Hint and On hover, within the anti-goals.
- How the five-stop slider is drawn, as long as it has a visible track, shows its stops, and its
  handles cannot cross.
- How far the in-between spots sit (halfway is the starting point).
