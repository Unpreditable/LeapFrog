// What LeapFrog does inside Obsidian: the floating buttons and the commands, in the editor and in
// reading view. Where the cursor lands is unit-tested under tests/; this covers the part that only
// exists inside Obsidian.

// Written without imports: describe, it, expect, browser, $ and the helpers are globals the harness
// provides.

const LF = "leapfrog";

const TOP = ".leapfrog-button[aria-label='Jump to top']";
const BOTTOM = ".leapfrog-button[aria-label='Jump to bottom']";

/** A note long enough to scroll: line i reads "Line i". */
const LONG = Array.from({ length: 300 }, (_, i) => `Line ${i}`).join("\n");

/** Opens LONG in the current tab with the caret on `atLine`, in the editor or in reading view. */
async function openLongNote(atLine: number, mode: "source" | "preview" = "source"): Promise<void> {
  await browser.executeObsidian(
    async ({ app }, text, atLine, mode) => {
      const path = "Long.md";
      const file = app.vault.getFileByPath(path) ?? (await app.vault.create(path, text));
      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file, { state: { mode } });
      app.workspace.setActiveLeaf(leaf, { focus: true });
      const editor = app.workspace.activeEditor?.editor;
      if (mode === "source" && editor) {
        editor.setCursor({ line: atLine, ch: 0 });
        editor.scrollIntoView({ from: { line: atLine, ch: 0 }, to: { line: atLine, ch: 0 } }, true);
      }
    },
    LONG,
    atLine,
    mode,
  );
}

function cursorLine(): Promise<number> {
  return browser.executeObsidian(({ app }) => app.workspace.activeEditor?.editor?.getCursor().line ?? -1);
}

/** How far reading view is scrolled down, in pixels. */
function previewScroll(): Promise<number> {
  return browser.executeObsidian(({ app, obsidian }) => {
    const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
    return view?.previewMode.containerEl.querySelector(".markdown-preview-view")?.scrollTop ?? -1;
  });
}

function scrollOf(scroller: string): Promise<number> {
  return browser.execute((scroller) => {
    const shown = [...document.querySelectorAll<HTMLElement>(`.workspace-leaf.mod-active ${scroller}`)].find((el) => el.clientHeight > 0);
    return shown?.scrollTop ?? -1;
  }, scroller);
}

/** The share of the active note's view left blank below its last line. */
function blankBelowEnd(scroller: string, content: string): Promise<number> {
  return browser.execute(
    (scroller, content) => {
      const view = [...document.querySelectorAll<HTMLElement>(`.workspace-leaf.mod-active ${scroller}`)].find((el) => el.clientHeight > 0);
      const inner = view?.querySelector<HTMLElement>(content);
      if (!view || !inner) return -1;
      const end = inner.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(inner).paddingBottom) || 0);
      return (view.getBoundingClientRect().top + view.clientHeight - end) / view.clientHeight;
    },
    scroller,
    content,
  );
}

function setJumpBack(on: boolean): Promise<void> {
  return browser.executeObsidian(({ app }, id, on) => {
    const plugin = (app as unknown as { plugins: { plugins: Record<string, { behaviour: { jumpBack: boolean } }> } }).plugins.plugins[id];
    plugin.behaviour = { ...plugin.behaviour, jumpBack: on };
  }, LF, on);
}

function runCommand(edge: "top" | "bottom"): Promise<void> {
  return browser.executeObsidian(({ app }, id) => {
    (app as unknown as { commands: { executeCommandById(id: string): boolean } }).commands.executeCommandById(id);
  }, `${LF}:jump-to-${edge}`);
}

describe("The floating buttons", () => {
  it("show on an open note", async () => {
    await openLongNote(150);
    await $(TOP).waitForDisplayed();
    expect(await $(BOTTOM).isDisplayed()).toBe(true);
  });

  it("move the cursor to the end of the note, then back to its start", async () => {
    await openLongNote(150);
    await $(BOTTOM).click();
    expect(await cursorLine()).toBe(299);
    expect(await line()).toBe("Line 299");
    await $(TOP).click();
    expect(await cursorLine()).toBe(0);
  });

  it("show the title at the top of the editor, and a third blank at the bottom", async () => {
    await openLongNote(150);
    await $(BOTTOM).click();
    await browser.pause(300);
    expect(Math.abs(await blankBelowEnd(".markdown-source-view .cm-scroller", ".cm-content > :last-child") - 1 / 3)).toBeLessThan(0.05);
    await $(TOP).click();
    await browser.waitUntil(async () => (await scrollOf(".markdown-source-view .cm-scroller")) === 0, { timeoutMsg: "the editor did not reach its very top" });
  });

  it("leave a third blank at the bottom of reading view", async () => {
    await openLongNote(0, "preview");
    await $(BOTTOM).click();
    await browser.pause(300);
    expect(Math.abs(await blankBelowEnd(".markdown-preview-view", ".markdown-preview-sizer") - 1 / 3)).toBeLessThan(0.05);
  });

  it("do nothing when already there, with Jump back off", async () => {
    await setJumpBack(false);
    await openLongNote(150);
    await $(BOTTOM).click();
    await browser.pause(300);
    await browser.executeObsidian(({ app }) => app.workspace.activeEditor?.editor?.setCursor({ line: 295, ch: 0 }));
    await $(BOTTOM).click();
    await browser.pause(100);
    expect(await cursorLine()).toBe(295);
    await $(TOP).click();
    await browser.pause(300);
    await browser.executeObsidian(({ app }) => app.workspace.activeEditor?.editor?.setCursor({ line: 5, ch: 0 }));
    await $(TOP).click();
    await browser.pause(100);
    expect(await cursorLine()).toBe(5);
    await setJumpBack(true);
  });

  it("show themselves when reached with the keyboard", async () => {
    await setPluginSettings(LF, { style: "background", visibility: "hover" });
    await openLongNote(0);
    // Off the buttons: an earlier test clicked one, and hovering shows it too.
    await $(".workspace-leaf.mod-active .view-header-title").click();
    await browser.pause(200);
    const opacity = (): Promise<string> =>
      browser.execute((selector) => {
        const button = document.querySelector(`.workspace-leaf.mod-active ${selector}`);
        if (!button) throw new Error("no button");
        return getComputedStyle(button).opacity;
      }, TOP);
    expect(await opacity()).toBe("0");
    await browser.execute((selector) => {
      const options = { preventScroll: true, focusVisible: true };
      document.querySelector<HTMLElement>(`.workspace-leaf.mod-active ${selector}`)?.focus(options);
    }, TOP);
    await browser.waitUntil(async () => (await opacity()) === "1", { timeoutMsg: "the focused button stayed hidden" });
    await setPluginSettings(LF, { visibility: "always" });
  });

  describe("jumping back", () => {
    const BACK = ".leapfrog-button[aria-label='Jump back']";
    const SCROLLER = ".markdown-source-view .cm-scroller";

    // Another note first: each test starts with no way back left over from the one before.
    beforeEach(() =>
      browser.executeObsidian(async ({ app }) => {
        const file = app.vault.getFileByPath("Other.md") ?? (await app.vault.create("Other.md", "Short"));
        await app.workspace.getLeaf(false).openFile(file);
      }),
    );

    it("offers the way back on the button clicked, pointing where it goes", async () => {
      await openLongNote(150);
      await $(BOTTOM).click();
      await $(`${BACK} svg.lucide-undo-2.leapfrog-back-up`).waitForExist();
      expect(await $(BOTTOM).isExisting()).toBe(false);
      expect(await $(TOP).isExisting()).toBe(true);
    });

    it("returns the scroll and the cursor to where they were", async () => {
      await openLongNote(150);
      await browser.pause(200);
      const before = await scrollOf(SCROLLER);
      await $(BOTTOM).click();
      await browser.waitUntil(async () => (await scrollOf(SCROLLER)) > before + 100, { timeoutMsg: "the jump never moved" });
      await $(BACK).click();
      await browser.waitUntil(async () => Math.abs((await scrollOf(SCROLLER)) - before) <= 1, { timeoutMsg: "the note did not go back" });
      expect(await cursorLine()).toBe(150);
      await $(BOTTOM).waitForExist();
      expect(await $(BACK).isExisting()).toBe(false);
    });

    it("forgets the way back once the user scrolls by hand", async () => {
      await openLongNote(150);
      await $(BOTTOM).click();
      await $(BACK).waitForExist();
      await browser.execute((selector) => {
        document.querySelector(`.workspace-leaf.mod-active ${selector}`)?.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, bubbles: true }));
      }, SCROLLER);
      await $(BOTTOM).waitForExist();
    });

    it("forgets the way back once a key is pressed", async () => {
      await openLongNote(150);
      await $(BOTTOM).click();
      await $(BACK).waitForExist();
      await browser.keys("\uE014");
      await $(BOTTOM).waitForExist();
    });

    it("forgets the way back on another note", async () => {
      await openLongNote(150);
      await $(BOTTOM).click();
      await $(BACK).waitForExist();
      await browser.executeObsidian(async ({ app }) => {
        const file = app.vault.getFileByPath("Other.md") ?? (await app.vault.create("Other.md", "Short"));
        await app.workspace.getLeaf(false).openFile(file);
      });
      await $(BOTTOM).waitForExist();
    });

    it("goes back in the same way from the top", async () => {
      await openLongNote(150);
      await $(TOP).click();
      await $(`${BACK} svg.leapfrog-back-down`).waitForExist();
    });
  });

  describe("over the text cursor", () => {
    /**
     * Puts the text cursor behind ↓. It takes the widest button and unbroken text: words wrap short of
     * the note's edge, and a normal button sits mostly in the margin beyond it.
     */
    async function caretBehindBottom(): Promise<void> {
      await setPluginSettings(LF, { width: 56 });
      await browser.executeObsidian(async ({ app, obsidian }, selector) => {
        (app.vault as unknown as { setConfig(key: string, value: unknown): void }).setConfig("readableLineLength", false);
        const text = Array.from({ length: 300 }, () => "x".repeat(1000)).join("\n");
        const file = app.vault.getFileByPath("Wide.md") ?? (await app.vault.create("Wide.md", text));
        await app.workspace.getLeaf(false).openFile(file);
        await new Promise((done) => window.setTimeout(done, 300));
        const view = app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        const cm = (view?.editor as unknown as {
          cm: {
            coordsAtPos(at: number): { left: number; right: number; top: number; bottom: number } | null;
            dispatch(spec: unknown): void;
            focus(): void;
            viewport: { from: number; to: number };
          };
        } | undefined)?.cm;
        const button = view?.contentEl.querySelector(selector)?.getBoundingClientRect();
        if (!cm || !button) throw new Error("no editor or button");
        let at = -1;
        for (let pos = cm.viewport.from; pos < cm.viewport.to && at < 0; pos++) {
          const c = cm.coordsAtPos(pos);
          if (c && c.left >= button.left && c.left <= button.right && c.top >= button.top && c.bottom <= button.bottom) at = pos;
        }
        if (at < 0) throw new Error("no text reaches the button");
        cm.focus();
        cm.dispatch({ selection: { anchor: at } });
      }, BOTTOM);
    }

    const faded = async (): Promise<boolean> => (await $(BOTTOM).getAttribute("class"))?.includes("is-over-caret") ?? false;

    it("fade a button with a background, and only that one", async () => {
      // Off the button: an earlier test clicked there, and hovering shows it in full.
      await $(".workspace-leaf.mod-active .view-header-title").click();
      await caretBehindBottom();
      await browser.waitUntil(faded, { timeoutMsg: "the button never faded" });
      expect((await $(TOP).getAttribute("class"))?.includes("is-over-caret")).toBe(false);
      await browser.waitUntil(async () => (await browser.execute((selector) => {
        const button = document.querySelector(selector);
        return button ? getComputedStyle(button).opacity : "";
      }, BOTTOM)) === "0.15", { timeoutMsg: "the faded button is not at 15 %" });
    });

    it("come back when the cursor moves away", async () => {
      await caretBehindBottom();
      await browser.waitUntil(faded, { timeoutMsg: "the button never faded" });
      await browser.executeObsidian(({ app }) => app.workspace.activeEditor?.editor?.setCursor({ line: 0, ch: 0 }));
      await browser.waitUntil(async () => !(await faded()), { timeoutMsg: "the button stayed faded" });
    });

    it("leave an outline alone", async () => {
      await setPluginSettings(LF, { style: "outline" });
      await caretBehindBottom();
      await browser.pause(200);
      expect(await faded()).toBe(false);
      await setPluginSettings(LF, { style: "background", width: 32 });
    });
  });

  it("land in the same place when scrolling smoothly", async () => {
    await browser.executeObsidian(({ app }, id) => {
      const plugin = (app as unknown as { plugins: { plugins: Record<string, { behaviour: { scroll: string } }> } }).plugins.plugins[id];
      plugin.behaviour = { ...plugin.behaviour, scroll: "smooth" };
    }, LF);
    await openLongNote(150);
    await $(BOTTOM).click();
    await browser.pause(800);
    expect(Math.abs(await blankBelowEnd(".markdown-source-view .cm-scroller", ".cm-content > :last-child") - 1 / 3)).toBeLessThan(0.05);
    await $(TOP).click();
    await browser.waitUntil(async () => (await scrollOf(".markdown-source-view .cm-scroller")) === 0, { timeoutMsg: "the smooth scroll did not reach the top" });
    await browser.executeObsidian(({ app }, id) => {
      const plugin = (app as unknown as { plugins: { plugins: Record<string, { behaviour: { scroll: string } }> } }).plugins.plugins[id];
      plugin.behaviour = { ...plugin.behaviour, scroll: "instant" };
    }, LF);
  });

  it("scroll reading view to either end", async () => {
    await openLongNote(0, "preview");
    await $(BOTTOM).click();
    await browser.waitUntil(async () => (await previewScroll()) > 100, { timeoutMsg: "reading view never scrolled down" });
    await $(TOP).click();
    await browser.waitUntil(async () => (await previewScroll()) === 0, { timeoutMsg: "reading view never scrolled back up" });
  });

  it("go away when the plugin is turned off, and come back with it", async () => {
    await openLongNote(0);
    await browser.executeObsidian(async ({ app }, id) => {
      await (app as unknown as { plugins: { disablePlugin(id: string): Promise<void> } }).plugins.disablePlugin(id);
    }, LF);
    expect(await $(TOP).isExisting()).toBe(false);
    await browser.executeObsidian(async ({ app }, id) => {
      await (app as unknown as { plugins: { enablePlugin(id: string): Promise<void> } }).plugins.enablePlugin(id);
    }, LF);
    await $(TOP).waitForDisplayed();
  });
});

describe("The commands", () => {
  it("jump to the bottom and the top of the note", async () => {
    await openLongNote(150);
    await runCommand("bottom");
    expect(await cursorLine()).toBe(299);
    await runCommand("top");
    expect(await cursorLine()).toBe(0);
  });
});

export {};
