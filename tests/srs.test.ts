import { describe, expect, it } from "vitest";
import { cardStatus, DAY, isDue, MASTERED_INTERVAL, newSrsState, previewInterval, relearn, review } from "../src/lib/srs";

const NOW = Date.UTC(2026, 0, 1);

describe("review", () => {
  it("schedules a new card 2 days out on Good, then 5 days, then by ease", () => {
    let s = newSrsState(NOW);
    s = review(s, "good", NOW);
    expect(s.interval).toBe(2);
    expect(s.due).toBe(NOW + 2 * DAY);
    s = review(s, "good", s.due);
    expect(s.interval).toBe(5);
    s = review(s, "good", s.due);
    expect(s.interval).toBe(Math.round(5 * 2.5));
  });

  it("resets the card and lowers ease on Again", () => {
    let s = review(review(newSrsState(NOW), "good", NOW), "good", NOW);
    s = review(s, "again", NOW);
    expect(s.reps).toBe(0);
    expect(s.interval).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeCloseTo(2.3);
    expect(s.due - NOW).toBeLessThan(DAY);
  });

  it("never lets ease drop below 1.3", () => {
    let s = newSrsState(NOW);
    for (let i = 0; i < 20; i++) s = review(s, "again", NOW);
    expect(s.ease).toBe(1.3);
  });

  it("grows intervals faster on Easy than on Good, and slower on Hard", () => {
    const base = review(review(newSrsState(NOW), "good", NOW), "good", NOW);
    const hard = review(base, "hard", NOW).interval;
    const good = review(base, "good", NOW).interval;
    const easy = review(base, "easy", NOW).interval;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it("always moves the interval forward on a pass, even with minimum ease", () => {
    let s = { ...newSrsState(NOW), ease: 1.3, reps: 5, interval: 1 };
    s = review(s, "hard", NOW);
    expect(s.interval).toBeGreaterThan(1);
  });
});

describe("status helpers", () => {
  it("reports new, learning and mastered", () => {
    const fresh = newSrsState(NOW);
    expect(cardStatus(fresh)).toBe("new");
    expect(cardStatus(review(fresh, "good", NOW))).toBe("learning");
    expect(cardStatus(review(fresh, "again", NOW))).toBe("learning");
    expect(cardStatus({ ...fresh, reps: 6, interval: MASTERED_INTERVAL, lastReviewed: NOW })).toBe("mastered");
  });

  it("knows when a card is due", () => {
    const s = review(newSrsState(NOW), "good", NOW);
    expect(isDue(s, NOW)).toBe(false);
    expect(isDue(s, NOW + 2 * DAY)).toBe(true);
  });

  it("relearn makes a card due immediately", () => {
    const s = relearn(review(newSrsState(NOW), "easy", NOW), NOW);
    expect(isDue(s, NOW)).toBe(true);
    expect(s.reps).toBe(0);
  });

  it("previews intervals in readable units", () => {
    const fresh = newSrsState(NOW);
    expect(previewInterval(fresh, "again", NOW)).toBe("10m");
    expect(previewInterval(fresh, "hard", NOW)).toBe("1d");
    expect(previewInterval(fresh, "good", NOW)).toBe("2d");
    expect(previewInterval(fresh, "easy", NOW)).toBe("4d");
  });
});
