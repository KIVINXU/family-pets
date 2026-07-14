<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { CalendarDays, Gift, Settings, Sparkles } from "lucide-vue-next";
import GrowthRewardDialog from "../components/GrowthRewardDialog.vue";
import { selectContextualDialogue, type DialogueLine } from "../pet-dialogue";
import type { PetExpression } from "../pets";
import { useAppStore } from "../store";

const store = useAppStore();
const interaction = ref<"happy" | "excited" | null>(null);
const ambientMessage = ref<DialogueLine | null>(null);
const showGrowthRewards = ref(false);
const claimingRewards = ref(false);
const reducedMotion = ref(false);
let interactionTimer: number | undefined;
let feedbackTimer: number | undefined;
let ambientDelayTimer: number | undefined;
let ambientDisplayTimer: number | undefined;
let motionQuery: MediaQueryList | undefined;

watch(
  () => store.currentPet.id,
  () => {
    Object.values(store.currentPet.assets).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  },
  { immediate: true },
);

const petExpression = computed<PetExpression>(() => {
  if (store.petFeedback?.kind === "level_up") return "excited";
  if (store.petFeedback?.kind === "happy") return "happy";
  if (interaction.value) return interaction.value;
  if (store.petNeedsRest) return "low_energy";
  return "normal";
});
const petImage = computed(() => store.currentPet.assets[petExpression.value]);
const petAlt = computed(() => {
  const expressionText = {
    normal: "平静地站着",
    happy: "开心地挥手",
    low_energy: "坐下来休息",
    excited: "兴奋地跳起来",
  }[petExpression.value];
  return `${store.state.child.currentPetName}${expressionText}`;
});
const petMessage = computed(
  () =>
    store.petFeedback?.message ??
    (interaction.value === "happy"
      ? "摸摸头收到啦，我很开心"
      : interaction.value === "excited"
        ? "再摸一下，我兴奋得跳起来啦"
        : store.petNeedsRest
          ? "好久不见，我刚刚打了个小哈欠"
          : ambientMessage.value?.text),
);
const companionCopy = computed(() => {
  if (!store.nextCompanionReward)
    return "已经收集了首版全部房间礼物，它们会一直陪着你";
  const remaining = Math.max(
    0,
    store.nextCompanionReward.days - store.currentCompanionStreak,
  );
  if (!store.currentCompanionStreak)
    return `从今天开始，陪伴 ${store.nextCompanionReward.days} 天会遇见${store.nextCompanionReward.title}`;
  return `再陪伴 ${remaining} 天，会遇见${store.nextCompanionReward.title}`;
});
const companionProgressMax = computed(
  () => store.nextCompanionReward?.days ?? Math.max(14, store.currentCompanionStreak),
);

function clearAmbientTimers() {
  window.clearTimeout(ambientDelayTimer);
  window.clearTimeout(ambientDisplayTimer);
}

function chooseAmbientMessage() {
  ambientMessage.value = selectContextualDialogue({
    petId: store.currentPet.id,
    now: new Date(),
    approvedTasksToday: store.approvedTasksToday,
    pendingTasksToday: store.pendingTasksToday,
    earnedPointsToday: store.earnedPointsToday,
    energyValue: store.state.progress.energyValue,
    currentStreak: store.currentCompanionStreak,
    hasStreakDialoguePack: store.hasStreakDialoguePack,
    previousId: ambientMessage.value?.id,
  });
}

function scheduleAmbientMessage() {
  clearAmbientTimers();
  if (
    reducedMotion.value ||
    document.visibilityState !== "visible" ||
    store.petFeedback ||
    interaction.value ||
    store.petNeedsRest
  )
    return;
  const delay = 8_000 + Math.floor(Math.random() * 6_001);
  ambientDelayTimer = window.setTimeout(() => {
    chooseAmbientMessage();
    const displayTime = 3_000 + Math.floor(Math.random() * 1_001);
    ambientDisplayTimer = window.setTimeout(() => {
      ambientMessage.value = null;
      scheduleAmbientMessage();
    }, displayTime);
  }, delay);
}

function resetAmbientMessage() {
  clearAmbientTimers();
  ambientMessage.value = null;
  if (reducedMotion.value) {
    if (document.visibilityState === "visible") chooseAmbientMessage();
    return;
  }
  scheduleAmbientMessage();
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") resetAmbientMessage();
  else {
    clearAmbientTimers();
    ambientMessage.value = null;
  }
}

function handleMotionPreference(event: MediaQueryListEvent | MediaQueryList) {
  reducedMotion.value = event.matches;
  resetAmbientMessage();
}

function pet() {
  store.clearPetFeedback();
  store.clearPetRest();
  window.clearTimeout(interactionTimer);
  interaction.value = interaction.value ? "excited" : "happy";
  interactionTimer = window.setTimeout(() => {
    interaction.value = null;
  }, 2200);
}

async function claimGrowthRewards() {
  claimingRewards.value = true;
  const claimed = await store.claimAvailableGrowthRewards();
  claimingRewards.value = false;
  if (claimed) showGrowthRewards.value = false;
}

watch(
  () => store.petFeedback?.id,
  (id) => {
    window.clearTimeout(feedbackTimer);
    if (!id) return;
    feedbackTimer = window.setTimeout(store.clearPetFeedback, 4200);
  },
  { immediate: true },
);

watch(
  [
    () => store.petFeedback?.id,
    interaction,
    () => store.petNeedsRest,
    () => store.currentPet.id,
    () => store.currentDateKey,
  ],
  resetAmbientMessage,
);

watch(
  () => store.availableGrowthRewardCount,
  (count, previous) => {
    if (!count) showGrowthRewards.value = false;
    else if (!previous || count > previous) showGrowthRewards.value = true;
  },
);

onMounted(() => {
  showGrowthRewards.value = store.availableGrowthRewardCount > 0;
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  handleMotionPreference(motionQuery);
  motionQuery.addEventListener("change", handleMotionPreference);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  window.clearTimeout(interactionTimer);
  window.clearTimeout(feedbackTimer);
  clearAmbientTimers();
  motionQuery?.removeEventListener("change", handleMotionPreference);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});
</script>

<template>
  <main class="page pet-page">
    <section class="pet-scene">
      <img
        class="room-bg"
        src="/assets/rooms/pet-room-background.png"
        :alt="`${store.state.child.currentPetName}的温暖房间`"
      />
      <img
        v-for="decoration in store.unlockedDecorations"
        :key="decoration.id"
        class="room-decoration"
        :class="`decoration-${decoration.id}`"
        :src="decoration.src"
        :alt="decoration.alt"
        :style="decoration.layout"
        :data-testid="`room-decoration-${decoration.id}`"
      />
      <header class="scene-header">
        <div>
          <small>{{ store.state.child.name }}的伙伴</small>
          <h1>{{ store.state.child.currentPetName }}</h1>
        </div>
        <RouterLink
          class="icon-button"
          to="/parent/unlock"
          aria-label="家长中心"
          ><Settings
        /></RouterLink>
      </header>
      <button
        v-if="store.availableGrowthRewardCount"
        class="scene-gift-button"
        type="button"
        data-testid="growth-gift-button"
        @click="showGrowthRewards = true"
      >
        <Gift :size="18" />有新礼物
        <span>{{ store.availableGrowthRewardCount }}</span>
      </button>
      <button
        class="pet-button"
        :aria-label="`和${store.state.child.currentPetName}互动`"
        @click="pet"
      >
        <img :src="petImage" :alt="petAlt" /><span
          v-if="petMessage"
          class="pet-speech"
          >{{ petMessage }}</span
        >
      </button>
      <div class="scene-stats">
        <span>Lv.{{ store.state.progress.level }}</span
        ><span><Sparkles :size="15" /> {{ store.availablePoints }} 积分</span>
      </div>
    </section>
    <section class="home-summary">
      <div class="companion-card" data-testid="companion-streak">
        <span class="companion-icon" aria-hidden="true"><CalendarDays /></span>
        <div class="companion-content">
          <div>
            <small>连续陪伴</small>
            <strong>{{ store.currentCompanionStreak }} 天</strong>
          </div>
          <p>{{ companionCopy }}</p>
          <progress
            :value="store.currentCompanionStreak"
            :max="companionProgressMax"
            aria-label="连续陪伴奖励进度"
          />
        </div>
      </div>
      <div class="progress-row">
        <div>
          <strong>成长进度</strong
          ><small
            >{{ store.state.progress.growthValue }} /
            {{ store.state.progress.growthTarget }}</small
          >
        </div>
        <progress
          :value="store.state.progress.growthValue"
          :max="store.state.progress.growthTarget"
        />
      </div>
      <div class="stat-strip today-overview" aria-label="今日概览">
        <div>
          <small>今天完成</small><strong>{{ store.approvedTasksToday }}</strong>
        </div>
        <div>
          <small>待家长确认</small><strong>{{ store.pendingTasksToday }}</strong>
        </div>
        <div>
          <small>今天获得</small><strong>+{{ store.earnedPointsToday }}</strong>
        </div>
      </div>
      <div class="quick-links">
        <RouterLink to="/tasks"
          ><b>今天做什么</b
          ><span
            >{{
              store.state.taskTemplates.filter((task) => task.active).length
            }}
            个小任务</span
          ></RouterLink
        ><RouterLink to="/rewards"
          ><b>看看奖励</b
          ><span>可用 {{ store.availablePoints }} 分</span></RouterLink
        >
      </div>
    </section>
    <GrowthRewardDialog
      v-if="showGrowthRewards && store.availableGrowthRewardCount"
      :level-milestones="store.availableLevelMilestones"
      :companion-rewards="store.availableCompanionRewards"
      :busy="claimingRewards"
      @close="showGrowthRewards = false"
      @claim="claimGrowthRewards"
    />
  </main>
</template>
