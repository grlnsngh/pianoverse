import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text } from "react-native";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";
import {
  act,
  create,
  ReactTestRenderer,
  ReactTestRendererJSON,
} from "react-test-renderer";
import PianoPhoto, { paletteFor } from "@/components/ui/PianoPhoto";
import { pianoPalettes } from "@/constants/theme";

const render = (element: React.ReactElement) => {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
};

// PianoPhoto renders one root view, so the JSON is a single node, not a list
const frameOf = (renderer: ReactTestRenderer) =>
  renderer.toJSON() as ReactTestRendererJSON;
const photos = (renderer: ReactTestRenderer) => renderer.root.findAllByType(Image);
const drawings = (renderer: ReactTestRenderer) => renderer.root.findAllByType(Svg);
const rects = (renderer: ReactTestRenderer) =>
  renderer.root.findAllByType(Rect).map((node) => node.props);

const URI = "https://cloud.appwrite.io/v1/storage/files/abc/view";

describe("paletteFor", () => {
  it("gives the same colours to the same piano every time", () => {
    expect(paletteFor("66f1c2a9e0b3d4f5a6b7c8d9")).toBe(
      paletteFor("66f1c2a9e0b3d4f5a6b7c8d9")
    );
  });

  it("keeps each piano's look from one app version to the next", () => {
    // Pinned on purpose. Changing the hash or the order of the palettes
    // recolours every piano that has no photo.
    expect(
      ["piano-1", "piano-2", "piano-3", "piano-4", "piano-5", ""].map(
        (id) => paletteFor(id).name
      )
    ).toEqual(["walnut", "mahogany", "oak", "walnut", "ebony", "ebony"]);
  });

  it("picks from the five palettes and uses all of them", () => {
    const used = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const palette = paletteFor(`66f1c2a9e0b3d4f5a6b7${i.toString(16).padStart(4, "0")}`);
      expect(pianoPalettes).toContain(palette);
      used.add(palette.name);
    }
    expect([...used].sort()).toEqual(["ebony", "mahogany", "oak", "walnut", "white"]);
  });
});

describe("PianoPhoto with a photo", () => {
  it("shows the photo, cropped to fill, and no drawing", () => {
    const renderer = render(<PianoPhoto id="piano-1" uri={URI} />);

    expect(photos(renderer)).toHaveLength(1);
    expect(photos(renderer)[0].props.source).toEqual({ uri: URI });
    expect(photos(renderer)[0].props.contentFit).toBe("cover");
    expect(drawings(renderer)).toHaveLength(0);
  });

  it("can fit the photo inside the frame instead", () => {
    const renderer = render(<PianoPhoto id="piano-1" uri={URI} contentFit="contain" />);

    expect(photos(renderer)[0].props.contentFit).toBe("contain");
  });

  it("swaps in the drawing when the photo can't load", () => {
    const renderer = render(<PianoPhoto id="piano-1" uri={URI} />);

    act(() => photos(renderer)[0].props.onError());

    expect(photos(renderer)).toHaveLength(0);
    expect(drawings(renderer)).toHaveLength(1);
  });

  it("tries a piano's next photo after one has failed", () => {
    const renderer = render(<PianoPhoto id="piano-1" uri={URI} />);
    act(() => photos(renderer)[0].props.onError());

    act(() => renderer.update(<PianoPhoto id="piano-1" uri={`${URI}?v=2`} />));

    expect(photos(renderer)).toHaveLength(1);
    expect(photos(renderer)[0].props.source).toEqual({ uri: `${URI}?v=2` });
    expect(drawings(renderer)).toHaveLength(0);
  });

  it("keeps the drawing for an address that has already failed", () => {
    const renderer = render(<PianoPhoto id="piano-1" uri={URI} />);
    act(() => photos(renderer)[0].props.onError());

    act(() => renderer.update(<PianoPhoto id="piano-1" uri={URI} accessibilityLabel="Weber" />));

    expect(photos(renderer)).toHaveLength(0);
    expect(drawings(renderer)).toHaveLength(1);
  });

  it("fills its frame with the wall colour while the photo loads, not white", () => {
    const renderer = render(<PianoPhoto id="piano-1" uri={URI} testID="frame" />);
    const frame = StyleSheet.flatten(frameOf(renderer).props.style);

    expect(frame.backgroundColor).toBe(paletteFor("piano-1").wall);
  });
});

describe("PianoPhoto without a photo", () => {
  it.each([undefined, null, ""])("shows the drawing for a photo of %p", (uri) => {
    const renderer = render(<PianoPhoto id="piano-1" uri={uri} />);

    expect(photos(renderer)).toHaveLength(0);
    expect(drawings(renderer)).toHaveLength(1);
  });

  it("crops the drawing like a photo, from a 160 x 160 canvas", () => {
    const svg = render(<PianoPhoto id="piano-1" />).root.findByType(Svg);

    expect(svg.props).toMatchObject({
      width: "100%",
      height: "100%",
      viewBox: "0 0 160 160",
      preserveAspectRatio: "xMidYMid slice",
    });
  });

  it("draws wall, floor and a soft shadow behind the piano", () => {
    const renderer = render(<PianoPhoto id="piano-1" />);
    const palette = paletteFor("piano-1");

    expect(rects(renderer)[0]).toMatchObject({ width: 160, height: 160, fill: palette.wall });
    expect(rects(renderer)[1]).toMatchObject({ y: 112, width: 160, height: 48, fill: palette.floor });
    expect(renderer.root.findByType(Ellipse).props).toMatchObject({
      cx: 80,
      cy: 115,
      rx: 52,
      ry: 4.5,
      fillOpacity: 0.14,
    });
  });

  it("scales and places the piano in one group", () => {
    const renderer = render(<PianoPhoto id="piano-1" />);
    // Svg wraps its children in a group of its own, which has no transform
    const group = renderer.root.findAllByType(G).find((g) => g.props.transform);

    expect(group?.props.transform).toBe("translate(28 40) scale(1.3)");

    // What reaches the native view: scale 1.3, then move by (28, 40)
    const matrices: unknown[] = [];
    const collect = (node: any) => {
      if (node?.type === "RNSVGGroup") matrices.push(node.props.matrix);
      (node?.children ?? []).forEach?.(collect);
    };
    collect(renderer.toJSON());
    expect(matrices).toContainEqual([1.3, 0, 0, 1.3, 28, 40]);
  });

  it("colours the lid, body, panel and legs from the piano's palette", () => {
    const renderer = render(<PianoPhoto id="piano-2" />);
    const palette = paletteFor("piano-2");
    const at = (x: number, y: number, width: number) =>
      rects(renderer).find((r) => r.x === x && r.y === y && r.width === width);

    expect(at(8, 8, 64)?.fill).toBe(palette.dark); // lid
    expect(at(11, 14, 58)?.fill).toBe(palette.body);
    expect(at(17, 19, 46)?.fill).toBe(palette.panel);
    expect(at(8, 36, 64)?.fill).toBe(palette.dark); // key slip
    expect(at(11, 47, 58)?.fill).toBe(palette.body); // lower rail
    expect(at(11, 47, 5)?.fill).toBe(palette.dark); // left leg
    expect(at(64, 47, 5)?.fill).toBe(palette.dark); // right leg
  });

  it("draws the keyboard with nine separators and seven black keys", () => {
    const renderer = render(<PianoPhoto id="piano-1" />);
    const separators = renderer.root
      .findAllByType(Path)
      .find((path) => path.props.stroke === "#D2CABB")!;
    const blackKeys = rects(renderer).filter((r) => r.fill === "#2B2320");

    expect(rects(renderer).find((r) => r.fill === "#F7F3EA")).toMatchObject({
      x: 13,
      y: 40,
      width: 54,
      height: 7,
    });
    expect(separators.props.d.match(/M/g)).toHaveLength(9);
    expect(separators.props.strokeWidth).toBe(0.6);
    expect(blackKeys.map((key) => key.x)).toEqual([17.2, 22.6, 33.4, 38.8, 44.2, 55, 60.4]);
    for (const key of blackKeys) {
      expect(key).toMatchObject({ y: 40, width: 2.4, height: 4.5 });
    }
  });

  it("gives different pianos different colours, and a piano the same ones each time", () => {
    const wall = (id: string) => rects(render(<PianoPhoto id={id} />))[0].fill;

    expect(wall("piano-1")).toBe(wall("piano-1"));
    expect(wall("piano-1")).not.toBe(wall("piano-2"));
  });
});

describe("PianoPhoto frame", () => {
  it("takes its size and corners from the style and clips to them", () => {
    const renderer = render(
      <PianoPhoto
        id="piano-1"
        uri={URI}
        style={{ width: 169, height: 169, borderRadius: 16 }}
      />
    );
    const frame = StyleSheet.flatten(frameOf(renderer).props.style);

    expect(frame).toMatchObject({
      width: 169,
      height: 169,
      borderRadius: 16,
      overflow: "hidden",
    });
  });

  it("draws children on top of the photo and of the drawing", () => {
    const withPhoto = render(
      <PianoPhoto id="piano-1" uri={URI}>
        <Text>Overdue · 18 days</Text>
      </PianoPhoto>
    );
    const withDrawing = render(
      <PianoPhoto id="piano-1">
        <Text>Ends in 3 days</Text>
      </PianoPhoto>
    );

    expect(withPhoto.root.findByType(Text).props.children).toBe("Overdue · 18 days");
    expect(withDrawing.root.findByType(Text).props.children).toBe("Ends in 3 days");
    // Later siblings paint above earlier ones
    const frame = frameOf(withPhoto);
    const kids = frame.children as { type: string }[];
    expect(kids[kids.length - 1].type).toBe("Text");
  });

  it("reads out a label for the photo or the drawing when it has one", () => {
    for (const uri of [URI, undefined]) {
      const labelled = render(
        <PianoPhoto id="piano-1" uri={uri} accessibilityLabel="Photo of Weber W-121" />
      );
      const layer = (frameOf(labelled).children as any[])[0];

      expect(layer.props).toMatchObject({
        accessible: true,
        accessibilityRole: "image",
        accessibilityLabel: "Photo of Weber W-121",
      });
    }
  });

  it("stays out of the screen reader's way when the text beside it already says what it is", () => {
    const renderer = render(<PianoPhoto id="piano-1" testID="frame" />);
    const json = frameOf(renderer);
    const layer = (json.children as any[])[0];

    expect(layer.props.accessible).toBe(false);
    expect(layer.props.accessibilityLabel).toBeUndefined();
  });
});
