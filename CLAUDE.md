# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working agreement

**Only explicit acceptance is acceptance.** Nothing else counts — not a correction, not a question,
not feedback on a draft, not silence, not "that reads better". If the user critiques a proposal and
you incorporate the critique, the result is a *new proposal* that also needs acceptance. Two rounds
of feedback are still zero approvals.

**Show, don't write.** When asked to show, propose, draft, or explain a change, put it in the reply
as text. Do not touch a file. An instruction to show something is never also an instruction to
apply it, however clear the resulting change seems.

**One asked-for thing at a time.** Do what was requested, not the adjacent work you noticed while
doing it. Surface the rest as a list and let the user pick. Finding a real problem is a reason to
mention it, never a licence to fix it uninvited.

**English only until the end.** While the work is in progress, `en.json` is the only locale to
touch. Translating the others is the second-to-last step before a commit, once the English has
stopped moving. Run `npm run build` and `npm test` during the work; `npm run validate-translations`
fails on a key the locales do not have yet, so leave `npm run release-check` for after the
translation pass.

**Ask when uncertain, before acting.** If a request could mean two things, say so and wait. Do not
pick the likelier reading and proceed. Guessing wrong wastes more of the user's time than asking.

## Commands

```bash
npm run dev                    # esbuild watch mode (rebuilds on save — use with Hot Reload plugin)
npm run build                  # TypeScript check + eslint + production bundle → main.js
npm test                       # Jest unit tests (pure logic only, no Obsidian API)
npm run validate-translations  # every locale has exactly en.json's keys, none blank
npm run release-check          # all three, in the order the Release workflow runs them
npm run test:e2e               # build, then drive a real Obsidian through e2e/specs (see e2e/README.md)
npm run test:all               # build, unit tests, then e2e; ends with one result line for each
```

`test:e2e` and `test:all` run on this machine only: each opens an Obsidian window that takes the
keyboard until it finishes. Neither is part of `release-check` or of CI. The code that runs them is
the ObsidianE2EHarness repo, checked out beside this one; this repo holds only the specs, fixture
vault and config, under `e2e/`. Spec files there have no imports, and must not gain any: Obsidian's
review reads them as plugin code.

**During development**: symlink this folder into `<vault>/.obsidian/plugins/leapfrog/` and
install the [Hot Reload](https://github.com/pjeby/hot-reload) community plugin. With `npm run dev`
running, any source change auto-reloads the plugin without restarting Obsidian.

## Architecture

**Purpose**: jump to the top or bottom of a note, from a floating button or a command. The buttons'
place and look are configurable, with presets and a preview in the settings; how the note scrolls
is too.

### Key files

| File | Role |
|---|---|
| [src/main.ts](src/main.ts) | Plugin entry point: loads the settings, registers the commands and the tab, and keeps one `ButtonHost` per open note |
| [src/i18n/i18n.ts](src/i18n/i18n.ts) | i18next init; every user-visible string goes through `t()` |
| [src/edge.ts](src/edge.ts) | Pure: where the cursor lands for a jump |
| [src/jump.ts](src/jump.ts), [src/scroll.ts](src/scroll.ts) | Performs a jump: cursor and scroll in the editor, scroll only in reading view; the animated scroll, which the wheel or a key stops |
| [src/settings.ts](src/settings.ts) | Pure: settings and saved-preset types, built-in presets, blocking handles, which chip is marked, validation of data.json |
| [src/layout.ts](src/layout.ts) | Pure: where each button goes in a given room — the five stops, Height, the fixed gap, the status bar's cover, shrink-to-fit — and Side Auto |
| [src/arrows.ts](src/arrows.ts) | The arrow icon for each Arrow choice, on the buttons and in the settings |
| [src/jump-back.ts](src/jump-back.ts) | The second click that goes back to where the first one left, until the user moves on |
| [src/caret-watch.ts](src/caret-watch.ts) | Fades a button covering the text cursor. Runs on every keystroke, so it must stay inside the editor's measuring |
| [src/buttons.ts](src/buttons.ts) | `ButtonHost`: draws the buttons into a note, a Look preview or the sample note, and redraws them when their host or the status bar resizes |
| [src/settings/settings-tab.ts](src/settings/settings-tab.ts) | Main settings page (Obsidian 1.13 declarative definitions): preset chips, the page rows and the sample note |
| [src/settings/placement-page.ts](src/settings/placement-page.ts), [look-page.ts](src/settings/look-page.ts), [behaviour-page.ts](src/settings/behaviour-page.ts) | The three settings pages, drawn by hand as `SettingPage`s |
| [src/settings/chips.ts](src/settings/chips.ts) | Preset chips and the dialog that names a saved preset |
| [src/settings/pills.ts](src/settings/pills.ts) | Option pills, used for every choice of two to four values |
| [src/settings/position-slider.ts](src/settings/position-slider.ts) | The five-stop Position slider; handles block at each other |
| [src/settings/preview.ts](src/settings/preview.ts) | The main page's sample note, with a photo inlined into `main.js` |

### i18n

Every user-visible string lives in `src/i18n/locales/`. `en.json` is the source of truth and
carries a `<key>_comment` sibling for each key explaining its context to translators. It is also
the only one to write while a change is still being worked on — see "English only until the end"
above. Every other locale must have exactly en's key set with no blank values —
`npm run validate-translations` enforces this, and the Release workflow gates on it.
`sample_lang.json` is the template for adding a language: it carries every key, and only it may
leave values blank.

### Releases

`.github/workflows/release.yml` is run by hand (Actions → Release → Patch/Minor/Major). It owns the
version in all three files — `manifest.json`, `versions.json`, `package.json` — so never bump them
by hand. It gates on translations, build and tests, commits and tags the bump, and creates a
**draft** GitHub release with `main.js`, `styles.css` and `manifest.json` attached.

## CSS rules

- **No `!important`** — increase selector specificity or use CSS variables instead.
- **No inline styles** — style through `styles.css` and class names, never `style=""`.
- **No partially-supported CSS properties** — Obsidian's embedded Chromium lags behind the latest
  spec. Known problematic properties: `text-decoration-color`, `text-decoration-thickness`,
  `text-decoration-skip-ink`. Use `text-decoration: underline` without sub-properties; style links
  via `color` and the shorthand only.
- **No `column-gap`** — it belongs to the multi-column spec, so Obsidian flags it as partially
  supported even inside a grid. Use the `gap` shorthand, and `gap: <row> <column>` when the two
  values differ.
- **Use Obsidian CSS variables** for all colors, fonts, spacing — never hardcode values that themes
  should control.
