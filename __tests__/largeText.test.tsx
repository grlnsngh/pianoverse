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
import useTextScale, {
  gridColumnsFor,
  GRID_ONE_COLUMN_BELOW,
  isLargeText,
  LARGE_TEXT_FROM,
} from "@/lib/useTextScale";
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

describe("how many cards a row of the pianos grid holds", () => {
  it("is two on every phone at 100%, even a narrow one", () => {
    expect(gridColumnsFor(411, 1)).toBe(2);
    expect(gridColumnsFor(390, 1)).toBe(2);
    expect(gridColumnsFor(330, 1)).toBe(2);
    expect(gridColumnsFor(300, 1)).toBe(2);
  });

  it("ignores a Font size under 100%, which only makes the words smaller", () => {
    expect(gridColumnsFor(330, 0.85)).toBe(2);
  });

  it("stays two for the phone the owner's father has, up to about 170%", () => {
    expect(gridColumnsFor(384, 1.15)).toBe(2);
    expect(gridColumnsFor(384, 1.3)).toBe(2);
    expect(gridColumnsFor(384, 1.5)).toBe(2);
    expect(gridColumnsFor(384, 1.7)).toBe(2);
  });

  it("is one when half the width can no longer hold a name, as seen on the emulator", () => {
    expect(gridColumnsFor(330, 1.5)).toBe(1);
    expect(gridColumnsFor(384, 2)).toBe(1);
    expect(gridColumnsFor(411, 2)).toBe(1);
  });

  it("keeps two columns on a 411 dp phone up to 180%, which the emulator showed well", () => {
    expect(gridColumnsFor(411, 1.8)).toBe(2);
  });

  it("changes at one place", () => {
    expect(GRID_ONE_COLUMN_BELOW).toBe(225);
    expect(gridColumnsFor(GRID_ONE_COLUMN_BELOW, 1)).toBe(2);
    expect(gridColumnsFor(GRID_ONE_COLUMN_BELOW * 1.5 - 1, 1.5)).toBe(1);
    expect(gridColumnsFor(GRID_ONE_COLUMN_BELOW * 1.5, 1.5)).toBe(2);
  });
});

describe("rows of words keep room above and below", () => {
  const read = (file: string) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  /** The style block with this name, from "name: {" to its closing brace */
  const block = (file: string, name: string) => {
    const text = read(file).replace(/\r\n/g, "\n");
    const start = text.indexOf(`  ${name}: {`);
    expect(start).toBeGreaterThan(-1);
    return text.slice(start, text.indexOf("\n  },", start));
  };

  // A row is minHeight tall at 100%. With bigger text it grows, and without its
  // own padding the words would touch the hairline above and the one below.
  const ROWS: [string, string][] = [
    ["components/FilterSheet.tsx", "sortRow"],
    ["components/FilterSheet.tsx", "switchRow"],
    ["components/PaymentsSection.tsx", "row"],
    ["components/ServiceSection.tsx", "interval"],
    ["app/income.tsx", "row"],
    ["app/customer/[key].tsx", "row"],
    ["app/customer/[key].tsx", "paymentRow"],
  ];

  it.each(ROWS)("%s: %s has paddingVertical and a minHeight", (file, name) => {
    const style = block(file, name);

    expect(style).toMatch(/minHeight: \d+/);
    expect(style).toMatch(/paddingVertical: spacing\.sm/);
  });
});
