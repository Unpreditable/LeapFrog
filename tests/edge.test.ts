import { easeInOut, edgePosition, isAtTarget, scrollForEnd, scrollPosition } from "../src/edge";

describe("isAtTarget", () => {
  it("is true on the target, give or take a rounded pixel", () => {
    expect(isAtTarget(2400, 2400, 5000)).toBe(true);
    expect(isAtTarget(2400.6, 2400, 5000)).toBe(true);
  });

  it("is false anywhere else", () => {
    expect(isAtTarget(2000, 2400, 5000)).toBe(false);
    expect(isAtTarget(0, 2400, 5000)).toBe(false);
  });

  it("is true as far as the note can scroll, when the target is past that", () => {
    expect(isAtTarget(1000, 2400, 1000)).toBe(true);
    expect(isAtTarget(900, 2400, 1000)).toBe(false);
  });

  it("is true for a note too short to scroll", () => {
    expect(isAtTarget(0, 0, 0)).toBe(true);
  });
});

describe("easeInOut", () => {
  it("starts and ends in place, and is halfway at the halfway point", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(1)).toBe(1);
  });

  it("moves slowly at first and fast in the middle", () => {
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(0.6)).toBeGreaterThan(0.6);
  });
});

describe("scrollPosition", () => {
  it("goes from the start to the target over the time given", () => {
    expect(scrollPosition(1000, 0, 0, 500)).toBe(1000);
    expect(scrollPosition(1000, 0, 250, 500)).toBeCloseTo(500);
    expect(scrollPosition(1000, 0, 500, 500)).toBe(0);
  });

  it("stays on the target once the time is up", () => {
    expect(scrollPosition(1000, 0, 900, 500)).toBe(0);
  });

  it("follows a target that moves on the way", () => {
    expect(scrollPosition(0, 2000, 250, 500)).toBeCloseTo(1000);
    expect(scrollPosition(0, 3000, 250, 500)).toBeCloseTo(1500);
  });
});

describe("scrollForEnd", () => {
  it("leaves a third of the view blank below the note's end", () => {
    expect(scrollForEnd(3000, 900)).toBe(2400);
  });

  it("stays at the top of a note that ends within two thirds of the view", () => {
    expect(scrollForEnd(500, 900)).toBe(0);
  });
});

describe("edgePosition", () => {
  it("puts the top at the start of the first line", () => {
    expect(edgePosition("top", 9, 12)).toEqual({ line: 0, ch: 0 });
  });

  it("puts the bottom at the end of the last line", () => {
    expect(edgePosition("bottom", 9, 12)).toEqual({ line: 9, ch: 12 });
  });

  it("puts both ends of an empty note in the same place", () => {
    expect(edgePosition("bottom", 0, 0)).toEqual(edgePosition("top", 0, 0));
  });
});
