import { createRouter, createWebHistory } from "vue-router";
import { useAppStore } from "./store";
import PetRoom from "./views/PetRoom.vue";
import Tasks from "./views/Tasks.vue";
import Rewards from "./views/Rewards.vue";
import Dex from "./views/Dex.vue";
import ParentUnlock from "./views/ParentUnlock.vue";
import ParentCenter from "./views/ParentCenter.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: PetRoom },
    { path: "/tasks", component: Tasks },
    { path: "/rewards", component: Rewards },
    { path: "/dex", component: Dex },
    { path: "/parent/unlock", component: ParentUnlock },
    {
      path: "/parent/:section?",
      component: ParentCenter,
      meta: { parent: true },
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.parent && !useAppStore().parentUnlocked) {
    return "/parent/unlock";
  }
});
