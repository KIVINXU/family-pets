<script setup lang="ts">
import { onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import { useAppStore } from "../store";

const store = useAppStore();
const router = useRouter();
const form = reactive({ pin: "", confirmPin: "" });
const showConfirmation = ref(false);
const busy = ref(false);

watch(form, () => store.setFormDirty("recover-pin", true), { deep: true });
onBeforeUnmount(() => store.setFormDirty("recover-pin", false));

async function resetPin() {
  busy.value = true;
  const reset = await store.resetForgottenPin(form.pin, form.confirmPin, true);
  busy.value = false;
  if (reset) {
    store.setFormDirty("recover-pin", false);
    showConfirmation.value = false;
    await router.replace("/parent/unlock");
  }
}
</script>

<template>
  <main class="page pin-page recover-page">
    <header class="page-header">
      <small>家长操作</small>
      <h1>重新设置家长 PIN</h1>
      <p>无需旧 PIN，也不会清空孩子的任务、积分或兑换记录。</p>
    </header>
    <form class="setup-card" @submit.prevent="showConfirmation = true">
      <label
        >新的 4 位 PIN<input
          v-model="form.pin"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          required
      /></label>
      <label
        >再次输入新 PIN<input
          v-model="form.confirmPin"
          type="password"
          inputmode="numeric"
          maxlength="4"
          pattern="[0-9]{4}"
          required
      /></label>
      <button>继续</button>
    </form>
    <RouterLink class="text-link" to="/parent/unlock">返回输入 PIN</RouterLink>

    <ConfirmDialog
      v-if="showConfirmation"
      title="确认重新设置家长 PIN"
      message="新的 PIN 会立即生效，现有家庭数据会保留。完成后请使用新 PIN 重新进入家长中心。"
      confirm-label="确认设置新 PIN"
      :busy="busy"
      @cancel="showConfirmation = false"
      @confirm="resetPin"
    />
  </main>
</template>
