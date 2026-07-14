import { describe, expect, it } from "vitest";
import type { TaskCompletion } from "./domain";
import {
  LEVEL_MILESTONES,
  availableCompanionRewards,
  availableLevelMilestones,
  calculateCompanionStreaks,
  newlyReachedWeeklyCheer,
} from "./growth-rewards";

const approved = (dateKey: string, id = dateKey): TaskCompletion => ({
  id,
  taskTemplateId: "task-read",
  dateKey,
  status: "approved",
  submittedAt: `${dateKey}T08:00:00.000Z`,
  reviewedAt: `${dateKey}T09:00:00.000Z`,
  bonusPoints: 0,
  bonusGrowthValue: 0,
});

describe("companion streaks", () => {
  it("deduplicates dates and keeps a streak ending yesterday", () => {
    const streaks = calculateCompanionStreaks(
      [
        approved("2026-07-12"),
        approved("2026-07-13"),
        approved("2026-07-13", "duplicate"),
      ],
      "2026-07-14",
    );
    expect(streaks).toEqual({
      current: 2,
      longest: 2,
      validDateKeys: ["2026-07-12", "2026-07-13"],
    });
  });

  it("keeps the historical longest run after a gentle reset", () => {
    const streaks = calculateCompanionStreaks(
      [
        approved("2026-06-29"),
        approved("2026-06-30"),
        approved("2026-07-01"),
        approved("2026-07-12"),
      ],
      "2026-07-14",
    );
    expect(streaks.current).toBe(0);
    expect(streaks.longest).toBe(3);
  });

  it("ignores rejected, invalid, and future dates", () => {
    const rejected = { ...approved("2026-07-13"), status: "rejected" as const };
    const streaks = calculateCompanionStreaks(
      [approved("2026-07-14"), approved("2026-02-30"), approved("2026-07-15"), rejected],
      "2026-07-14",
    );
    expect(streaks.validDateKeys).toEqual(["2026-07-14"]);
  });
});

describe("growth reward eligibility", () => {
  it("derives pet milestone levels from the pet catalog", () => {
    expect(LEVEL_MILESTONES.map((item) => [item.id, item.points])).toEqual([
      ["level-2", 10],
      ["level-3", 10],
      ["level-5", 15],
      ["level-7", 20],
      ["level-10", 30],
    ]);
  });

  it("does not offer an already claimed level or companion reward", () => {
    expect(availableLevelMilestones(5, ["level-2"]).map((item) => item.id)).toEqual([
      "level-3",
      "level-5",
    ]);
    expect(availableCompanionRewards(14, ["streak-3"]).map((item) => item.id)).toEqual([
      "streak-7",
      "streak-14",
    ]);
  });

  it("returns only a new post-14 weekly checkpoint", () => {
    expect(newlyReachedWeeklyCheer(20, 21)).toBe(21);
    expect(newlyReachedWeeklyCheer(21, 21)).toBeNull();
    expect(newlyReachedWeeklyCheer(21, 28)).toBe(28);
    expect(newlyReachedWeeklyCheer(13, 14)).toBeNull();
  });
});
