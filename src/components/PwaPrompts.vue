<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import { useAppStore } from "../store";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISSED_KEY = "family_pets_install_dismissed";
const store = useAppStore();
const installEvent = ref<InstallPromptEvent | null>(null);
const installDismissed = ref(false);
const showUpdateDialog = ref(false);
const { needRefresh, updateServiceWorker } = useRegisterSW();
const showInstall = computed(
  () =>
    store.state.setupCompleted &&
    Boolean(installEvent.value) &&
    !installDismissed.value,
);

function captureInstall(event: Event) {
  event.preventDefault();
  installEvent.value = event as InstallPromptEvent;
}

async function install() {
  if (!installEvent.value) return;
  await installEvent.value.prompt();
  const choice = await installEvent.value.userChoice;
  if (choice.outcome === "accepted") installEvent.value = null;
  else dismissInstall();
}

function dismissInstall() {
  installDismissed.value = true;
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    // Installation guidance is optional UI state.
  }
}

async function applyUpdate() {
  showUpdateDialog.value = false;
  await updateServiceWorker(true);
}

onMounted(() => {
  try {
    installDismissed.value =
      window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    installDismissed.value = false;
  }
  window.addEventListener("beforeinstallprompt", captureInstall);
});
onBeforeUnmount(() =>
  window.removeEventListener("beforeinstallprompt", captureInstall),
);
</script>

<template>
  <aside v-if="showInstall" class="pwa-prompt" aria-label="安装应用提示">
    <div>
      <b>添加到主屏幕</b>
      <small>下次像普通应用一样打开，离线也能继续使用。</small>
    </div>
    <button class="secondary" @click="dismissInstall">以后再说</button>
    <button @click="install">安装</button>
  </aside>
  <aside
    v-if="needRefresh && store.state.setupCompleted"
    class="pwa-prompt"
    aria-label="应用更新提示"
  >
    <div>
      <b>有新版本可以使用</b>
      <small>由你决定何时更新，当前页面不会自动刷新。</small>
    </div>
    <button class="secondary" @click="needRefresh = false">稍后</button>
    <button @click="showUpdateDialog = true">查看更新</button>
  </aside>
  <ConfirmDialog
    v-if="showUpdateDialog"
    title="现在更新应用？"
    :message="store.hasUnsavedChanges ? '当前有尚未提交的表单内容。继续更新会刷新页面，请确认已记录这些内容。' : '应用会刷新一次，本地家庭数据不会丢失。'"
    confirm-label="更新并刷新"
    @cancel="showUpdateDialog = false"
    @confirm="applyUpdate"
  />
</template>
