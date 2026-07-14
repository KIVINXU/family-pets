<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Delete } from "lucide-vue-next";
import { useAppStore } from "../store";

const store = useAppStore();
const router = useRouter();
const pin = ref("");
const error = ref("");
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", ""];

async function key(value: string) {
  error.value = "";
  if (value === "back") pin.value = pin.value.slice(0, -1);
  else if (pin.value.length < 4) pin.value += value;
  if (pin.value.length !== 4) return;
  if (store.verifyPin(pin.value)) await router.replace("/parent");
  else {
    error.value = "PIN 不正确，请重新输入。";
    pin.value = "";
  }
}
</script>

<template>
  <main class="page pin-page">
    <header class="page-header">
      <small>家长空间</small>
      <h1>输入家长 PIN</h1>
      <p>进入后可以确认任务、管理奖励和备份家庭数据。</p>
    </header>
    <div class="pin-dots" aria-label="已输入的 PIN 位数">
      <i v-for="n in 4" :key="n" :class="{ filled: n <= pin.length }" />
    </div>
    <p class="form-error" aria-live="polite">{{ error }}</p>
    <div class="keypad">
      <button
        v-for="value in keys"
        :key="value"
        :disabled="!value"
        :aria-label="value === 'back' ? '删除一位' : value || '空白'"
        @click="key(value)"
      >
        <Delete v-if="value === 'back'" />
        <span v-else>{{ value }}</span>
      </button>
    </div>
    <RouterLink class="text-link" to="/parent/recover-pin">忘记 PIN？重新设置</RouterLink>
  </main>
</template>
