# Button settings: design

Date: 2026-10-29. Revised 2026-10-30 after trying the first build: presets become chips with saved
presets of the user's own, the settings move onto two pages, choices become option pills, Arrows
and Arrangement merge into one row, handles block instead of pushing, and buttons gain a Height.

## Goal

Make the floating jump buttons configurable: where they sit, how they look and when they show.
Presets set everything at once, the user can save their own, and the settings show the result
without leaving the settings window.

LeapFrog is meant to be simple, convenient and nice to look at. The settings may be many, but each
one must be obvious from its name and from the preview; nothing here should need explaining, and
descriptions stay short.

## Non-goals (this round)

- Colour choices. Planned next; the settings and styling should leave room for them.
- Fun icons (a cat), hover or click animations. Planned later.
- Jumping by heading, or by heading level. Planned later.
- Per-note or per-folder settings. One set of settings applies to every note.
- Copying, duplicating, renaming or editing a saved preset.

## Anti-goals

- Buttons that leave the note, overlap each other, or cover each other at any setting or pane size.
- Buttons hidden under Obsidian's own interface, such as the status bar.
- Buttons that grow, shrink or move when hovered. Hover only reveals or tints.
- A preview that looks different from the real buttons. The one allowed difference: a pane too small
  for the chosen size shrinks its buttons (see Small panes).
- Two buttons whose gap differs from one screen size to another.
- Placement bleeding into the Look page, or a preview implying a placement the buttons will not
  have.
- A handle that moves when the user did not touch it.
- Long descriptions. A row's description, where it has one, is one short line.

## Layout of the settings

All changes apply immediately to every open note, with no reload. Every choice of two to four values
is a row of **option pills** — every value visible, the chosen one highlighted, one click to change —
never a dropdown.

### Main page

1. **Presets** — chips (see Presets).
2. **Placement** — a row that opens the Placement page.
3. **Look** — a row that opens the Look page.
4. **Behaviour** — a row that opens the Behaviour page.
5. **Sample note** — always there, right under those rows (see Sample note).

Each page row shows a short summary of its current values on the right, as Obsidian's own page rows
do; what the summary says is the builder's call. That summary (`displayValue`) needs Obsidian
1.13.1; on 1.13.0 the rows show without it (*builder's call, settled in review*: `minAppVersion`
stays 1.13.0, as Littera Nexa does with the same API).

### Placement page

| Row | Values | Notes |
|---|---|---|
| Buttons | `↑ over ↓` · `↑ ↓` · `↑` · `↓` | Pills drawn as arrows, no words: stacked, side by side, up only, down only |
| Position | five-stop slider | Two handles for stacked, one otherwise. See Positions |
| Side | Auto · Left · Right | Description follows the choice. See Side |

### Look page

At the top, under a **Preview** heading, four tiles, each named above: **Stacked**, **Side by side**,
**Up only**, **Down only**. They show the look only — Width, Height, Roundness, Shape, Show and
Reveal — whatever the Buttons and Position rows say. Hovering them behaves as it would in a
note.

Height is not to scale in the previews: a button takes its share of the tile, as it would of a note,
so every height fits. A line in the normal text colour right under the previews says so. Sliders on
this page redraw the previews while still held; the value is saved once let go. They are twice
Obsidian's usual slider width.

| Row | Values | Notes |
|---|---|---|
| Width | slider, px | Was Size. Also the height while Height is Auto |
| Height | Auto … 50 % | See Height. Has no effect on side by side. Description: what it does |
| Roundness | 0 % (square) – 100 % (round) | Measured against the width: a fully round tall button is a pill with semicircle ends |
| Shape | Outline · Background · Both · None | Both is an outline and a background together |
| Arrow | Arrow · Thick · Chevron · Triangle | Pills drawn as the icons, no words; the name is a tooltip. The Buttons pills and Position handles draw the chosen icon too |
| Show | Arrow + Shape · Shape · On hover | See Show. For Shape and On hover, except on touch, the description says to hover over a preview to see it |
| Reveal | Under cursor · Both | Shown only for Shape and On hover |

Settings hidden by another setting keep their values, so switching back restores them.

### Behaviour page

| Row | Values | Notes |
|---|---|---|
| Scroll | Instant · Quick · Smooth | Instant by default. Quick is 150 ms, Smooth 500 ms with ease-in/out, however long the note |
| Jump back | on / off | On by default. See below |

Scroll applies to buttons and commands. The user's wheel, touch or key stops a scroll on the way, and a system set to
reduce motion gets Instant. The cursor moves at once, not at the end of the scroll.

**Jump back:** after a click jumps to an end, that button turns into the way back: Obsidian's `undo-2`
icon, whatever the Arrow style, turned to point where it goes. Clicking it returns the scroll and the
cursor to where they were, and it turns back into its arrow. The other button stays as it is, and
clicking it starts a new jump with its own way back. The way back is forgotten once the user scrolls by
hand, clicks into the note or presses a key, or the note or its view changes. Hotkeys always go to the
end and never offer a way back.

**Fading over the text cursor** is always on, with no setting: while the text cursor is behind a button, that button drops to 15 % opacity, so
the text being typed stays readable. Hovering shows it in full, and it can still be clicked. It applies
only to Shape Background or Both, as an outline or a bare arrow does not hide text, and not to Show On
hover, which shows nothing until pointed at. It follows the cursor, not all the text behind a button.

This runs on every keystroke, so it must cost next to nothing. It does no work at all for a look that
cannot hide text, and otherwise reads positions inside the editor's own measuring, once a frame, so it
adds no layout of its own. Measured in a heavy 1,500-line note: about 0.1 ms per check, and no
difference in the time per keystroke with the check on or skipped.

Presets do not carry these settings. Picking a preset for its looks never changes the scroll, so they
are saved apart, under `behaviour` in `data.json`.

## Presets

### Chips

The main page shows every preset as a chip: the six built-in ones first, then the user's own in the
order they were saved, then a **Save** chip.

- Clicking a chip applies it: it sets every setting, including ones its Buttons choice hides.
- The chip whose values the settings match is marked with a ✓ — at most one. After any change, no
  chip is marked until the user picks or saves one. There is no Custom chip or entry.
- Built-in chips cannot be deleted. The user's own chips carry a delete icon; deleting one asks no
  confirmation (*builder's call*: it is one click to save again) and leaves the current settings as
  they are.
- Chips show the name only.

### Save

The **Save** chip opens a small dialog asking for a name, with Save and Cancel.

- The name is trimmed; it must not be empty and may be at most 20 characters. Save is disabled
  until it is valid, with a short line saying why.
- Duplicate names are allowed, and so are values that match another preset: what to keep is the
  user's business.
- Saving adds a chip with the current settings and marks it ✓.

Saved presets live in the plugin's `data.json` beside the settings, and are validated on load like
everything else: an entry with a bad name is dropped, and its values are cleaned value by value.

### Built-in presets

Starting values; the builder may tune them. Every preset carries every setting, including the
stops its Buttons choice does not use.

| Preset | Buttons | ↑ stop | ↓ stop | Shared stop | Height | Side | Width | Roundness | Shape | Show |
|---|---|---|---|---|---|---|---|---|---|---|
| Classic | Stacked | Bottom | Bottom | Bottom | Auto | Auto | 32 | 100 | Background | Arrow + Shape |
| Minimal | Stacked | Bottom | Bottom | Bottom | Auto | Auto | 26 | 100 | None | On hover |
| Middle rail | Stacked | Middle | Middle | Middle | Auto | Auto | 30 | 100 | Outline | Always |
| Bottom bar | Side by side | Bottom | Bottom | Bottom | Auto | Auto | 34 | 30 | Background | Arrow + Shape |
| Up only | ↑ | Bottom | Bottom | Bottom | Auto | Auto | 38 | 100 | Background | Arrow + Shape |
| Apart | Stacked | Top | Bottom | Bottom | Auto | Auto | 30 | 100 | Outline | Shape |

Reveal is "Under cursor" and Arrow is "Arrow" in every preset. **Defaults** for a new install: Classic.

## Positions

There are five stops down the side of the note. Top is flush with the top edge (less a small inset),
Bottom flush with the bottom edge, Middle centred, and the other two halfway between; the builder
may tune the in-between ones. Stops are measured on the room the note leaves the buttons, so no stop
can push a button out of the note.

### The slider

- **Stacked:** two handles, ↑ and ↓. Same stop: the buttons sit together, ↑ directly above ↓.
  Different stops: each sits at its own.
- **Side by side, ↑ only, ↓ only:** one handle, and one stop shared by all three, so switching among
  them never moves the buttons. Stacked keeps its two stops apart from it.
- **Blocking:** a handle stops at the other handle's stop. It may share it but never passes it, and
  the other handle never moves while one is dragged. To bring ↑ lower than ↓, the user moves ↓ first.
- **Two handles on one stop** are drawn side by side, touching, not on top of each other, so either
  can be grabbed. This holds during a drag too, the moment the dragged handle reaches the other's stop.
- **Labels:** only Top, Middle and Bottom are labelled; the other two stops are unlabelled dots. A
  screen reader hears each stop's position in words.
- The track is thin and its five dots are clearly visible on it.
- The slider always responds, whatever the Height. Tall buttons shift to fit the note and avoid
  overlap, so at large heights stops may land close together. The row's description always says
  so; side by side, where Height has no effect, it reads "Moves both buttons together." instead, so
  switching Buttons does not shift the page.

Every stop not in use keeps its value. Switching to or from stacked uses that choice's stops as they
were, and does not look at the other's.

### Spacing

The gap between two buttons is fixed. When two buttons at different stops would come closer than
that gap — neighbouring stops in a short pane, or tall buttons — both move away from their midpoint
until they are exactly one gap apart, and the pair slides back inside the note if that pushed one
past an edge. This happens only when the buttons are drawn; the saved stops do not change.

## Height

A slider from **Auto** to **50 %** of the room the note leaves the buttons.

- **Auto:** a button is as tall as it is wide.
- **Above Auto:** a button's height is that share of the room, never less than its width. It is
  placed at its stop like any other button.
- **50 %, stacked:** ↑ fills the upper half and ↓ the lower half, each half the room less half the
  gap, so they never overlap.
- **50 %, one arrow:** that arrow is half the room tall, at its stop.
- Hidden for side by side.

The arrow stays centred in a tall button, at the size it has in a round one.

## Side

**Auto** (the default) puts the buttons on the side where lines end — right for left-to-right text,
left for right-to-left — so they cover the least text. It follows Obsidian's **Right-to-left**
editor setting, one switch for the whole vault, and follows it at once when it changes. It does not
guess any note's direction from its text. **Left** and **Right** fix the side.

The row's description is one line and follows the choice. For Auto it names the setting it follows:
*"Follows Settings → Editor → Right-to-left (RTL)."*, where "Editor → Right-to-left (RTL)" is a link
that opens the Editor tab. That needs Obsidian's non-public `app.setting.openTabById`; without it the
words show as plain text.

## Obsidian's status bar

On desktop, Obsidian's status bar floats over the bottom-right corner of the workspace, on top of
whichever note sits there. The room the buttons are placed in excludes whatever part of the note the
status bar covers, so Bottom sits just above it.

This is measured, not a fixed margin: the status bar's height and width vary with theme, plugins and
font size, it can be hidden, and it covers only the note under it — a note in a left pane, or with
the buttons on the left side clear of the bar, keeps its full room. The room is measured again
whenever the buttons are redrawn and when the status bar changes size.

## Small panes

When a pane is too small to hold the buttons at the chosen size — shorter than two buttons, their
gap and the insets, or narrower than a side-by-side pair — the buttons shrink until they fit, and
return to the chosen size when the pane grows again. Their gap and insets stay as they are.

## Show

- **Arrow + Shape** — buttons fully visible.
- **Shape** — the button's shape (its outline, background or both) shows, with no arrow. Hovering
  reveals the arrow. It needs a shape: picking Shape None while Show is Shape switches Show to On
  hover, and picking Show Shape while Shape is None switches Shape to Both. Saved settings with
  both load as On hover.
- **On hover** — nothing shows until hovered, then the whole button appears.

A button reached with the keyboard shows itself, as a hovered one does.

**Reveal** decides what pointing at one button reveals: that one, or both arrows — including
when they are at different stops.

On touch screens there is no hover, and Shape and On hover draw as Arrow + Shape, so no tap jumps to
something the user could not see.

## Where a jump lands

**Top** scrolls to the very start, so the note's title and anything else above its first line show.
**Bottom** scrolls so a third of the view stays blank below the note's last line. A note that already
ends within the top two thirds of its view does not move. The editor gets room to scroll past the end
for this while the plugin is on, about a third of the window; reading view already has half a view.
The sample note jumps the same way.

With no way back to offer, a click on a button with nowhere to go does nothing at all: no scroll, and in the editor no cursor
move. That covers a note already at that end, one already scrolling there, and one too short to
scroll. A hotkey still moves the cursor, as it is the way
to reach the end of a short note from the keyboard.

## Sample note

The main page ends with a sample note, under the Placement and Look rows. It shows the real buttons
in their real placement; clicking ↑ or ↓ scrolls it to its top or bottom. It is a scrollable page
styled like reading view, with no cursor. It is as wide as the page and takes the height the tab has
left, between 500 and 800 px: as tall as it can be without the page scrolling as well. In a window
too short for 500 px, the page scrolls. The main page's rows and gaps are tighter than Obsidian's usual, to leave it room.

The note is a short article about frogs: a title, a photo with a caption, then four sections. The
photo is inlined into `main.js`, since a release ships no other files.

The heading above the note reads **Preview.** in bold, then "Test your settings below." in regular
weight.

Picking a preset redraws it at once, so presets can be compared in it. Coming back from the Placement
or Look page redraws it too.

## One drawing

The Look previews, the sample note and real notes draw the buttons with the same code and the same
CSS. This is what keeps the preview truthful.

## Constraints

- Obsidian 1.13 declarative settings (`getSettingDefinitions`), with its page rows for Placement and
  Look; rows the built-in types cannot express (chips, option pills, the five-stop slider, the
  previews, the sample note) are drawn by hand. `minAppVersion` stays 1.13.0.
- The CSS rules in CLAUDE.md: Obsidian variables for every colour, size and spacing that a theme
  should control; no `!important`; no inline styles, except computed positions and sizes, set as CSS
  custom properties.
- Every user-visible string goes through `t()`, with English only until the end. Pills drawn as
  arrows need no translation but still carry a translated tooltip and screen-reader name.
- Works in reading view, live preview and source mode, in popout windows, and on mobile.
- Saved settings from an older version, or hand-edited ones, are validated: anything unknown or out
  of range falls back to its default. Version 0.1.0 saved no settings, so there is nothing to
  migrate; the unreleased first build's `arrows` + `arrangement` and `size` are not carried over.

## Testing

- Unit tests (Jest) for the pure parts: settings and saved-preset validation, which chip is marked,
  blocking, Height and Side resolution, and the position maths (stops in a room, tall buttons,
  push-apart, sliding back inside, shrinking).
- End-to-end tests for what only exists in Obsidian: chips apply, mark, save (with the name rules)
  and delete; each page's rows change the buttons in an open note; the slider blocks and keeps
  touching handles grabbable; Height 50 % fills each half; Side Auto follows Obsidian's Right-to-left setting;
  the Look previews; the sample note, jumping in it and picking a preset above it.

## Left to the builder

- Width range and step; the inset from the note's edge; the gap between buttons; the Height step.
- The page rows' summaries; the previews' exact size.
- The sample note's wording.
- How the five-stop slider and the pills are drawn, within the rules above.
- How far the in-between stops sit (halfway is the starting point).
