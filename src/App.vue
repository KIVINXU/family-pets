<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { useAppStore } from "./store";
import AppNav from "./components/AppNav.vue";
import ToastHost from "./components/ToastHost.vue";
import PwaPrompts from "./components/PwaPrompts.vue";
const store = useAppStore();
const route = useRoute();
const showChildNav = computed(
  () => route.path !== "/setup" && !route.path.startsWith("/parent"),
);
let midnightTimer: number | undefined;
let sessionTimer: number | undefined;
const isProtectedParentPath = (path: string) =>
  path.startsWith("/parent") &&
  path !== "/parent/unlock" &&
  path !== "/parent/recover-pin";

function scheduleMidnightRefresh() {
  window.clearTimeout(midnightTimer);
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 1, 0);
  midnightTimer = window.setTimeout(() => {
    store.refreshToday();
    scheduleMidnightRefresh();
  }, next.getTime() - now.getTime());
}

function recordVisibilityChange() {
  store.recordAppActivity(document.visibilityState === "visible");
  store.recordParentVisibility(document.visibilityState === "hidden");
  if (document.visibilityState === "visible") {
    store.refreshToday();
    scheduleMidnightRefresh();
    if (!store.parentUnlocked && isProtectedParentPath(route.path))
      void router.replace("/parent/unlock");
  }
}

function recordParentActivity() {
  if (route.path.startsWith("/parent")) store.recordParentSessionActivity();
}

const router = useRouter();

watch(
  () => route.path,
  (path, previous) => {
    if (previous?.startsWith("/parent") && !path.startsWith("/parent"))
      store.lockParent();
  },
);

onMounted(() => {
  void store.load();
  store.refreshToday();
  scheduleMidnightRefresh();
  document.addEventListener("visibilitychange", recordVisibilityChange);
  document.addEventListener("pointerdown", recordParentActivity, true);
  document.addEventListener("keydown", recordParentActivity, true);
  document.addEventListener("input", recordParentActivity, true);
  sessionTimer = window.setInterval(() => {
    if (store.checkParentSession() && route.path.startsWith("/parent"))
      void router.replace("/parent/unlock");
  }, 15_000);
});
onBeforeUnmount(() => {
  window.clearTimeout(midnightTimer);
  window.clearInterval(sessionTimer);
  document.removeEventListener("visibilitychange", recordVisibilityChange);
  document.removeEventListener("pointerdown", recordParentActivity, true);
  document.removeEventListener("keydown", recordParentActivity, true);
  document.removeEventListener("input", recordParentActivity, true);
});
</script>
<template>
  <div v-if="!store.loaded" class="loading-shell">
    <div class="skeleton scene-skeleton" />
    <div class="skeleton line-skeleton" />
  </div>
  <div v-else class="app-root">
    <p v-if="store.error" class="error-banner">{{ store.error }}</p>
    <RouterView /><AppNav v-if="showChildNav" /><ToastHost /><PwaPrompts />
  </div>
</template>
