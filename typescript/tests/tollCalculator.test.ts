import { describe, it, expect } from "vitest";
import { getSinglePassFee, getDailyTollFee } from "../src/tollCalculator.js";
import { createVehicle } from "../src/vehicle.js";

const Car      = createVehicle("Car");
const Motorbike = createVehicle("Motorbike");
const Tractor  = createVehicle("Tractor");
const Emergency = createVehicle("Emergency");
const Diplomat = createVehicle("Diplomat");
const Foreign  = createVehicle("Foreign");
const Military = createVehicle("Military");

function date(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

// ─── Single-pass fee ────────────────────────────────────────────────────────

describe("getSinglePassFee — fee schedule", () => {
  const weekday = (h: number, m: number) => date(2025, 3, 12, h, m); // Wednesday

  const cases: [number, number, number][] = [
    [6, 0, 8], [6, 29, 8],
    [6, 30, 13], [6, 59, 13],
    [7, 0, 18], [7, 59, 18],
    [8, 0, 13], [8, 29, 13],
    [8, 30, 8], [14, 59, 8],
    [15, 0, 13], [15, 29, 13],
    [15, 30, 18], [16, 59, 18],
    [17, 0, 13], [17, 59, 13],
    [18, 0, 8], [18, 29, 8],
    [18, 30, 0], [5, 59, 0], [0, 0, 0],
  ];

  it.each(cases)("at %i:%02i → %i SEK", (h, m, expected) => {
    expect(getSinglePassFee(weekday(h, m), Car)).toBe(expected);
  });
});

// ─── Toll-free vehicles ──────────────────────────────────────────────────────

describe("getSinglePassFee — toll-free vehicles", () => {
  const rushHour = date(2025, 3, 12, 7, 30); // Wednesday 07:30

  it.each([Motorbike, Tractor, Emergency, Diplomat, Foreign, Military])(
    "$type is free",
    (vehicle) => {
      expect(getSinglePassFee(rushHour, vehicle)).toBe(0);
    }
  );

  it("Car is charged", () => {
    expect(getSinglePassFee(rushHour, Car)).toBe(18);
  });
});

// ─── Toll-free dates ─────────────────────────────────────────────────────────

describe("getSinglePassFee — toll-free dates", () => {
  it("Saturday is free", () => {
    expect(getSinglePassFee(date(2025, 3, 15, 8, 0), Car)).toBe(0);
  });

  it("Sunday is free", () => {
    expect(getSinglePassFee(date(2025, 3, 16, 8, 0), Car)).toBe(0);
  });

  it("Christmas Day is free", () => {
    expect(getSinglePassFee(date(2025, 12, 25, 8, 0), Car)).toBe(0);
  });

  it("New Year's Day is free", () => {
    expect(getSinglePassFee(date(2025, 1, 1, 8, 0), Car)).toBe(0);
  });

  it("Labour Day (Första maj) is free", () => {
    expect(getSinglePassFee(date(2025, 5, 1, 8, 0), Car)).toBe(0);
  });

  it("National Day is free", () => {
    expect(getSinglePassFee(date(2025, 6, 6, 8, 0), Car)).toBe(0);
  });

  it("Easter Monday 2025 is free (April 21)", () => {
    expect(getSinglePassFee(date(2025, 4, 21, 8, 0), Car)).toBe(0);
  });

  it("Good Friday 2025 is free (April 18)", () => {
    expect(getSinglePassFee(date(2025, 4, 18, 8, 0), Car)).toBe(0);
  });

  it("Ascension Day 2025 is free (May 29)", () => {
    expect(getSinglePassFee(date(2025, 5, 29, 8, 0), Car)).toBe(0);
  });
});

// ─── Daily total — hourly deduplication ─────────────────────────────────────

describe("getDailyTollFee — hourly deduplication", () => {
  const wed = (h: number, m: number) => date(2025, 3, 12, h, m);

  it("single pass returns that pass's fee", () => {
    expect(getDailyTollFee(Car, [wed(7, 0)])).toBe(18);
  });

  it("two passes within 60 min → highest fee only", () => {
    expect(getDailyTollFee(Car, [wed(7, 0), wed(7, 30)])).toBe(18);
  });

  it("two passes within 60 min, second is higher → second fee", () => {
    expect(getDailyTollFee(Car, [wed(6, 0), wed(6, 45)])).toBe(13);
  });

  it("two passes within 60 min, first is higher → first fee", () => {
    expect(getDailyTollFee(Car, [wed(6, 30), wed(7, 0)])).toBe(18);
  });

  it("passes in separate 60-min windows → fees are summed", () => {
    expect(getDailyTollFee(Car, [wed(7, 0), wed(9, 0)])).toBe(26);
  });

  it("exactly 60 minutes apart → same window", () => {
    expect(getDailyTollFee(Car, [wed(7, 0), wed(8, 0)])).toBe(18);
  });

  it("61 minutes apart → separate windows", () => {
    expect(getDailyTollFee(Car, [wed(7, 0), wed(8, 1)])).toBe(31);
  });

  it("three windows each charged separately", () => {
    expect(getDailyTollFee(Car, [wed(6, 0), wed(8, 0), wed(10, 0)])).toBe(29);
  });

  it("window resets correctly after first expires", () => {
    // 06:00=8 (window 1), 07:30=18 (window 2), 08:00=13 (same as window 2) → 8 + 18 = 26
    expect(getDailyTollFee(Car, [wed(6, 0), wed(7, 30), wed(8, 0)])).toBe(26);
  });
});

// ─── Daily cap ───────────────────────────────────────────────────────────────

describe("getDailyTollFee — maximum 60 SEK per day", () => {
  const wed = (h: number, m: number) => date(2025, 3, 12, h, m);

  it("caps at 60 SEK", () => {
    // 7 separate windows: 8 + 18 + 8 + 8 + 8 + 18 + 13 = 81 → capped at 60
    const passes = [
      wed(6, 0),
      wed(7, 30),
      wed(9, 30),
      wed(11, 30),
      wed(13, 30),
      wed(15, 30),
      wed(17, 30),
    ];
    expect(getDailyTollFee(Car, passes)).toBe(60);
  });
});

// ─── Toll-free vehicle / date on daily total ─────────────────────────────────

describe("getDailyTollFee — toll-free vehicle", () => {
  const wed = (h: number, m: number) => date(2025, 3, 12, h, m);

  it("motorbike pays 0 regardless of times", () => {
    expect(getDailyTollFee(Motorbike, [wed(7, 0), wed(8, 0), wed(15, 30)])).toBe(0);
  });
});

describe("getDailyTollFee — toll-free date", () => {
  it("Saturday passes are free", () => {
    const sat = (h: number, m: number) => date(2025, 3, 15, h, m);
    expect(getDailyTollFee(Car, [sat(7, 0), sat(8, 0)])).toBe(0);
  });
});

describe("getDailyTollFee — multiple days", () => {
  it("applies the daily cap per day, not across all days", () => {
    // Wednesday: 7 windows = 81 SEK → capped at 60
    // Thursday:  one pass at 07:00 = 18 SEK
    // Total: 60 + 18 = 78
    const wed = (h: number, m: number) => date(2025, 3, 12, h, m);
    const thu = (h: number, m: number) => date(2025, 3, 13, h, m);
    const passes = [
      wed(6, 0), wed(7, 30), wed(9, 30), wed(11, 30),
      wed(13, 30), wed(15, 30), wed(17, 30),
      thu(7, 0),
    ];
    expect(getDailyTollFee(Car, passes)).toBe(78);
  });
});

// ─── createVehicle ───────────────────────────────────────────────────────────

describe("createVehicle", () => {
  it("accepts exact casing", () => {
    expect(createVehicle("Car").type).toBe("Car");
  });

  it("accepts lowercase", () => {
    expect(createVehicle("car").type).toBe("Car");
  });

  it("accepts uppercase", () => {
    expect(createVehicle("CAR").type).toBe("Car");
  });

  it("trims whitespace", () => {
    expect(createVehicle("  car  ").type).toBe("Car");
  });

  it("throws on unknown type", () => {
    expect(() => createVehicle("Truck")).toThrow('Unknown vehicle type: "Truck"');
  });
});
