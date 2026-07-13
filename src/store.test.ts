import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { seedState, todayKey } from "./domain";
import { appRepository } from "./repository";
import { useAppStore } from "./store";

describe("app store rules", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setActivePinia(createPinia());
    vi.spyOn(appRepository, "save").mockResolvedValue();
  });

  it("carries growth into the next level after approval", async () => {
    const store = useAppStore();
    store.state = seedState();
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

  it("migrates a schema version 1 backup to the default pet", async () => {
    const legacyState = seedState();
    const legacyChild: Partial<typeof legacyState.child> = {
      ...legacyState.child,
      currentPetName: "小团子",
    };
    delete legacyChild.currentPetId;

    const restored = await appRepository.restore(
      JSON.stringify({
        schemaVersion: 1,
        state: { ...legacyState, child: legacyChild },
      }),
    );

    expect(restored.child.currentPetId).toBe("tuantuan");
    expect(restored.child.currentPetName).toBe("小团子");
  });

  it("falls back to Tuantuan when restored pet is still locked", async () => {
    const backupState = seedState();
    backupState.child.currentPetId = "mili";
    backupState.child.currentPetName = "米粒";
    backupState.progress.level = 2;

    const restored = await appRepository.restore(
      JSON.stringify({ schemaVersion: 2, state: backupState }),
    );

    expect(restored.child.currentPetId).toBe("tuantuan");
    expect(restored.child.currentPetName).toBe("团团");
  });

  it("blocks switching to a pet before its unlock level", async () => {
    const store = useAppStore();
    store.state = seedState();

    expect(await store.switchPet("paopao")).toBe(false);
    expect(store.state.child.currentPetId).toBe("tuantuan");
    expect(store.toast?.message).toContain("3 级");
    expect(appRepository.save).not.toHaveBeenCalled();
  });

  it("switches to an unlocked pet and persists the selection", async () => {
    const store = useAppStore();
    store.state = seedState();
    store.state.progress.level = 3;

    expect(await store.switchPet("paopao")).toBe(true);

    expect(store.state.child.currentPetId).toBe("paopao");
    expect(store.state.child.currentPetName).toBe("泡泡");
    expect(store.currentPet.id).toBe("paopao");
    expect(appRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        child: expect.objectContaining({ currentPetId: "paopao" }),
      }),
    );
  });

  it("rejects incomplete backup data", async () => {
    await expect(
      appRepository.restore(
        JSON.stringify({
          schemaVersion: 1,
          state: { child: { name: "小满" }, taskTemplates: [] },
        }),
      ),
    ).rejects.toThrow("备份文件格式不正确");
  });

  it("persists a reactive store state through IndexedDB", async () => {
    vi.restoreAllMocks();
    const store = useAppStore();
    store.state = seedState();

    await store.submitTask("task-brush");

    expect(store.completionFor("task-brush")?.status).toBe("pending_review");
    expect(store.error).toBe("");
  });

  it("passes a cloneable plain object to the repository", async () => {
    const save = vi.mocked(appRepository.save);
    save.mockImplementation(async (state) => {
      expect(() => structuredClone(state)).not.toThrow();
    });
    const store = useAppStore();
    store.state.progress.moodValue = 73;
    store.state.taskTemplates[0].description = "嵌套响应式数据";

    await store.submitTask("task-brush");

    expect(save).toHaveBeenCalledOnce();
    expect(store.error).toBe("");
  });

  it("does not freeze points twice for the same pending reward", async () => {
    const store = useAppStore();
    store.state = seedState();

    await store.requestReward("reward-story");
    await store.requestReward("reward-story");

    expect(
      store.state.redemptions.filter(
        (item) => item.rewardId === "reward-story",
      ),
    ).toHaveLength(1);
    expect(store.state.progress.frozenPoints).toBe(30);
    expect(store.toast?.message).toContain("已经在等待");
  });

  it("keeps the parent note on an approved redemption", async () => {
    const store = useAppStore();
    store.state = seedState();
    await store.requestReward("reward-story");
    const redemption = store.redemptionForReward("reward-story");

    await store.approveRedemption(redemption!.id, "周六晚上一起讲");

    expect(store.redemptionForReward("reward-story")?.status).toBe("approved");
    expect(store.redemptionForReward("reward-story")?.parentNote).toBe(
      "周六晚上一起讲",
    );
  });

  it("requires the parent PIN before resetting local data", async () => {
    const store = useAppStore();
    store.state = seedState();
    store.state.progress.pointsBalance = 222;

    expect(await store.resetData("0000")).toBe(false);
    expect(store.state.progress.pointsBalance).toBe(222);
    expect(await store.resetData("2580")).toBe(true);
    expect(store.state.progress.pointsBalance).toBe(65);
  });

  it("archives and restores a task without deleting its history", async () => {
    const store = useAppStore();
    store.state = seedState();
    store.state.taskCompletions.push({
      id: "approved-history",
      taskTemplateId: "task-read",
      dateKey: todayKey(),
      status: "approved",
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      bonusPoints: 0,
      bonusGrowthValue: 0,
    });

    expect(await store.archiveTask("task-read")).toBe(true);
    expect(
      store.state.taskTemplates.find((item) => item.id === "task-read")
        ?.archived,
    ).toBe(true);
    expect(store.state.taskCompletions).toHaveLength(1);
    expect(await store.restoreTask("task-read")).toBe(true);
    expect(
      store.state.taskTemplates.find((item) => item.id === "task-read")
        ?.archived,
    ).toBe(false);
  });

  it("blocks reward archival while a redemption is pending", async () => {
    const store = useAppStore();
    store.state = seedState();
    await store.requestReward("reward-story");

    expect(await store.archiveReward("reward-story")).toBe(false);
    expect(
      store.state.rewards.find((item) => item.id === "reward-story")?.archived,
    ).not.toBe(true);
    expect(store.toast?.message).toContain("待确认兑换");
  });

  it("updates family profile and requires the current PIN for PIN changes", async () => {
    const store = useAppStore();
    store.state = seedState();

    expect(
      await store.updateChildProfile({ name: "安安", currentPetName: "糯米" }),
    ).toBe(true);
    expect(store.state.child.name).toBe("安安");
    expect(store.state.child.currentPetName).toBe("糯米");
    expect(await store.updateParentPin("0000", "1357")).toBe(false);
    expect(await store.updateParentPin("2580", "1357")).toBe(true);
    expect(store.verifyPin("1357")).toBe(true);
  });
});
