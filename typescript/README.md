# Toll Calculator — TypeScript

## Requirements

From the project specification:

- Fees differ between 8 SEK and 18 SEK depending on time of day
- Rush-hour traffic renders the highest fee
- Maximum fee per day is 60 SEK
- A vehicle is only charged once per hour; if multiple passes occur within the same 60-minute window, the highest fee applies
- Some vehicle types are fee-free
- Weekends and public holidays are fee-free

## Getting started

```bash
npm install
npm test
```

## Project structure

```
src/
  vehicle.ts        — VehicleType, Vehicle interface, createVehicle factory
  holidays.ts       — Swedish public holiday calculation
  tollCalculator.ts — Fee schedule and core calculation logic
  index.ts          — Public exports
tests/
  tollCalculator.test.ts
```

## Design decisions

### vehicle.ts — string union over enum

`VehicleType` is a TypeScript string union, not an enum. Enums compile to a runtime JavaScript object (an IIFE), which is unnecessary overhead when all we need is a type-level constraint. String unions are erased entirely at compile time and are compatible with plain string values from JSON or external APIs without mapping.

### createVehicle — single entry point for external input

Any string coming from outside the system (an API, user input, a database) may have inconsistent casing or whitespace. `createVehicle` normalises the input with `trim().toLowerCase()` before the switch, so the rest of the codebase can trust that `vehicle.type` is always correctly formed. Add new vehicle types here and nowhere else.

### Only Car is charged

All vehicle types except `Car` are toll-free. Rather than maintaining an explicit allowlist of free vehicle types (which requires updating in two places when a new type is added), the check is simply `vehicle.type !== "Car"`. If charging rules diverge per vehicle type in the future, revisit this.

### Fee schedule as a table

The fee schedule is expressed as a plain array of `{ from, to, fee }` objects written as `"HH:MM"` strings for readability. The `toMinutes` helper converts these to integers (minutes since midnight) once at module load time, so every fee lookup is a simple integer comparison — no string parsing at runtime.

### Hourly deduplication — sliding window

The original Java and C# implementations had a bug: `intervalStart` was never updated after the first 60-minute window expired, meaning all subsequent passes were compared against the very first timestamp of the day. The fix is a standard sliding window: when a pass falls outside the current window, commit the window's maximum fee to the total, then start a new window at the current pass.

### Multi-day handling

`getDailyTollFee` accepts passes from multiple calendar days. Passes are grouped by day before processing, and the 60 SEK cap is applied independently per day. The input does not need to be sorted — sorting is handled internally on a copy of the array so the caller's data is never mutated.

### Swedish public holidays — calculated, not hardcoded

The original code hardcoded holidays for 2013 only. Holidays are now calculated dynamically for any year using the Anonymous Gregorian algorithm for Easter, from which all movable holidays are derived as fixed offsets.

Holiday dates are cached per year — the first call for a given year builds the full set of 13 dates and stores it in a Map. Every subsequent call for the same year is a single Map lookup and Set membership check, both O(1).

The 13 public holidays are defined by Swedish law (Lag (1989:253) om allmänna helgdagar, amended by Lag (2004:1320)):

| Holiday | Rule |
|---|---|
| Nyårsdagen | 1 januari |
| Trettondedag jul | 6 januari |
| Långfredagen | Fredagen före påskdagen (Easter − 2) |
| Påskdagen | Söndagen efter fullmånen på/efter 21 mars |
| Annandag påsk | Dagen efter påskdagen (Easter + 1) |
| Första maj | 1 maj |
| Kristi himmelsfärdsdag | Sjätte torsdagen efter påskdagen (Easter + 39) |
| Pingstdagen | Sjunde söndagen efter påskdagen (Easter + 49) |
| Nationaldagen | 6 juni |
| Midsommardagen | Lördagen 20–26 juni |
| Alla helgons dag | Lördagen 31 oktober–6 november |
| Juldagen | 25 december |
| Annandag jul | 26 december |

Sundays are also public holidays per § 1, but these are already covered by the weekend check.

### No runtime dependencies

The only dependencies are development tools (TypeScript, Vitest). Holiday logic is calculated in code rather than delegated to a third-party library, keeping the production bundle dependency-free and the logic transparent and auditable.

## Known deviations from the original code

The original Java and C# implementations contained the following bugs, which are fixed here:

1. **Operator precedence in fee schedule** — the condition for the 15:30–16:59 = 18 SEK band was malformed due to missing parentheses, making the rule logically fragile.
2. **intervalStart never updated** — after the first 60-minute window, `intervalStart` remained pinned to `dates[0]`, breaking hourly deduplication for all subsequent passes.
3. **C# millisecond component bug** — `date.Millisecond - intervalStart.Millisecond` used the millisecond *component* (0–999) rather than total elapsed milliseconds, making the time difference always incorrect.
4. **Holidays hardcoded to 2013** — the `isTollFreeDate` check returned `false` for any year other than 2013.
5. **July toll-free** — the original code treated all of July as toll-free. This is not in the requirements and has been removed.
