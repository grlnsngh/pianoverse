import { DEFAULT_DESIGN, EMPTY_LETTERHEAD, LETTERHEAD_TEMPLATES, type LetterheadDesign } from "@/utils/letterhead";
import { agreementPages } from "@/utils/paperForms/agreements";
import { LETTERHEAD_PIANO } from "@/utils/paperForms/letterheadPiano";
import {
  fontsForDesign,
  formStrip,
  letterheadCss,
  letterheadFrame,
  NO_ASSETS,
  receiptMark,
} from "@/utils/paperForms/letterheads";

/** The letterheads drawn on the paper forms: the five designs, the business's own image, the pad, and none. */

const tps = {
  business: "The Piano Services",
  tagline: "Expert Piano Tuning",
  address: "163, Ground Floor, Tilak Nagar",
  phone: "98110 20513",
  email: "tps@example.com",
  gst: "07AAMFT8696F1ZF",
  pan: "AAMFT8696F",
};
const make = (template: LetterheadDesign["template"], extra: Partial<LetterheadDesign> = {}): LetterheadDesign => ({
  ...DEFAULT_DESIGN,
  style: "make",
  template,
  ...extra,
});
const logo = { logo: "data:image/png;base64,LOGO", image: null };
const image = { logo: null, image: "data:image/jpeg;base64,PAGE" };
const withUpload = (kind: "page" | "strip"): LetterheadDesign => ({
  ...DEFAULT_DESIGN,
  style: "upload",
  upload: {
    image: { file: "letterhead-1.jpg", width: 1240, height: kind === "page" ? 1754 : 300 },
    kind,
    top: 54,
    bottom: 18,
    strength: 100,
  },
});
const piano = { logo: null, image: null, picture: LETTERHEAD_PIANO.uri };
const withPicture = (template: LetterheadDesign["template"], picture: Partial<LetterheadDesign["picture"]> = {}) =>
  make(template, { picture: { ...DEFAULT_DESIGN.picture, ...picture } });
/** The picture's box in some HTML: its width and height in px. */
const picBoxes = (html: string) =>
  [...html.matchAll(/class="lh-pic" style="width:(\d+)px;height:(\d+)px/g)].map((m) => [Number(m[1]), Number(m[2])]);

describe("the five designs", () => {
  it("print every detail, escaped, in each design", () => {
    const details = { ...tps, business: "Tune & Play <Pianos>" };
    for (const { id } of LETTERHEAD_TEMPLATES) {
      const frame = letterheadFrame(make(id), details, NO_ASSETS);
      const html = frame.firstLayers + frame.restLayers + frame.restStrip;

      expect(frame.style).toBe("make");
      expect(html).toMatch(/Tune &amp; Play &lt;Pianos&gt;|TUNE &amp; PLAY &lt;PIANOS&gt;/);
      expect(html).not.toContain("<Pianos>");
      expect(html).toContain("98110 20513");
    }
  });

  it("put the full letterhead on page 1 and the small one on the pages after", () => {
    for (const { id } of LETTERHEAD_TEMPLATES) {
      const frame = letterheadFrame(make(id), tps, NO_ASSETS);

      expect(frame.firstLayers).toContain("163, Ground Floor, Tilak Nagar");
      expect(frame.restStrip).toContain("98110 20513");
      expect(frame.restStrip).not.toContain("163, Ground Floor");
      expect(frame.firstTop).toBeLessThanOrEqual(240);
      expect(frame.restTop).toBeLessThan(frame.firstTop);
    }
  });

  it("draws Monogram like TPS 2: big initials, the name over them, and a watermark on every page", () => {
    const frame = letterheadFrame(make("monogram"), tps, NO_ASSETS);

    expect(frame.firstLayers).toContain(">TPS</div>");
    expect(frame.firstLayers).toContain("THE PIANO SERVICES");
    expect(frame.firstLayers).toContain("font-size:300px");
    expect(frame.restLayers).toContain("font-size:300px");
    expect(frame.firstLayers).toContain("#F2CDB6");
  });

  it("shows the logo in Monogram's small letterhead when there is one, in place of the initials", () => {
    const withLogo = letterheadFrame(make("monogram", { logo: { file: "logo-1.png", width: 600, height: 400 } }), tps, logo);
    const without = letterheadFrame(make("monogram"), tps, NO_ASSETS);

    expect(withLogo.restStrip).toContain('class="lh-logo"');
    expect(withLogo.restStrip).not.toContain("font-size:42px");
    expect(withLogo.restStrip).toContain("THE PIANO SERVICES");
    expect(without.restStrip).not.toContain("lh-logo");
    expect(without.restStrip).toContain(">TPS</span>");
  });

  it("uses the colour chosen", () => {
    const frame = letterheadFrame(make("band", { colour: "navy" }), tps, NO_ASSETS);

    expect(frame.firstLayers).toContain("background:#1F3A5F");
    expect(frame.restStrip).toContain("background:#1F3A5F");
    // Band's contact strip runs along the bottom of every page, so the footer line sits above it
    expect(frame.restLayers).toContain("bottom:0;height:50px");
    expect(frame.footBottom).toBe(64);
  });

  it("shows the logo where the design has one, and the initials where there is none", () => {
    const withLogo = letterheadFrame(make("classic", { logo: { file: "logo-1.png", width: 600, height: 400 } }), tps, logo);
    const without = letterheadFrame(make("classic"), tps, NO_ASSETS);

    expect(withLogo.firstLayers).toContain('class="lh-logo"');
    expect(without.firstLayers).not.toContain("lh-logo");
    expect(without.firstLayers).toContain(">TPS</div>");
  });

  it("sets the details in Lora when the lettering is Elegant", () => {
    expect(letterheadFrame(make("modern", { elegant: true }), tps, NO_ASSETS).firstLayers).toContain("'Lora'");
    expect(letterheadFrame(make("modern", { elegant: false }), tps, NO_ASSETS).firstLayers).not.toContain("'Lora'");
  });

  it("shrinks a long name to fit on one line", () => {
    const long = { ...tps, business: "Sharma Brothers Pianos, Organs and Musical Instruments" };
    const frame = letterheadFrame(make("monogram"), long, NO_ASSETS);
    const size = Number(frame.firstLayers.match(/top:60px;font-size:(\d+)px/)?.[1]);

    expect(size).toBeLessThan(34);
    expect(size).toBeGreaterThanOrEqual(18);
  });
});

describe("the picture (Batch 47)", () => {
  it("puts the grand piano at the top right of Monogram, with the GST, PAN and e-mail under it, as on TPS 2", () => {
    const frame = letterheadFrame(make("monogram"), tps, piano);

    // 136 px tall, as wide as the photo's shape allows, level with the top of the header
    expect(frame.firstLayers).toContain('class="lh-pic" style="width:115px;height:136px;flex-shrink:0;position:absolute;right:48px;top:26px"');
    // The name stops short of it
    expect(frame.firstLayers).toContain("left:48px;right:187px;top:26px;height:196px");
    // Two columns under the name: what the business is on the left, its numbers on the right, under the piano
    const columns = frame.firstLayers.match(/<div style="min-width:0">(.*?)<\/div><\/div><div style="flex-shrink:0;text-align:right">(.*?)<\/div><\/div><\/div>/);
    expect(columns?.[1]).toContain("Mob.: 98110 20513");
    expect(columns?.[1]).not.toContain("GST");
    expect(columns?.[2]).toContain("GST No. 07AAMFT8696F1ZF");
    expect(columns?.[2]).toContain("PAN No. AAMFT8696F");
    expect(columns?.[2]).toContain("E-mail: tps@example.com");
    // The numbers start below the piano (26 + 136 + 8)
    expect(frame.firstLayers).toContain("left:52px;right:48px;top:170px;height:54px");
    expect(frame.firstTop).toBe(250);
    // Small in the strip of the pages after, and the initials still behind every page
    expect(picBoxes(frame.restStrip)).toEqual([[44, 52]]);
    expect(frame.restLayers).toContain("font-size:300px");
  });

  it("draws the picture in every design, at its side, without going over the writing", () => {
    for (const { id } of LETTERHEAD_TEMPLATES) {
      for (const place of ["right", "left"] as const) {
        const frame = letterheadFrame(withPicture(id, { place }), tps, piano);

        expect(picBoxes(frame.firstLayers)).toHaveLength(1);
        expect(picBoxes(frame.restStrip)).toHaveLength(1);
        const [[, height]] = picBoxes(frame.firstLayers);
        // The writing starts below the picture
        expect(frame.firstTop).toBeGreaterThan(height + 26);
      }
    }
  });

  it("keeps every agreement on two pages at any size the slider allows", () => {
    for (const { id } of LETTERHEAD_TEMPLATES) {
      for (const size of [60, 100, 130]) {
        for (const place of ["right", "left", "behind"] as const) {
          const design = withPicture(id, { size, place });
          expect([id, size, place, agreementPages("hotel", tps, design, piano).length]).toEqual([id, size, place, 2]);
          expect([id, size, place, agreementPages("private", tps, design, piano).length]).toEqual([id, size, place, 2]);
        }
      }
    }
  });

  it("grows and shrinks the picture with its size, keeping its shape, and pales it with its strength", () => {
    const [[w60, h60]] = picBoxes(letterheadFrame(withPicture("modern", { size: 60 }), tps, piano).firstLayers);
    const [[w130, h130]] = picBoxes(letterheadFrame(withPicture("modern", { size: 130 }), tps, piano).firstLayers);

    expect(h60).toBe(62);
    expect(h130).toBe(135);
    expect(w130 / h130).toBeCloseTo(w60 / h60, 1);
    expect(letterheadFrame(withPicture("modern", { strength: 40 }), tps, piano).firstLayers).toContain("opacity:0.4");
    expect(letterheadFrame(withPicture("modern"), tps, piano).firstLayers).not.toContain("opacity");
  });

  it("puts a wide picture, such as a logo banner, no wider than its room", () => {
    const wide = make("monogram", {
      picture: { ...DEFAULT_DESIGN.picture, source: "own", image: { file: "picture-1.png", width: 1000, height: 200 } },
    });

    expect(picBoxes(letterheadFrame(wide, tps, { ...piano, picture: "data:image/png;base64,WIDE" }).firstLayers)).toEqual([[260, 52]]);
  });

  it("puts a picture behind the writing faint on every page, instead of Monogram's initials", () => {
    const frame = letterheadFrame(withPicture("monogram", { place: "behind", strength: 15 }), tps, piano);

    for (const layers of [frame.firstLayers, frame.restLayers]) {
      expect(layers).toContain("mix-blend-mode:multiply");
      expect(layers).toContain("opacity:0.15");
      expect(layers).not.toContain("font-size:300px");
    }
    // Nothing beside the header or in the strip
    expect(picBoxes(frame.firstLayers)).toHaveLength(0);
    expect(picBoxes(frame.restStrip)).toHaveLength(0);
    expect(frame.firstTop).toBe(240);
  });

  it("draws nothing when there is no picture, or its image couldn't be read", () => {
    expect(letterheadFrame(withPicture("monogram", { source: "none" }), tps, piano).firstLayers).not.toContain("lh-pic");
    expect(letterheadFrame(withPicture("monogram"), tps, NO_ASSETS).firstLayers).not.toContain("lh-pic");
    // The person's own picture before one is chosen
    expect(letterheadFrame(withPicture("monogram", { source: "own" }), tps, piano).firstLayers).not.toContain("lh-pic");
    expect(letterheadFrame({ ...withPicture("monogram"), style: "printed" }, tps, piano).firstLayers).toBe("");
  });

  it("splits Classic's contacts and lets its tagline take two lines beside a big picture, so nothing is cut off", () => {
    const frame = letterheadFrame(withPicture("classic", { size: 130 }), tps, piano);

    expect(frame.firstLayers).toContain(">Mob. 98110 20513  ·  tps@example.com</div>");
    expect(frame.firstLayers).toContain(">GST No. 07AAMFT8696F1ZF  ·  PAN AAMFT8696F</div>");
  });

  it("sets the picture on a white card inside Band's coloured band", () => {
    const frame = letterheadFrame(withPicture("band"), tps, piano);

    expect(frame.firstLayers).toContain('padding:8px;border-radius:10px;background:#FFFFFF"><div class="lh-pic"');
    expect(frame.restStrip).toContain('padding:4px;border-radius:6px;background:#FFFFFF"><div class="lh-pic"');
  });

  it("puts the small picture on the forms and on each receipt", () => {
    expect(picBoxes(formStrip(withPicture("monogram"), tps, piano)?.html ?? "")).toEqual([[44, 52]]);
    expect(picBoxes(receiptMark(withPicture("monogram"), tps, piano) ?? "")).toEqual([[22, 26]]);
    expect(receiptMark(withPicture("monogram", { place: "behind" }), tps, piano)).not.toContain("lh-pic");
    expect(formStrip(withPicture("monogram", { place: "behind" }), tps, piano)?.html).toContain("mix-blend-mode:multiply");
  });

  it("writes the picture into the document once, as a CSS class", () => {
    const css = letterheadCss(piano);

    expect(css.split(LETTERHEAD_PIANO.uri)).toHaveLength(2);
    expect(css).toContain(".lh-pic{background:url(");
  });
});

describe("the other choices", () => {
  it("prints the business's own image on every page, its whole page or its top strip", () => {
    const page = letterheadFrame(withUpload("page"), tps, image);
    const strip = letterheadFrame(withUpload("strip"), tps, image);

    expect(page.style).toBe("upload");
    expect(page.firstLayers).toContain("lh-image");
    expect(page.firstLayers).toContain("height:1122px");
    expect(page.restLayers).toBe(page.firstLayers);
    // 54 mm down and 18 mm up, at 96 px to the inch
    expect(page.firstTop).toBe(204);
    expect(page.footBottom).toBe(68 + 4);
    // 1240 x 300 across the page's 794 px
    expect(strip.firstLayers).toContain("height:192px");
    expect(strip.footBottom).toBe(30);
  });

  it("never stretches the image out of shape, and pales it with its strength", () => {
    const square: LetterheadDesign = {
      ...withUpload("page"),
      upload: { ...withUpload("page").upload, image: { file: "letterhead-2.jpg", width: 750, height: 750 }, strength: 30 },
    };
    const frame = letterheadFrame(square, tps, image);

    // As wide as the page, as tall as its own shape makes it, from the top
    expect(frame.firstLayers).toContain("background-size:100% auto;background-position:top center");
    expect(frame.firstLayers).not.toContain("100% 100%");
    expect(frame.firstLayers).toContain("opacity:0.3");
    expect(letterheadFrame(withUpload("page"), tps, image).firstLayers).not.toContain("opacity");
  });

  it("leaves the top and bottom empty for a printed pad", () => {
    const frame = letterheadFrame({ ...DEFAULT_DESIGN, style: "printed", printed: { top: 45, bottom: 15 } }, tps, NO_ASSETS);

    expect(frame).toMatchObject({ style: "printed", firstLayers: "", restLayers: "", firstTop: 170, footBottom: 61 });
  });

  it("prints nothing for None, and for Upload mine without an image", () => {
    const none = letterheadFrame({ ...DEFAULT_DESIGN, style: "none" }, tps, NO_ASSETS);
    const noImage = letterheadFrame({ ...DEFAULT_DESIGN, style: "upload" }, tps, NO_ASSETS);

    expect(none).toMatchObject({ style: "none", firstLayers: "", firstTop: 52 });
    expect(noImage.style).toBe("none");
  });

  it("falls back to lines to write on when a letterhead is to be made but there is no name", () => {
    expect(letterheadFrame(DEFAULT_DESIGN, EMPTY_LETTERHEAD, NO_ASSETS).style).toBe("lines");
  });
});

describe("the small letterhead on the forms", () => {
  it("goes at the top of the rent card and handover for a made letterhead or an image, and not otherwise", () => {
    expect(formStrip(make("monogram"), tps, NO_ASSETS)?.html).toContain("THE PIANO SERVICES");
    expect(formStrip(withUpload("page"), tps, image)?.html).toContain("lh-image");
    expect(formStrip({ ...DEFAULT_DESIGN, style: "none" }, tps, NO_ASSETS)).toBeNull();
    expect(formStrip({ ...DEFAULT_DESIGN, style: "printed" }, tps, NO_ASSETS)).toBeNull();
    expect(formStrip(DEFAULT_DESIGN, EMPTY_LETTERHEAD, NO_ASSETS)).toBeNull();
  });

  it("goes on each receipt with the name and phone, or the image, and not otherwise", () => {
    const mark = receiptMark(make("modern"), tps, NO_ASSETS);

    expect(mark).toContain("THE PIANO SERVICES");
    expect(mark).toContain("Mob. 98110 20513");
    expect(receiptMark(withUpload("strip"), tps, image)).toContain("lh-image");
    expect(receiptMark({ ...DEFAULT_DESIGN, style: "none" }, tps, NO_ASSETS)).toBeNull();
  });
});

describe("what goes in the document once", () => {
  it("writes each image as one CSS class, however many pages use it", () => {
    const css = letterheadCss({ logo: "data:image/png;base64,LOGO", image: "data:image/jpeg;base64,PAGE" });

    expect(css.match(/LOGO/g)).toHaveLength(1);
    expect(css.match(/PAGE/g)).toHaveLength(1);
    expect(letterheadCss(NO_ASSETS)).not.toContain("url(");
  });

  it("asks for the fonts a design uses, and only those", () => {
    expect(fontsForDesign(make("monogram", { elegant: true }))).toEqual(["playfair400", "lora400"]);
    expect(fontsForDesign(make("classic", { elegant: false }))).toEqual(["playfair500"]);
    expect(fontsForDesign(make("band", { elegant: false }))).toEqual([]);
    expect(fontsForDesign({ ...DEFAULT_DESIGN, style: "none" })).toEqual([]);
  });
});
