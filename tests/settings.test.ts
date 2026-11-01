import {
  applyPreset,
  BUILT_IN,
  DEFAULT_SETTINGS,
  deletePreset,
  LeapFrogSettings,
  loadBehaviour,
  loadData,
  nameError,
  savePreset,
  UserPreset,
  withChange,
} from "../src/settings";

const apart = (): LeapFrogSettings => applyPreset("apart", []);

describe("built-in presets", () => {
  it("match the spec's table", () => {
    expect(BUILT_IN.classic).toEqual({
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
    });
    expect(BUILT_IN.minimal).toMatchObject({ width: 26, style: "none", visibility: "hover" });
    expect(BUILT_IN["middle-rail"]).toMatchObject({ upStop: "middle", downStop: "middle", sharedStop: "middle", width: 30, style: "outline" });
    expect(BUILT_IN["bottom-bar"]).toMatchObject({ buttons: "row", roundness: 30, width: 34 });
    expect(BUILT_IN["up-only"]).toMatchObject({ buttons: "up", width: 38 });
    expect(BUILT_IN.apart).toMatchObject({ upStop: "top", downStop: "bottom", width: 30, style: "outline", visibility: "shape" });
  });

  it("all use the plain arrow", () => {
    for (const look of Object.values(BUILT_IN)) expect(look.arrow).toBe("arrow");
  });

  it("make Classic the default", () => {
    expect(DEFAULT_SETTINGS).toEqual({ preset: "classic", ...BUILT_IN.classic });
  });
});

describe("withChange", () => {
  it("blocks ↑ at ↓'s stop and leaves ↓ alone", () => {
    const s = withChange({ ...apart(), downStop: "middle" }, "upStop", "bottom");
    expect([s.upStop, s.downStop]).toEqual(["middle", "middle"]);
  });

  it("blocks ↓ at ↑'s stop and leaves ↑ alone", () => {
    const s = withChange({ ...apart(), upStop: "middle" }, "downStop", "top");
    expect([s.upStop, s.downStop]).toEqual(["middle", "middle"]);
  });

  it("keeps the stacked stops and the shared stop apart when switching", () => {
    const s = { ...apart(), sharedStop: "middle" as const };
    const away = withChange(s, "buttons", "up");
    expect([away.upStop, away.downStop, away.sharedStop]).toEqual(["top", "bottom", "middle"]);
    const back = withChange(withChange(away, "sharedStop", "upper-middle"), "buttons", "stacked");
    expect([back.upStop, back.downStop, back.sharedStop]).toEqual(["top", "bottom", "upper-middle"]);
  });

  it("switches Show from Shape to On hover when Shape becomes None", () => {
    expect(withChange(apart(), "style", "none").visibility).toBe("hover");
    expect(withChange(DEFAULT_SETTINGS, "style", "none").visibility).toBe("always");
  });

  it("switches Shape from None to Both when Show becomes Shape", () => {
    expect(withChange(applyPreset("minimal", []), "visibility", "shape").style).toBe("both");
    expect(withChange(DEFAULT_SETTINGS, "visibility", "shape").style).toBe("background");
  });

  it("clears the preset on any change", () => {
    expect(withChange(DEFAULT_SETTINGS, "width", 40).preset).toBeNull();
  });
});

describe("presets", () => {
  const mine: UserPreset = { id: "a", name: "Mine", values: { ...BUILT_IN.minimal, width: 44 } };

  it("applies a built-in or a saved preset", () => {
    expect(applyPreset("minimal", [])).toEqual({ preset: "minimal", ...BUILT_IN.minimal });
    expect(applyPreset("user:a", [mine])).toEqual({ preset: "user:a", ...mine.values });
  });

  it("checks a name after trimming", () => {
    expect(nameError("  ")).toBe("empty");
    expect(nameError("x".repeat(21))).toBe("long");
    expect(nameError(` ${"x".repeat(20)} `)).toBeNull();
  });

  it("saves a preset, duplicates allowed, and marks it", () => {
    const first = savePreset(DEFAULT_SETTINGS, "Mine", [], "1");
    const second = savePreset(first.settings, "Mine", first.presets, "2");
    expect(second.presets.map((p) => p.name)).toEqual(["Mine", "Mine"]);
    expect(second.settings.preset).toBe("user:2");
  });

  it("saves the trimmed name", () => {
    expect(savePreset(DEFAULT_SETTINGS, "  Mine ", [], "1").presets[0].name).toBe("Mine");
  });

  it("unmarks the deleted preset and keeps the settings", () => {
    const { settings, presets } = savePreset({ ...DEFAULT_SETTINGS, width: 44 }, "Mine", [], "1");
    const after = deletePreset(settings, "1", presets);
    expect(after.presets).toEqual([]);
    expect(after.settings).toEqual({ ...settings, preset: null });
  });

  it("keeps the mark when another preset is deleted", () => {
    const first = savePreset(DEFAULT_SETTINGS, "One", [], "1");
    const second = savePreset(first.settings, "Two", first.presets, "2");
    expect(deletePreset(second.settings, "1", second.presets).settings.preset).toBe("user:2");
  });
});

describe("loadBehaviour", () => {
  it("starts with an instant jump", () => {
    for (const raw of [null, undefined, 3, [], {}]) expect(loadBehaviour(raw)).toEqual({ scroll: "instant", jumpBack: true });
  });

  it("keeps a saved scroll, and loads an unknown one as instant", () => {
    expect(loadBehaviour({ behaviour: { scroll: "smooth" } }).scroll).toBe("smooth");
    expect(loadBehaviour({ behaviour: { scroll: "warp" } }).scroll).toBe("instant");
  });

  it("keeps Jump back off once turned off, and loads anything odd as on", () => {
    expect(loadBehaviour({ behaviour: { jumpBack: false } }).jumpBack).toBe(false);
    expect(loadBehaviour({ behaviour: { jumpBack: "no" } }).jumpBack).toBe(true);
  });

  it("drops the sound and volume an earlier build saved", () => {
    expect(loadBehaviour({ behaviour: { scroll: "quick", sound: "pop", volume: 70 } })).toEqual({ scroll: "quick", jumpBack: true });
  });

  it("leaves the settings and the presets' values alone", () => {
    const { settings } = loadData({ behaviour: { scroll: "smooth" } });
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe("loadData", () => {
  it("returns the defaults for anything that is not an object", () => {
    for (const raw of [null, undefined, 3, "x", []]) expect(loadData(raw)).toEqual({ settings: DEFAULT_SETTINGS, presets: [] });
  });

  it("loads saved presets, dropping bad ones", () => {
    expect(loadData({ presets: "x" }).presets).toEqual([]);
    const { presets } = loadData({
      presets: [
        { id: "a", name: "", values: {} },
        { id: "b", name: "x".repeat(25), values: {} },
        { id: "c", name: "Ok", values: { width: "big" } },
        "junk",
      ],
    });
    expect(presets.map((p) => p.id)).toEqual(["c"]);
    expect(presets[0].values.width).toBe(32);
  });

  it("keeps the mark only while the values still match", () => {
    expect(loadData({ ...BUILT_IN.minimal, preset: "minimal" }).settings.preset).toBe("minimal");
    expect(loadData({ ...BUILT_IN.minimal, width: 40, preset: "minimal" }).settings.preset).toBeNull();
    expect(loadData({ ...BUILT_IN.classic, preset: "user:zzz" }).settings.preset).toBeNull();
    const saved = { id: "z", name: "Z", values: { ...BUILT_IN.classic, width: 44 } };
    expect(loadData({ ...saved.values, preset: "user:z", presets: [saved] }).settings.preset).toBe("user:z");
  });

  it("falls back one setting at a time", () => {
    const { settings } = loadData({ width: "big", side: "left", upStop: "nowhere" });
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, side: "left", preset: null });
  });

  it("keeps a valid arrow, and loads a missing or unknown one as the plain arrow", () => {
    expect(loadData({ arrow: "chevron" }).settings.arrow).toBe("chevron");
    expect(loadData({}).settings.arrow).toBe("arrow");
    expect(loadData({ arrow: "banana" }).settings.arrow).toBe("arrow");
  });

  it("gives a saved preset with no arrow the plain arrow", () => {
    const { presets } = loadData({ presets: [{ id: "a", name: "Old", values: { width: 40 } }] });
    expect(presets[0].values.arrow).toBe("arrow");
  });

  it("clamps width, roundness and height to their ranges and steps", () => {
    expect(loadData({ width: 999 }).settings.width).toBe(56);
    expect(loadData({ width: 31 }).settings.width).toBe(32);
    expect(loadData({ roundness: -5 }).settings.roundness).toBe(0);
    expect(loadData({ height: 7 }).settings.height).toBe(5);
    expect(loadData({ height: 99 }).settings.height).toBe(50);
  });

  it("loads Show Shape with Shape None as On hover", () => {
    expect(loadData({ style: "none", visibility: "shape" }).settings.visibility).toBe("hover");
  });

  it("swaps ↑ and ↓ when ↑ is below", () => {
    for (const buttons of ["stacked", "up"]) {
      const { settings } = loadData({ buttons, upStop: "bottom", downStop: "top" });
      expect([settings.upStop, settings.downStop]).toEqual(["top", "bottom"]);
    }
  });
});
