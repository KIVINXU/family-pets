<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Upload } from "lucide-vue-next";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import type { BackupCandidate } from "../repository";
import { useAppStore } from "../store";

const store = useAppStore();
const router = useRouter();
const form = reactive({
  childName: store.state.child.name,
  petName: store.state.child.currentPetName,
  pin: "",
  confirmPin: "",
});
const restorePin = reactive({ pin: "", confirmPin: "" });
const candidate = ref<BackupCandidate | null>(null);
const busy = ref(false);

watch(
  [form, restorePin],
  () => store.setFormDirty("setup", true),
  { deep: true },
);
onBeforeUnmount(() => store.setFormDirty("setup", false));

async function submit() {
  busy.value = true;
  const completed = await store.completeSetup(form);
  busy.value = false;
  if (completed) {
    store.setFormDirty("setup", false);
    await router.replace("/");
  }
}

async function chooseBackup(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  candidate.value = file ? store.previewRestore(await file.text()) : null;
  input.value = "";
}

async function restoreBackup() {
  if (!candidate.value) return;
  busy.value = true;
  const restored = await store.restoreDuringSetup(
    candidate.value,
    restorePin.pin,
    restorePin.confirmPin,
  );
  busy.value = false;
  if (restored) {
    store.setFormDirty("setup", false);
    candidate.value = null;
    await router.replace("/");
  }
}
</script>

<template>
  <main class="page setup-page">
    <header class="page-header">
      <small>第一次使用</small>
      <h1>给孩子准备一个温暖的小伙伴</h1>
      <p>只需四项，之后的任务和奖励都可以在家长中心慢慢调整。</p>
    </header>
    <form class="setup-card" @submit.prevent="submit">
      <label>孩子昵称<input v-model="form.childName" maxlength="12" required /></label>
      <label>宠物名称<input v-model="form.petName" maxlength="12" required /></label>
      <label
        >设置 4 位家长 PIN<input
          v-model="form.pin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]{4}"
          maxlength="4"
          autocomplete="new-password"
          required
      /></label>
      <label
        >再次输入 PIN<input
          v-model="form.confirmPin"
          type="password"
          inputmode="numeric"
          pattern="[0-9]{4}"
          maxlength="4"
          autocomplete="new-password"
          required
      /></label>
      <p class="form-help">PIN 只用于在这台设备上区分孩子和家长操作。</p>
      <button :disabled="busy">{{ busy ? "正在保存…" : "开始使用" }}</button>
    </form>
    <label class="restore-entry button secondary">
      <Upload :size="18" />已有备份，直接恢复
      <input type="file" accept="application/json" hidden @change="chooseBackup" />
    </label>

    <ConfirmDialog
      v-if="candidate"
      title="恢复这个家庭备份？"
      :message="`导出于 ${candidate.summary.exportedAt ? new Date(candidate.summary.exportedAt).toLocaleString('zh-CN') : '未知时间'}；${candidate.summary.childName}，Lv.${candidate.summary.level}，${candidate.summary.points} 积分。包含 ${candidate.summary.taskCount} 个任务、${candidate.summary.rewardCount} 个奖励、${candidate.summary.historyCount} 条历史。`"
      confirm-label="设置新 PIN 并恢复"
      :busy="busy"
      @cancel="candidate = null"
      @confirm="restoreBackup"
    >
      <div class="dialog-fields">
        <label
          >这台设备的新 PIN<input
            v-model="restorePin.pin"
            type="password"
            inputmode="numeric"
            maxlength="4"
            required
        /></label>
        <label
          >再次输入新 PIN<input
            v-model="restorePin.confirmPin"
            type="password"
            inputmode="numeric"
            maxlength="4"
            required
        /></label>
      </div>
    </ConfirmDialog>
  </main>
</template>
