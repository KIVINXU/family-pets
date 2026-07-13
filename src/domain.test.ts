import { describe, expect, it } from "vitest";
import { isTaskScheduled, seedState, todayKey } from "./domain";

describe("domain seed", () => {
  it("keeps points and growth as separate values", () => {
    const state = seedState();
    expect(state.progress.pointsBalance).toBe(65);
    expect(state.progress.totalGrowthValue).toBe(142);
    expect(
      state.taskTemplates.every(
        (task) => task.pointsReward > 0 && task.growthReward > 0,
      ),
    ).toBe(true);
  });

  it("creates a stable local date key", () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches weekly tasks to an explicit weekday", () => {
    const task = { ...seedState().taskTemplates[0], recurrence: "每周三" };
    expect(isTaskScheduled(task, new Date("2026-07-15T12:00:00"))).toBe(true);
    expect(isTaskScheduled(task, new Date("2026-07-16T12:00:00"))).toBe(false);
  });
});
