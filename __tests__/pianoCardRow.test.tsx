import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ReactTestInstance } from "react-test-renderer";
import Svg, { Path } from "react-native-svg";
import PianoCard from "@/components/PianoCard";
import PianoRow from "@/components/PianoRow";
import SelectionMark from "@/components/SelectionMark";
import { Badge, PianoPhoto } from "@/components/ui";
import { ICONS } from "@/components/ui/Icon";
import { lightColors as colors, fonts } from "@/constants/theme";
import { findAllMemo, hostByTestId, mount, textContent } from "./helpers/ui";
import { makePiano } from "./helpers/fixtures";

type Mounted = Awaited<ReturnType<typeof mount>>;
const flat = (style: unknown) => StyleSheet.flatten(style as any);
const hasAncestor = (
  node: ReactTestInstance,
  matches: (ancestor: ReactTestInstance) => boolean
) => {
  for (let up = node.parent; up; up = up.parent) if (matches(up)) return true;
  return false;
};

// Every date is counted from this day
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
});
afterEach(() => {
  jest.useRealTimers();
});

const overdue = makePiano({
  $id: "weber",
  title: "Weber W-121",
  company_associated: "RS Music Center",
  category: "rentable",
  rental_price: 5000,
  rental_period_end: "2026-09-11" as any,
});
const comfortable = makePiano({
  $id: "samick",
  title: "Samick SU-118",
  company_associated: "Kirpalsons",
  category: "rentable",
  rental_price: 3800,
  rental_period_end: "2026-10-11" as any,
});
const endingSoon = makePiano({
  $id: "schimmel",
  title: "Schimmel W114",
  company_associated: "Shamshersons",
  category: "rentable",
  rental_price: 6200,
  rental_period_end: "2026-10-02" as any,
});
const stored = makePiano({
  $id: "ronish",
  title: "Ronish R-112",
  company_associated: "The Piano Services",
  category: "warehouse",
  warehouse_since_date: "2026-03-14" as any,
});

describe("PianoCard", () => {
  const setup = (
    item = comfortable,
    props: Partial<React.ComponentProps<typeof PianoCard>> = {}
  ) => {
    const handlers = { onOpen: jest.fn(), onToggle: jest.fn(), onSelectStart: jest.fn() };
    return {
      ...handlers,
      mounted: mount(<PianoCard item={item} {...handlers} {...props} />),
    };
  };
  const card = (renderer: Mounted) => renderer.root.findByType(Pressable);
  // The card's own lines: not the badge's label (that is inside the photo), nor
  // the bold price inside the price line
  const lines = (renderer: Mounted) =>
    card(renderer)
      .findAllByType(Text)
      .filter(
        (text) =>
          !hasAncestor(text, (node) => node.type === Text) &&
          !hasAncestor(text, (node) => node.type === (PianoPhoto as any).type)
      );
  const badge = (renderer: Mounted) => findAllMemo(renderer.root, Badge)[0]?.props;

  it("has the photo first, 169 high with radius 16, then the title and company", async () => {
    const renderer = await setup().mounted;
    const photo = renderer.root.find(
      (node) => typeof node.type === "string" && flat(node.props.style)?.height === 169
    );

    expect(flat(photo.props.style)).toMatchObject({ height: 169, borderRadius: 16, overflow: "hidden" });
    const [title, company] = lines(renderer);
    expect(textContent(title)).toBe("Samick SU-118");
    expect(flat(title.props.style)).toMatchObject({
      fontFamily: fonts.semibold,
      fontSize: 15,
      lineHeight: 20,
      marginTop: 10,
    });
    expect(textContent(company)).toBe("Kirpalsons");
    expect(flat(company.props.style)).toMatchObject({ fontSize: 14, lineHeight: 20, color: colors.ink2 });
    expect(title.props.numberOfLines).toBe(1);
  });

  it("shows the cover photo, cropped to fill", async () => {
    const renderer = await setup().mounted;
    const image = renderer.root.findByType(Image);

    expect(image.props.source).toEqual({ uri: comfortable.image_url });
    expect(image.props.contentFit).toBe("cover");
  });

  it("draws the piano instead when there is no photo", async () => {
    const renderer = await setup(makePiano({ ...comfortable, image_url: "", image_urls: [] })).mounted;

    expect(renderer.root.findAllByType(Image)).toHaveLength(0);
    expect(renderer.root.findAllByType(Svg).some((svg) => svg.props.viewBox === "0 0 160 160")).toBe(true);
  });

  it("says the price in bold and the time left in grey after it", async () => {
    const renderer = await setup().mounted;
    const line = lines(renderer)[2];
    const price = line.findAllByType(Text)[1];

    expect(textContent(line)).toBe("₹3,800 · 12 days left");
    expect(flat(price.props.style)).toMatchObject({
      fontFamily: fonts.bold,
      color: colors.ink,
      fontVariant: ["tabular-nums"],
    });
    expect(flat(line.props.style)).toMatchObject({ fontSize: 14, color: colors.ink2 });
  });

  it("puts a red badge on the photo, and only the price below, for an overdue rental", async () => {
    const renderer = await setup(overdue).mounted;

    expect(badge(renderer)).toMatchObject({ tone: "late", label: "Overdue · 18 days", onPhoto: true });
    expect(textContent(lines(renderer)[2])).toBe("₹5,000");
  });

  it("puts a white badge on the photo for a rental ending soon", async () => {
    const renderer = await setup(endingSoon).mounted;

    expect(badge(renderer)).toMatchObject({ tone: "soon", label: "Ends in 3 days", onPhoto: true });
  });

  it("has no badge for a rental with time left", async () => {
    const renderer = await setup().mounted;

    expect(badge(renderer)).toBeUndefined();
  });

  it("puts the category's icon in a white 30 px circle in the corner", async () => {
    const renderer = await setup().mounted;
    const circle = hostByTestId(renderer.root, "category-icon");

    expect(flat(circle.props.style)).toMatchObject({
      position: "absolute",
      top: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.white,
    });
    expect(circle.findAllByType(Path)[0].props.d).toBe(ICONS.categoryRentable[0].d);
    expect(circle.findByType(Svg).props).toMatchObject({ width: 16, height: 16, stroke: colors.ink });
  });

  it("says where a warehouse piano is stored, where the price would be", async () => {
    const renderer = await setup(stored).mounted;

    expect(textContent(lines(renderer)[2])).toBe("Stored since Mar 2026");
    // No bold price in it
    expect(lines(renderer)[2].findAllByType(Text)).toHaveLength(1);
  });

  it("leaves out the company line when there is no company", async () => {
    const renderer = await setup(makePiano({ ...comfortable, company_associated: null })).mounted;

    expect(lines(renderer).map(textContent)).toEqual(["Samick SU-118", "₹3,800 · 12 days left"]);
  });

  it("opens the piano when pressed, and starts choosing pianos on a long press", async () => {
    const { mounted, onOpen, onToggle, onSelectStart } = setup();
    const renderer = await mounted;

    card(renderer).props.onPress();
    card(renderer).props.onLongPress();

    expect(onOpen).toHaveBeenCalledWith("samick");
    expect(onSelectStart).toHaveBeenCalledWith("samick");
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("dims a little while pressed", async () => {
    const renderer = await setup().mounted;
    const style = card(renderer).props.style;

    expect(flat(style({ pressed: true })).opacity).toBe(0.9);
    expect(flat(style({ pressed: false })).opacity).toBeUndefined();
  });

  it("is one button that reads the piano out in full", async () => {
    const renderer = await setup(overdue).mounted;

    expect(card(renderer).props).toMatchObject({
      accessibilityRole: "button",
      accessibilityLabel: "Weber W-121, RS Music Center, ₹5,000, Overdue · 18 days",
      accessibilityHint: "Opens this piano",
    });
    expect(card(renderer).props.accessibilityState).toBeUndefined();
  });

  describe("while choosing pianos", () => {
    it("chooses instead of opening when pressed, and a long press does nothing more", async () => {
      const { mounted, onOpen, onToggle } = setup(comfortable, { selecting: true });
      const renderer = await mounted;

      card(renderer).props.onPress();

      expect(onToggle).toHaveBeenCalledWith("samick");
      expect(onOpen).not.toHaveBeenCalled();
      expect(card(renderer).props.onLongPress).toBeUndefined();
    });

    it("shows an empty circle on a piano that isn't chosen", async () => {
      const renderer = await setup(comfortable, { selecting: true, selected: false }).mounted;
      const mark = hostByTestId(renderer.root, "selection-mark");

      expect(flat(mark.props.style)).toMatchObject({
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: colors.white,
        backgroundColor: "rgba(255, 255, 255, 0.7)",
      });
    });

    it("rings the photo in ink and ticks it on a piano that is chosen", async () => {
      const renderer = await setup(comfortable, { selecting: true, selected: true }).mounted;
      const mark = hostByTestId(renderer.root, "selection-mark");

      expect(flat(mark.props.style)).toMatchObject({ borderWidth: 3, borderColor: colors.ink, borderRadius: 16 });
      const check = renderer.root.findAllByType(Path).find((path) => path.props.d === ICONS.check[0].d);
      expect(check).toBeTruthy();
      expect(renderer.root.findAllByType(Svg).find((svg) => svg.props.strokeWidth === 3)?.props).toMatchObject({
        stroke: colors.white,
        width: 16,
      });
    });

    it("hides the badge, the category icon and the price, keeping the title and company", async () => {
      const renderer = await setup(overdue, { selecting: true }).mounted;

      expect(badge(renderer)).toBeUndefined();
      expect(renderer.root.findAll((n) => n.props.testID === "category-icon")).toHaveLength(0);
      expect(lines(renderer).map(textContent)).toEqual(["Weber W-121", "RS Music Center"]);
    });

    it("tells a screen reader whether it is chosen, and what a press does", async () => {
      const chosen = await setup(comfortable, { selecting: true, selected: true }).mounted;
      const notChosen = await setup(comfortable, { selecting: true, selected: false }).mounted;

      expect(card(chosen).props.accessibilityState).toEqual({ selected: true });
      expect(card(notChosen).props.accessibilityState).toEqual({ selected: false });
      expect(card(chosen).props.accessibilityHint).toBe("Chooses this piano");
    });
  });
});

describe("PianoRow", () => {
  const setup = (
    item = comfortable,
    props: Partial<React.ComponentProps<typeof PianoRow>> = {}
  ) => {
    const handlers = { onOpen: jest.fn(), onToggle: jest.fn(), onSelectStart: jest.fn() };
    return {
      ...handlers,
      mounted: mount(<PianoRow item={item} {...handlers} {...props} />),
    };
  };
  const row = (renderer: Mounted) => renderer.root.findByType(Pressable);
  const texts = (renderer: Mounted) => renderer.root.findAllByType(Text);
  const styleOf = (renderer: Mounted, content: string) =>
    flat(texts(renderer).find((text) => textContent(text) === content)!.props.style);

  it("has a 64 px photo with radius 12 at the left, 20 px in", async () => {
    const renderer = await setup().mounted;
    const photo = renderer.root.find(
      (node) => typeof node.type === "string" && flat(node.props.style)?.width === 64
    );

    expect(flat(row(renderer).props.style({ pressed: false }))).toMatchObject({
      flexDirection: "row",
      paddingLeft: 20,
    });
    expect(flat(photo.props.style)).toMatchObject({ width: 64, height: 64, borderRadius: 12 });
    expect(renderer.root.findByType(Image).props.source).toEqual({ uri: comfortable.image_url });
  });

  it("says the title, then Category · Company, then the status", async () => {
    const renderer = await setup().mounted;

    expect(texts(renderer).map(textContent)).toEqual([
      "Samick SU-118",
      "Rentable · Kirpalsons",
      "12 days left",
      "₹3,800",
    ]);
    expect(styleOf(renderer, "Samick SU-118")).toMatchObject({
      fontFamily: fonts.semibold,
      fontSize: 16,
      lineHeight: 22,
    });
    expect(styleOf(renderer, "Rentable · Kirpalsons")).toMatchObject({
      fontSize: 14,
      color: colors.ink2,
    });
  });

  it("colours the status: red when overdue, orange when ending soon, grey otherwise", async () => {
    const late = await setup(overdue).mounted;
    const soon = await setup(endingSoon).mounted;
    const fine = await setup().mounted;

    expect(styleOf(late, "Overdue · 18 days")).toMatchObject({ color: colors.late, fontFamily: fonts.semibold });
    expect(styleOf(soon, "Ends in 3 days").color).toBe(colors.brandText);
    expect(styleOf(fine, "12 days left").color).toBe(colors.ink2);
  });

  it("has the price at the right end, in semibold with lining digits", async () => {
    const renderer = await setup(overdue).mounted;

    expect(styleOf(renderer, "₹5,000")).toMatchObject({
      fontFamily: fonts.semibold,
      fontSize: 16,
      fontVariant: ["tabular-nums"],
    });
  });

  it("puts a hairline under the text that starts at the text, not at the edge", async () => {
    const renderer = await setup().mounted;
    const content = renderer.root.find(
      (node) => typeof node.type === "string" && flat(node.props.style)?.borderBottomWidth === 1
    );

    expect(flat(content.props.style)).toMatchObject({
      borderBottomColor: colors.hairline,
      paddingRight: 20,
      gap: 12,
    });
  });

  it("says the category alone when there is no company, and has no price for a warehouse piano", async () => {
    const renderer = await setup(makePiano({ ...stored, company_associated: null })).mounted;

    expect(texts(renderer).map(textContent)).toEqual([
      "Ronish R-112",
      "Warehouse",
      "Stored since Mar 2026",
    ]);
  });

  it("opens the piano when pressed, and starts choosing on a long press", async () => {
    const { mounted, onOpen, onSelectStart } = setup();
    const renderer = await mounted;

    row(renderer).props.onPress();
    row(renderer).props.onLongPress();

    expect(onOpen).toHaveBeenCalledWith("samick");
    expect(onSelectStart).toHaveBeenCalledWith("samick");
  });

  it("goes light grey while pressed", async () => {
    const renderer = await setup().mounted;

    expect(flat(row(renderer).props.style({ pressed: true })).backgroundColor).toBe(colors.grouped);
  });

  it("is one button that reads the piano out in full", async () => {
    const renderer = await setup(overdue).mounted;

    expect(row(renderer).props).toMatchObject({
      accessibilityRole: "button",
      accessibilityLabel: "Weber W-121, Rentable, RS Music Center, Overdue · 18 days, ₹5,000",
    });
  });

  describe("while choosing pianos", () => {
    it("chooses instead of opening", async () => {
      const { mounted, onOpen, onToggle } = setup(comfortable, { selecting: true });
      const renderer = await mounted;

      row(renderer).props.onPress();

      expect(onToggle).toHaveBeenCalledWith("samick");
      expect(onOpen).not.toHaveBeenCalled();
      expect(row(renderer).props.onLongPress).toBeUndefined();
    });

    it("shows a circle at the end in place of the price, filled and ticked when chosen", async () => {
      const notChosen = await setup(comfortable, { selecting: true, selected: false }).mounted;
      const chosen = await setup(comfortable, { selecting: true, selected: true }).mounted;

      expect(texts(notChosen).map(textContent)).not.toContain("₹3,800");
      expect(flat(hostByTestId(notChosen.root, "selection-mark").props.style)).toMatchObject({
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: colors.inputBorder,
      });
      expect(flat(hostByTestId(chosen.root, "selection-mark").props.style).backgroundColor).toBe(colors.ink);
      expect(chosen.root.findAllByType(Path)[0].props.d).toBe(ICONS.check[0].d);
      expect(row(chosen).props.accessibilityState).toEqual({ selected: true });
    });
  });
});

describe("SelectionMark", () => {
  it("draws nothing extra over a photo until it is chosen", async () => {
    const renderer = await mount(<SelectionMark selected={false} />);

    expect(renderer.root.findAllByType(Svg)).toHaveLength(0);
    expect(renderer.root.findAllByType(View).length).toBeGreaterThan(0);
  });

  it("does not catch touches, so the card underneath still gets them", async () => {
    const chosen = await mount(<SelectionMark selected />);
    const notChosen = await mount(<SelectionMark selected={false} />);

    expect(hostByTestId(chosen.root, "selection-mark").props.pointerEvents).toBe("none");
    expect(hostByTestId(notChosen.root, "selection-mark").props.pointerEvents).toBe("none");
  });
});
