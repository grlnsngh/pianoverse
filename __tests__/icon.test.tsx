import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import Icon, { ICONS, IconName } from "@/components/ui/Icon";
import { colors } from "@/constants/theme";

const render = (element: React.ReactElement) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
};

const svgOf = (renderer: ReactTestRenderer) => renderer.root.findByType(Svg);
const pathsOf = (renderer: ReactTestRenderer) =>
  renderer.root.findAllByType(Path).map((node) => node.props.d as string);

const names = Object.keys(ICONS) as IconName[];

describe("Icon set", () => {
  it("has every icon in the spec", () => {
    expect(names.sort()).toEqual(
      [
        "search",
        "sliders",
        "plus",
        "chevronRight",
        "chevronLeft",
        "chevronDown",
        "check",
        "close",
        "more",
        "share",
        "phone",
        "message",
        "tabToday",
        "tabPianos",
        "tabAccount",
        "categoryAll",
        "categoryRentable",
        "categoryEvents",
        "categoryOnSale",
        "categoryWarehouse",
        "bell",
        "download",
        "logout",
        "wifiOff",
        "camera",
        "cameraOff",
        "refresh",
        "alert",
        "list",
        "pencil",
        "trash",
      ].sort()
    );
  });

  it("draws every icon with at least one shape, and only well-formed paths", () => {
    const pathData = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s-]+$/;
    for (const name of names) {
      const renderer = render(<Icon name={name} />);
      const shapes =
        renderer.root.findAllByType(Path).length +
        renderer.root.findAllByType(Circle).length +
        renderer.root.findAllByType(Rect).length;
      expect(shapes).toBeGreaterThan(0);
      for (const d of pathsOf(renderer)) {
        expect(d).toMatch(pathData);
      }
    }
  });

  it("gives every path a start point, so it can't draw from nowhere", () => {
    for (const name of names) {
      for (const d of pathsOf(render(<Icon name={name} />))) {
        expect(d).toMatch(/^[Mm]/);
      }
    }
  });
});

describe("Icon", () => {
  it("is 24 x 24 with round strokes in ink at weight 1.75", () => {
    const svg = svgOf(render(<Icon name="search" />));

    expect(svg.props).toMatchObject({
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: colors.ink,
      strokeWidth: 1.75,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    });
  });

  it("scales to any size and keeps the 24 unit grid", () => {
    const svg = svgOf(render(<Icon name="search" size={40} />));

    expect(svg.props).toMatchObject({ width: 40, height: 40, viewBox: "0 0 24 24" });
  });

  it("takes a colour", () => {
    const svg = svgOf(render(<Icon name="alert" color={colors.late} />));

    expect(svg.props.stroke).toBe(colors.late);
  });

  it("is drawn heavier, at 2, when active", () => {
    expect(svgOf(render(<Icon name="tabToday" active />)).props.strokeWidth).toBe(2);
    expect(svgOf(render(<Icon name="tabToday" active={false} />)).props.strokeWidth).toBe(1.75);
  });

  it("draws the search icon as a lens and a handle", () => {
    const renderer = render(<Icon name="search" />);

    expect(renderer.root.findAllByType(Circle).map((c) => c.props)).toEqual([
      expect.objectContaining({ cx: 11, cy: 11, r: 7 }),
    ]);
    expect(pathsOf(renderer)).toEqual(["m20 20-3.5-3.5"]);
  });

  it("draws the sliders icon as two tracks and two knobs", () => {
    const renderer = render(<Icon name="sliders" />);

    expect(pathsOf(renderer)).toEqual(["M4 7h10M18 7h2M4 17h2M10 17h10"]);
    expect(renderer.root.findAllByType(Circle).map((c) => [c.props.cx, c.props.cy, c.props.r])).toEqual([
      [16, 7, 2],
      [8, 17, 2],
    ]);
  });

  it("draws the tab icons with their rounded rectangles", () => {
    const today = render(<Icon name="tabToday" />).root.findByType(Rect).props;
    const pianos = render(<Icon name="tabPianos" />).root.findByType(Rect).props;

    expect(today).toMatchObject({ x: 3.5, y: 5, width: 17, height: 15.5, rx: 3 });
    expect(pianos).toMatchObject({ x: 3, y: 5, width: 18, height: 14, rx: 2.5 });
  });

  it("draws the more icon as three solid dots, not outlines", () => {
    const dots = render(<Icon name="more" color="#123456" />).root.findAllByType(Circle);

    expect(dots.map((dot) => [dot.props.cx, dot.props.cy, dot.props.r])).toEqual([
      [5, 12, 1.8],
      [12, 12, 1.8],
      [19, 12, 1.8],
    ]);
    for (const dot of dots) {
      expect(dot.props.fill).toBe("#123456");
      expect(dot.props.stroke).toBe("none");
    }
  });

  it("draws camera off as the camera with a slash", () => {
    const camera = pathsOf(render(<Icon name="camera" />));
    const off = pathsOf(render(<Icon name="cameraOff" />));

    expect(off).toEqual([...camera, "M3 3l18 18"]);
    expect(render(<Icon name="cameraOff" />).root.findAllByType(Circle)).toHaveLength(1);
  });

  it("is hidden from screen readers, because the button around it says what it does", () => {
    const svg = svgOf(render(<Icon name="plus" />));

    expect(svg.props.accessibilityElementsHidden).toBe(true);
    expect(svg.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(svg.props.accessible).toBeUndefined();
  });

  it("says what it is when it stands alone", () => {
    const svg = svgOf(render(<Icon name="alert" accessibilityLabel="Error" />));

    expect(svg.props).toMatchObject({
      accessible: true,
      accessibilityRole: "image",
      accessibilityLabel: "Error",
    });
    expect(svg.props.accessibilityElementsHidden).toBeUndefined();
  });
});
