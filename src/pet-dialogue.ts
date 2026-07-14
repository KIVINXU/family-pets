import type { PetId } from "./pets";

export type DialoguePeriod = "morning" | "daytime" | "evening" | "night";

export interface DialogueLine {
  id: string;
  text: string;
}

export interface DialogueContext {
  petId: PetId;
  now: Date;
  approvedTasksToday: number;
  pendingTasksToday: number;
  earnedPointsToday: number;
  energyValue: number;
  currentStreak: number;
  hasStreakDialoguePack: boolean;
  previousId?: string;
  random?: () => number;
}

const PERIOD_LINES: Record<DialoguePeriod, readonly DialogueLine[]> = {
  morning: [
    { id: "morning-hello", text: "早上好呀，今天也从一件小事开始吧" },
    { id: "morning-soft", text: "伸个懒腰，新的一天慢慢来就好" },
  ],
  daytime: [
    { id: "day-company", text: "我在这里陪你，把事情一件件做好" },
    { id: "day-step", text: "每完成一点点，房间都会更有光彩" },
  ],
  evening: [
    { id: "evening-gentle", text: "傍晚啦，挑一件轻松的小事就很好" },
    { id: "evening-proud", text: "今天走到这里已经很棒啦" },
  ],
  night: [
    { id: "night-rest", text: "夜深啦，今天辛苦了，安心休息吧" },
    { id: "night-tomorrow", text: "晚安，没做完的事明天再慢慢来" },
    { id: "night-company", text: "我会守着这间小屋，陪你做个好梦" },
  ],
};

const PET_LINES: Record<PetId, readonly DialogueLine[]> = {
  tuantuan: [
    { id: "tuantuan-1", text: "不着急，我会软乎乎地陪着你" },
    { id: "tuantuan-2", text: "认真做过的小事，我都帮你记得" },
    { id: "tuantuan-3", text: "一起安安静静待一会儿也很好" },
    { id: "tuantuan-4", text: "你向前一点，我就开心一点" },
    { id: "tuantuan-5", text: "房间暖暖的，因为你来过呀" },
    { id: "tuantuan-6", text: "今天的你，也值得一个大大的拥抱" },
  ],
  paopao: [
    { id: "paopao-1", text: "我发现啦，你今天又多认真了一点" },
    { id: "paopao-2", text: "小小的变化也值得好好收藏" },
    { id: "paopao-3", text: "让我看看，下一颗好消息在哪里" },
    { id: "paopao-4", text: "细心一点点，惊喜就会冒出来" },
    { id: "paopao-5", text: "你的努力，我一条也不会漏掉" },
    { id: "paopao-6", text: "好奇心正在帮我们找到新办法" },
  ],
  meimei: [
    { id: "meimei-1", text: "好消息要一起分享才更甜呀" },
    { id: "meimei-2", text: "给今天的自己一个开心的拥抱吧" },
    { id: "meimei-3", text: "你的笑容让小屋也亮起来啦" },
    { id: "meimei-4", text: "一点点进步，也要大方地庆祝" },
    { id: "meimei-5", text: "我把快乐分你一大半" },
    { id: "meimei-6", text: "今天值得记住的是你的认真" },
  ],
  xingya: [
    { id: "xingya-1", text: "换个小办法，也许会发现新惊喜" },
    { id: "xingya-2", text: "你的点子像小星星一样亮" },
    { id: "xingya-3", text: "慢慢试试看，答案可能就在旁边" },
    { id: "xingya-4", text: "今天想出一个新办法就很厉害" },
    { id: "xingya-5", text: "我喜欢你认真思考的样子" },
    { id: "xingya-6", text: "每个小问题都藏着一次发现" },
  ],
  mili: [
    { id: "mili-1", text: "勇敢不是着急，是愿意再试一次" },
    { id: "mili-2", text: "慢一点没关系，坚持就很了不起" },
    { id: "mili-3", text: "我会陪你把困难变成小台阶" },
    { id: "mili-4", text: "认真走过的每一步都算数" },
    { id: "mili-5", text: "你比自己想象中更有耐心" },
    { id: "mili-6", text: "深呼吸，我们可以稳稳地继续" },
  ],
};

const STREAK_LINES: Record<PetId, readonly DialogueLine[]> = {
  tuantuan: [
    { id: "tuantuan-streak-1", text: "这么多天的陪伴，让小屋越来越温暖" },
    { id: "tuantuan-streak-2", text: "每天一点点，我们已经走了好远呀" },
  ],
  paopao: [
    { id: "paopao-streak-1", text: "我数过啦，这一路有好多认真瞬间" },
    { id: "paopao-streak-2", text: "连续的小进步，拼成了大大的发现" },
  ],
  meimei: [
    { id: "meimei-streak-1", text: "这么长的陪伴，当然值得一起庆祝" },
    { id: "meimei-streak-2", text: "快乐一天天攒起来，变成了满屋星光" },
  ],
  xingya: [
    { id: "xingya-streak-1", text: "你把每天的小点子连成了一条星河" },
    { id: "xingya-streak-2", text: "坚持让普通的日子长出了新光芒" },
  ],
  mili: [
    { id: "mili-streak-1", text: "这么多天稳稳走来，真的很勇敢" },
    { id: "mili-streak-2", text: "耐心积起来，就变成了闪亮的力量" },
  ],
};

export function dialoguePeriod(now: Date): DialoguePeriod {
  const hour = now.getHours();
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "daytime";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function contextualLines(context: DialogueContext, period: DialoguePeriod) {
  const lines = [...PERIOD_LINES[period]];
  if (period !== "night") {
    if (context.pendingTasksToday > 0)
      lines.push({ id: "context-pending", text: "好消息已经送出啦，等家长来确认就好" });
    if (context.approvedTasksToday > 0)
      lines.push({ id: "context-approved", text: `今天已经完成 ${context.approvedTasksToday} 件事，真不错` });
    if (context.earnedPointsToday > 0)
      lines.push({ id: "context-points", text: `今天收到了 ${context.earnedPointsToday} 颗积分星光` });
    if (context.currentStreak > 0)
      lines.push({ id: "context-streak", text: `我们已经连续陪伴 ${context.currentStreak} 天啦` });
  }
  if (context.energyValue <= 25)
    lines.push({ id: "context-rest", text: "今天可以慢一点，休息也是照顾自己" });
  return lines;
}

export function selectContextualDialogue(context: DialogueContext): DialogueLine {
  const random = context.random ?? Math.random;
  const period = dialoguePeriod(context.now);
  const shared = contextualLines(context, period);
  const personal =
    period === "night"
      ? []
      : [
          ...PET_LINES[context.petId],
          ...(context.hasStreakDialoguePack ? STREAK_LINES[context.petId] : []),
        ];
  const source = random() < 0.25 && personal.length ? personal : shared;
  const withoutPrevious = source.filter((line) => line.id !== context.previousId);
  const candidates = withoutPrevious.length ? withoutPrevious : source;
  if (!candidates.length)
    return { id: "fallback", text: "我在这里，陪你慢慢长大" };
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index];
}
