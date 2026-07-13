<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { RouterView, useRoute } from "vue-router";
import { useAppStore } from "./store";
import AppNav from "./components/AppNav.vue";
import ToastHost from "./components/ToastHost.vue";
const store = useAppStore();
const route = useRoute();
const showChildNav = computed(() => !route.path.startsWith("/parent"));

function recordVisibilityChange() {
  store.recordAppActivity(document.visibilityState === "visible");
}

onMounted(() => {
  void store.load();
  document.addEventListener("visibilitychange", recordVisibilityChange);
});
onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", recordVisibilityChange);
});
</script>
<template>
  <div v-if="!store.loaded" class="loading-shell">
    <div class="skeleton scene-skeleton" />
    <div class="skeleton line-skeleton" />
  </div>
  <div v-else class="app-root">
    <p v-if="store.error" class="error-banner">{{ store.error }}</p>
    <RouterView /><AppNav v-if="showChildNav" /><ToastHost />
  </div>
</template>
