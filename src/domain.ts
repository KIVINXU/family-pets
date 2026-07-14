import type { PetId } from "./pets";

export type TaskStatus = "pending_review" | "approved" | "rejected";
export type RedemptionStatus = "pending" | "approved" | "rejected";
export type LevelMilestoneId =
  | "level-2"
  | "level-3"
  | "level-5"
  | "level-7"
  | "level-10";
export type CompanionRewardId = "streak-3" | "streak-7" | "streak-14";
export type LedgerType =
  | "task_reward"
  | "bonus_reward"
  | "milestone_reward"
  | "redemption_freeze"
  | "redemption_deduct"
  | "redemption_return";

export interface ChildProfile {
  id: string;
  name: string;
  avatar: string;
  currentPetId: PetId;
  currentPetName: string;
}
export interface ChildProgress {
  level: number;
  growthValue: number;
  growthTarget: number;
  totalGrowthValue: number;
  moodValue: number;
  energyValue: number;
  pointsBalance: number;
  frozenPoints: number;
  updatedAt: string;
}
export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  growthReward: number;
  recurrence: string;
  active: boolean;
  archived?: boolean;
}
export interface TaskCompletion {
  id: string;
  taskTemplateId: string;
  dateKey: string;
  status: TaskStatus;
  submittedAt: string;
  reviewedAt?: string;
  parentNote?: string;
  bonusPoints: number;
  bonusGrowthValue: number;
}
export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  available: boolean;
  archived?: boolean;
}
export interface Redemption {
  id: string;
  rewardId: string;
  pointsCost: number;
  status: RedemptionStatus;
  requestedAt: string;
  reviewedAt?: string;
  parentNote?: string;
  fulfilledAt?: string;
}
export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  approvedByParent: boolean;
}
export interface AppState {
  setupCompleted: boolean;
  child: ChildProfile;
  progress: ChildProgress;
  taskTemplates: TaskTemplate[];
  taskCompletions: TaskCompletion[];
  rewards: Reward[];
  redemptions: Redemption[];
  ledger: LedgerEntry[];
  claimedLevelMilestones: LevelMilestoneId[];
  claimedCompanionRewards: CompanionRewardId[];
  parentPin: string;
}

export type FamilyData = Omit<AppState, "parentPin" | "setupCompleted">;

export const RESERVED_PARENT_PIN = "2580";

export function parentPinValidationError(
  nextPin: string,
  confirmPin?: string,
  currentPin?: string,
) {
  if (!/^\d{4}$/.test(nextPin)) return "PIN 必须是 4 位数字";
  if (nextPin === RESERVED_PARENT_PIN) return "这个 PIN 不能使用，请换一个";
  if (confirmPin !== undefined && nextPin !== confirmPin)
    return "两次输入的 PIN 不一致";
  if (currentPin !== undefined && nextPin === currentPin)
    return "新 PIN 不能和当前 PIN 相同";
  return "";
}

export const seedState = (): AppState => ({
  setupCompleted: false,
  child: {
    id: "child-default",
    name: "小满",
    avatar: "团团伙伴",
    currentPetId: "tuantuan",
    currentPetName: "团团",
  },
  progress: {
    level: 1,
    growthValue: 0,
    growthTarget: 100,
    totalGrowthValue: 0,
    moodValue: 80,
    energyValue: 80,
    pointsBalance: 0,
    frozenPoints: 0,
    updatedAt: new Date().toISOString(),
  },
  taskTemplates: [
    {
      id: "task-brush",
      title: "认真刷牙",
      description: "早晚都照顾好小牙齿",
      pointsReward: 10,
      growthReward: 8,
      recurrence: "每日",
      active: true,
    },
    {
      id: "task-read",
      title: "阅读 20 分钟",
      description: "和团团一起安静读书",
      pointsReward: 15,
      growthReward: 12,
      recurrence: "每日",
      active: true,
    },
    {
      id: "task-tidy",
      title: "整理玩具",
      description: "让玩具回到自己的家",
      pointsReward: 12,
      growthReward: 10,
      recurrence: "每日",
      active: true,
    },
    {
      id: "task-help",
      title: "帮家里做件小事",
      description: "主动帮忙会让家更温暖",
      pointsReward: 18,
      growthReward: 15,
      recurrence: "每日",
      active: true,
    },
  ],
  taskCompletions: [],
  rewards: [
    {
      id: "reward-story",
      title: "多讲一个睡前故事",
      description: "今晚多选一本喜欢的故事",
      pointsCost: 20,
      available: true,
    },
    {
      id: "reward-cartoon",
      title: "动画片 20 分钟",
      description: "选择一集想看的动画片",
      pointsCost: 60,
      available: true,
    },
    {
      id: "reward-outing",
      title: "周末亲子活动",
      description: "一起决定周末的小冒险",
      pointsCost: 160,
      available: true,
    },
  ],
  redemptions: [],
  ledger: [],
  claimedLevelMilestones: [],
  claimedCompanionRewards: [],
  parentPin: RESERVED_PARENT_PIN,
});

export const todayKey = (date = new Date()) => date.toLocaleDateString("sv-SE");
export const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const weeklyDay: Record<string, number> = {
  每周日: 0,
  每周一: 1,
  每周二: 2,
  每周三: 3,
  每周四: 4,
  每周五: 5,
  每周六: 6,
};

export const isTaskScheduled = (task: TaskTemplate, date = new Date()) => {
  if (task.archived || !task.active) return false;
  const day = date.getDay();
  if (task.recurrence === "每日") return true;
  if (task.recurrence === "工作日") return day >= 1 && day <= 5;
  if (task.recurrence === "周末") return day === 0 || day === 6;
  if (task.recurrence === "每周一次") return day === 1;
  return weeklyDay[task.recurrence] === day;
};
