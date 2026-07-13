<script setup lang="ts">
import {
  Gift,
  LockKeyhole,
  Clock3,
  CheckCircle2,
  RotateCcw,
} from "lucide-vue-next";
import { useAppStore } from "../store";
import type { Reward } from "../domain";

const store = useAppStore();
const latest = (reward: Reward) => store.redemptionForReward(reward.id);
const buttonText = (reward: Reward) => {
  if (latest(reward)?.status === "pending") return "等待家长确认";
  if (latest(reward)?.status === "approved" && !latest(reward)?.fulfilledAt)
    return "等待家长兑现";
  if (store.availablePoints < reward.pointsCost)
    return `还差 ${reward.pointsCost - store.availablePoints} 分`;
  return `${reward.pointsCost} 分申请`;
};
</script>

<template>
  <main class="page content-page">
    <header class="page-header reward-header">
      <small>团团的小商店</small>
      <h1>把努力变成期待</h1>
      <div class="balance">
        <strong>{{ store.availablePoints }}</strong
        ><span>可用积分</span>
        <small v-if="store.state.progress.frozenPoints"
          >{{ store.state.progress.frozenPoints }} 分已帮你留住</small
        >
      </div>
    </header>

    <section class="reward-grid">
      <article
        v-for="reward in store.state.rewards.filter(
          (item) => item.available && !item.archived,
        )"
        :key="reward.id"
      >
        <div class="reward-card-head">
          <div class="reward-art"><Gift /></div>
          <span
            v-if="latest(reward)"
            class="reward-status"
            :class="`reward-status-${latest(reward)?.status}`"
          >
            <Clock3 v-if="latest(reward)?.status === 'pending'" :size="14" />
            <CheckCircle2
              v-else-if="latest(reward)?.status === 'approved'"
              :size="14"
            />
            <RotateCcw v-else :size="14" />
            {{
              latest(reward)?.status === "pending"
                ? "确认中"
                : latest(reward)?.status === "approved"
                  ? latest(reward)?.fulfilledAt
                    ? "已兑现"
                    : "待兑现"
                  : "已退回"
            }}
          </span>
        </div>
        <h2>{{ reward.title }}</h2>
        <p>{{ reward.description }}</p>
        <div
          v-if="
            latest(reward)?.status !== 'pending' && latest(reward)?.parentNote
          "
          class="reward-result"
          :class="`reward-result-${latest(reward)?.status}`"
        >
          {{ latest(reward)?.parentNote }}
        </div>
        <button
          :disabled="
            latest(reward)?.status === 'pending' ||
            (latest(reward)?.status === 'approved' &&
              !latest(reward)?.fulfilledAt) ||
            store.availablePoints < reward.pointsCost
          "
          @click="store.requestReward(reward.id)"
        >
          <LockKeyhole
            v-if="store.availablePoints < reward.pointsCost"
            :size="17"
          />
          <Clock3 v-else-if="latest(reward)?.status === 'pending'" :size="17" />
          {{ buttonText(reward) }}
        </button>
      </article>
    </section>
  </main>
</template>
