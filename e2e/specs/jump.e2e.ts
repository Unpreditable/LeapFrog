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
