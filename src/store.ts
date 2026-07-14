import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  appRepository,
  type BackupCandidate,
} from "./repository";
import { hasBeenAwayLongEnough, PET_LAST_ACTIVE_KEY } from "./activity";
import {
  ensureBackupSetupTime,
  resetBackupPreferences,
} from "./backup-preferences";
import {
  findPet,
  getPet,
  isPetUnlocked,
  PET_CATALOG,
  petsUnlockedAtLevel,
  type PetId,
} from "./pets";
import {
  seedState,
  parentPinValidationError,
  todayKey,
  uid,
  type AppState,
  type LedgerEntry,
  type Redemption,
  type TaskCompletion,
} from "./domain";

export const PARENT_SESSION_TIMEOUT_MS = 10 * 60 * 1000;

export const useAppStore = defineStore("app", () => {
  const state = ref<AppState>(seedState());
  const loaded = ref(false);
  const error = ref("");
  const toast = ref<null | {
    kind: "success" | "error" | "info";
    message: string;
    id: string;
  }>(null);
  const parentUnlocked = ref(false);
  const currentDateKey = ref(todayKey());
  const dirtyForms = ref<Record<string, boolean>>({});
  const petNeedsRest = ref(false);
  const petFeedback = ref<null | {
    kind: "happy" | "level_up";
    message: string;
    id: string;
  }>(null);
  const currentPet = computed(() => getPet(state.value.child.currentPetId));
  const unlockedPets = computed(() =>
    petsUnlockedAtLevel(state.value.progress.level),
  );
  const availablePoints = computed(() =>
    Math.max(
      0,
      state.value.progress.pointsBalance - state.value.progress.frozenPoints,
    ),
  );
  const pendingTasks = computed(() =>
    state.value.taskCompletions.filter((x) => x.status === "pending_review"),
  );
  const approvedTasksToday = computed(
    () =>
      state.value.taskCompletions.filter(
        (item) =>
          item.dateKey === currentDateKey.value && item.status === "approved",
      ).length,
  );
  const pendingTasksToday = computed(
    () =>
      state.value.taskCompletions.filter(
        (item) =>
          item.dateKey === currentDateKey.value &&
          item.status === "pending_review",
      ).length,
  );
  const earnedPointsToday = computed(() =>
    state.value.ledger
      .filter(
        (item) =>
          todayKey(new Date(item.createdAt)) === currentDateKey.value &&
          (item.type === "task_reward" || item.type === "bonus_reward"),
      )
      .reduce((sum, item) => sum + item.amount, 0),
  );
  const hasUnsavedChanges = computed(() =>
    Object.values(dirtyForms.value).some(Boolean),
  );
  const pendingRedemptions = computed(() =>
    state.value.redemptions.filter((x) => x.status === "pending"),
  );
  const unfulfilledRedemptions = computed(() =>
    state.value.redemptions.filter(
      (item) => item.status === "approved" && !item.fulfilledAt,
    ),
  );
  const completionFor = (taskId: string) =>
    state.value.taskCompletions.find(
      (x) =>
        x.taskTemplateId === taskId && x.dateKey === currentDateKey.value,
    );
  const redemptionForReward = (rewardId: string) =>
    [...state.value.redemptions]
      .reverse()
      .find((item) => item.rewardId === rewardId);
  const notify = (
    message: string,
    kind: "success" | "error" | "info" = "success",
  ) => {
    toast.value = { kind, message, id: uid("toast") };
  };
  const persist = async (previous: AppState, successMessage?: string) => {
    try {
      await appRepository.save(snapshot());
      if (successMessage) notify(successMessage);
      return true;
    } catch (cause) {
      state.value = previous;
      error.value =
        cause instanceof Error
          ? `保存失败：${cause.message}`
          : "保存失败，刚才的修改没有生效。";
      notify(error.value, "error");
      return false;
    }
  };
  const cap = (n: number) => Math.max(0, Math.min(100, n));
  const snapshot = (): AppState =>
    JSON.parse(JSON.stringify(state.value)) as AppState;

  let loadPromise: Promise<void> | null = null;
  let parentLastActivityAt = 0;
  let parentHiddenAt: number | null = null;

  async function load() {
    if (loaded.value) return;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      recordAppActivity();
      try {
        state.value = await appRepository.load();
        if (state.value.setupCompleted) ensureBackupSetupTime();
      } catch {
        error.value = "本地数据读取失败，已使用初始数据。";
      } finally {
        loaded.value = true;
      }
    })();
    return loadPromise;
  }
  function verifyPin(pin: string) {
    parentUnlocked.value = pin === state.value.parentPin;
    if (parentUnlocked.value) {
      parentLastActivityAt = Date.now();
      parentHiddenAt = null;
    }
    return parentUnlocked.value;
  }
  function refreshToday(now = new Date()) {
    currentDateKey.value = todayKey(now);
  }
  function setFormDirty(key: string, dirty: boolean) {
    dirtyForms.value = { ...dirtyForms.value, [key]: dirty };
  }
  function recordParentSessionActivity(now = Date.now()) {
    if (parentUnlocked.value) parentLastActivityAt = now;
  }
  function checkParentSession(now = Date.now()) {
    if (
      parentUnlocked.value &&
      parentLastActivityAt > 0 &&
      now - parentLastActivityAt >= PARENT_SESSION_TIMEOUT_MS
    ) {
      lockParent();
      return true;
    }
    return false;
  }
  function recordParentVisibility(hidden: boolean, now = Date.now()) {
    if (!parentUnlocked.value) return false;
    if (hidden) {
      parentHiddenAt = now;
      return false;
    }
    const shouldLock =
      parentHiddenAt !== null &&
      now - parentHiddenAt >= PARENT_SESSION_TIMEOUT_MS;
    parentHiddenAt = null;
    if (shouldLock) {
      lockParent();
      return true;
    }
    recordParentSessionActivity(now);
    return false;
  }
  async function submitTask(taskTemplateId: string) {
    const previous = snapshot();
    const existing = completionFor(taskTemplateId);
    if (
      existing?.status === "pending_review" ||
      existing?.status === "approved"
    )
      return;
    const item: TaskCompletion = {
      id: existing?.id ?? uid("completion"),
      taskTemplateId,
      dateKey: currentDateKey.value,
      status: "pending_review",
      submittedAt: new Date().toISOString(),
      bonusPoints: 0,
      bonusGrowthValue: 0,
    };
    state.value.taskCompletions = [
      ...state.value.taskCompletions.filter((x) => x.id !== item.id),
      item,
    ];
    if (await persist(previous, "任务已提交，等待家长确认")) {
      petFeedback.value = {
        kind: "happy",
        message: "收到啦，完成后交给家长确认就会获得奖励",
        id: uid("feedback"),
      };
    }
  }
  function ledger(
    type: LedgerEntry["type"],
    amount: number,
    reason: string,
    approvedByParent: boolean,
  ): LedgerEntry {
    return {
      id: uid("ledger"),
      type,
      amount,
      balanceAfter: state.value.progress.pointsBalance,
      reason,
      createdAt: new Date().toISOString(),
      approvedByParent,
    };
  }
  async function approveTask(
    id: string,
    bonusPoints = 0,
    bonusGrowthValue = 0,
    note = "",
  ) {
    const previous = snapshot();
    const item = state.value.taskCompletions.find((x) => x.id === id);
    if (!item || item.status !== "pending_review") return;
    const task = state.value.taskTemplates.find(
      (x) => x.id === item.taskTemplateId,
    );
    if (!task) return;
    const previousLevel = state.value.progress.level;
    const points = task.pointsReward + bonusPoints,
      growth = task.growthReward + bonusGrowthValue;
    const totalGrowth = state.value.progress.growthValue + growth;
    const levelUps = Math.floor(
      totalGrowth / state.value.progress.growthTarget,
    );
    state.value.progress = {
      ...state.value.progress,
      level: state.value.progress.level + levelUps,
      pointsBalance: state.value.progress.pointsBalance + points,
      growthValue: totalGrowth % state.value.progress.growthTarget,
      totalGrowthValue: state.value.progress.totalGrowthValue + growth,
      moodValue: cap(state.value.progress.moodValue + 8),
      energyValue: cap(state.value.progress.energyValue + 6),
      updatedAt: new Date().toISOString(),
    };
    Object.assign(item, {
      status: "approved",
      reviewedAt: new Date().toISOString(),
      bonusPoints,
      bonusGrowthValue,
      parentNote: note || undefined,
    });
    state.value.ledger.push(
      ledger("task_reward", task.pointsReward, `任务通过：${task.title}`, true),
    );
    if (bonusPoints)
      state.value.ledger.push(
        ledger(
          "bonus_reward",
          bonusPoints,
          `家长额外鼓励：${task.title}`,
          true,
        ),
      );
    if (await persist(previous, "任务审核完成")) {
      const newlyUnlocked = PET_CATALOG.filter(
        (pet) =>
          pet.unlockLevel > previousLevel &&
          pet.unlockLevel <= state.value.progress.level,
      );
      petFeedback.value =
        levelUps > 0
          ? {
              kind: "level_up",
              message: newlyUnlocked.length
                ? `升级啦！新伙伴${newlyUnlocked.map((pet) => pet.name).join("、")}已解锁`
                : `升级啦！现在是 ${state.value.progress.level} 级`,
              id: uid("feedback"),
            }
          : {
              kind: "happy",
              message: `${task.title}通过啦，谢谢你的努力`,
              id: uid("feedback"),
            };
    }
  }
  async function rejectTask(id: string, note: string) {
    const previous = snapshot();
    const item = state.value.taskCompletions.find((x) => x.id === id);
    if (!item || item.status !== "pending_review") return;
    Object.assign(item, {
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      parentNote: note,
    });
    await persist(previous, "任务已温和退回");
  }
  async function requestReward(rewardId: string) {
    const previous = snapshot();
    const reward = state.value.rewards.find((x) => x.id === rewardId);
    if (!reward?.available) return;
    if (
      state.value.redemptions.some(
        (item) =>
          item.rewardId === rewardId &&
          item.status === "approved" &&
          !item.fulfilledAt,
      )
    ) {
      notify("这个奖励还在等待兑现", "info");
      return;
    }
    if (
      state.value.redemptions.some(
        (item) => item.rewardId === rewardId && item.status === "pending",
      )
    ) {
      notify("这个奖励已经在等待家长确认了", "info");
      return;
    }
    if (availablePoints.value < reward.pointsCost) {
      notify(`还差 ${reward.pointsCost - availablePoints.value} 分`, "info");
      return;
    }
    const item: Redemption = {
      id: uid("redemption"),
      rewardId,
      pointsCost: reward.pointsCost,
      status: "pending",
      requestedAt: new Date().toISOString(),
    };
    state.value.progress.frozenPoints += reward.pointsCost;
    state.value.redemptions.push(item);
    state.value.ledger.push(
      ledger(
        "redemption_freeze",
        reward.pointsCost,
        `申请兑换：${reward.title}`,
        false,
      ),
    );
    if (await persist(previous, "兑换申请已提交，积分已帮你留住")) {
      petFeedback.value = {
        kind: "happy",
        message: `已经把${reward.title}的心愿送给家长啦`,
        id: uid("feedback"),
      };
    }
  }
  async function approveRedemption(id: string, note = "") {
    const previous = snapshot();
    const item = state.value.redemptions.find((x) => x.id === id);
    if (!item || item.status !== "pending") return;
    const reward = state.value.rewards.find((x) => x.id === item.rewardId);
    state.value.progress.pointsBalance -= item.pointsCost;
    state.value.progress.frozenPoints -= item.pointsCost;
    Object.assign(item, {
      status: "approved",
      reviewedAt: new Date().toISOString(),
      parentNote: note.trim() || "家长已确认，可以安排啦",
    });
    state.value.ledger.push(
      ledger(
        "redemption_deduct",
        -item.pointsCost,
        `兑换通过：${reward?.title ?? "奖励"}`,
        true,
      ),
    );
    await persist(previous, "兑换已确认");
  }
  async function rejectRedemption(id: string, note: string) {
    const previous = snapshot();
    const item = state.value.redemptions.find((x) => x.id === id);
    if (!item || item.status !== "pending") return;
    const reward = state.value.rewards.find((x) => x.id === item.rewardId);
    state.value.progress.frozenPoints -= item.pointsCost;
    Object.assign(item, {
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      parentNote: note,
    });
    state.value.ledger.push(
      ledger(
        "redemption_return",
        item.pointsCost,
        `兑换驳回返还：${reward?.title ?? "奖励"}`,
        true,
      ),
    );
    await persist(previous, "兑换已退回，积分已返还");
  }
  async function fulfillRedemption(id: string) {
    const previous = snapshot();
    const item = state.value.redemptions.find(
      (redemption) => redemption.id === id,
    );
    if (!item || item.status !== "approved" || item.fulfilledAt) return false;
    item.fulfilledAt = new Date().toISOString();
    return persist(previous, "奖励已标记为兑现");
  }
  async function addTask(
    title: string,
    description: string,
    pointsReward: number,
    growthReward: number,
    recurrence = "每日",
  ) {
    const previous = snapshot();
    state.value.taskTemplates.push({
      id: uid("task"),
      title,
      description,
      pointsReward,
      growthReward,
      recurrence,
      active: true,
    });
    await persist(previous, "任务已添加");
  }
  async function toggleTask(id: string) {
    const previous = snapshot();
    const item = state.value.taskTemplates.find((x) => x.id === id);
    if (item) {
      item.active = !item.active;
      await persist(previous, "任务状态已更新");
    }
  }
  async function updateTask(
    id: string,
    values: {
      title: string;
      description: string;
      pointsReward: number;
      growthReward: number;
      recurrence: string;
    },
  ) {
    const previous = snapshot();
    const item = state.value.taskTemplates.find((x) => x.id === id);
    if (!item) return;
    Object.assign(item, values);
    await persist(previous, "任务规则已保存");
  }
  async function archiveTask(id: string) {
    if (
      state.value.taskCompletions.some(
        (item) =>
          item.taskTemplateId === id && item.status === "pending_review",
      )
    ) {
      notify("这个任务还有待确认记录，暂时不能归档", "info");
      return false;
    }
    const previous = snapshot();
    const item = state.value.taskTemplates.find((task) => task.id === id);
    if (!item) return false;
    item.archived = true;
    item.active = false;
    return persist(previous, "任务已归档");
  }
  async function restoreTask(id: string) {
    const previous = snapshot();
    const item = state.value.taskTemplates.find((task) => task.id === id);
    if (!item) return false;
    item.archived = false;
    item.active = true;
    return persist(previous, "任务已恢复");
  }
  async function addReward(
    title: string,
    description: string,
    pointsCost: number,
  ) {
    const previous = snapshot();
    state.value.rewards.push({
      id: uid("reward"),
      title,
      description,
      pointsCost,
      available: true,
    });
    await persist(previous, "奖励已添加");
  }
  async function toggleReward(id: string) {
    const previous = snapshot();
    const item = state.value.rewards.find((x) => x.id === id);
    if (item) {
      item.available = !item.available;
      await persist(previous, "奖励状态已更新");
    }
  }
  async function updateReward(
    id: string,
    values: { title: string; description: string; pointsCost: number },
  ) {
    const previous = snapshot();
    const item = state.value.rewards.find((x) => x.id === id);
    if (!item) return;
    Object.assign(item, values);
    await persist(previous, "奖励规则已保存");
  }
  async function archiveReward(id: string) {
    if (
      state.value.redemptions.some(
        (item) => item.rewardId === id && item.status === "pending",
      )
    ) {
      notify("这个奖励还有待确认兑换，暂时不能归档", "info");
      return false;
    }
    const previous = snapshot();
    const item = state.value.rewards.find((reward) => reward.id === id);
    if (!item) return false;
    item.archived = true;
    item.available = false;
    return persist(previous, "奖励已归档");
  }
  async function restoreReward(id: string) {
    const previous = snapshot();
    const item = state.value.rewards.find((reward) => reward.id === id);
    if (!item) return false;
    item.archived = false;
    item.available = true;
    return persist(previous, "奖励已恢复");
  }
  function previewRestore(raw: string) {
    try {
      return appRepository.previewBackup(raw);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "恢复失败，请检查备份文件。";
      notify(message, "error");
      return null;
    }
  }
  async function confirmRestore(candidate: BackupCandidate, currentPin: string) {
    if (!parentUnlocked.value || currentPin !== state.value.parentPin) {
      notify("当前 PIN 不正确，数据没有恢复", "error");
      return false;
    }
    const previous = snapshot();
    state.value = {
      ...candidate.state,
      setupCompleted: true,
      parentPin: previous.parentPin,
    };
    if (!(await persist(previous, "备份恢复完成"))) return false;
    lockParent();
    return true;
  }
  async function restoreDuringSetup(
    candidate: BackupCandidate,
    nextPin: string,
    confirmPin: string,
  ) {
    const pinError = parentPinValidationError(nextPin, confirmPin);
    if (pinError) {
      notify(pinError, "error");
      return false;
    }
    const previous = snapshot();
    state.value = {
      ...candidate.state,
      setupCompleted: true,
      parentPin: nextPin,
    };
    const saved = await persist(previous, "家庭备份已恢复");
    if (saved) ensureBackupSetupTime();
    return saved;
  }
  async function completeSetup(values: {
    childName: string;
    petName: string;
    pin: string;
    confirmPin: string;
  }) {
    const childName = values.childName.trim();
    const petName = values.petName.trim();
    if (!childName || !petName) {
      notify("孩子昵称和宠物名称不能为空", "error");
      return false;
    }
    const pinError = parentPinValidationError(values.pin, values.confirmPin);
    if (pinError) {
      notify(pinError, "error");
      return false;
    }
    const previous = snapshot();
    Object.assign(state.value.child, {
      name: childName,
      currentPetName: petName,
    });
    state.value.parentPin = values.pin;
    state.value.setupCompleted = true;
    const saved = await persist(previous, "家庭设置完成，欢迎回来");
    if (saved) ensureBackupSetupTime();
    return saved;
  }
  async function resetData(pin: string) {
    if (!parentUnlocked.value || pin !== state.value.parentPin) {
      notify("PIN 不正确，数据没有重置", "error");
      return false;
    }
    const previous = snapshot();
    state.value = seedState();
    if (!(await persist(previous, "本地数据已恢复为初始状态"))) return false;
    resetBackupPreferences();
    lockParent();
    return true;
  }
  async function updateChildProfile(values: {
    name: string;
    currentPetName: string;
  }) {
    const name = values.name.trim();
    const currentPetName = values.currentPetName.trim();
    if (!name || !currentPetName) {
      notify("孩子昵称和宠物名称不能为空", "error");
      return false;
    }
    const previous = snapshot();
    Object.assign(state.value.child, { name, currentPetName });
    return persist(previous, "家庭资料已保存");
  }
  async function switchPet(petId: PetId) {
    const pet = findPet(petId);
    if (!pet) {
      notify("没有找到这个伙伴", "error");
      return false;
    }
    if (!isPetUnlocked(pet, state.value.progress.level)) {
      notify(`达到 ${pet.unlockLevel} 级后就能邀请${pet.name}啦`, "info");
      return false;
    }
    if (state.value.child.currentPetId === pet.id) return true;
    const previous = snapshot();
    Object.assign(state.value.child, {
      currentPetId: pet.id,
      currentPetName: pet.name,
    });
    if (!(await persist(previous, `已选择${pet.name}作为当前伙伴`))) {
      return false;
    }
    petFeedback.value = {
      kind: "happy",
      message: `${pet.name}来陪你啦`,
      id: uid("feedback"),
    };
    return true;
  }
  async function updateParentPin(
    currentPin: string,
    nextPin: string,
    confirmPin: string,
  ) {
    if (!parentUnlocked.value || currentPin !== state.value.parentPin) {
      notify("当前 PIN 不正确", "error");
      return false;
    }
    const pinError = parentPinValidationError(
      nextPin,
      confirmPin,
      currentPin,
    );
    if (pinError) {
      notify(pinError, "error");
      return false;
    }
    const previous = snapshot();
    state.value.parentPin = nextPin;
    if (!(await persist(previous, "家长 PIN 已更新，请重新进入"))) return false;
    lockParent();
    return true;
  }
  async function resetForgottenPin(
    nextPin: string,
    confirmPin: string,
    confirmed: boolean,
  ) {
    if (!confirmed) {
      notify("请先确认正在重新设置家长 PIN", "info");
      return false;
    }
    const pinError = parentPinValidationError(
      nextPin,
      confirmPin,
      state.value.parentPin,
    );
    if (pinError) {
      notify(pinError, "error");
      return false;
    }
    const previous = snapshot();
    state.value.parentPin = nextPin;
    if (!(await persist(previous, "新的家长 PIN 已生效"))) return false;
    lockParent();
    return true;
  }
  function lockParent() {
    parentUnlocked.value = false;
    parentLastActivityAt = 0;
    parentHiddenAt = null;
  }
  function clearPetFeedback() {
    petFeedback.value = null;
  }
  function clearPetRest() {
    petNeedsRest.value = false;
  }
  function recordAppActivity(detectLongAbsence = true, now = Date.now()) {
    if (typeof window === "undefined") return;
    try {
      const lastActiveAt = window.localStorage.getItem(PET_LAST_ACTIVE_KEY);
      if (detectLongAbsence && hasBeenAwayLongEnough(lastActiveAt, now)) {
        petNeedsRest.value = true;
      }
      window.localStorage.setItem(PET_LAST_ACTIVE_KEY, String(now));
    } catch {
      // Activity tracking is optional and must never block the local app.
    }
  }
  function clearToast() {
    toast.value = null;
  }
  return {
    state,
    loaded,
    error,
    toast,
    parentUnlocked,
    currentDateKey,
    hasUnsavedChanges,
    petNeedsRest,
    petFeedback,
    currentPet,
    unlockedPets,
    availablePoints,
    pendingTasks,
    approvedTasksToday,
    pendingTasksToday,
    earnedPointsToday,
    pendingRedemptions,
    unfulfilledRedemptions,
    completionFor,
    redemptionForReward,
    load,
    verifyPin,
    lockParent,
    refreshToday,
    setFormDirty,
    recordParentSessionActivity,
    checkParentSession,
    recordParentVisibility,
    submitTask,
    approveTask,
    rejectTask,
    requestReward,
    approveRedemption,
    rejectRedemption,
    fulfillRedemption,
    addTask,
    toggleTask,
    updateTask,
    archiveTask,
    restoreTask,
    addReward,
    updateReward,
    archiveReward,
    restoreReward,
    toggleReward,
    previewRestore,
    confirmRestore,
    restoreDuringSetup,
    completeSetup,
    resetData,
    updateChildProfile,
    switchPet,
    updateParentPin,
    resetForgottenPin,
    clearPetFeedback,
    clearPetRest,
    recordAppActivity,
    notify,
    clearToast,
    exportData: () => appRepository.export(state.value),
  };
});
