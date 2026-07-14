<script setup lang="ts">
import { nextTick, onMounted, ref, useId } from "vue";
import { Gift, Home, Sparkles, X } from "lucide-vue-next";
import type { LevelMilestone, RoomDecoration } from "../growth-rewards";
import { findPet } from "../pets";

const titleId = useId();
const claimButton = ref<HTMLButtonElement | null>(null);

defineProps<{
  levelMilestones: readonly LevelMilestone[];
  companionRewards: readonly RoomDecoration[];
  busy?: boolean;
}>();
defineEmits<{ claim: []; close: [] }>();

const milestonePetName = (milestone: LevelMilestone) =>
  milestone.petId ? findPet(milestone.petId)?.name : undefined;

onMounted(() => void nextTick(() => claimButton.value?.focus()));
</script>

<template>
  <div class="dialog-backdrop growth-dialog-backdrop" @click.self="$emit('close')">
    <section
      class="growth-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      data-testid="growth-reward-dialog"
    >
      <header class="growth-dialog-header">
        <span class="growth-dialog-mark" aria-hidden="true"><Gift /></span>
        <div>
          <small>伙伴送来的成长礼物</small>
          <h2 :id="titleId">你的努力有了新变化</h2>
        </div>
        <button
          class="growth-dialog-close"
          type="button"
          aria-label="稍后再领取"
          :disabled="busy"
          @click="$emit('close')"
        >
          <X />
        </button>
      </header>

      <p class="growth-dialog-intro">
        可以现在一起领取，也可以先关掉。礼物会一直留在宠物房里。
      </p>

      <ul class="growth-reward-list">
        <li v-for="milestone in levelMilestones" :key="milestone.id">
          <span class="reward-list-icon points" aria-hidden="true"><Sparkles /></span>
          <div>
            <strong>达到 Lv.{{ milestone.level }}</strong>
            <small>
              +{{ milestone.points }} 积分<span v-if="milestonePetName(milestone)">
                · 新伙伴{{ milestonePetName(milestone) }}</span
              >
            </small>
          </div>
        </li>
        <li v-for="reward in companionRewards" :key="reward.id">
          <span class="reward-list-icon room" aria-hidden="true"><Home /></span>
          <div>
            <strong>连续陪伴 {{ reward.days }} 天 · {{ reward.title }}</strong>
            <small>{{ reward.description }}</small>
          </div>
        </li>
      </ul>

      <footer>
        <button class="secondary" type="button" :disabled="busy" @click="$emit('close')">
          稍后领取
        </button>
        <button
          ref="claimButton"
          type="button"
          :disabled="busy"
          @click="$emit('claim')"
        >
          {{ busy ? "正在打开…" : "打开全部礼物" }}
        </button>
      </footer>
    </section>
  </div>
</template>
