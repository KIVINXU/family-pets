import { describe, expect, it } from "vitest";
import {
  isTaskScheduled,
  parentPinValidationError,
  RESERVED_PARENT_PIN,
  seedState,
  todayKey,
} from "./domain";

describe("domain seed", () => {
  it("starts a real family at zero progress", () => {
    const state = seedState();
    expect(state.setupCompleted).toBe(false);
    expect(state.parentPin).toBe(RESERVED_PARENT_PIN);
    expect(state.progress).toMatchObject({
      level: 1,
      growthValue: 0,
      totalGrowthValue: 0,
      pointsBalance: 0,
      frozenPoints: 0,
    });
    expect(state.taskCompletions).toEqual([]);
    expect(state.redemptions).toEqual([]);
    expect(state.ledger).toEqual([]);
  });

  it("keeps starter rewards on three positive-feedback horizons", () => {
    const state = seedState();
    const typicalTwoTasks = 25;
    const costs = state.rewards.map((reward) => reward.pointsCost);
    expect(costs[0]).toBeLessThanOrEqual(typicalTwoTasks);
    expect(costs[1]).toBeGreaterThanOrEqual(typicalTwoTasks * 2);
    expect(costs[1]).toBeLessThanOrEqual(typicalTwoTasks * 3);
    expect(costs[2]).toBeGreaterThanOrEqual(typicalTwoTasks * 6);
  });

  it("validates new PIN values without exposing the current PIN", () => {
    expect(parentPinValidationError("12")).toContain("4 位");
    expect(parentPinValidationError("2580")).toContain("不能使用");
    expect(parentPinValidationError("1357", "2468")).toContain("不一致");
    expect(parentPinValidationError("1357", "1357", "1357")).toContain(
      "不能和当前",
    );
    expect(parentPinValidationError("1357", "1357", "2468")).toBe("");
  });

  it("creates a stable local date key", () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayKey(new Date("2026-07-15T12:00:00"))).toBe("2026-07-15");
  });

  it("matches weekly tasks to an explicit weekday", () => {
    const task = { ...seedState().taskTemplates[0], recurrence: "每周三" };
    expect(isTaskScheduled(task, new Date("2026-07-15T12:00:00"))).toBe(true);
    expect(isTaskScheduled(task, new Date("2026-07-16T12:00:00"))).toBe(false);
  });
});
