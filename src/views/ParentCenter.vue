<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Plus,
  Download,
  Upload,
  Pencil,
  X,
  Archive,
  RotateCcw,
} from "lucide-vue-next";
import { useAppStore } from "../store";

const store = useAppStore();
const router = useRouter();
if (!store.parentUnlocked) router.replace("/parent/unlock");

const tab = ref<"review" | "manage" | "report" | "ledger">("review");
const reviewDrafts = reactive<
  Record<string, { note: string; bonusPoints: number; bonusGrowth: number }>
>({});
const redemptionDrafts = reactive<Record<string, string>>({});
const editingTaskId = ref<string | null>(null);
const taskForm = reactive({
  title: "",
  description: "",
  pointsReward: 10,
  growthReward: 10,
  recurrence: "每日",
});
const editingRewardId = ref<string | null>(null);
const rewardForm = reactive({ title: "", description: "", pointsCost: 50 });
const ledger = computed(() => [...store.state.ledger].reverse());
const ledgerFilter = ref<"all" | "earn" | "redeem">("all");
const resetPin = ref("");
const childForm = reactive({
  name: store.state.child.name,
  currentPetName: store.state.child.currentPetName,
});
const pinForm = reactive({ current: "", next: "" });
const filteredLedger = computed(() =>
  ledger.value.filter((item) => {
    if (ledgerFilter.value === "earn")
      return item.type === "task_reward" || item.type === "bonus_reward";
    if (ledgerFilter.value === "redeem")
      return item.type.startsWith("redemption_");
    return true;
  }),
);
const visibleTasks = computed(() =>
  store.state.taskTemplates.filter((item) => !item.archived),
);
const archivedTasks = computed(() =>
  store.state.taskTemplates.filter((item) => item.archived),
);
const visibleRewards = computed(() =>
  store.state.rewards.filter((item) => !item.archived),
);
const archivedRewards = computed(() =>
  store.state.rewards.filter((item) => item.archived),
);
const weekStart = computed(() => {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day + 1);
  return start;
});
const isThisWeek = (value?: string) =>
  Boolean(value && new Date(value) >= weekStart.value);
const weeklyTasks = computed(() =>
  store.state.taskCompletions.filter(
    (item) => item.status === "approved" && isThisWeek(item.reviewedAt),
  ),
);
const weeklyPoints = computed(() =>
  store.state.ledger
    .filter(
      (item) =>
        isThisWeek(item.createdAt) &&
        (item.type === "task_reward" || item.type === "bonus_reward"),
    )
    .reduce((sum, item) => sum + item.amount, 0),
);
const weeklyRewards = computed(
  () =>
    store.state.redemptions.filter(
      (item) => item.status === "approved" && isThisWeek(item.reviewedAt),
    ).length,
);
const weeklyActiveDays = computed(
  () =>
    new Set(weeklyTasks.value.map((item) => item.reviewedAt?.slice(0, 10)))
      .size,
);
const weeklyMessage = computed(() =>
  weeklyTasks.value.length >= 5
    ? "这一周积累了不少认真完成的小事，记得具体表扬孩子的努力。"
    : weeklyTasks.value.length
      ? "已经有了不错的开始，保持轻松、稳定的节奏就很好。"
      : "本周还没有确认完成的任务，可以从一个很容易做到的小任务开始。",
);

const taskBy = (id: string) =>
  store.state.taskTemplates.find((item) => item.id === id);
const rewardBy = (id: string) =>
  store.state.rewards.find((item) => item.id === id);
const draftFor = (id: string) =>
  (reviewDrafts[id] ??= { note: "", bonusPoints: 0, bonusGrowth: 0 });

async function approveTask(id: string) {
  const draft = draftFor(id);
  await store.approveTask(
    id,
    Number(draft.bonusPoints) || 0,
    Number(draft.bonusGrowth) || 0,
    draft.note.trim(),
  );
  delete reviewDrafts[id];
}

async function rejectTask(id: string) {
  const draft = draftFor(id);
  await store.rejectTask(id, draft.note.trim() || "这次再认真一点就好");
  delete reviewDrafts[id];
}

async function approveRedemption(id: string) {
  await store.approveRedemption(id, redemptionDrafts[id]?.trim() ?? "");
  delete redemptionDrafts[id];
}

async function rejectRedemption(id: string) {
  await store.rejectRedemption(
    id,
    redemptionDrafts[id]?.trim() || "这次先留着积分吧",
  );
  delete redemptionDrafts[id];
}

function editTask(id: string) {
  const task = taskBy(id);
  if (!task) return;
  editingTaskId.value = id;
  Object.assign(taskForm, {
    title: task.title,
    description: task.description,
    pointsReward: task.pointsReward,
    growthReward: task.growthReward,
    recurrence: task.recurrence,
  });
}

function resetTaskForm() {
  editingTaskId.value = null;
  Object.assign(taskForm, {
    title: "",
    description: "",
    pointsReward: 10,
    growthReward: 10,
    recurrence: "每日",
  });
}

async function saveTask() {
  const values = {
    ...taskForm,
    pointsReward: Number(taskForm.pointsReward),
    growthReward: Number(taskForm.growthReward),
  };
  if (editingTaskId.value) await store.updateTask(editingTaskId.value, values);
  else
    await store.addTask(
      values.title,
      values.description,
      values.pointsReward,
      values.growthReward,
      values.recurrence,
    );
  resetTaskForm();
}

function editReward(id: string) {
  const reward = rewardBy(id);
  if (!reward) return;
  editingRewardId.value = id;
  Object.assign(rewardForm, {
    title: reward.title,
    description: reward.description,
    pointsCost: reward.pointsCost,
  });
}

function resetRewardForm() {
  editingRewardId.value = null;
  Object.assign(rewardForm, { title: "", description: "", pointsCost: 50 });
}

async function saveReward() {
  const values = { ...rewardForm, pointsCost: Number(rewardForm.pointsCost) };
  if (editingRewardId.value)
    await store.updateReward(editingRewardId.value, values);
  else
    await store.addReward(values.title, values.description, values.pointsCost);
  resetRewardForm();
}

async function saveChildProfile() {
  await store.updateChildProfile(childForm);
}

async function saveParentPin() {
  if (await store.updateParentPin(pinForm.current, pinForm.next)) {
    pinForm.current = "";
    pinForm.next = "";
  }
}

function leave() {
  store.lockParent();
  router.push("/");
}
function download() {
  const blob = new Blob([store.exportData()], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "family-pets-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file && confirm("恢复会覆盖当前数据，确定继续吗？"))
    await store.restore(await file.text());
  input.value = "";
}
async function resetLocalData() {
  if (!confirm("这会清除当前任务进度、兑换和积分记录，确定继续吗？")) return;
  if (await store.resetData(resetPin.value)) resetPin.value = "";
}
</script>

<template>
  <main class="page parent-page">
    <header class="parent-head">
      <div>
        <small>家长中心</small>
        <h1>今天的家庭进度</h1>
      </div>
      <button class="text-button" @click="leave">回到孩子端</button>
    </header>

    <nav class="tabs">
      <button :class="{ active: tab === 'review' }" @click="tab = 'review'">
        审核
        <span
          v-if="
            store.pendingTasks.length +
            store.pendingRedemptions.length +
            store.unfulfilledRedemptions.length
          "
          class="tab-badge"
          >{{
            store.pendingTasks.length +
            store.pendingRedemptions.length +
            store.unfulfilledRedemptions.length
          }}</span
        >
      </button>
      <button :class="{ active: tab === 'manage' }" @click="tab = 'manage'">
        管理
      </button>
      <button :class="{ active: tab === 'report' }" @click="tab = 'report'">
        周报
      </button>
      <button :class="{ active: tab === 'ledger' }" @click="tab = 'ledger'">
        记录与备份
      </button>
    </nav>

    <section v-if="tab === 'review'" class="admin-section">
      <h2 class="section-heading">
        任务确认
        <span v-if="store.pendingTasks.length" class="count-badge">{{
          store.pendingTasks.length
        }}</span>
      </h2>
      <p v-if="!store.pendingTasks.length" class="empty">
        暂时没有等待确认的任务。
      </p>
      <article
        v-for="item in store.pendingTasks"
        :key="item.id"
        class="review-card"
      >
        <header>
          <div>
            <b>{{ taskBy(item.taskTemplateId)?.title }}</b
            ><small
              >基础奖励 {{ taskBy(item.taskTemplateId)?.pointsReward }} 分 ·
              {{ taskBy(item.taskTemplateId)?.growthReward }} 成长</small
            >
          </div>
          <span>待确认</span>
        </header>
        <label
          >给孩子的留言<input
            v-model="draftFor(item.id).note"
            placeholder="例如：今天整理得很认真"
        /></label>
        <div class="bonus-grid">
          <label
            >额外积分<input
              v-model.number="draftFor(item.id).bonusPoints"
              type="number"
              min="0"
              max="100"
          /></label>
          <label
            >额外成长<input
              v-model.number="draftFor(item.id).bonusGrowth"
              type="number"
              min="0"
              max="100"
          /></label>
        </div>
        <footer>
          <button class="secondary" @click="rejectTask(item.id)">
            温和退回</button
          ><button @click="approveTask(item.id)">确认通过</button>
        </footer>
      </article>

      <h2 class="section-heading">
        兑换确认
        <span v-if="store.pendingRedemptions.length" class="count-badge">{{
          store.pendingRedemptions.length
        }}</span>
      </h2>
      <p v-if="!store.pendingRedemptions.length" class="empty">
        暂时没有等待确认的兑换。
      </p>
      <article
        v-for="item in store.pendingRedemptions"
        :key="item.id"
        class="review-card"
      >
        <header>
          <div>
            <b>{{ rewardBy(item.rewardId)?.title }}</b
            ><small>使用 {{ item.pointsCost }} 分</small>
          </div>
          <span>待确认</span>
        </header>
        <label
          >给孩子的留言<input
            v-model="redemptionDrafts[item.id]"
            placeholder="例如：周六下午一起看"
        /></label>
        <footer>
          <button class="secondary" @click="rejectRedemption(item.id)">
            退回并返还积分</button
          ><button @click="approveRedemption(item.id)">确认兑换</button>
        </footer>
      </article>
      <h2 class="section-heading">
        待兑现奖励
        <span v-if="store.unfulfilledRedemptions.length" class="count-badge">{{
          store.unfulfilledRedemptions.length
        }}</span>
      </h2>
      <p v-if="!store.unfulfilledRedemptions.length" class="empty">
        暂时没有等待兑现的奖励。
      </p>
      <article
        v-for="item in store.unfulfilledRedemptions"
        :key="item.id"
        class="review-row"
      >
        <div>
          <b>{{ rewardBy(item.rewardId)?.title }}</b
          ><small>{{ item.parentNote }}</small>
        </div>
        <button @click="store.fulfillRedemption(item.id)">标记已兑现</button>
      </article>
    </section>

    <section v-else-if="tab === 'manage'" class="admin-section split-admin">
      <div>
        <div class="section-title">
          <h2>{{ editingTaskId ? "编辑任务" : "新增任务" }}</h2>
          <button
            v-if="editingTaskId"
            class="icon-plain"
            aria-label="取消编辑"
            @click="resetTaskForm"
          >
            <X />
          </button>
        </div>
        <form class="task-editor" @submit.prevent="saveTask">
          <label>任务名称<input v-model="taskForm.title" required /></label>
          <label
            >任务说明<input v-model="taskForm.description" required
          /></label>
          <div class="bonus-grid">
            <label
              >积分奖励<input
                v-model.number="taskForm.pointsReward"
                type="number"
                min="1"
                max="500"
                required
            /></label>
            <label
              >成长奖励<input
                v-model.number="taskForm.growthReward"
                type="number"
                min="1"
                max="500"
                required
            /></label>
          </div>
          <label
            >重复规则<select v-model="taskForm.recurrence">
              <option>每日</option>
              <option>工作日</option>
              <option>周末</option>
              <option>每周一</option>
              <option>每周二</option>
              <option>每周三</option>
              <option>每周四</option>
              <option>每周五</option>
              <option>每周六</option>
              <option>每周日</option>
            </select></label
          >
          <button>
            <Pencil v-if="editingTaskId" /><Plus v-else />{{
              editingTaskId ? "保存修改" : "添加任务"
            }}
          </button>
        </form>
        <div v-for="item in visibleTasks" :key="item.id" class="manage-row">
          <button class="manage-main" @click="editTask(item.id)">
            <span
              ><b>{{ item.title }}</b
              ><small
                >{{ item.pointsReward }} 分 · {{ item.growthReward }} 成长 ·
                {{ item.recurrence }}</small
              ></span
            ><Pencil :size="17" />
          </button>
          <button class="state-toggle" @click="store.toggleTask(item.id)">
            {{ item.active ? "使用中" : "已暂停" }}
          </button>
          <button
            class="archive-action"
            :aria-label="`归档任务 ${item.title}`"
            @click="store.archiveTask(item.id)"
          >
            <Archive :size="17" />
          </button>
        </div>
        <details v-if="archivedTasks.length" class="archive-list">
          <summary>已归档任务 {{ archivedTasks.length }}</summary>
          <div
            v-for="item in archivedTasks"
            :key="item.id"
            class="archived-row"
          >
            <span>{{ item.title }}</span
            ><button @click="store.restoreTask(item.id)">
              <RotateCcw :size="15" />恢复
            </button>
          </div>
        </details>
      </div>

      <div>
        <div class="section-title">
          <h2>{{ editingRewardId ? "编辑奖励" : "新增奖励" }}</h2>
          <button
            v-if="editingRewardId"
            class="icon-plain"
            aria-label="取消编辑奖励"
            @click="resetRewardForm"
          >
            <X />
          </button>
        </div>
        <form @submit.prevent="saveReward">
          <label>奖励名称<input v-model="rewardForm.title" required /></label>
          <label
            >奖励说明<input v-model="rewardForm.description" required
          /></label>
          <label
            >所需积分<input
              v-model.number="rewardForm.pointsCost"
              type="number"
              min="1"
              max="9999"
              required
          /></label>
          <button>
            <Pencil v-if="editingRewardId" /><Plus v-else />{{
              editingRewardId ? "保存修改" : "添加奖励"
            }}
          </button>
        </form>
        <div v-for="item in visibleRewards" :key="item.id" class="manage-row">
          <button class="manage-main" @click="editReward(item.id)">
            <span
              ><b>{{ item.title }}</b
              ><small
                >{{ item.pointsCost }} 分 · {{ item.description }}</small
              ></span
            ><Pencil :size="17" />
          </button>
          <button class="state-toggle" @click="store.toggleReward(item.id)">
            {{ item.available ? "已上架" : "已下架" }}
          </button>
          <button
            class="archive-action"
            :aria-label="`归档奖励 ${item.title}`"
            @click="store.archiveReward(item.id)"
          >
            <Archive :size="17" />
          </button>
        </div>
        <details v-if="archivedRewards.length" class="archive-list">
          <summary>已归档奖励 {{ archivedRewards.length }}</summary>
          <div
            v-for="item in archivedRewards"
            :key="item.id"
            class="archived-row"
          >
            <span>{{ item.title }}</span
            ><button @click="store.restoreReward(item.id)">
              <RotateCcw :size="15" />恢复
            </button>
          </div>
        </details>
      </div>
      <div class="profile-settings">
        <div>
          <h2>家庭资料</h2>
          <form @submit.prevent="saveChildProfile">
            <label
              >孩子昵称<input v-model="childForm.name" maxlength="12" required
            /></label>
            <label
              >当前宠物昵称<input
                v-model="childForm.currentPetName"
                maxlength="12"
                required
            /></label>
            <button><Pencil />保存资料</button>
          </form>
        </div>
        <div>
          <h2>修改家长 PIN</h2>
          <form @submit.prevent="saveParentPin">
            <label
              >当前 PIN<input
                v-model="pinForm.current"
                inputmode="numeric"
                maxlength="4"
                type="password"
                required
            /></label>
            <label
              >新 PIN<input
                v-model="pinForm.next"
                inputmode="numeric"
                maxlength="4"
                type="password"
                required
            /></label>
            <button>更新 PIN</button>
          </form>
        </div>
      </div>
    </section>

    <section v-else-if="tab === 'ledger'" class="admin-section">
      <div class="balance-strip">
        <div>
          <small>可用积分</small><strong>{{ store.availablePoints }}</strong>
        </div>
        <div>
          <small>冻结积分</small
          ><strong>{{ store.state.progress.frozenPoints }}</strong>
        </div>
        <div>
          <small>总积分</small
          ><strong>{{ store.state.progress.pointsBalance }}</strong>
        </div>
      </div>
      <div class="backup-actions">
        <button @click="download"><Download />导出备份</button
        ><label class="button secondary"
          ><Upload />恢复备份<input
            type="file"
            accept="application/json"
            hidden
            @change="upload"
        /></label>
      </div>
      <div class="ledger-filters">
        <button
          :class="{ active: ledgerFilter === 'all' }"
          @click="ledgerFilter = 'all'"
        >
          全部
        </button>
        <button
          :class="{ active: ledgerFilter === 'earn' }"
          @click="ledgerFilter = 'earn'"
        >
          获得
        </button>
        <button
          :class="{ active: ledgerFilter === 'redeem' }"
          @click="ledgerFilter = 'redeem'"
        >
          兑换
        </button>
      </div>
      <p v-if="!filteredLedger.length" class="empty">
        这个分类暂时没有积分记录。
      </p>
      <article v-for="item in filteredLedger" :key="item.id" class="ledger-row">
        <div>
          <b>{{ item.reason }}</b
          ><small>{{ new Date(item.createdAt).toLocaleString("zh-CN") }}</small>
        </div>
        <strong :class="{ negative: item.amount < 0 }"
          >{{ item.amount > 0 ? "+" : "" }}{{ item.amount }}</strong
        >
      </article>
      <section class="danger-zone">
        <div>
          <b>重置本地数据</b>
          <p>仅用于重新开始或清理演示数据，操作后无法撤销。</p>
        </div>
        <label
          >再次输入家长 PIN<input
            v-model="resetPin"
            inputmode="numeric"
            maxlength="4"
            type="password"
        /></label>
        <button :disabled="resetPin.length !== 4" @click="resetLocalData">
          重置数据
        </button>
      </section>
    </section>
    <section v-else class="admin-section weekly-report">
      <header class="report-header">
        <div>
          <small>本周家庭进度</small>
          <h2>
            {{
              weekStart.toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
              })
            }}
            起
          </h2>
        </div>
        <span>{{ weeklyActiveDays }} 个活跃日</span>
      </header>
      <div class="report-metrics">
        <div>
          <small>完成任务</small><strong>{{ weeklyTasks.length }}</strong>
        </div>
        <div>
          <small>获得积分</small><strong>{{ weeklyPoints }}</strong>
        </div>
        <div>
          <small>确认奖励</small><strong>{{ weeklyRewards }}</strong>
        </div>
      </div>
      <p class="report-message">{{ weeklyMessage }}</p>
      <h2>本周完成记录</h2>
      <p v-if="!weeklyTasks.length" class="empty">
        确认任务后，本周记录会出现在这里。
      </p>
      <article
        v-for="item in [...weeklyTasks].reverse()"
        :key="item.id"
        class="weekly-row"
      >
        <div>
          <b>{{ taskBy(item.taskTemplateId)?.title ?? "已归档任务" }}</b
          ><small>{{
            item.reviewedAt
              ? new Date(item.reviewedAt).toLocaleDateString("zh-CN", {
                  weekday: "short",
                  month: "numeric",
                  day: "numeric",
                })
              : ""
          }}</small>
        </div>
        <span
          >+{{
            (taskBy(item.taskTemplateId)?.pointsReward ?? 0) + item.bonusPoints
          }}
          分</span
        >
      </article>
    </section>
  </main>
</template>
