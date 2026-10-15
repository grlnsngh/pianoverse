jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock("@/lib/appwrite", () => ({
  getRentPaymentsBetween: jest.fn(),
}));

import fs from "fs";
import path from "path";
import React from "react";
import { Text } from "react-native";
import { act, create } from "react-test-renderer";
import { Provider } from "react-redux";
import Today from "@/app/(tabs)/today";
import { amountTextProps, maxScale } from "@/constants/theme";
import { getRentPaymentsBetween } from "@/lib/appwrite";
import { PianoDataContext } from "@/lib/PianoDataContext";
import useTextScale, { isLargeText, LARGE_TEXT_FROM } from "@/lib/useTextScale";
import { testUser } from "./helpers/fixtures";
import { mount } from "./helpers/ui";
import { atFontScale, createTestStore, queryAllByText, setFontScale } from "./helpers/render";

/**
 * Large text (docs/large-text/PLAN.md, Batch L1): what the phone's Font size
 * is, the limits on text that is already big, and that every screen with a
 * big title or amount carries its limit.
 */

const Probe = () => {
  const { fontScale, large } = useTextScale();
  return <Text testID="probe">{`${fontScale} ${large}`}</Text>;
};
const probe = (tree: ReturnType<typeof create>) => tree.root.findByProps({ testID: "probe" }).props.children;

describe("what the Font size is", () => {
  it("is 100% in tests unless a test changes it", () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Probe />);
    });

    expect(probe(tree)).toBe("1 false");
  });

  it("calls 125% and up large text, and nothing under it", () => {
    expect(LARGE_TEXT_FROM).toBe(1.25);
    expect(isLargeText(1)).toBe(false);
    expect(isLargeText(1.15)).toBe(false);
    expect(isLargeText(1.24)).toBe(false);
    expect(isLargeText(1.25)).toBe(true);
    expect(isLargeText(2)).toBe(true);
  });

  it("follows the setting while the app is open", () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Probe />);
    });
    expect(probe(tree)).toBe("1 false");

    setFontScale(1.5);
    expect(probe(tree)).toBe("1.5 true");

    setFontScale(1);
    expect(probe(tree)).toBe("1 false");
  });

  describe("with the phone's Font size at 150%", () => {
    atFontScale(1.5);

    it("starts large", () => {
      let tree!: ReturnType<typeof create>;
      act(() => {
        tree = create(<Probe />);
      });

      expect(probe(tree)).toBe("1.5 true");
    });
  });

  it("goes back to 100% after a describe block that changed it", () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Probe />);
    });

    expect(probe(tree)).toBe("1 false");
  });
});

describe("the limits on big text", () => {
  it("lets amounts and titles grow by at most 30%", () => {
    expect(maxScale.amount).toBe(1.3);
    expect(maxScale.title).toBe(1.3);
  });

  it("gives sections and the tab bar a little more room, and small badges and counts a little less", () => {
    expect(maxScale.section).toBe(1.5);
    expect(maxScale.tabLabel).toBe(1.5);
    expect(maxScale.badge).toBe(1.3);
    expect(maxScale.count).toBe(1.2);
  });

  it("never limits below what a person asked for in a way that could shrink text", () => {
    // maxFontSizeMultiplier must be at least 1 (React Native warns and ignores a smaller one)
    Object.values(maxScale).forEach((limit) => expect(limit).toBeGreaterThanOrEqual(1));
  });

  it("keeps an amount on one line, shrinking to fit rather than breaking in the middle of the number", () => {
    expect(amountTextProps).toEqual({
      maxFontSizeMultiplier: 1.3,
      numberOfLines: 1,
      adjustsFontSizeToFit: true,
      minimumFontScale: 0.6,
    });
  });
});

describe("Today at a large Font size", () => {
  const open = async () => {
    jest.mocked(getRentPaymentsBetween).mockResolvedValue([
      {
        $id: "p1",
        $createdAt: "2026-09-25T09:00:00.000+00:00",
        piano_id: "x",
        creator: testUser.accountId,
        amount: 12_45_000,
        paid_on: "2026-09-25",
        customer_name: null,
      } as any,
    ]);
    const store = createTestStore({ user: testUser, items: [] });
    return mount(
      <Provider store={store}>
        <PianoDataContext.Provider value={{ status: "ready", reportStatus: jest.fn(), refresher: { current: null } }}>
          <Today />
        </PianoDataContext.Provider>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 29, 12, 0, 0) });
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("limits the title, and keeps the amount received on one line that shrinks to fit", async () => {
    const renderer = await open();

    const title = queryAllByText(renderer.root, "Today")[0];
    expect(title.props.maxFontSizeMultiplier).toBe(maxScale.title);

    const amount = queryAllByText(renderer.root, "₹12,45,000")[0];
    expect(amount.props).toMatchObject({
      maxFontSizeMultiplier: maxScale.amount,
      numberOfLines: 1,
      adjustsFontSizeToFit: true,
    });
  });
});

describe("where the limits are wired in", () => {
  const root = path.join(__dirname, "..");
  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return sourceFiles(relative);
      return /\.tsx$/.test(entry.name) ? [relative] : [];
    });
  const files = ["app", "components"].flatMap(sourceFiles);
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

  it("gives every screen with a big title its limit: a style from type.largeTitle or type.pianoTitle needs maxScale.title", () => {
    const missing = files.filter((file) => {
      const text = read(file);
      return /\.\.\.type\.(largeTitle|pianoTitle)\b/.test(text) && !text.includes("maxScale.title");
    });

    expect(missing).toEqual([]);
  });

  it("gives every section and sheet title its limit: a style from type.section or type.sheetTitle needs maxScale.section", () => {
    const missing = files.filter((file) => {
      const text = read(file);
      return /\.\.\.type\.(section|sheetTitle)/.test(text) && !text.includes("maxScale.section");
    });

    expect(missing).toEqual([]);
  });

  it("gives every amount in type.amount its limit and one-line fit", () => {
    const missing = files.filter((file) => {
      const text = read(file);
      return /\.\.\.type\.amount\b/.test(text) && !text.includes("amountTextProps");
    });

    expect(missing).toEqual([]);
  });
});
