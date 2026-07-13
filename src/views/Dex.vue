<script setup lang="ts">
import { computed } from "vue";
import { Check, LockKeyhole, PawPrint, Sparkles } from "lucide-vue-next";
import { PET_CATALOG, isPetUnlocked } from "../pets";
import { useAppStore } from "../store";

const store = useAppStore();
const unlockedCount = computed(
  () =>
    PET_CATALOG.filter((pet) =>
      isPetUnlocked(pet, store.state.progress.level),
    ).length,
);
const nextPet = computed(() =>
  PET_CATALOG.find(
    (pet) => !isPetUnlocked(pet, store.state.progress.level),
  ),
);
const levelsUntil = (unlockLevel: number) =>
  Math.max(0, unlockLevel - store.state.progress.level);
</script>

<template>
  <main class="page dex-page">
    <header class="page-header dex-header">
      <div>
        <small>幻兽图鉴</small>
        <h1>选择今天的伙伴</h1>
        <p>陪伴会随着等级增加，每位伙伴都有自己的四种心情。</p>
      </div>
      <div class="dex-count" aria-label="图鉴收集进度">
        <strong>{{ unlockedCount }} / {{ PET_CATALOG.length }}</strong>
        <span>已解锁</span>
      </div>
    </header>

    <section class="dex-progress" aria-label="下一个伙伴解锁进度">
      <div>
        <Sparkles :size="20" />
        <span v-if="nextPet">
          再升 {{ levelsUntil(nextPet.unlockLevel) }} 级，{{ nextPet.name }}就会加入
        </span>
        <span v-else>所有伙伴都已经到齐啦</span>
      </div>
      <progress :value="unlockedCount" :max="PET_CATALOG.length" />
    </section>

    <section class="pet-collection" aria-label="宠物列表">
      <article
        v-for="pet in PET_CATALOG"
        :key="pet.id"
        class="pet-card"
        :class="{
          'is-current': store.state.child.currentPetId === pet.id,
          'is-locked': !isPetUnlocked(pet, store.state.progress.level),
        }"
      >
        <div class="pet-card-art">
          <img :src="pet.assets.happy" :alt="`${pet.name}，${pet.species}`" />
          <span
            v-if="store.state.child.currentPetId === pet.id"
            class="pet-card-status current"
          >
            <Check :size="14" />当前伙伴
          </span>
          <span
            v-else-if="!isPetUnlocked(pet, store.state.progress.level)"
            class="pet-card-status locked"
          >
            <LockKeyhole :size="14" />Lv.{{ pet.unlockLevel }} 解锁
          </span>
        </div>
        <div class="pet-card-body">
          <div class="pet-card-title">
            <div>
              <small>{{ pet.species }}</small>
              <h2>{{ pet.name }}</h2>
            </div>
            <PawPrint :size="22" />
          </div>
          <p>{{ pet.description }}</p>
          <div class="pet-traits">
            <span v-for="trait in pet.traits" :key="trait">{{ trait }}</span>
          </div>
          <div class="pet-card-action">
            <small v-if="!isPetUnlocked(pet, store.state.progress.level)">
              还差 {{ levelsUntil(pet.unlockLevel) }} 级
            </small>
            <small v-else-if="store.state.child.currentPetId === pet.id">
              正在宠物房陪伴你
            </small>
            <small v-else>已经可以邀请</small>
            <button
              :aria-label="`选择${pet.name}`"
              :disabled="
                !isPetUnlocked(pet, store.state.progress.level) ||
                store.state.child.currentPetId === pet.id
              "
              @click="store.switchPet(pet.id)"
            >
              <LockKeyhole
                v-if="!isPetUnlocked(pet, store.state.progress.level)"
                :size="16"
              />
              <Check
                v-else-if="store.state.child.currentPetId === pet.id"
                :size="16"
              />
              <PawPrint v-else :size="16" />
              {{
                !isPetUnlocked(pet, store.state.progress.level)
                  ? `Lv.${pet.unlockLevel}`
                  : store.state.child.currentPetId === pet.id
                    ? "已选择"
                    : "选择"
              }}
            </button>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>
