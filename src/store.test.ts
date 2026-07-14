import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { seedState, todayKey } from "./domain";
import { appRepository } from "./repository";
import { PARENT_SESSION_TIMEOUT_MS, useAppStore } from "./store";

function configuredState(pin = "2468") {
  const state = seedState();
  state.setupCompleted = true;
  state.parentPin = pin;
  return state;
}

function legacyState(state = configuredState()) {
  const {
    claimedLevelMilestones: _claimedLevels,
    claimedCompanionRewards: _claimedCompanion,
    ...legacy
  } = state;
  return legacy;
}

describe("app store rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setActivePinia(createPinia());
    vi.spyOn(appRepository, "save").mockResolvedValue();
  });

  it("loads only once when bootstrap callers overlap", async () => {
    const load = vi.spyOn(appRepository, "load").mockResolvedValue(configuredState());
    const store = useAppStore();

    await Promise.all([store.load(), store.load(), store.load()]);

    expect(load).toHaveBeenCalledOnce();
    expect(store.loaded).toBe(true);
  });

  it("completes minimal setup without resetting existing progress", async () => {
    const store = useAppStore();
    store.state.progress.pointsBalance = 88;

    expect(
      await store.completeSetup({
        childName: "安安",
        petName: "糯米",
        pin: "2580",
        confirmPin: "2580",
      }),
    ).toBe(false);
    expect(
      await store.completeSetup({
        childName: "安安",
        petName: "糯米",
        pin: "1357",
        confirmPin: "1357",
      }),
    ).toBe(true);
    expect(store.state).toMatchObject({
      setupCompleted: true,
      parentPin: "1357",
      child: { name: "安安", currentPetName: "糯米" },
      progress: { pointsBalance: 88 },
    });
  });

  it("changes PIN with confirmation, persists, and locks the parent session", async () => {
    const store = useAppStore();
    store.state = configuredState();
    expect(store.verifyPin("2468")).toBe(true);

    expect(await store.updateParentPin("0000", "1357", "1357")).toBe(false);
    expect(await store.updateParentPin("2468", "1357", "9999")).toBe(false);
    expect(await store.updateParentPin("2468", "1357", "1357")).toBe(true);

    expect(store.parentUnlocked).toBe(false);
    expect(store.verifyPin("2468")).toBe(false);
    expect(store.verifyPin("1357")).toBe(true);
    expect(appRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ parentPin: "1357" }),
    );
  });

  it("resets a forgotten PIN without deleting family data", async () => {
    const store = useAppStore();
    store.state = configuredState();
    store.state.progress.pointsBalance = 222;

    expect(await store.resetForgottenPin("1357", "1357", false)).toBe(false);
    expect(await store.resetForgottenPin("1357", "1357", true)).toBe(true);

    expect(store.state.progress.pointsBalance).toBe(222);
    expect(store.state.parentPin).toBe("1357");
    expect(store.parentUnlocked).toBe(false);
  });

  it("previews and restores a backup while preserving the device PIN", async () => {
    const store = useAppStore();
    store.state = configuredState("2468");
    expect(store.verifyPin("2468")).toBe(true);
    const other = configuredState("9999");
    other.child.name = "小禾";
    other.progress.pointsBalance = 76;
    const candidate = store.previewRestore(
      JSON.stringify({ schemaVersion: 2, state: legacyState(other) }),
    );

    expect(candidate?.summary.childName).toBe("小禾");
    expect(store.state.child.name).not.toBe("小禾");
    expect(await store.confirmRestore(candidate!, "0000")).toBe(false);
    expect(await store.confirmRestore(candidate!, "2468")).toBe(true);
    expect(store.state.child.name).toBe("小禾");
    expect(store.state.parentPin).toBe("2468");
    expect(store.parentUnlocked).toBe(false);
  });

  it("restores from setup with a new local PIN in one write", async () => {
    const store = useAppStore();
    const other = configuredState();
    other.child.name = "小禾";
    const candidate = store.previewRestore(
      JSON.stringify({ schemaVersion: 2, state: legacyState(other) }),
    );

    expect(await store.restoreDuringSetup(candidate!, "1357", "1357")).toBe(
      true,
    );
    expect(store.state).toMatchObject({
      setupCompleted: true,
      parentPin: "1357",
      child: { name: "小禾" },
    });
    expect(appRepository.save).toHaveBeenCalledOnce();
  });

  it("locks after ten minutes idle or a long background interval", () => {
    const store = useAppStore();
    store.state = configuredState();
    vi.setSystemTime(new Date("2026-07-14T10:00:00"));
    expect(store.verifyPin("2468")).toBe(true);
    const start = Date.now();
    store.recordParentSessionActivity(start);
    expect(store.checkParentSession(start + PARENT_SESSION_TIMEOUT_MS - 1)).toBe(
      false,
    );
    expect(store.checkParentSession(start + PARENT_SESSION_TIMEOUT_MS)).toBe(
      true,
    );

    expect(store.verifyPin("2468")).toBe(true);
    store.recordParentVisibility(true, start);
    expect(
      store.recordParentVisibility(
        false,
        start + PARENT_SESSION_TIMEOUT_MS - 1,
      ),
    ).toBe(false);
    store.recordParentVisibility(true, start);
    expect(
      store.recordParentVisibility(false, start + PARENT_SESSION_TIMEOUT_MS),
    ).toBe(true);
    vi.useRealTimers();
  });

  it("derives the local daily overview and refreshes its date boundary", async () => {
    const store = useAppStore();
    store.state = configuredState();
    store.refreshToday(new Date("2026-07-14T10:00:00"));
    store.state.taskCompletions.push({
      id: "approved-today",
      taskTemplateId: "task-brush",
      dateKey: "2026-07-14",
      status: "approved",
      submittedAt: "2026-07-14T01:00:00.000Z",
      reviewedAt: "2026-07-14T02:00:00.000Z",
      bonusPoints: 0,
      bonusGrowthValue: 0,
    });
    store.state.ledger.push({
      id: "earned-today",
      type: "task_reward",
      amount: 10,
      balanceAfter: 10,
      reason: "任务通过",
      createdAt: new Date("2026-07-14T12:00:00").toISOString(),
      approvedByParent: true,
    });
    expect(store.approvedTasksToday).toBe(1);
    expect(store.earnedPointsToday).toBe(10);
    store.refreshToday(new Date("2026-07-15T00:01:00"));
    expect(store.approvedTasksToday).toBe(0);
  });

  it("claims all eligible growth rewards atomically and only once", async () => {
    const store = useAppStore();
    store.state = configuredState();
    store.state.progress.level = 10;
    store.refreshToday(new Date("2026-07-14T12:00:00"));
    for (let day = 1; day <= 14; day += 1) {
      const dateKey = `2026-07-${String(day).padStart(2, "0")}`;
      store.state.taskCompletions.push({
        id: `approved-${day}`,
        taskTemplateId: "task-read",
        dateKey,
        status: "approved",
        submittedAt: `${dateKey}T01:00:00.000Z`,
        reviewedAt: `${dateKey}T02:00:00.000Z`,
        bonusPoints: 0,
        bonusGrowthValue: 0,
      });
    }

    expect(store.availableGrowthRewardCount).toBe(8);
    expect(await store.claimAvailableGrowthRewards()).toBe(true);
    expect(store.state.progress.pointsBalance).toBe(85);
    expect(store.state.claimedLevelMilestones).toHaveLength(5);
    expect(store.state.claimedCompanionRewards).toEqual([
      "streak-3",
      "streak-7",
      "streak-14",
    ]);
    expect(
      store.state.ledger
        .filter((item) => item.type === "milestone_reward")
        .map((item) => item.balanceAfter),
    ).toEqual([10, 20, 35, 55, 85]);
    expect(store.unlockedDecorations).toHaveLength(3);
    expect(store.hasStreakDialoguePack).toBe(true);
    expect(store.availableGrowthRewardCount).toBe(0);
    expect(await store.claimAvailableGrowthRewards()).toBe(false);
    expect(store.state.progress.pointsBalance).toBe(85);
    expect(appRepository.save).toHaveBeenCalledOnce();
  });

  it("rolls back points, ledger, and claim markers together", async () => {
    vi.mocked(appRepository.save).mockRejectedValueOnce(new Error("磁盘不可用"));
    const store = useAppStore();
    store.state = configuredState();
    store.state.progress.level = 3;

    expect(await store.claimAvailableGrowthRewards()).toBe(false);
    expect(store.state.progress.pointsBalance).toBe(0);
    expect(store.state.ledger).toEqual([]);
    expect(store.state.claimedLevelMilestones).toEqual([]);
  });

  it("carries growth into a level that unlocks a new pet", async () => {
    const store = useAppStore();
    store.state = configuredState();
    store.state.progress.level = 2;
    store.state.progress.growthValue = 95;
    store.state.taskCompletions.push({
      id: "pending-growth",
      taskTemplateId: "task-brush",
      dateKey: todayKey(),
      status: "pending_review",
      submittedAt: new Date().toISOString(),
      bonusPoints: 0,
      bonusGrowthValue: 0,
    });

    await store.approveTask("pending-growth");

    expect(store.state.progress.level).toBe(3);
    expect(store.state.progress.growthValue).toBe(3);
    expect(store.petFeedback?.message).toContain("泡泡");
  });

  it("rolls back a durable mutation when persistence fails", async () => {
    vi.mocked(appRepository.save).mockRejectedValueOnce(new Error("磁盘不可用"));
    const store = useAppStore();
    store.state = configuredState();

    await store.submitTask("task-brush");

    expect(store.state.taskCompletions).toEqual([]);
    expect(store.error).toContain("磁盘不可用");
  });

  it("prevents duplicate reward freezes", async () => {
    const store = useAppStore();
    store.state = configuredState();
    store.state.progress.pointsBalance = 50;

    await store.requestReward("reward-story");
    await store.requestReward("reward-story");

    expect(store.state.redemptions).toHaveLength(1);
    expect(store.state.progress.frozenPoints).toBe(20);
  });

  it("requires an unlocked session and PIN before resetting local data", async () => {
    const store = useAppStore();
    store.state = configuredState();
    store.state.progress.pointsBalance = 222;

    expect(await store.resetData("2468")).toBe(false);
    expect(store.verifyPin("2468")).toBe(true);
    expect(await store.resetData("0000")).toBe(false);
    expect(await store.resetData("2468")).toBe(true);
    expect(store.state.setupCompleted).toBe(false);
    expect(store.state.progress.pointsBalance).toBe(0);
    expect(store.parentUnlocked).toBe(false);
  });
});
