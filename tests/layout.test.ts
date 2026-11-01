import { coveredBelow, layout, LayoutInput, previewHeight, resolveSide, overlaps } from "../src/layout";

// A room of 600px: the height less an inset of 16 at the top and at the bottom.
const base: LayoutInput = {
  width: 400,
  height: 632,
  cover: 0,
  buttonWidth: 32,
  heightPct: 0,
  buttons: "stacked",
  upStop: "bottom",
  downStop: "bottom",
  sharedStop: "bottom",
};

describe("layout", () => {
  it("stacks both buttons at Bottom, flush with the inset", () => {
    expect(layout(base)).toEqual({
      width: 32,
      height: 32,
      buttons: [
        { edge: "top", top: 16 + 600 - 70, offset: 16 },
        { edge: "bottom", top: 16 + 600 - 32, offset: 16 },
      ],
    });
  });

  it("puts Top flush with the top inset", () => {
    expect(layout({ ...base, upStop: "top", downStop: "top" }).buttons[0].top).toBe(16);
  });

  it("centres Middle", () => {
    expect(layout({ ...base, buttons: "up", sharedStop: "middle", upStop: "top" }).buttons).toEqual([{ edge: "top", top: 16 + (600 - 32) / 2, offset: 16 }]);
  });

  it("sets a row side by side", () => {
    expect(layout({ ...base, buttons: "row" }).buttons.map((b) => b.offset)).toEqual([16, 16 + 32 + 6]);
  });

  it("keeps buttons on different stops at their own spots", () => {
    const [up, down] = layout({ ...base, upStop: "top", downStop: "bottom" }).buttons;
    expect([up.top, down.top]).toEqual([16, 16 + 600 - 32]);
  });

  it("pushes neighbouring stops in a short pane to exactly one gap apart, inside the room", () => {
    const [up, down] = layout({ ...base, height: 132, upStop: "middle", downStop: "lower-middle" }).buttons; // room 100
    expect(down.top - up.top).toBe(32 + 6);
    expect(up.top).toBeGreaterThanOrEqual(16);
    expect(down.top + 32).toBeLessThanOrEqual(16 + 100);
  });

  it("slides a pushed-apart pair back inside the room", () => {
    const [up, down] = layout({ ...base, height: 132, upStop: "lower-middle", downStop: "bottom" }).buttons;
    expect(down.top + 32).toBe(16 + 100);
    expect(down.top - up.top).toBe(38);
  });

  it("leaves out what the status bar covers", () => {
    expect(layout({ ...base, cover: 24 }).buttons[1].top).toBe(16 + 576 - 32);
  });

  it("shrinks to fit a pane too short for two buttons, keeping the gap", () => {
    const l = layout({ ...base, height: 82 }); // room 50
    expect(l.width).toBe(22);
    expect(l.buttons[1].top - l.buttons[0].top).toBe(22 + 6);
  });

  it("shrinks a row to fit a narrow pane", () => {
    expect(layout({ ...base, buttons: "row", width: 80 }).width).toBe(21); // (80 − 32 − 6) / 2
  });

  it("keeps the chosen size where it fits", () => {
    expect(layout({ ...base, buttons: "up", height: 64 }).width).toBe(32);
  });

  it("returns only the arrows asked for", () => {
    expect(layout({ ...base, buttons: "down" }).buttons.map((b) => b.edge)).toEqual(["bottom"]);
  });

  it("uses the shared stop for ↓ alone", () => {
    expect(layout({ ...base, buttons: "down", sharedStop: "top", downStop: "bottom" }).buttons[0].top).toBe(16);
  });
});

describe("layout of the new choices", () => {
  it("places a side-by-side pair at the shared stop", () => {
    const tops = layout({ ...base, buttons: "row", sharedStop: "top", upStop: "bottom" }).buttons.map((b) => b.top);
    expect(tops).toEqual([16, 16]);
  });

  it("fills a room of any height exactly at 50 %", () => {
    const l = layout({ ...base, heightPct: 50, height: 632.6 });
    expect(l.buttons[0].top).toBe(16);
    expect(l.buttons[1].top + l.height).toBeCloseTo(16 + 600.6);
  });

  it("fills each half at 50 % stacked", () => {
    const l = layout({ ...base, heightPct: 50 });
    expect(l.height).toBe(297);
    expect(l.buttons.map((b) => b.top)).toEqual([16, 16 + 297 + 6]);
  });

  it("keeps 50 % halves apart and above the status bar in a short pane", () => {
    const l = layout({ ...base, heightPct: 50, height: 232, cover: 40 }); // room 160
    const [up, down] = l.buttons;
    expect(l.height).toBe(77);
    expect(down.top + 77).toBeLessThanOrEqual(16 + 160);
    expect(down.top - (up.top + 77)).toBe(6);
  });

  it("makes one arrow half the room tall at its stop", () => {
    const l = layout({ ...base, buttons: "down", heightPct: 50 });
    expect(l.height).toBe(300);
    expect(l.buttons[0].top).toBe(16 + 300);
  });

  it("never makes a button shorter than it is wide", () => {
    expect(layout({ ...base, heightPct: 5 }).height).toBe(32);
  });

  it("pushes tall buttons on neighbouring stops one gap apart", () => {
    const [up, down] = layout({ ...base, heightPct: 30, upStop: "middle", downStop: "lower-middle" }).buttons;
    expect(down.top - up.top).toBeCloseTo((600 - 6) * 0.3 + 6);
  });
});

describe("previewHeight", () => {
  const preview = { buttonWidth: 32, heightPct: 0, buttons: "up" as const, tileRoom: 200 };

  it("is the width at Auto", () => {
    expect(previewHeight(preview)).toBe(32);
  });

  it("takes Height's share of the tile, as it would of a note", () => {
    expect(previewHeight({ ...preview, heightPct: 25 })).toBe(50);
    expect(previewHeight({ ...preview, heightPct: 50, buttons: "stacked" })).toBe(97);
  });

  it("never draws a button shorter than it is wide", () => {
    expect(previewHeight({ ...preview, heightPct: 5 })).toBe(32);
  });

  it("keeps side by side as tall as wide", () => {
    expect(previewHeight({ ...preview, heightPct: 50, buttons: "row" })).toBe(32);
  });
});

describe("resolveSide", () => {
  it("puts Auto where lines end", () => {
    expect(resolveSide("auto", false)).toBe("right");
    expect(resolveSide("auto", true)).toBe("left");
    expect(resolveSide("left", false)).toBe("left");
    expect(resolveSide("right", true)).toBe("right");
  });
});

describe("coveredBelow", () => {
  const host = { left: 0, top: 0, right: 800, bottom: 600 };
  const bar = { left: 500, top: 576, right: 800, bottom: 600 };

  it("is the bar's height when it sits over the buttons' side", () => {
    expect(coveredBelow(host, bar, "right", 64)).toBe(24);
  });

  it("is 0 for buttons on the left, clear of the bar", () => {
    expect(coveredBelow(host, bar, "left", 64)).toBe(0);
  });

  it("is 0 for a pane the bar is not over", () => {
    expect(coveredBelow({ ...host, right: 400 }, bar, "right", 64)).toBe(0);
  });

  it("is 0 with no bar, or a hidden one", () => {
    expect(coveredBelow(host, null, "right", 64)).toBe(0);
    expect(coveredBelow(host, { left: 0, top: 0, right: 0, bottom: 0 }, "right", 64)).toBe(0);
  });

  it("is 0 for a bar below the pane", () => {
    expect(coveredBelow({ ...host, bottom: 500 }, bar, "right", 64)).toBe(0);
  });
});

describe("overlaps", () => {
  const box = { left: 100, top: 100, right: 132, bottom: 132 };

  it("is true when a cursor sits inside a button", () => {
    expect(overlaps(box, { left: 110, top: 105, right: 111, bottom: 125 })).toBe(true);
  });

  it("is true when a cursor sticks out past a button's edge", () => {
    expect(overlaps(box, { left: 110, top: 125, right: 111, bottom: 145 })).toBe(true);
  });

  it("is false beside, above or below a button", () => {
    expect(overlaps(box, { left: 90, top: 105, right: 91, bottom: 125 })).toBe(false);
    expect(overlaps(box, { left: 110, top: 70, right: 111, bottom: 90 })).toBe(false);
    expect(overlaps(box, { left: 110, top: 140, right: 111, bottom: 160 })).toBe(false);
  });

  it("is false when they only touch", () => {
    expect(overlaps(box, { left: 132, top: 105, right: 133, bottom: 125 })).toBe(false);
  });
});
