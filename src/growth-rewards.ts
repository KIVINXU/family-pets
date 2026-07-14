import type {
  CompanionRewardId,
  LevelMilestoneId,
  TaskCompletion,
} from "./domain";
import { PET_CATALOG, type PetId } from "./pets";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface LevelMilestone {
  id: LevelMilestoneId;
  level: number;
  points: number;
  petId?: PetId;
}

const PET_MILESTONE_POINTS: Partial<Record<PetId, number>> = {
  paopao: 10,
  meimei: 15,
  xingya: 20,
  mili: 30,
};

const petMilestones = PET_CATALOG.flatMap<LevelMilestone>((pet) => {
  const points = PET_MILESTONE_POINTS[pet.id];
  if (points === undefined) return [];
  return [
    {
      id: `level-${pet.unlockLevel}` as LevelMilestoneId,
      level: pet.unlockLevel,
      points,
      petId: pet.id,
    },
  ];
});

export const LEVEL_MILESTONES: readonly LevelMilestone[] = [
  { id: "level-2", level: 2, points: 10 },
  ...petMilestones,
];

export interface RoomDecoration {
  id: CompanionRewardId;
  days: number;
  title: string;
  description: string;
  src: string;
  alt: string;
  layout: {
    left: string;
    top: string;
    width: string;
    zIndex: number;
  };
  unlocksDialoguePack?: boolean;
}

export const COMPANION_REWARDS: readonly RoomDecoration[] = [
  {
    id: "streak-3",
    days: 3,
    title: "小植物",
    description: "给房间添一点嫩绿的新成长",
    src: "/assets/objects/plant.png",
    alt: "连续陪伴三天获得的绿色小植物",
    layout: { left: "19.7%", top: "67.7%", width: "12.4%", zIndex: 2 },
  },
  {
    id: "streak-7",
    days: 7,
    title: "温暖小夜灯",
    description: "晚上也有一束安静的陪伴",
    src: "/assets/objects/night-light.png",
    alt: "连续陪伴七天获得的月亮小夜灯",
    layout: { left: "85.6%", top: "68.6%", width: "11.2%", zIndex: 2 },
  },
  {
    id: "streak-14",
    days: 14,
    title: "星星墙饰",
    description: "把两周的努力挂成亮晶晶的纪念",
    src: "/assets/objects/star-wall.png",
    alt: "连续陪伴十四天获得的月亮星星墙饰",
    layout: { left: "17.6%", top: "12.9%", width: "18.1%", zIndex: 1 },
    unlocksDialoguePack: true,
  },
];

export interface CompanionStreaks {
  current: number;
  longest: number;
  validDateKeys: string[];
}

function dateKeyTimestamp(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    return null;
  return timestamp;
}

export function calculateCompanionStreaks(
  completions: readonly TaskCompletion[],
  todayDateKey: string,
): CompanionStreaks {
  const todayTimestamp = dateKeyTimestamp(todayDateKey);
  if (todayTimestamp === null)
    return { current: 0, longest: 0, validDateKeys: [] };

  const dated = [...new Set(
    completions
      .filter((item) => item.status === "approved")
      .map((item) => item.dateKey),
  )]
    .map((dateKey) => ({ dateKey, timestamp: dateKeyTimestamp(dateKey) }))
    .filter(
      (item): item is { dateKey: string; timestamp: number } =>
        item.timestamp !== null && item.timestamp <= todayTimestamp,
    )
    .sort((left, right) => left.timestamp - right.timestamp);

  if (!dated.length) return { current: 0, longest: 0, validDateKeys: [] };

  let run = 1;
  let longest = 1;
  for (let index = 1; index < dated.length; index += 1) {
    run =
      dated[index].timestamp - dated[index - 1].timestamp === DAY_MS
        ? run + 1
        : 1;
    longest = Math.max(longest, run);
  }

  const latest = dated.at(-1)?.timestamp ?? 0;
  const current =
    latest === todayTimestamp || latest === todayTimestamp - DAY_MS ? run : 0;
  return {
    current,
    longest,
    validDateKeys: dated.map((item) => item.dateKey),
  };
}

export function availableLevelMilestones(
  level: number,
  claimed: readonly LevelMilestoneId[],
) {
  const claimedIds = new Set(claimed);
  return LEVEL_MILESTONES.filter(
    (milestone) => milestone.level <= level && !claimedIds.has(milestone.id),
  );
}

export function availableCompanionRewards(
  longestStreak: number,
  claimed: readonly CompanionRewardId[],
) {
  const claimedIds = new Set(claimed);
  return COMPANION_REWARDS.filter(
    (reward) => reward.days <= longestStreak && !claimedIds.has(reward.id),
  );
}

export function unlockedDecorations(claimed: readonly CompanionRewardId[]) {
  const claimedIds = new Set(claimed);
  return COMPANION_REWARDS.filter((reward) => claimedIds.has(reward.id));
}

export function nextCompanionReward(
  currentStreak: number,
  claimed: readonly CompanionRewardId[] = [],
) {
  const claimedIds = new Set(claimed);
  return (
    COMPANION_REWARDS.find(
      (reward) => reward.days > currentStreak && !claimedIds.has(reward.id),
    ) ?? COMPANION_REWARDS.find((reward) => !claimedIds.has(reward.id)) ?? null
  );
}

export function newlyReachedWeeklyCheer(previousLongest: number, nextLongest: number) {
  if (nextLongest < 21 || nextLongest <= previousLongest) return null;
  const previousCheckpoint = Math.max(14, Math.floor(previousLongest / 7) * 7);
  const nextCheckpoint = Math.floor(nextLongest / 7) * 7;
  return nextCheckpoint > previousCheckpoint ? nextCheckpoint : null;
}
