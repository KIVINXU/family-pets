<script setup lang="ts">
import { watch } from "vue";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-vue-next";
import { useAppStore } from "../store";

const store = useAppStore();
let timer: number | undefined;
watch(
  () => store.toast?.id,
  (id) => {
    window.clearTimeout(timer);
    if (id) timer = window.setTimeout(store.clearToast, 2800);
  },
);
</script>

<template>
  <Transition name="toast">
    <div
      v-if="store.toast"
      class="toast"
      :class="`toast-${store.toast.kind}`"
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 v-if="store.toast.kind === 'success'" :size="20" />
      <AlertCircle v-else-if="store.toast.kind === 'error'" :size="20" />
      <Info v-else :size="20" />
      <span>{{ store.toast.message }}</span>
      <button aria-label="关闭提示" @click="store.clearToast">
        <X :size="17" />
      </button>
    </div>
  </Transition>
</template>
