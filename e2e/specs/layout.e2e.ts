// Where the buttons sit in a real note: the stops, the side, the status bar, short panes, and what is
// left once the plugin is off. The arithmetic is unit-tested under tests/; this checks that the
// note's real size, Obsidian's status bar and the settings reach it.

// Written without imports: describe, it, expect, browser, $ and the helpers are globals the harness
// provides.

const LF = "leapfrog";

const NOTE = Array.from({ length: 200 }, (_, i) => `Line ${i}`).join("\n\n");

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
}

interface Measured {
  host: Box;
  bar: Box | null;
  buttons: Record<string, Box>;
  sets: number;
}

/** Opens the sample note in the current tab, in editing view unless `mode` says otherwise. */
async function openNote(mode: "source" | "preview" = "source"): Promise<void> {
  await browser.executeObsidian(
    async ({ app }, text, mode) => {
      const file = app.vault.getFileByPath("Layout.md") ?? (await app.vault.create("Layout.md", text));
      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file, { state: { mode } });
      app.workspace.setActiveLeaf(leaf, { focus: true });
    },
    NOTE,
    mode,
  );
  await $(".leapfrog-button").waitForDisplayed();
}

/** The active note's area, the status bar, and each button by its label, in window pixels. */
function measure(): Promise<Measured> {
  return browser.executeObsidian(({ app, obsidian }) => {
    const box = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width };
    };
    const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!view) throw new Error("no note open");
    const buttons: Record<string, Box> = {};
    view.contentEl.querySelectorAll(".leapfrog-button").forEach((el) => {
      buttons[el.getAttribute("aria-label") ?? ""] = box(el);
    });
    const bar = document.querySelector(".status-bar");
    return {
      host: box(view.contentEl),
      bar: bar ? box(bar) : null,
      buttons,
      sets: view.contentEl.querySelectorAll(".leapfrog-buttons").length,
    };
  });
}

/** Limits the active note's height, or lifts the limit with null. */
async function limitHeight(px: number | null): Promise<void> {
  await browser.executeObsidian(({ app, obsidian }, px) => {
    const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    if (!view) throw new Error("no note open");
    view.contentEl.toggleClass("e2e-limited", px !== null);
    if (px === null) view.contentEl.style.removeProperty("max-height");
    else view.contentEl.style.setProperty("max-height", `${px}px`);
  }, px);
  await browser.pause(300);
}

const UP = "Jump to top";
const DOWN = "Jump to bottom";

describe("Where the buttons sit", () => {
  // Settings carry over from test to test otherwise: each starts from the defaults.
  beforeEach(() => resetState());
  afterEach(() => limitHeight(null));

  it("keeps ↓ above the status bar", async () => {
    await openNote();
    const m = await measure();
    expect(m.bar).not.toBeNull();
    expect(m.buttons[DOWN].bottom).toBeLessThanOrEqual(m.bar!.top);
  });

  it("moves the buttons to the left side", async () => {
    await setPluginSettings(LF, { side: "left" });
    await openNote();
    const m = await measure();
    expect(Math.round(m.buttons[UP].left - m.host.left)).toBe(16);
  });

  it("puts buttons on different stops at Top and Bottom", async () => {
    await setPluginSettings(LF, { upStop: "top", downStop: "bottom" });
    await openNote();
    const m = await measure();
    expect(Math.round(m.buttons[UP].top - m.host.top)).toBe(16);
    expect(m.buttons[DOWN].top).toBeGreaterThan(m.host.top + m.host.width / 4);
  });

  it("never overlaps neighbouring stops in a short pane", async () => {
    await setPluginSettings(LF, { upStop: "middle", downStop: "lower-middle" });
    await openNote();
    await limitHeight(160);
    const m = await measure();
    expect(Math.round(m.buttons[DOWN].top - m.buttons[UP].bottom)).toBe(6);
  });

  it("shrinks in a pane too small for the buttons, and grows back", async () => {
    await openNote();
    await limitHeight(90);
    expect((await measure()).buttons[UP].width).toBeLessThan(32);
    await limitHeight(null);
    expect(Math.round((await measure()).buttons[UP].width)).toBe(32);
  });

  it("fills each half of the note at 50 %", async () => {
    await setPluginSettings(LF, { height: 50 });
    await openNote();
    const m = await measure();
    expect(Math.round(m.buttons[UP].top - m.host.top)).toBe(16);
    expect(m.buttons[DOWN].bottom).toBeLessThanOrEqual(m.bar!.top);
    expect(Math.round(m.buttons[DOWN].top - m.buttons[UP].bottom)).toBe(6);
  });

  it("moves Side Auto buttons when Right-to-left is switched", async () => {
    await openNote();
    const setRtl = (on: boolean): Promise<void> =>
      browser.executeObsidian(({ app }, on) => {
        (app.vault as unknown as { setConfig(key: string, value: unknown): void }).setConfig("rightToLeft", on);
      }, on);
    await setRtl(true);
    try {
      await browser.waitUntil(async () => {
        const m = await measure();
        return Math.round(m.buttons[UP].left - m.host.left) === 16;
      }, { timeout: 1000, timeoutMsg: "the buttons stayed on the right" });
    } finally {
      await setRtl(false);
    }
  });

  it("keeps one set of buttons across reading view and editing", async () => {
    await openNote();
    const before = await measure();
    for (const mode of ["preview", "source"]) {
      await browser.executeObsidian(async ({ app, obsidian }, mode) => {
        const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        await view?.setState({ ...view.getState(), mode }, { history: false });
      }, mode);
      await browser.pause(200);
    }
    const after = await measure();
    expect(after.sets).toBe(1);
    expect(Math.round(after.buttons[DOWN].top)).toBe(Math.round(before.buttons[DOWN].top));
  });
});

describe("Redrawing", () => {
  it("leaves the buttons alone while the status bar changes width", async () => {
    await openNote();
    const same = await browser.executeObsidian(async ({ app, obsidian }) => {
      const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
      const button = view?.contentEl.querySelector(".leapfrog-button");
      const bar = document.querySelector(".status-bar");
      if (!button || !bar) throw new Error("no button or no status bar");
      const extra = bar.createDiv({ cls: "status-bar-item", text: "a wider status bar" });
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      extra.remove();
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      return view?.contentEl.querySelector(".leapfrog-button") === button;
    });
    expect(same).toBe(true);
  });

  it("refits a note in a popout window when the popout's note gets shorter", async () => {
    const width = await browser.executeObsidian(async ({ app }, text, px) => {
      const file = app.vault.getFileByPath("Layout.md") ?? (await app.vault.create("Layout.md", text));
      const leaf = app.workspace.openPopoutLeaf();
      await leaf.openFile(file);
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      const content = leaf.view.containerEl.querySelector<HTMLElement>(".view-content");
      if (!content) throw new Error("no note in the popout");
      if (px > 0) content.style.setProperty("max-height", `${px}px`);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      const button = content.querySelector(".leapfrog-button");
      const w = button ? button.getBoundingClientRect().width : -1;
      leaf.detach();
      return w;
    }, NOTE, 90);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(32);
  });
});

describe("Turning the plugin off", () => {
  it("leaves nothing behind in split panes and popout windows", async () => {
    await openNote();
    const left = await browser.executeObsidian(async ({ app }) => {
      const file = app.vault.getFileByPath("Layout.md");
      if (!file) throw new Error("no note");
      await app.workspace.getLeaf("split").openFile(file);
      await app.workspace.openPopoutLeaf().openFile(file);
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      const docs = new Set<Document>();
      app.workspace.iterateAllLeaves((leaf) => {
        docs.add(leaf.view.containerEl.ownerDocument);
      });
      const before = [...docs].reduce((n, d) => n + d.querySelectorAll(".leapfrog-buttons").length, 0);
      await (app as unknown as { plugins: { disablePlugin(id: string): Promise<void> } }).plugins.disablePlugin("leapfrog");
      const after = [...docs].reduce((n, d) => n + d.querySelectorAll(".leapfrog-buttons").length, 0);
      await (app as unknown as { plugins: { enablePlugin(id: string): Promise<void> } }).plugins.enablePlugin("leapfrog");
      return { before, after, windows: docs.size };
    });
    expect(left.windows).toBe(2);
    expect(left.before).toBe(3);
    expect(left.after).toBe(0);
  });
});

export {};
