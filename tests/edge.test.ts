import { edgePosition } from "../src/edge";

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
