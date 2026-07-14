import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { seedState, type AppState } from "../src/domain";

const APP_STATE_KEY = "family_pets_app_state_v1";
const DEMO_PIN = "2468";
const DEMO_NOW = new Date("2026-07-15T10:00:00+08:00");
const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots");

function demoState(): AppState {
  const state = seedState();
  state.setupCompleted = true;
  state.parentPin = DEMO_PIN;
  state.child.name = "小满";
  state.child.currentPetName = "团团";
  state.progress = {
    ...state.progress,
    level: 10,
    growthValue: 72,
    growthTarget: 100,
    totalGrowthValue: 972,
    moodValue: 94,
    energyValue: 86,
    pointsBalance: 188,
    frozenPoints: 20,
    updatedAt: DEMO_NOW.toISOString(),
  };
  state.claimedLevelMilestones = [
    "level-2",
    "level-3",
    "level-5",
    "level-7",
    "level-10",
  ];
  state.claimedCompanionRewards = ["streak-3", "streak-7", "streak-14"];

  for (let day = 2; day <= 14; day += 1) {
    const dateKey = `2026-07-${String(day).padStart(2, "0")}`;
    state.taskCompletions.push({
      id: `demo-streak-${day}`,
      taskTemplateId: "task-read",
      dateKey,
      status: "approved",
      submittedAt: `${dateKey}T01:00:00.000Z`,
      reviewedAt: `${dateKey}T02:00:00.000Z`,
      parentNote: day === 14 ? "每天坚持阅读，越来越专注了。" : undefined,
      bonusPoints: 0,
      bonusGrowthValue: 0,
    });
  }

  state.taskCompletions.push(
    {
      id: "demo-approved-today",
      taskTemplateId: "task-tidy",
      dateKey: "2026-07-15",
      status: "approved",
      submittedAt: "2026-07-15T01:00:00.000Z",
      reviewedAt: "2026-07-15T01:10:00.000Z",
      parentNote: "玩具分类整理得很整齐，继续保持！",
      bonusPoints: 3,
      bonusGrowthValue: 2,
    },
    {
      id: "demo-pending-today",
      taskTemplateId: "task-brush",
      dateKey: "2026-07-15",
      status: "pending_review",
      submittedAt: "2026-07-15T01:30:00.000Z",
      bonusPoints: 0,
      bonusGrowthValue: 0,
    },
  );

  state.redemptions = [
    {
      id: "demo-fulfilled-redemption",
      rewardId: "reward-cartoon",
      pointsCost: 60,
      status: "approved",
      requestedAt: "2026-07-13T08:00:00.000Z",
      reviewedAt: "2026-07-13T08:10:00.000Z",
      parentNote: "周末一起选一集喜欢的动画片。",
      fulfilledAt: "2026-07-13T12:00:00.000Z",
    },
    {
      id: "demo-pending-redemption",
      rewardId: "reward-story",
      pointsCost: 20,
      status: "pending",
      requestedAt: "2026-07-15T01:40:00.000Z",
    },
  ];

  state.ledger = [
    {
      id: "demo-ledger-task",
      type: "task_reward",
      amount: 15,
      balanceAfter: 168,
      reason: "完成任务：阅读 20 分钟",
      createdAt: "2026-07-14T02:00:00.000Z",
      approvedByParent: true,
    },
    {
      id: "demo-ledger-bonus",
      type: "bonus_reward",
      amount: 3,
      balanceAfter: 188,
      reason: "任务额外奖励：整理玩具",
      createdAt: "2026-07-15T01:10:00.000Z",
      approvedByParent: true,
    },
  ];
  return state;
}

async function installDemoState(page: Page, state: AppState) {
  await page.goto("/");
  await page.evaluate(
    async ({ key, nextState }) => {
      const request = indexedDB.open("family-pets", 4);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction("app", "readwrite");
      transaction.objectStore("app").put(
        {
          schemaVersion: 4,
          savedAt: new Date().toISOString(),
          state: nextState,
        },
        key,
      );
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      database.close();
    },
    { key: APP_STATE_KEY, nextState: state },
  );
  await page.reload();
}

async function settlePage(page: Page) {
  await expect(page.locator(".loading-shell")).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );
  });
}

async function capture(page: Page, fileName: string) {
  await settlePage(page);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, fileName),
    animations: "disabled",
  });
}

async function enterPin(page: Page) {
  for (const digit of DEMO_PIN) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

test("capture the four current README product screens", async ({ page }) => {
  await page.clock.install({ time: DEMO_NOW });
  await installDemoState(page, demoState());

  await expect(page.getByText("小满的伙伴")).toBeVisible();
  await expect(page.getByTestId("companion-streak")).toContainText("14 天");
  await capture(page, "readme-pet-room.png");

  await page.goto("/tasks");
  await expect(page.getByRole("heading", { name: "和团团一起完成" })).toBeVisible();
  await capture(page, "readme-tasks.png");

  await page.goto("/rewards");
  await expect(page.getByRole("heading", { name: "把努力变成期待" })).toBeVisible();
  await capture(page, "readme-rewards.png");

  await page.goto("/parent/unlock");
  await enterPin(page);
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByRole("heading", { name: "今天的家庭进度" })).toBeVisible();
  await capture(page, "readme-parent-center.png");
});
