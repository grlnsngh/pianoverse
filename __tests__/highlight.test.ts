import { splitMatches } from "@/utils/highlight";

describe("splitMatches", () => {
  it("returns the text whole when nothing was searched for", () => {
    expect(splitMatches("Yamaha U1", "")).toEqual([{ text: "Yamaha U1", match: false }]);
    expect(splitMatches("Yamaha U1", "   ")).toEqual([{ text: "Yamaha U1", match: false }]);
  });

  it("returns the text whole when nothing matches", () => {
    expect(splitMatches("Yamaha U1", "steinway")).toEqual([{ text: "Yamaha U1", match: false }]);
  });

  it("marks the match and keeps the text's own capitals", () => {
    expect(splitMatches("Yamaha U1", "AHA")).toEqual([
      { text: "Yam", match: false },
      { text: "aha", match: true },
      { text: " U1", match: false },
    ]);
  });

  it("marks every match", () => {
    expect(splitMatches("Kawai Kawai", "kawai")).toEqual([
      { text: "Kawai", match: true },
      { text: " ", match: false },
      { text: "Kawai", match: true },
    ]);
  });

  it("marks a match at the very start or end, with no empty pieces", () => {
    expect(splitMatches("Petrof", "pet")).toEqual([
      { text: "Pet", match: true },
      { text: "rof", match: false },
    ]);
    expect(splitMatches("Petrof", "rof")).toEqual([
      { text: "Pet", match: false },
      { text: "rof", match: true },
    ]);
    expect(splitMatches("Petrof", "petrof")).toEqual([{ text: "Petrof", match: true }]);
  });

  it("ignores spaces around the term, as the search does", () => {
    expect(splitMatches("Young Chang", "  chang ")).toEqual([
      { text: "Young ", match: false },
      { text: "Chang", match: true },
    ]);
  });

  it("treats characters that mean something in a pattern as plain letters", () => {
    expect(splitMatches("B-12/34 (old)", "(old)")).toEqual([
      { text: "B-12/34 ", match: false },
      { text: "(old)", match: true },
    ]);
    expect(splitMatches("Model D.2", ".")).toEqual([
      { text: "Model D", match: false },
      { text: ".", match: true },
      { text: "2", match: false },
    ]);
    expect(splitMatches("a+b", "+")).toEqual([
      { text: "a", match: false },
      { text: "+", match: true },
      { text: "b", match: false },
    ]);
  });

  it("copes with empty text", () => {
    expect(splitMatches("", "kawai")).toEqual([{ text: "", match: false }]);
  });
});
