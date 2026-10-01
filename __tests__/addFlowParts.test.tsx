jest.mock("react-native-appwrite", () =>
  require("./helpers/fakeAppwrite").createFakeAppwriteModule()
);

import React from "react";
import { ProgressBar, SuccessMark } from "@/components/ui";
import { createPianoEntry } from "@/lib/appwrite";
import { rentalLengthPhrase } from "@/utils/dates";
import { categoryLabelOf } from "@/utils/pianoDisplay";
import { formatMobile } from "@/utils/validation";
import { fakeBackend } from "./helpers/fakeAppwrite";
import { testUser } from "./helpers/fixtures";
import { mount } from "./helpers/ui";

describe("how long a rental is", () => {
  const phrase = (from: [number, number, number], to: [number, number, number]) =>
    rentalLengthPhrase(new Date(...from), new Date(...to));

  it("says whole months as a number of months", () => {
    expect(phrase([2026, 8, 29], [2027, 2, 29])).toBe("A 6-month rental");
    expect(phrase([2026, 8, 1], [2027, 8, 1])).toBe("A 12-month rental");
  });

  it("says a short rental in days", () => {
    expect(phrase([2026, 8, 1], [2026, 8, 13])).toBe("A 12-day rental");
    expect(phrase([2026, 8, 1], [2026, 8, 2])).toBe("A 1-day rental");
  });

  it("says an before the numbers that begin with a vowel sound", () => {
    expect(phrase([2026, 8, 1], [2026, 8, 9])).toBe("An 8-day rental");
    expect(phrase([2026, 8, 1], [2026, 8, 12])).toBe("An 11-day rental");
    expect(phrase([2026, 8, 1], [2027, 6, 1])).toBe("A 10-month rental");
    expect(phrase([2026, 8, 1], [2027, 7, 1])).toBe("An 11-month rental");
    expect(phrase([2026, 8, 1], [2027, 9, 1])).toBe("A 13-month rental");
  });

  it("spells out months and days when it isn't a whole number of months", () => {
    expect(phrase([2026, 8, 30], [2027, 2, 1])).toBe("A rental of 5 months and 1 day");
    expect(phrase([2026, 8, 1], [2026, 10, 4])).toBe("A rental of 2 months and 3 days");
    expect(phrase([2026, 8, 1], [2026, 9, 2])).toBe("A rental of 1 month and 1 day");
  });

  it("says nothing when the rental doesn't end after it starts", () => {
    expect(phrase([2026, 8, 1], [2026, 8, 1])).toBe("");
    expect(phrase([2026, 8, 5], [2026, 8, 1])).toBe("");
  });
});

describe("a mobile number for reading", () => {
  it.each([
    ["9876543210", "+91 98765 43210"],
    ["98765 43210", "+91 98765 43210"],
    ["+91 98765-43210", "+91 98765 43210"],
    ["09876543210", "+91 98765 43210"],
    ["12345", "12345"],
    ["  +44 7700 900123 ", "+44 7700 900123"],
    ["", ""],
  ])("shows %p as %p", (typed, shown) => {
    expect(formatMobile(typed)).toBe(shown);
  });
});

describe("category names", () => {
  it("are the ones the rest of the app uses", () => {
    expect(categoryLabelOf("rentable")).toBe("Rentable");
    expect(categoryLabelOf("events")).toBe("Events");
    expect(categoryLabelOf("on_sale")).toBe("On sale");
    expect(categoryLabelOf("warehouse")).toBe("Warehouse");
    expect(categoryLabelOf("nonsense")).toBe("Unknown category");
  });
});

describe("the progress bar", () => {
  const bar = async (progress: number) => {
    const renderer = await mount(
      <ProgressBar progress={progress} accessibilityLabel="Uploading" />
    );
    return renderer.root.find(
      (node) => node.props.accessibilityRole === "progressbar"
    );
  };

  it("reads out how far along it is", async () => {
    const node = await bar(0.25);

    expect(node.props.accessibilityLabel).toBe("Uploading");
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 25 });
  });

  it("never reads out less than nothing or more than everything", async () => {
    expect((await bar(-1)).props.accessibilityValue.now).toBe(0);
    expect((await bar(3)).props.accessibilityValue.now).toBe(100);
  });
});

describe("the success mark", () => {
  it("is an orange circle a screen reader calls a success", async () => {
    const renderer = await mount(<SuccessMark testID="mark" />);

    const [circle] = renderer.root.findAll(
      (node) => node.props.accessibilityLabel === "Success"
    );
    expect(circle.props.accessibilityRole).toBe("image");
  });
});

describe("publishing a piano tells how far the photos have got", () => {
  const input = (photos: any[]) => ({
    users: testUser.$id,
    creator: testUser.accountId,
    category: "warehouse",
    make: "Other",
    title: "Kawai K-300",
    description: "Black polish",
    company_associated: "Shamshersons",
    photos,
    date_of_purchase: "2026-01-15",
  });
  const local = (name: string) => ({
    uri: `file:///cache/ImagePicker/${name}.jpeg`,
    fileName: `${name}.jpeg`,
    fileSize: 1000,
  });

  beforeEach(() => fakeBackend.reset());

  it("after each new photo, counting only the ones that are uploaded", async () => {
    const progress: [number, number][] = [];

    await createPianoEntry(
      input([local("a"), "https://example.com/saved.jpg", local("b")]),
      (finished, total) => progress.push([finished, total])
    );

    expect(progress).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });

  it("with nothing to upload when the photos are all saved ones", async () => {
    const progress: [number, number][] = [];

    await createPianoEntry(input(["https://example.com/saved.jpg"]), (finished, total) =>
      progress.push([finished, total])
    );

    expect(progress).toEqual([[0, 0]]);
  });

  it("without anyone listening", async () => {
    await expect(createPianoEntry(input([local("a")]))).resolves.toBeTruthy();
  });
});
