import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Path } from "react-native-svg";
import { Badge, Banner } from "@/components/ui";
import { ICONS } from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import { colors, fonts, radii } from "@/constants/theme";
import { findAllMemo, hostByTestId, mount, textContent } from "./helpers/ui";

type Mounted = Awaited<ReturnType<typeof mount>>;

const flat = (style: unknown) => StyleSheet.flatten(style as any);

describe("Badge", () => {
  const pill = (renderer: Mounted) => hostByTestId(renderer.root, "badge");

  it("is a red pill with white text for an overdue rental", async () => {
    const renderer = await mount(<Badge testID="badge" tone="late" label="Overdue · 18 days" />);

    expect(flat(pill(renderer).props.style)).toMatchObject({
      backgroundColor: colors.late,
      borderRadius: radii.full,
      paddingVertical: 2,
      paddingHorizontal: 9,
    });
    expect(flat(renderer.root.findByType(Text).props.style)).toMatchObject({
      color: colors.white,
      fontFamily: fonts.bold,
      fontSize: 12,
      lineHeight: 18,
    });
    expect(textContent(pill(renderer))).toBe("Overdue · 18 days");
  });

  it("has no dot when it is red", async () => {
    const renderer = await mount(<Badge testID="badge" tone="late" label="Overdue" />);

    expect(pill(renderer).findAllByType(View)).toHaveLength(0);
  });

  it("is a white pill with an orange dot and ink text when a rental ends soon", async () => {
    const renderer = await mount(<Badge testID="badge" tone="soon" label="Ends in 3 days" />);
    const [dot] = pill(renderer).findAllByType(View);

    expect(flat(pill(renderer).props.style).backgroundColor).toBe(colors.white);
    expect(flat(renderer.root.findByType(Text).props.style).color).toBe(colors.ink);
    expect(flat(dot.props.style)).toMatchObject({
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.brand,
    });
    expect(flat(pill(renderer).props.style).gap).toBe(6);
  });

  it("sits in the flow by default, and only as wide as its text", async () => {
    const renderer = await mount(<Badge testID="badge" tone="late" label="Overdue" />);
    const style = flat(pill(renderer).props.style);

    expect(style.position).toBeUndefined();
    expect(style.alignSelf).toBe("flex-start");
  });

  it("pins itself 8 px in from the top left corner of a photo", async () => {
    const renderer = await mount(<Badge testID="badge" tone="late" label="Overdue" onPhoto />);

    expect(flat(pill(renderer).props.style)).toMatchObject({
      position: "absolute",
      top: 8,
      left: 8,
    });
  });

  it("reads out its words", async () => {
    const renderer = await mount(<Badge testID="badge" tone="soon" label="Ends in 3 days" />);

    expect(pill(renderer).props).toMatchObject({
      accessible: true,
      accessibilityLabel: "Ends in 3 days",
    });
  });
});

describe("Banner", () => {
  const strip = (renderer: Mounted) => hostByTestId(renderer.root, "banner");
  const iconPath = (renderer: Mounted) =>
    renderer.root.findAllByType(Path).map((path) => path.props.d);
  // What the banner should draw, read from the icon set rather than repeated here
  const wifiOff = ICONS.wifiOff[0].d;
  const alert = ICONS.alert[1].d;

  it("says the list is a saved copy when offline: grey strip, wifi-off icon, bold lead", async () => {
    const renderer = await mount(
      <Banner
        testID="banner"
        variant="offline"
        lead="Offline."
        message="Showing pianos saved on 28 Sep."
      />
    );

    expect(flat(strip(renderer).props.style)).toMatchObject({
      backgroundColor: colors.grouped,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      gap: 10,
    });
    expect(iconPath(renderer)).toEqual([wifiOff]);
    expect(textContent(strip(renderer))).toBe("Offline. Showing pianos saved on 28 Sep.");

    const [text, lead] = renderer.root.findAllByType(Text);
    expect(flat(text.props.style)).toMatchObject({
      color: colors.inkBody,
      fontSize: 13,
      lineHeight: 18,
    });
    expect(flat(lead.props.style).fontFamily).toBe(fonts.bold);
    expect(textContent(lead)).toBe("Offline. ");
  });

  it("shows a small spinner while syncing, and no icon", async () => {
    const renderer = await mount(
      <Banner testID="banner" variant="syncing" message="Updating pianos…" />
    );
    const [spinner] = findAllMemo(renderer.root, Spinner);

    expect(spinner.props).toMatchObject({ size: 18, decorative: true });
    expect(flat(strip(renderer).props.style).backgroundColor).toBe(colors.grouped);
    // Only the spinner is drawn, not the offline or alert icon
    expect(iconPath(renderer)).not.toContain(wifiOff);
    expect(iconPath(renderer)).not.toContain(alert);
    expect(textContent(strip(renderer))).toBe("Updating pianos…");
  });

  it("is a red tinted strip with an alert icon and dark red text for an error", async () => {
    const renderer = await mount(
      <Banner
        testID="banner"
        variant="error"
        message="Some changes didn’t sync."
        onRetry={() => {}}
      />
    );
    const [message] = renderer.root.findAllByType(Text);

    expect(flat(strip(renderer).props.style).backgroundColor).toBe(colors.lateTint);
    expect(flat(message.props.style).color).toBe(colors.lateTintText);
    expect(iconPath(renderer)).toContain(alert);
  });

  it("has a Retry link on an error that can be retried", async () => {
    const onRetry = jest.fn();
    const renderer = await mount(
      <Banner testID="banner" variant="error" message="Some changes didn’t sync." onRetry={onRetry} />
    );
    const retry = renderer.root.findByType(Pressable);

    expect(textContent(retry)).toBe("Retry");
    expect(retry.props.accessibilityRole).toBe("button");
    // The strip is 38 px tall, so the tap area reaches past it
    expect(retry.props.hitSlop).toMatchObject({ top: 4, bottom: 4 });

    retry.props.onPress();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("can name the retry action something else", async () => {
    const renderer = await mount(
      <Banner variant="error" message="Couldn’t update." onRetry={() => {}} retryLabel="Try again" />
    );

    expect(textContent(renderer.root.findByType(Pressable))).toBe("Try again");
  });

  it("has no Retry link without something to retry, or on other banners", async () => {
    const noHandler = await mount(<Banner variant="error" message="Something failed." />);
    const offline = await mount(
      <Banner variant="offline" message="Saved copy." onRetry={() => {}} />
    );

    expect(noHandler.root.findAllByType(Pressable)).toHaveLength(0);
    expect(offline.root.findAllByType(Pressable)).toHaveLength(0);
  });

  it("is announced: at once for an error, politely otherwise", async () => {
    const error = await mount(<Banner testID="banner" variant="error" message="Failed." />);
    const offline = await mount(<Banner testID="banner" variant="offline" message="Saved copy." />);

    expect(strip(error).props).toMatchObject({
      accessibilityRole: "alert",
      accessibilityLiveRegion: "assertive",
    });
    expect(strip(offline).props.accessibilityLiveRegion).toBe("polite");
    expect(strip(offline).props.accessibilityRole).toBeUndefined();
  });

  it("keeps the message and the Retry link as separate things to reach", async () => {
    const renderer = await mount(
      <Banner testID="banner" variant="error" message="Failed." onRetry={() => {}} />
    );

    // If the whole strip were one accessible block, iOS couldn't focus Retry
    expect(strip(renderer).props.accessible).toBeUndefined();
  });
});
