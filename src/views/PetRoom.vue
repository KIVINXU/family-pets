<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Settings, Sparkles } from "lucide-vue-next";
import type { PetExpression } from "../pets";
import { useAppStore } from "../store";

const store = useAppStore();
const interaction = ref<"happy" | "excited" | null>(null);
let interactionTimer: number | undefined;
let feedbackTimer: number | undefined;

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
          : undefined),
);

function pet() {
  store.clearPetFeedback();
  store.clearPetRest();
  window.clearTimeout(interactionTimer);
  interaction.value = interaction.value ? "excited" : "happy";
  interactionTimer = window.setTimeout(() => {
    interaction.value = null;
  }, 2200);
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

onBeforeUnmount(() => {
  window.clearTimeout(interactionTimer);
  window.clearTimeout(feedbackTimer);
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
  </main>
</template>
