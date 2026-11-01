// The settings, clicked through as a person would: the preset chips and saving one's own, the
// sample note, and the Placement and Look pages.

// Written without imports: describe, it, expect, browser, $ and the helpers are globals the harness
// provides.

const LF = "leapfrog";

/** What Obsidian keeps of its settings window that the specs reach for. */
interface SettingsWindow {
  open(): void;
  openTabById(id: string): void;
  close(): void;
  activeTab: { containerEl: HTMLElement };
}

/** XPath for an element with this class, matched as a whole word: `setting-item` is not `setting-items`. */
function cls(name: string): string {
  return `contains(concat(' ', normalize-space(@class), ' '), ' ${name} ')`;
}

/** The settings row with this name. */
function row(name: string): string {
  return `//div[${cls("setting-item")}][.//div[${cls("setting-item-name")}][normalize-space()='${name}']]`;
}

/** The preset chip with this name; the last one when names repeat. */
function chip(name: string): string {
  return `(//*[${cls("leapfrog-chip")}][.//*[${cls("leapfrog-chip-name")}][normalize-space()='${name}']])[last()]`;
}

const CHIPS = ".leapfrog-chips";
const ACTIVE = ".leapfrog-chip.is-active";
const SAVE = ".leapfrog-chip-save";
const NAME = ".leapfrog-save-modal input";
const CONFIRM = ".leapfrog-save-modal .leapfrog-save-confirm";
const ERROR = ".leapfrog-save-modal .leapfrog-save-error";
const SAMPLE = ".leapfrog-sample";

/** WebDriver's codes for the keys pressed in the save dialog: a key's name would be typed as text. */
const KEY = { enter: "\uE007", escape: "\uE00C", backspace: "\uE003", right: "\uE014" };

async function openSettings(): Promise<void> {
  await browser.executeObsidian(({ app }, id) => {
    (app.vault as unknown as { setConfig(key: string, value: unknown): void }).setConfig("settingsPopoutWindow", false);
    const setting = (app as unknown as { setting: SettingsWindow }).setting;
    setting.open();
    setting.openTabById(id);
  }, LF);
  await $(CHIPS).waitForDisplayed();
}

async function closeSettings(): Promise<void> {
  await browser.executeObsidian(({ app }) => (app as unknown as { setting: SettingsWindow }).setting.close());
}

/** The plugin's data.json. */
function saved(): Promise<Record<string, unknown>> {
  return browser.executeObsidian(async ({ app }, id) => {
    const file = `${app.vault.configDir}/plugins/${id}/data.json`;
    if (!(await app.vault.adapter.exists(file))) return {};
    return JSON.parse(await app.vault.adapter.read(file)) as Record<string, unknown>;
  }, LF);
}

async function activeChips(): Promise<string[]> {
  return browser.execute((selector) => [...document.querySelectorAll(selector)].map((el) => el.textContent ?? ""), ACTIVE);
}

async function savePreset(name: string): Promise<void> {
  await $(SAVE).click();
  await $(NAME).waitForDisplayed();
  // Real key presses into the field: type() and press() are for the editor only.
  await $(NAME).click();
  await browser.keys(name);
  await browser.keys(KEY.enter);
  await $(NAME).waitForExist({ reverse: true });
}

/** How far the sample note's text is scrolled. */
function scrolled(): Promise<number> {
  return browser.executeObsidian(({ app }) => {
    const tab = (app as unknown as { setting: SettingsWindow }).setting.activeTab.containerEl;
    return tab.querySelector(".leapfrog-sample-text")?.scrollTop ?? -1;
  });
}

describe("The preset chips", () => {
  beforeEach(async () => {
    await resetState();
    await openSettings();
  });

  afterEach(() => closeSettings());

  it("marks the default preset, and only it", async () => {
    expect(await activeChips()).toEqual(["Classic"]);
  });

  it("applies a chip and marks it", async () => {
    await $(chip("Minimal")).click();
    await browser.waitUntil(async () => (await saved()).style === "none", { timeoutMsg: "Minimal was not applied" });
    expect(await activeChips()).toEqual(["Minimal"]);
  });

  it("saves a named preset, allowing a duplicate name", async () => {
    await savePreset("Mine");
    await savePreset("Mine");
    expect(await $$(chip("Mine").replace("[last()]", "")).length).toBe(2);
    expect((await saved()).presets).toHaveLength(2);
    expect(await activeChips()).toHaveLength(1);
  });

  it("refuses an empty or too long name", async () => {
    await $(SAVE).click();
    await $(NAME).waitForDisplayed();
    expect(await $(CONFIRM).getAttribute("disabled")).not.toBeNull();
    await $(NAME).click();
    await browser.keys("x".repeat(21));
    expect(await $(CONFIRM).getAttribute("disabled")).not.toBeNull();
    expect(await $(ERROR).getText()).not.toBe("");
    await browser.keys(KEY.backspace);
    expect(await $(CONFIRM).getAttribute("disabled")).toBeNull();
    await browser.keys(KEY.escape);
  });

  it("deletes only saved presets, and unmarks the deleted one", async () => {
    expect(await $(`${CHIPS} .leapfrog-chip-delete`).isExisting()).toBe(false);
    await $(chip("Minimal")).click();
    await savePreset("Mine");
    await $(chip("Mine")).$(".leapfrog-chip-delete").click();
    await browser.waitUntil(async () => !(await $(chip("Mine")).isExisting()), { timeoutMsg: "the chip stayed" });
    expect(await activeChips()).toEqual([]);
    const data = await saved();
    expect(data.style).toBe("none");
    expect(data.presets).toEqual([]);
  });

  it("wraps the chips in a narrow window", async () => {
    const fits = await browser.executeObsidian(async ({ app }, px) => {
      const tab = (app as unknown as { setting: SettingsWindow }).setting.activeTab.containerEl;
      tab.style.setProperty("max-width", `${px}px`);
      await new Promise((resolve) => window.setTimeout(resolve, 200));
      const chips = tab.querySelector<HTMLElement>(".leapfrog-chips");
      const result = chips ? chips.scrollWidth <= chips.clientWidth + 1 && getComputedStyle(chips).flexWrap === "wrap" : false;
      tab.style.removeProperty("max-width");
      return result;
    }, 320);
    expect(fits).toBe(true);
  });
});

describe("The sample note", () => {
  beforeEach(async () => {
    await resetState();
    await openSettings();
  });

  afterEach(() => closeSettings());

  it("sits under the Placement and Look rows", async () => {
    const order = await browser.execute((selector) => {
      const below = (a: Element | null, b: Element | null): boolean => !!a && !!b && a.getBoundingClientRect().top >= b.getBoundingClientRect().bottom - 1;
      const named = (name: string): Element | null =>
        [...document.querySelectorAll(".setting-item")].find((el) => el.querySelector(".setting-item-name")?.textContent === name) ?? null;
      return below(document.querySelector(selector), named("Look")) && below(named("Look"), named("Placement"));
    }, SAMPLE);
    expect(order).toBe(true);
  });

  it("has a title and a photo, and text aligned to the start", async () => {
    expect(await $(`${SAMPLE} h1`).isDisplayed()).toBe(true);
    expect(await $(`${SAMPLE} h1`).getText()).toBe("The Leap Frog");
    const photo = await browser.execute((selector) => {
      const img = document.querySelector<HTMLImageElement>(`${selector} img`);
      const h1 = document.querySelector(`${selector} h1`);
      return { loaded: (img?.naturalWidth ?? 0) > 0, align: h1 ? getComputedStyle(h1).textAlign : "" };
    }, SAMPLE);
    expect(photo).toEqual({ loaded: true, align: "start" });
  });

  it("is headed Preview, in bold, then the invitation in regular weight", async () => {
    expect(await $(".leapfrog-sample-group .setting-item-heading").getText()).toBe("Preview. Test your settings below.");
    const weights = await browser.execute(() => {
      const intro = document.querySelector(".leapfrog-sample-intro");
      return intro?.parentElement ? [Number(getComputedStyle(intro.parentElement).fontWeight), Number(getComputedStyle(intro).fontWeight)] : [];
    });
    expect(weights[0]).toBeGreaterThan(weights[1]);
  });

  it("stretches from 500 to 800 px, as far as it can without the tab scrolling", async () => {
    await browser.pause(200);
    const fit = await browser.execute((selector) => {
      const frame = document.querySelector<HTMLElement>(selector);
      const tab = frame?.closest<HTMLElement>(".vertical-tab-content");
      if (!frame || !tab) return null;
      const padding = parseFloat(getComputedStyle(tab).paddingBottom) || 0;
      const room = tab.getBoundingClientRect().top + tab.clientHeight - padding - frame.getBoundingClientRect().bottom;
      return { height: frame.offsetHeight, over: tab.scrollHeight - tab.clientHeight, room };
    }, SAMPLE);
    if (!fit) throw new Error("no sample note");
    expect(fit.height).toBeGreaterThanOrEqual(500);
    expect(fit.height).toBeLessThanOrEqual(802);
    // Taller than the minimum only if it fits; short of the maximum only if there is no room left.
    if (fit.height > 502) expect(fit.over).toBe(0);
    if (fit.height < 798) expect(fit.room).toBeLessThanOrEqual(2);
  });

  it("jumps in the sample note", async () => {
    await $(`${SAMPLE} .leapfrog-button[aria-label='Jump to bottom']`).click();
    await browser.waitUntil(async () => (await scrolled()) > 0, { timeoutMsg: "the sample note never scrolled down" });
    await $(`${SAMPLE} .leapfrog-button[aria-label='Jump to top']`).click();
    await browser.waitUntil(async () => (await scrolled()) === 0, { timeoutMsg: "the sample note never scrolled back up" });
  });

  it("redraws when a chip is picked", async () => {
    await $(SAMPLE).waitForDisplayed();
    await $(chip("Apart")).click();
    await browser.pause(300);
    expect(await $(SAMPLE).isDisplayed()).toBe(true);
    const fromTop = await browser.execute((selector) => {
      const frame = document.querySelector(selector);
      const up = frame?.querySelector(".leapfrog-button[aria-label='Jump to top']");
      // From the frame's inner edge: the buttons sit inside its border.
      return frame && up ? Math.round(up.getBoundingClientRect().top - frame.getBoundingClientRect().top - frame.clientTop) : -1;
    }, SAMPLE);
    expect(fromTop).toBe(16);
  });
});

const HANDLE = ".leapfrog-position .leapfrog-handle";

/** Opens one of the settings pages from the main page. */
async function openPage(name: string): Promise<void> {
  await $(row(name)).click();
  await browser.pause(300);
}

async function pill(rowName: string, value: string): Promise<void> {
  await $(row(rowName)).$(`.leapfrog-pill[data-value='${value}']`).click();
  await browser.pause(200);
}

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function handleBoxes(): Promise<Record<string, Box>> {
  return browser.execute((selector) => {
    const out: Record<string, Box> = {};
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const r = el.getBoundingClientRect();
      out[el.dataset.handle ?? ""] = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    return out;
  }, HANDLE);
}

describe("The Placement page", () => {
  beforeEach(async () => {
    await resetState();
    await openSettings();
  });

  afterEach(() => closeSettings());

  it("shows two handles for stacked and one otherwise", async () => {
    await openPage("Placement");
    expect(await $$(HANDLE).length).toBe(2);
    await pill("Buttons", "row");
    await browser.waitUntil(async () => (await $$(HANDLE).length) === 1, { timeoutMsg: "side by side kept two handles" });
    await pill("Buttons", "up");
    expect(await $$(HANDLE).length).toBe(1);
  });

  it("blocks a dragged handle at the other's stop, side by side while still dragging", async () => {
    await $(chip("Apart")).click();
    await openPage("Placement");
    const during = await browser.execute((selector) => {
      const up = document.querySelector<HTMLElement>(`${selector}[data-handle='up']`);
      const down = document.querySelector<HTMLElement>(`${selector}[data-handle='down']`);
      const track = document.querySelector<HTMLElement>(".leapfrog-position-track");
      if (!up || !down || !track) throw new Error("no slider");
      const r = track.getBoundingClientRect();
      const at = (x: number): PointerEventInit => ({ clientX: x, clientY: r.top, bubbles: true, pointerId: 1 });
      up.dispatchEvent(new PointerEvent("pointerdown", at(r.left)));
      up.ownerDocument.dispatchEvent(new PointerEvent("pointermove", at(r.right + 40)));
      const apart = up.getBoundingClientRect().right <= down.getBoundingClientRect().left + 1;
      up.ownerDocument.dispatchEvent(new PointerEvent("pointerup", at(r.right + 40)));
      return apart;
    }, HANDLE);
    expect(during).toBe(true);
    await browser.waitUntil(async () => (await saved()).upStop === "bottom", { timeoutMsg: "↑ never reached ↓'s stop" });
    expect((await saved()).downStop).toBe("bottom");
  });

  it("moves a lone ↓ on the shared stop, which ↑ only and side by side then use", async () => {
    await openPage("Placement");
    await pill("Buttons", "down");
    await browser.execute((selector) => {
      const down = document.querySelector<HTMLElement>(`${selector}[data-handle='down']`);
      const track = document.querySelector<HTMLElement>(".leapfrog-position-track");
      if (!down || !track) throw new Error("no slider");
      const r = track.getBoundingClientRect();
      const at = (x: number): PointerEventInit => ({ clientX: x, clientY: r.top, bubbles: true, pointerId: 1 });
      down.dispatchEvent(new PointerEvent("pointerdown", at(r.right)));
      down.ownerDocument.dispatchEvent(new PointerEvent("pointermove", at(r.left - 40)));
      down.ownerDocument.dispatchEvent(new PointerEvent("pointerup", at(r.left - 40)));
    }, HANDLE);
    await browser.waitUntil(async () => (await saved()).sharedStop === "top", { timeoutMsg: "↓ snapped back" });
    expect((await saved()).downStop).toBe("bottom");
    await pill("Buttons", "up");
    expect(await $(`${HANDLE}[data-handle='up']`).getAttribute("aria-valuenow")).toBe("1");
    await pill("Buttons", "row");
    expect(await $(`${HANDLE}[data-handle='pair']`).getAttribute("aria-valuenow")).toBe("1");
  });

  it("moves ↓ when the track is clicked below two handles on one stop", async () => {
    await $(chip("Middle rail")).click();
    await openPage("Placement");
    await browser.execute(() => {
      const track = document.querySelector<HTMLElement>(".leapfrog-position-track");
      if (!track) throw new Error("no slider");
      const r = track.getBoundingClientRect();
      track.dispatchEvent(new PointerEvent("pointerdown", { clientX: r.right, clientY: r.top, bubbles: true }));
    });
    await browser.waitUntil(async () => (await saved()).downStop === "bottom", { timeoutMsg: "the click below did nothing" });
    expect((await saved()).upStop).toBe("middle");
  });

  it("shows Height's value once", async () => {
    await openPage("Look");
    const text = await browser.execute((xpath) => {
      const found = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      return (found as HTMLElement | null)?.querySelector(".setting-item-control")?.textContent?.trim() ?? "";
    }, row("Height"));
    expect(text).toBe("Auto");
  });

  it("keeps focus on the Height slider through arrow keys", async () => {
    await openPage("Look");
    await $(row("Height")).$("input[type='range']").click();
    for (let i = 0; i < 3; i++) await browser.keys(KEY.right);
    await browser.pause(300);
    const focused = await browser.execute(() => {
      const el = document.activeElement as HTMLInputElement | null;
      return el?.type === "range" ? Number(el.value) : -1;
    });
    expect(focused).toBeGreaterThan(0);
    expect((await saved()).height).toBe(focused);
  });

  it("keeps both handles grabbable on one stop", async () => {
    await openPage("Placement");
    const { up, down } = await handleBoxes();
    expect(up.right).toBeLessThanOrEqual(down.left + 1);
    expect(down.left - up.right).toBeLessThanOrEqual(1);
  });

  it("labels only Top, Middle and Bottom", async () => {
    await openPage("Placement");
    const labels = await browser.execute(() => [...document.querySelectorAll(".leapfrog-position-labels span")].map((el) => el.textContent ?? ""));
    expect(labels).toEqual(["Top", "Middle", "Bottom"]);
  });

  it("keeps Position movable at 50 % stacked, and says the buttons shift", async () => {
    await setPluginSettings(LF, { height: 50 });
    await openPage("Placement");
    expect(await $("[data-handle='up']").getAttribute("tabindex")).toBe("0");
    expect(await $(row("Position")).$(".setting-item-description").getText()).toContain("shift to fit");
  });

  it("keeps a Position description when switching to side by side", async () => {
    await openPage("Placement");
    expect(await $(row("Position")).$(".setting-item-description").getText()).toContain("shift to fit");
    await pill("Buttons", "row");
    await browser.waitUntil(async () => (await $(row("Position")).$(".setting-item-description").getText()).includes("together"), {
      timeoutMsg: "side by side lost its description",
    });
  });

  it("links Side Auto's description to the Editor settings", async () => {
    await openPage("Placement");
    await $(row("Side")).$(".setting-item-description a").click();
    await browser.waitUntil(
      () => browser.executeObsidian(({ app }) => (app as unknown as { setting: { activeTab?: { id: string } } }).setting.activeTab?.id === "editor"),
      { timeoutMsg: "the link did not open the Editor tab" },
    );
  });
});

const PREVIEWS = ".leapfrog-look-previews";

async function slide(name: string, value: number): Promise<void> {
  await browser.execute(
    (xpath, value) => {
      const found = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const input = (found as HTMLElement | null)?.querySelector<HTMLInputElement>("input[type='range']");
      if (!input) throw new Error("no slider");
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    row(name),
    value,
  );
  await browser.pause(200);
}

/** Each Look preview's buttons, by label. */
function previewBoxes(): Promise<Record<string, Box & { width: number; radius: number }>[]> {
  return browser.execute((selector) => {
    return [...document.querySelectorAll(`${selector} .leapfrog-buttons`)].map((group) => {
      const out: Record<string, Box & { width: number; radius: number }> = {};
      group.querySelectorAll(".leapfrog-button").forEach((el) => {
        const r = el.getBoundingClientRect();
        out[el.getAttribute("aria-label") ?? ""] = {
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          radius: parseFloat(getComputedStyle(el).borderTopLeftRadius),
        };
      });
      return out;
    });
  }, PREVIEWS);
}

function arrowOpacity(label: string): Promise<string> {
  return browser.execute((selector) => {
    const svg = document.querySelector(selector);
    return svg ? getComputedStyle(svg).opacity : "";
  }, `${PREVIEWS} .leapfrog-button[aria-label='${label}'] svg`);
}

describe("The Behaviour page", () => {
  beforeEach(async () => {
    await resetState();
    await openSettings();
    await openPage("Behaviour");
  });

  afterEach(() => closeSettings());

  it("saves the scroll apart from the settings, and a preset leaves it alone", async () => {
    await pill("Scroll", "smooth");
    await browser.waitUntil(async () => ((await saved()).behaviour as { scroll?: string } | undefined)?.scroll === "smooth", {
      timeoutMsg: "the scroll was not saved",
    });
    await closeSettings();
    await openSettings();
    await $(chip("Minimal")).click();
    await browser.pause(200);
    expect(((await saved()).behaviour as { scroll: string }).scroll).toBe("smooth");
  });
});

describe("The Look page", () => {
  beforeEach(async () => {
    await resetState();
    await openSettings();
  });

  afterEach(() => closeSettings());

  it("changes the arrow icon in the previews", async () => {
    await openPage("Look");
    await pill("Arrow", "chevron");
    await $(`${PREVIEWS} .leapfrog-button svg.lucide-chevron-up`).waitForExist();
    await browser.waitUntil(async () => (await saved()).arrow === "chevron", { timeoutMsg: "the arrow was not saved" });
  });

  it("draws the chosen icon on the Placement page", async () => {
    await setPluginSettings(LF, { arrow: "chevron" });
    await openPage("Placement");
    await $(`${HANDLE} svg.lucide-chevron-up`).waitForExist();
    expect(await $(row("Buttons")).$("svg.lucide-chevron-down").isExisting()).toBe(true);
  });

  it("turns the triangle over for ↓", async () => {
    await setPluginSettings(LF, { arrow: "triangle" });
    await openPage("Look");
    expect(await $(`${PREVIEWS} .leapfrog-button[aria-label='Jump to bottom'] svg.leapfrog-arrow-flipped`).isExisting()).toBe(true);
    expect(await $(`${PREVIEWS} .leapfrog-button[aria-label='Jump to top'] svg.leapfrog-arrow-flipped`).isExisting()).toBe(false);
  });

  it("shows the look stacked, side by side, and each arrow alone, under a heading", async () => {
    await openPage("Look");
    expect(await $(".leapfrog-look-heading").getText()).toBe("Preview");
    const names = await browser.execute(() => [...document.querySelectorAll(".leapfrog-look-preview-name")].map((el) => el.textContent ?? ""));
    expect(names).toEqual(["Stacked", "Side by side", "Up only", "Down only"]);
    const [stacked, row, up, down] = await previewBoxes();
    expect(Object.keys(up)).toEqual(["Jump to top"]);
    expect(Object.keys(down)).toEqual(["Jump to bottom"]);
    expect(Object.keys(stacked)).toHaveLength(2);
    expect(stacked["Jump to bottom"].top).toBeGreaterThan(stacked["Jump to top"].bottom);
    expect(Math.round(row["Jump to bottom"].top)).toBe(Math.round(row["Jump to top"].top));
  });

  it("keeps placement out of the previews", async () => {
    await setPluginSettings(LF, { buttons: "up" });
    await openPage("Look");
    const previews = await previewBoxes();
    expect(previews.map((p) => Object.keys(p).length)).toEqual([2, 2, 1, 1]);
  });

  it("redraws the previews while the width slider moves", async () => {
    await openPage("Look");
    await slide("Width", 40);
    expect(Math.round((await previewBoxes())[0]["Jump to top"].width)).toBe(40);
  });

  it("reveals one arrow or both on hover", async () => {
    await setPluginSettings(LF, { visibility: "shape", hoverShows: "one" });
    await openPage("Look");
    const hover = (): Promise<void> =>
      browser.execute((selector) => {
        document.querySelector(selector)?.dispatchEvent(new PointerEvent("pointerenter"));
      }, `${PREVIEWS} .leapfrog-button[aria-label='Jump to top']`);
    await hover();
    await browser.pause(300);
    expect(await arrowOpacity("Jump to bottom")).toBe("0");
    await pill("Reveal", "both");
    await hover();
    await browser.pause(300);
    expect(await arrowOpacity("Jump to bottom")).toBe("1");
  });

  it("shows Reveal only for Shape and On hover", async () => {
    await openPage("Look");
    expect(await $(row("Reveal")).isExisting()).toBe(false);
    await pill("Show", "shape");
    await $(row("Reveal")).waitForDisplayed();
  });

  it("puts Height right under Width", async () => {
    await openPage("Look");
    const names = await browser.execute(() => [...document.querySelectorAll(".leapfrog-page .setting-item-name")].map((el) => el.textContent ?? ""));
    expect(names.indexOf("Height")).toBe(names.indexOf("Width") + 1);
    await closeSettings();
    await openSettings();
    await openPage("Placement");
    expect(await $(row("Height")).isExisting()).toBe(false);
  });

  it("says the previews are not to scale", async () => {
    await openPage("Look");
    expect(await $(".leapfrog-look-note").getText()).toContain("not to scale");
  });

  it("draws Height as its share of each preview", async () => {
    await openPage("Look");
    await slide("Height", 25);
    const up = (await previewBoxes())[2]["Jump to top"];
    const tile = await browser.execute(() => {
      const el = document.querySelectorAll<HTMLElement>(".leapfrog-look-preview-buttons")[2];
      const style = getComputedStyle(el);
      return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    });
    expect(Math.round(up.bottom - up.top)).toBe(Math.round(tile / 4));
  });

  it("redraws the previews while a slider is still held", async () => {
    await openPage("Look");
    await browser.execute((xpath) => {
      const found = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      const input = (found as HTMLElement | null)?.querySelector<HTMLInputElement>("input[type='range']");
      if (!input) throw new Error("no slider");
      input.value = "48";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, row("Width"));
    await browser.pause(100);
    expect(Math.round((await previewBoxes())[0]["Jump to top"].width)).toBe(48);
  });

  it("rounds a button against its width", async () => {
    await openPage("Look");
    const button = (await previewBoxes())[0]["Jump to top"];
    expect(Math.round(button.radius)).toBe(Math.round(button.width / 2));
  });
});

export {};
