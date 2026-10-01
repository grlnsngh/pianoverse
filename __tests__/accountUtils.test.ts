import { formatLastUpdated, initialOf, memberSince } from "@/utils/account";

describe("the letter in the profile's circle", () => {
  it("is the first letter of the username, in capitals", () => {
    expect(initialOf("grlnsngh", "grlnsngh@gmail.com")).toBe("G");
  });

  it("falls back to the email, and then to U", () => {
    expect(initialOf("", "anita@example.com")).toBe("A");
    expect(initialOf(undefined, undefined)).toBe("U");
    expect(initialOf("  ", "  ")).toBe("U");
  });
});

describe("how long someone has been a member", () => {
  const now = new Date(2026, 8, 30);

  it("counts days for the first month, and says day for one", () => {
    expect(memberSince("2026-09-30T08:00:00.000+00:00", now)).toBe(
      "Member for 1 day · since Sep 2026"
    );
    expect(memberSince("2026-09-10T08:00:00.000+00:00", now)).toBe(
      "Member for 20 days · since Sep 2026"
    );
  });

  it("counts months for the first year", () => {
    expect(memberSince("2026-07-30T08:00:00.000+00:00", now)).toBe(
      "Member for 2 months · since Jul 2026"
    );
    expect(memberSince("2026-08-25T08:00:00.000+00:00", now)).toBe(
      "Member for 1 month · since Aug 2026"
    );
  });

  it("then counts years", () => {
    expect(memberSince("2025-09-20T08:00:00.000+00:00", now)).toBe(
      "Member for 1 year · since Sep 2025"
    );
    expect(memberSince("2023-01-05T08:00:00.000+00:00", now)).toBe(
      "Member for 3 years · since Jan 2023"
    );
  });

  it("says nothing when the account's date isn't known", () => {
    expect(memberSince(undefined, now)).toBeNull();
    expect(memberSince("not a date", now)).toBeNull();
  });
});

describe("when the pianos on the phone were last saved", () => {
  const now = new Date(2026, 8, 30, 20, 15);
  const at = (date: Date) => date.toISOString();

  it("says Today with the time, in lower case", () => {
    expect(formatLastUpdated(at(new Date(2026, 8, 30, 18, 40)), now)).toBe("Today, 6:40 pm");
    expect(formatLastUpdated(at(new Date(2026, 8, 30, 9, 5)), now)).toBe("Today, 9:05 am");
  });

  it("says Yesterday for the day before", () => {
    expect(formatLastUpdated(at(new Date(2026, 8, 29, 23, 59)), now)).toBe(
      "Yesterday, 11:59 pm"
    );
  });

  it("says the day and month for an older one this year", () => {
    expect(formatLastUpdated(at(new Date(2026, 8, 28, 18, 40)), now)).toBe("28 Sep, 6:40 pm");
  });

  it("adds the year for one from another year", () => {
    expect(formatLastUpdated(at(new Date(2025, 11, 31, 8, 0)), now)).toBe(
      "31 Dec 2025, 8:00 am"
    );
  });
});
