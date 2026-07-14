<script setup lang="ts">
import { computed } from "vue";
import { Check, Clock3, RotateCcw, Circle } from "lucide-vue-next";
import { useAppStore } from "../store";
import { isTaskScheduled, type TaskStatus } from "../domain";

const store = useAppStore();
const scheduledTasks = computed(() =>
  store.state.taskTemplates.filter((task) =>
    isTaskScheduled(task, new Date(`${store.currentDateKey}T12:00:00`)),
  ),
);
const statusText: Record<TaskStatus, string> = {
  pending_review: "等待家长确认",
  approved: "今天完成啦",
  rejected: "可以重新提交",
};
const statusClass = (status?: TaskStatus) =>
  status ? `status-${status}` : "status-new";
</script>

<template>
  <main class="page content-page">
    <header class="page-header">
      <small>今日清单</small>
      <h1>和{{ store.state.child.currentPetName }}一起完成</h1>
      <p>做完后请家长确认，奖励才会到账。</p>
    </header>
    <p v-if="!scheduledTasks.length" class="empty-state">
      今天没有安排任务，和{{ store.state.child.currentPetName }}轻松玩一会儿吧。
    </p>
    <section class="list">
      <article v-for="task in scheduledTasks" :key="task.id" class="task-row">
        <div class="task-icon"><Check /></div>
        <div class="grow">
          <div class="task-title-line">
            <h2>{{ task.title }}</h2>
            <span
              class="status-chip"
              :class="statusClass(store.completionFor(task.id)?.status)"
            >
              {{
                store.completionFor(task.id)?.status
                  ? statusText[store.completionFor(task.id)!.status]
                  : "还没开始"
              }}
            </span>
          </div>
          <p>{{ task.description }}</p>
          <div class="reward-line">
            <span>+{{ task.pointsReward }} 积分</span>
            <span>+{{ task.growthReward }} 成长</span>
            <span>{{ task.recurrence }}</span>
          </div>
          <p
            v-if="store.completionFor(task.id)?.parentNote"
            class="parent-note"
          >
            家长留言：{{ store.completionFor(task.id)?.parentNote }}
          </p>
        </div>
        <button
          :disabled="
            ['pending_review', 'approved'].includes(
              store.completionFor(task.id)?.status ?? '',
            )
          "
          @click="store.submitTask(task.id)"
        >
          <Clock3
            v-if="store.completionFor(task.id)?.status === 'pending_review'"
            :size="17"
          />
          <RotateCcw
            v-else-if="store.completionFor(task.id)?.status === 'rejected'"
            :size="17"
          />
          <Circle v-else :size="17" />
          {{
            store.completionFor(task.id)?.status === "rejected"
              ? "重新提交"
              : store.completionFor(task.id)?.status === "approved"
                ? "已完成"
                : store.completionFor(task.id)?.status === "pending_review"
                  ? "待确认"
                  : "我完成了"
          }}
        </button>
      </article>
    </section>
  </main>
</template>
