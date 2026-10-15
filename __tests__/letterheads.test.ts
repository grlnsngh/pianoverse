import { DEFAULT_DESIGN, EMPTY_LETTERHEAD, LETTERHEAD_TEMPLATES, type LetterheadDesign } from "@/utils/letterhead";
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
  upload: { image: { file: "letterhead-1.jpg", width: 1240, height: kind === "page" ? 1754 : 300 }, kind, top: 54, bottom: 18 },
});

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
