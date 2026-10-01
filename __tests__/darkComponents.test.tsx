import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { act, ReactTestRenderer } from "react-test-renderer";
import PianoCard from "@/components/PianoCard";
import PianoRow from "@/components/PianoRow";
import SelectionMark from "@/components/SelectionMark";
import { Badge, Banner, Button, Field, PianoPhoto, SearchPill, Segmented, Switch, TabBar } from "@/components/ui";
import { paletteFor } from "@/components/ui/PianoPhoto";
import { darkColors, lightColors, pianoPalettesDark } from "@/constants/theme";
import { makePiano } from "./helpers/fixtures";
import { colorsDrawn, hostByTestId, inDark, lightLeaks as leaks, lightOnlyColors as lightOnly, mount } from "./helpers/ui";

const withInsets = (bottom: number, children: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, left: 0, right: 0, bottom },
    }}
  >
    {children}
  </SafeAreaProvider>
);

const dark = darkColors;

const styleOfText = (renderer: ReactTestRenderer, text: string) => {
  const node = renderer.root.findAll(
    (candidate) => (candidate.type as unknown) === Text && candidate.props.children === text
  )[0];
  return StyleSheet.flatten(node.props.style);
};

const piano = makePiano({
  $id: "schimmel",
  title: "Schimmel W114",
  company_associated: "Shamshersons",
  category: "rentable",
  rental_price: 6200,
  rental_customer_name: "Asha Mehta",
  rental_period_end: "2099-10-02" as any,
});

describe("components in the dark theme", () => {
  it("draws a primary button in the same orange, with its label in the dark that sits on orange", async () => {
    const renderer = await mount(inDark(<Button title="Save" onPress={() => {}} />));

    expect(styleOfText(renderer, "Save").color).toBe(dark.onBrand);
    expect(colorsDrawn(renderer)).toContain(dark.brand);
    expect(dark.onBrand).toBe("#1A1814");
  });

  it("draws a secondary button on the dark fill, in light ink", async () => {
    const renderer = await mount(inDark(<Button title="Cancel" variant="secondary" onPress={() => {}} />));

    expect(styleOfText(renderer, "Cancel").color).toBe(dark.ink);
    expect(colorsDrawn(renderer)).toContain(dark.fill);
  });

  it("draws a destructive button in the red that keeps white readable, not the lightened red of text", async () => {
    const renderer = await mount(inDark(<Button title="Delete" variant="destructive" onPress={() => {}} />));

    expect(colorsDrawn(renderer)).toContain(dark.lateFill);
    expect(colorsDrawn(renderer)).not.toContain(dark.late);
    expect(styleOfText(renderer, "Delete").color).toBe(dark.white);
  });

  it("draws an overdue badge red with white text and any other badge on the surface with light ink", async () => {
    const late = await mount(inDark(<Badge testID="badge" tone="late" label="Overdue" />));
    const soon = await mount(inDark(<Badge testID="badge" tone="soon" label="Ends soon" />));

    expect(StyleSheet.flatten(hostByTestId(late.root, "badge").props.style).backgroundColor).toBe(dark.lateFill);
    expect(styleOfText(late, "Overdue").color).toBe(dark.white);
    expect(StyleSheet.flatten(hostByTestId(soon.root, "badge").props.style).backgroundColor).toBe(dark.surface);
    expect(styleOfText(soon, "Ends soon").color).toBe(dark.ink);
  });

  it("draws the chosen segment on a raised chip, lighter than its track", async () => {
    const renderer = await mount(
      inDark(
        <Segmented
          testID="seg"
          options={[
            { value: "a", label: "Light" },
            { value: "b", label: "Dark" },
          ]}
          value="b"
          onChange={() => {}}
          accessibilityLabel="Theme"
        />
      )
    );
    // The chip is only drawn once the control knows how wide it is
    await act(async () => {
      hostByTestId(renderer.root, "seg").props.onLayout({ nativeEvent: { layout: { width: 300 } } });
    });

    expect(StyleSheet.flatten(hostByTestId(renderer.root, "seg-chip").props.style).backgroundColor).toBe(dark.raised);
    expect(colorsDrawn(renderer)).toContain(dark.raised);
    expect(colorsDrawn(renderer)).toContain(dark.hairline);
    expect(styleOfText(renderer, "Dark").color).toBe(dark.ink);
  });

  it("draws a chosen piano's mark in light ink with a dark tick, the opposite of light", async () => {
    const renderer = await mount(inDark(<SelectionMark selected variant="row" />));

    expect(colorsDrawn(renderer)).toContain(dark.ink);
    const tick = renderer.root.findAll((node) => node.props.name === "check")[0];
    expect(tick.props.color).toBe(dark.onInk);

    const light = await mount(<SelectionMark selected variant="row" />);
    expect(light.root.findAll((node) => node.props.name === "check")[0].props.color).toBe(lightColors.onInk);
  });

  it("draws the drawing of a piano with no photo on the dark wall of its palette", async () => {
    const renderer = await mount(inDark(<PianoPhoto id="piano-1" testID="photo" />));
    const frame = StyleSheet.flatten(hostByTestId(renderer.root, "photo").props.style);

    expect(frame.backgroundColor).toBe(paletteFor("piano-1", "dark").wall);
    expect(pianoPalettesDark.map((palette) => palette.wall)).toContain(frame.backgroundColor);
    expect(frame.backgroundColor).not.toBe(paletteFor("piano-1").wall);
  });
});

describe("nothing of the light theme is left in the dark one", () => {
  const gallery: [string, React.ReactElement][] = [
    [
      "buttons",
      <View key="buttons">
        <Button title="Primary" onPress={() => {}} />
        <Button title="Secondary" variant="secondary" onPress={() => {}} />
        <Button title="Outline" variant="outline" onPress={() => {}} />
        <Button title="Delete" variant="destructive" onPress={() => {}} />
        <Button title="Text" variant="text" tone="brand" onPress={() => {}} />
        <Button title="Busy" loading onPress={() => {}} />
        <Button title="Off" disabled onPress={() => {}} />
      </View>,
    ],
    [
      "badges and banners",
      <View key="badges">
        <Badge tone="late" label="Overdue" />
        <Badge tone="soon" label="Soon" />
        <Banner variant="offline" lead="Offline." message="Saved copy." />
        <Banner variant="error" message="Failed." onRetry={() => {}} />
        <Banner variant="syncing" message="Updating…" />
      </View>,
    ],
    [
      "fields",
      <View key="fields">
        <Field label="Email" value="" onChangeText={() => {}} />
        <Field label="Email" value="a@b.co" onChangeText={() => {}} error="Not an email" />
      </View>,
    ],
    [
      "controls",
      <View key="controls">
        <Switch value onValueChange={() => {}} accessibilityLabel="On" />
        <Switch value={false} onValueChange={() => {}} accessibilityLabel="Off" />
        <Segmented
          options={[
            { value: "a", label: "One" },
            { value: "b", label: "Two" },
          ]}
          value="a"
          onChange={() => {}}
          accessibilityLabel="Choice"
        />
        <SearchPill onPress={() => {}} onFilterPress={() => {}} filterCount={2} />
      </View>,
    ],
    [
      "a piano card and row",
      <View key="pianos">
        <PianoCard item={piano} onOpen={() => {}} onToggle={() => {}} onSelectStart={() => {}} />
        <PianoRow item={piano} onOpen={() => {}} />
        <PianoRow item={piano} selecting selected onOpen={() => {}} onToggle={() => {}} />
      </View>,
    ],
  ];

  it.each(gallery)("in %s", async (_name, element) => {
    const renderer = await mount(inDark(element));

    expect(lightOnly.length).toBeGreaterThan(10);
    expect(leaks(renderer)).toEqual([]);
  });

  it("(the check can find a leak: the same components in light do draw those colours)", async () => {
    const renderer = await mount(
      <View>
        <Button title="Secondary" variant="secondary" onPress={() => {}} />
        <PianoRow item={piano} onOpen={() => {}} />
      </View>
    );

    expect(leaks(renderer).length).toBeGreaterThan(0);
  });

  it("in the tab bar", async () => {
    const renderer = await mount(
      inDark(
        withInsets(
          34,
          <TabBar
            tabs={
              [
                { key: "today", label: "Today", icon: "tabToday" },
                { key: "pianos", label: "Pianos", icon: "tabPianos" },
              ] as any
            }
            active="today"
            onSelect={() => {}}
          />
        )
      )
    );

    expect(leaks(renderer)).toEqual([]);
  });
});
