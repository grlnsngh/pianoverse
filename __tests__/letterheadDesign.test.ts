import {
  BEHIND_STRENGTH,
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
  PICTURE_LIMITS,
  printedPicture,
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
    expect(DEFAULT_DESIGN.upload).toEqual({ image: null, kind: "page", top: 54, bottom: 18, strength: 100 });
  });

  it("has the grand piano at the top right, at its own size and full strength (as on TPS 2)", () => {
    expect(DEFAULT_DESIGN.picture).toEqual({ source: "piano", image: null, place: "right", size: 100, strength: 100 });
    expect(PICTURE_LIMITS).toEqual({ size: [60, 130], strength: [10, 100] });
    expect(BEHIND_STRENGTH).toBe(15);
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
        picture: { source: "own", image: { file: "picture-1.jpg", width: 800, height: 600 }, place: "behind", size: 70, strength: 20 },
        upload: { image: { file: "letterhead-1.jpg", width: 1240, height: 1754 }, kind: "strip", top: 40, bottom: 20, strength: 55 },
        printed: { top: 30, bottom: 10 },
      })
    ).toEqual({
      style: "upload",
      template: "band",
      colour: "teal",
      elegant: false,
      logo: null,
      picture: { source: "own", image: { file: "picture-1.jpg", width: 800, height: 600 }, place: "behind", size: 70, strength: 20 },
      upload: { image: { file: "letterhead-1.jpg", width: 1240, height: 1754 }, kind: "strip", top: 40, bottom: 20, strength: 55 },
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

  it("gives a design saved before pictures existed the grand piano, and keeps a picture's numbers in range", () => {
    // The owner's letterhead from before Batch 47 had no picture and no strength for the upload
    const old = cleanDesign({ style: "make", template: "monogram", upload: { kind: "page", top: 32, bottom: 19 } });
    expect(old.picture).toEqual(DEFAULT_DESIGN.picture);
    expect(old.upload.strength).toBe(100);

    expect(cleanDesign({ picture: { source: "sticker", place: "above", size: 500, strength: 1 } }).picture).toEqual({
      source: "piano",
      image: null,
      place: "right",
      size: 130,
      strength: 10,
    });
    expect(cleanDesign({ picture: { image: { file: "../x.png", width: 5, height: 5 } } }).picture.image).toBeNull();
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

  it("prints a picture only on a made letterhead, and the person's own only once it is chosen", () => {
    expect(printedPicture(DEFAULT_DESIGN)).toEqual(DEFAULT_DESIGN.picture);
    expect(printedPicture({ ...DEFAULT_DESIGN, style: "upload" })).toBeNull();
    expect(printedPicture({ ...DEFAULT_DESIGN, style: "none" })).toBeNull();
    expect(printedPicture({ ...DEFAULT_DESIGN, picture: { ...DEFAULT_DESIGN.picture, source: "none" } })).toBeNull();
    expect(printedPicture({ ...DEFAULT_DESIGN, picture: { ...DEFAULT_DESIGN.picture, source: "own" } })).toBeNull();
    const own = { ...DEFAULT_DESIGN.picture, source: "own" as const, image: { file: "picture-1.jpg", width: 8, height: 6 } };
    expect(printedPicture({ ...DEFAULT_DESIGN, picture: own })).toEqual(own);
  });

  it("says in one line what the letterhead is", () => {
    expect(designSummary(DEFAULT_DESIGN, tps)).toBe("Monogram · The Piano Services");
    expect(designSummary({ ...DEFAULT_DESIGN, template: "band" }, EMPTY_LETTERHEAD)).toBe("Band · add your business name");
    expect(designSummary({ ...DEFAULT_DESIGN, style: "none" }, tps)).toBe("No letterhead · just the document");
    expect(designSummary({ ...DEFAULT_DESIGN, style: "printed" }, tps)).toBe("Printed letterhead paper · 45 mm left empty at the top");
    expect(designSummary({ ...DEFAULT_DESIGN, style: "upload" }, tps)).toBe("My own letterhead image · none chosen yet");
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
