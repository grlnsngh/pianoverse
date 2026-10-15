import {
  cleanDesign,
  colourById,
  DEFAULT_DESIGN,
  designSummary,
  effectiveStyle,
  EMPTY_LETTERHEAD,
  initialsOf,
  LETTERHEAD_COLOURS,
  LETTERHEAD_TEMPLATES,
  mmToPx,
} from "@/utils/letterhead";

/** The letterhead's design (canvas page "Letterhead"): what is kept, what is allowed, what is printed. */

const tps = { ...EMPTY_LETTERHEAD, business: "The Piano Services" };

describe("the choices", () => {
  it("has five designs and eight colours", () => {
    expect(LETTERHEAD_TEMPLATES.map((template) => template.name)).toEqual([
      "Monogram",
      "Classic",
      "Modern",
      "Band",
      "Minimal",
    ]);
    expect(LETTERHEAD_COLOURS.map((colour) => colour.name)).toEqual([
      "Copper",
      "Navy",
      "Teal",
      "Forest",
      "Maroon",
      "Plum",
      "Gold",
      "Ink",
    ]);
    expect(colourById("navy").accent).toBe("#1F3A5F");
    expect(colourById("nonsense").id).toBe("copper");
  });

  it("starts as Monogram in copper, with the details in the serif", () => {
    expect(DEFAULT_DESIGN).toMatchObject({ style: "make", template: "monogram", colour: "copper", elegant: true, logo: null });
    expect(DEFAULT_DESIGN.printed).toEqual({ top: 45, bottom: 15 });
    expect(DEFAULT_DESIGN.upload).toEqual({ image: null, kind: "page", top: 54, bottom: 18 });
  });
});

describe("a stored design", () => {
  it("keeps what is allowed and puts the default where something isn't", () => {
    expect(
      cleanDesign({
        style: "upload",
        template: "band",
        colour: "teal",
        elegant: false,
        upload: { image: { file: "letterhead-1.jpg", width: 1240, height: 1754 }, kind: "strip", top: 40, bottom: 20 },
        printed: { top: 30, bottom: 10 },
      })
    ).toEqual({
      style: "upload",
      template: "band",
      colour: "teal",
      elegant: false,
      logo: null,
      upload: { image: { file: "letterhead-1.jpg", width: 1240, height: 1754 }, kind: "strip", top: 40, bottom: 20 },
      printed: { top: 30, bottom: 10 },
    });
    expect(cleanDesign({ style: "wild", template: "fancy", colour: "rainbow", elegant: "yes" })).toEqual(DEFAULT_DESIGN);
    expect(cleanDesign(null)).toEqual(DEFAULT_DESIGN);
  });

  it("keeps the spaces inside what the sliders allow, in whole millimetres", () => {
    const design = cleanDesign({ printed: { top: 200, bottom: -5 }, upload: { top: 2, bottom: 33.6 } });

    expect(design.printed).toEqual({ top: 90, bottom: 0 });
    expect(design.upload).toMatchObject({ top: 10, bottom: 34 });
  });

  it("trusts an image only when it names a plain file in the letterhead folder and has a size", () => {
    expect(cleanDesign({ logo: { file: "../secrets.png", width: 10, height: 10 } }).logo).toBeNull();
    expect(cleanDesign({ logo: { file: ".hidden.png", width: 10, height: 10 } }).logo).toBeNull();
    expect(cleanDesign({ logo: { file: "logo-1.png", width: 0, height: 10 } }).logo).toBeNull();
    expect(cleanDesign({ logo: { file: "logo-1.png", width: 600.4, height: 400 } }).logo).toEqual({
      file: "logo-1.png",
      width: 600,
      height: 400,
    });
  });
});

describe("what is really printed", () => {
  it("prints a made letterhead only with a business name, and lines to write on without one", () => {
    expect(effectiveStyle(DEFAULT_DESIGN, tps)).toBe("make");
    expect(effectiveStyle(DEFAULT_DESIGN, EMPTY_LETTERHEAD)).toBe("lines");
  });

  it("prints nothing at the top for Upload mine until there is an image", () => {
    const upload = { ...DEFAULT_DESIGN, style: "upload" as const };

    expect(effectiveStyle(upload, tps)).toBe("none");
    expect(
      effectiveStyle({ ...upload, upload: { ...upload.upload, image: { file: "a.jpg", width: 1, height: 1 } } }, tps)
    ).toBe("upload");
    expect(effectiveStyle({ ...DEFAULT_DESIGN, style: "printed" }, tps)).toBe("printed");
    expect(effectiveStyle({ ...DEFAULT_DESIGN, style: "none" }, tps)).toBe("none");
  });

  it("says in one line what the letterhead is", () => {
    expect(designSummary(DEFAULT_DESIGN, tps)).toBe("Monogram · The Piano Services");
    expect(designSummary({ ...DEFAULT_DESIGN, template: "band" }, EMPTY_LETTERHEAD)).toBe("Band · add your business name");
    expect(designSummary({ ...DEFAULT_DESIGN, style: "none" }, tps)).toBe("None · just the document");
    expect(designSummary({ ...DEFAULT_DESIGN, style: "printed" }, tps)).toBe("My printed paper · top 45 mm left empty");
    expect(designSummary({ ...DEFAULT_DESIGN, style: "upload" }, tps)).toBe("Upload mine · no image yet");
  });
});

describe("small helpers", () => {
  it("makes initials from the first three words", () => {
    expect(initialsOf("The Piano Services")).toBe("TPS");
    expect(initialsOf("sharma music house and sons")).toBe("SMH");
    expect(initialsOf("  Tune   &  Play ")).toBe("TP");
    expect(initialsOf("")).toBe("");
  });

  it("turns millimetres into the page's pixels", () => {
    expect(mmToPx(25.4)).toBe(96);
    expect(mmToPx(45)).toBe(170);
  });
});
