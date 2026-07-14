import { describe, expect, it } from "vitest";
import {
  dialoguePeriod,
  selectContextualDialogue,
  type DialogueContext,
} from "./pet-dialogue";

const context = (overrides: Partial<DialogueContext> = {}): DialogueContext => ({
  petId: "tuantuan",
  now: new Date("2026-07-14T12:00:00"),
  approvedTasksToday: 1,
  pendingTasksToday: 1,
  earnedPointsToday: 10,
  energyValue: 80,
  currentStreak: 3,
  hasStreakDialoguePack: false,
  random: () => 0.5,
  ...overrides,
});

describe("contextual pet dialogue", () => {
  it("uses the four agreed local time periods", () => {
    expect(dialoguePeriod(new Date("2026-07-14T06:00:00"))).toBe("morning");
    expect(dialoguePeriod(new Date("2026-07-14T10:00:00"))).toBe("daytime");
    expect(dialoguePeriod(new Date("2026-07-14T17:00:00"))).toBe("evening");
    expect(dialoguePeriod(new Date("2026-07-14T21:00:00"))).toBe("night");
  });

  it("never adds task pressure to the night candidate pool", () => {
    const lines = new Set<string>();
    for (let index = 0; index < 20; index += 1) {
      let call = 0;
      lines.add(
        selectContextualDialogue(
          context({
            now: new Date("2026-07-14T22:00:00"),
            random: () => (call++ === 0 ? 0.5 : index / 20),
          }),
        ).text,
      );
    }
    expect([...lines].join(" ")).not.toMatch(
      /还没|来不及|待确认|完成 \d+ 件|不着急|认真/,
    );
    expect([...lines].join(" ")).toMatch(/晚安|休息|好梦|明天/);
  });

  it("selects a pet-specific line on the personality branch", () => {
    let call = 0;
    const selected = selectContextualDialogue(
      context({ petId: "mili", random: () => (call++ === 0 ? 0.1 : 0) }),
    );
    expect(selected.id).toBe("mili-1");
  });

  it("excludes the immediately previous line when alternatives exist", () => {
    const selected = selectContextualDialogue(
      context({ previousId: "day-company", random: () => 0.5 }),
    );
    expect(selected.id).not.toBe("day-company");
  });

  it("unlocks the extra companion line pack only after claiming it", () => {
    let call = 0;
    const selected = selectContextualDialogue(
      context({
        hasStreakDialoguePack: true,
        random: () => (call++ === 0 ? 0.1 : 0.99),
      }),
    );
    expect(selected.id).toContain("streak");
  });
});
