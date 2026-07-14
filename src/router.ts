import { createRouter, createWebHistory } from "vue-router";
import { useAppStore } from "./store";
import PetRoom from "./views/PetRoom.vue";
import Tasks from "./views/Tasks.vue";
import Rewards from "./views/Rewards.vue";
import Dex from "./views/Dex.vue";
import ParentUnlock from "./views/ParentUnlock.vue";
import ParentCenter from "./views/ParentCenter.vue";
import FirstRunSetup from "./views/FirstRunSetup.vue";
import RecoverParentPin from "./views/RecoverParentPin.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/setup", component: FirstRunSetup },
    { path: "/", component: PetRoom },
    { path: "/tasks", component: Tasks },
    { path: "/rewards", component: Rewards },
    { path: "/dex", component: Dex },
    { path: "/parent/unlock", component: ParentUnlock },
    { path: "/parent/recover-pin", component: RecoverParentPin },
    {
      path: "/parent/:section?",
      component: ParentCenter,
      meta: { parent: true },
    },
  ],
});

router.beforeEach(async (to) => {
  const store = useAppStore();
  await store.load();
  if (!store.state.setupCompleted && to.path !== "/setup") return "/setup";
  if (store.state.setupCompleted && to.path === "/setup") return "/";
  if (to.meta.parent && !store.parentUnlocked) {
    return "/parent/unlock";
  }
});
