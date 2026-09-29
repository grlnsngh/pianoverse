jest.mock("expo-router", () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  usePathname: jest.fn(() => "/home"),
}));

import React from "react";
import { addDays, addMonths, addYears } from "date-fns";
import CardItem from "@/components/CardItem";
import ListItem from "@/components/ListItem";
import { icons } from "@/constants";
import { PianoItem } from "@/redux/pianos/types";
import {
  getRemainingPeriod,
  getRentalState,
  toStoredDate,
} from "@/utils/dates";
import {
  formatPeriod,
  getCategoryIcon,
  getRentalStatusColor,
  getRentalStatusText,
  isEndingSoon,
  RENTAL_STATUS_COLORS,
} from "@/utils/rentalStatus";
import { makePiano, testUser } from "./helpers/fixtures";
import { allTexts, createTestStore, renderWithStore } from "./helpers/render";

const endingOn = (date: Date) => toStoredDate(date);
const inDays = (days: number) => endingOn(addDays(new Date(), days));
const remainingUntil = (end: string) => getRemainingPeriod(end);

describe("describing a period", () => {
  it("uses its largest whole unit", () => {
    expect(formatPeriod(remainingUntil(inDays(1)))).toBe("1 day");
    expect(formatPeriod(remainingUntil(inDays(5)))).toBe("5 days");
    expect(formatPeriod(remainingUntil(inDays(7)))).toBe("1 week");
    expect(formatPeriod(remainingUntil(inDays(20)))).toBe("2 weeks");
    expect(
      formatPeriod(remainingUntil(endingOn(addMonths(new Date(), 3))))
    ).toBe("3 months");
    expect(
      formatPeriod(remainingUntil(endingOn(addYears(new Date(), 2))))
    ).toBe("2 years");
  });

  it("describes a period in the past by its length", () => {
    expect(formatPeriod(remainingUntil(inDays(-3)))).toBe("3 days");
    expect(formatPeriod(remainingUntil(inDays(-14)))).toBe("2 weeks");
  });

  it("says 0 days, not 0 day", () => {
    expect(formatPeriod({ days: 0, weeks: 0, months: 0, years: 0 })).toBe(
      "0 days"
    );
  });
});

describe("a rental's status", () => {
  const status = (end: string, compact = false) =>
    getRentalStatusText(getRentalState(end), remainingUntil(end), { compact });
  const color = (end: string) =>
    getRentalStatusColor(getRentalState(end), remainingUntil(end));

  it("counts down while it runs", () => {
    expect(status(inDays(20))).toBe("2 weeks remaining");
    expect(status(inDays(20), true)).toBe("2w left");
    expect(status(endingOn(addMonths(new Date(), 2)), true)).toBe("2mo left");
    expect(color(inDays(20))).toBe(RENTAL_STATUS_COLORS.active);
  });

  it("is highlighted from a week before the end", () => {
    expect(isEndingSoon(remainingUntil(inDays(7)))).toBe(true);
    expect(isEndingSoon(remainingUntil(inDays(8)))).toBe(false);
    expect(color(inDays(7))).toBe(RENTAL_STATUS_COLORS.endingSoon);
    expect(status(inDays(0))).toBe("Due today");
    expect(color(inDays(0))).toBe(RENTAL_STATUS_COLORS.endingSoon);
  });

  it("says how long ago it ended", () => {
    expect(status(inDays(-3))).toBe("Expired 3 days ago");
    expect(status(inDays(-3), true)).toBe("Expired");
    expect(color(inDays(-3))).toBe(RENTAL_STATUS_COLORS.ended);
  });

  it("is empty for a piano that isn't rented", () => {
    expect(getRentalStatusText(null, remainingUntil(inDays(3)))).toBeNull();
  });
});

describe("the piano rows", () => {
  const rental = (end: string) =>
    makePiano({
      $id: "rental",
      category: "rentable",
      rental_period_start: inDays(-30) as any,
      rental_period_end: end as any,
    });
  const rowProps = {
    index: 0,
    visibleMenuId: null,
    openMenu: jest.fn(),
    closeMenu: jest.fn(),
  };
  const textsOf = (element: React.ReactElement, piano: PianoItem) =>
    allTexts(
      renderWithStore(
        element,
        createTestStore({ user: testUser, items: [piano] })
      ).root
    );

  it("describe a rental the same way", () => {
    const piano = rental(inDays(-3));

    expect(textsOf(<CardItem item={piano} {...rowProps} />, piano)).toContain(
      "Expired 3 days ago"
    );
    expect(textsOf(<ListItem item={piano} {...rowProps} />, piano)).toContain(
      "Expired 3 days ago"
    );
    expect(
      textsOf(<CardItem item={piano} {...rowProps} isGridView />, piano)
    ).toContain("Expired 3 days ago");
  });

  // Every row a piano can appear in
  const allRowTexts = (piano: PianoItem) => [
    ...textsOf(<CardItem item={piano} {...rowProps} />, piano),
    ...textsOf(<CardItem item={piano} {...rowProps} isGridView />, piano),
    ...textsOf(<ListItem item={piano} {...rowProps} />, piano),
  ];

  it("say nothing about a rental for a piano that is no longer rented out", () => {
    // Rental dates left over from when it was a rental
    const onSale = makePiano({
      $id: "on-sale",
      category: "on_sale",
      rental_period_start: inDays(-400) as any,
      rental_period_end: inDays(-365) as any,
    });

    const texts = allRowTexts(onSale).join(" ");
    expect(texts).not.toMatch(/Expired|remaining|left|Due today/);
  });

  it("say nothing about the rental of a sold piano", () => {
    const sold = { ...rental(inDays(20)), sold_date: inDays(-1) as any };

    const texts = allRowTexts(sold).join(" ");
    expect(texts).not.toMatch(/Expired|remaining|left|Due today/);
    expect(texts).toContain("Rentable · Sold");
  });

  it("show one icon per category", () => {
    expect(getCategoryIcon("rentable")).toBe(icons.card);
    expect(getCategoryIcon("events")).toBe(icons.play);
    expect(getCategoryIcon("on_sale")).toBe(icons.bookmark);
    expect(getCategoryIcon("warehouse")).toBe(icons.home);
    expect(getCategoryIcon("unknown")).toBe(icons.card);
  });
});
