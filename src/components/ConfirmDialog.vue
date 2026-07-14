<script setup lang="ts">
import { useId } from "vue";

const titleId = useId();
defineProps<{
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
}>();
defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <div class="dialog-backdrop" @click.self="$emit('cancel')">
    <section
      class="confirm-dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <header>
        <small>请再次确认</small>
        <h2 :id="titleId">{{ title }}</h2>
      </header>
      <p>{{ message }}</p>
      <slot />
      <footer>
        <button class="secondary" :disabled="busy" @click="$emit('cancel')">
          取消
        </button>
        <button
          :class="{ danger }"
          :disabled="busy"
          @click="$emit('confirm')"
        >
          {{ busy ? "处理中…" : (confirmLabel ?? "确认") }}
        </button>
      </footer>
    </section>
  </div>
</template>
