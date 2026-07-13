import { expect, test, type Page } from "@playwright/test";
import { PET_LAST_ACTIVE_KEY, PET_REST_AFTER_MS } from "../src/activity";
import { seedState, type AppState } from "../src/domain";

const APP_STATE_KEY = "family_pets_app_state_v1";

async function unlockParent(page: Page) {
  await page.goto("/parent/unlock");
  for (const digit of ["2", "5", "8", "0"]) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
  await expect(page).toHaveURL(/\/parent$/);
}

async function installAppState(page: Page, state: AppState) {
  await page.goto("/");
  await page.evaluate(
    async ({ key, state: nextState }) => {
      const request = indexedDB.open("family-pets", 2);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction("app", "readwrite");
      transaction.objectStore("app").put(
        {
          schemaVersion: 2,
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
    { key: APP_STATE_KEY, state },
  );
  await page.reload();
}

test("continuous pet interactions progress from happy to excited", async ({
  page,
}) => {
  await page.goto("/");
  const petButton = page.getByRole("button", { name: "和团团互动" });
  const petImage = petButton.locator("img");

  await expect(petImage).toHaveAttribute("src", /tuantuan-normal\.png/);
  await petButton.click();
  await expect(petImage).toHaveAttribute("src", /tuantuan-happy\.png/);
  await expect(page.getByText("摸摸头收到啦，我很开心")).toBeVisible();
  await petButton.click();
  await expect(petImage).toHaveAttribute("src", /tuantuan-excited\.png/);
  await expect(
    page.getByText("再摸一下，我兴奋得跳起来啦"),
  ).toBeVisible();
});

test("Tuantuan rests after the app has not been opened for a day", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key, lastActiveAt }) => {
      window.localStorage.setItem(key, String(lastActiveAt));
    },
    {
      key: PET_LAST_ACTIVE_KEY,
      lastActiveAt: Date.now() - PET_REST_AFTER_MS - 60_000,
    },
  );
  await page.goto("/");
  const petButton = page.getByRole("button", { name: "和团团互动" });
  const petImage = petButton.locator("img");

  await expect(petImage).toHaveAttribute("src", /tuantuan-low-energy\.png/);
  await expect(
    page.getByText("好久不见，我刚刚打了个小哈欠"),
  ).toBeVisible();
  await petButton.click();
  await expect(petImage).toHaveAttribute("src", /tuantuan-happy\.png/);
});

test("task submission survives reload and returns parent feedback", async ({
  page,
}) => {
  await page.goto("/tasks");
  await page.getByRole("button", { name: "我完成了" }).first().click();
  await expect(
    page.locator(".status-chip", { hasText: "等待家长确认" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator(".status-chip", { hasText: "等待家长确认" }),
  ).toBeVisible();

  await unlockParent(page);
  const review = page.locator(".review-card").first();
  await review.getByLabel("给孩子的留言").fill("今天刷牙特别认真");
  await review.getByLabel("额外积分").fill("3");
  await review.getByRole("button", { name: "确认通过" }).click();
  await page.getByRole("button", { name: "回到孩子端" }).click();
  await page.getByRole("link", { name: "任务", exact: true }).click();

  await expect(page.getByText("今天完成啦")).toBeVisible();
  await expect(page.getByText(/今天刷牙特别认真/)).toBeVisible();
});

test("reward request cannot be duplicated and shows approval result", async ({
  page,
}) => {
  await page.goto("/rewards");
  const reward = page.locator(".reward-grid article").first();
  await reward.getByRole("button", { name: /30 分申请/ }).click();
  await expect(reward.getByText("确认中")).toBeVisible();
  await expect(
    reward.getByRole("button", { name: "等待家长确认" }),
  ).toBeDisabled();

  await unlockParent(page);
  const review = page.locator(".review-card").last();
  await review.getByLabel("给孩子的留言").fill("周六晚上一起讲");
  await review.getByRole("button", { name: "确认兑换" }).click();
  await page.getByRole("button", { name: "回到孩子端" }).click();
  await page.getByRole("link", { name: "奖励", exact: true }).click();

  await expect(
    page.locator(".reward-grid article").first().getByText("待兑现"),
  ).toBeVisible();
  await expect(page.getByText("周六晚上一起讲")).toBeVisible();
  await unlockParent(page);
  await page.getByRole("button", { name: "标记已兑现" }).click();
  await page.getByRole("button", { name: "回到孩子端" }).click();
  await page.getByRole("link", { name: "奖励", exact: true }).click();
  const fulfilledReward = page.locator(".reward-grid article").first();
  await expect(fulfilledReward.getByText("已兑现")).toBeVisible();
  await expect(
    fulfilledReward.getByRole("button", { name: /30 分申请/ }),
  ).toBeEnabled();
});

test("parent route is protected after leaving", async ({ page }) => {
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/parent\/unlock$/);
  await unlockParent(page);
  await page.getByRole("button", { name: "回到孩子端" }).click();
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/parent\/unlock$/);
});

test("archived tasks disappear from child view and can be restored", async ({
  page,
}) => {
  await unlockParent(page);
  await page.getByRole("button", { name: "管理", exact: true }).click();
  await page.getByRole("button", { name: "归档任务 认真刷牙" }).click();
  await expect(page.getByText("已归档任务 1")).toBeVisible();
  await page.getByRole("button", { name: "回到孩子端" }).click();
  await page.getByRole("link", { name: "任务", exact: true }).click();
  await expect(page.getByText("认真刷牙")).toHaveCount(0);

  await page.getByRole("link", { name: "宠物房", exact: true }).click();
  await page.getByLabel("家长中心").click();
  for (const digit of ["2", "5", "8", "0"]) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
  await page.getByRole("button", { name: "管理", exact: true }).click();
  await page.getByText("已归档任务 1").click();
  await page
    .locator(".archived-row")
    .first()
    .getByRole("button", { name: "恢复" })
    .click();
  await page.getByRole("button", { name: "回到孩子端" }).click();
  await page.getByRole("link", { name: "任务", exact: true }).click();
  await expect(page.getByText("认真刷牙")).toBeVisible();
});

test("parent can update the child and pet names", async ({ page }) => {
  await unlockParent(page);
  await page.getByRole("button", { name: "管理", exact: true }).click();
  await page.getByLabel("孩子昵称").fill("安安");
  await page.getByLabel("当前宠物昵称").fill("糯米");
  await page.getByRole("button", { name: "保存资料" }).click();
  await page.getByRole("button", { name: "回到孩子端" }).click();

  await expect(page.getByText("安安的伙伴")).toBeVisible();
  await expect(page.getByRole("heading", { name: "糯米" })).toBeVisible();
});

test("an unlocked pet can be selected and survives reload", async ({ page }) => {
  const state = seedState();
  state.progress.level = 3;
  await installAppState(page, state);

  await page.getByRole("link", { name: "图鉴", exact: true }).click();
  await expect(page.locator(".pet-card")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "选择米粒" })).toBeDisabled();

  await page.getByRole("button", { name: "选择泡泡" }).click();
  await expect(page.getByText("已选择泡泡作为当前伙伴")).toBeVisible();
  await page.getByRole("link", { name: "宠物房", exact: true }).click();

  const petButton = page.getByRole("button", { name: "和泡泡互动" });
  await expect(page.getByRole("heading", { name: "泡泡" })).toBeVisible();
  await expect(petButton.locator("img")).toHaveAttribute(
    "src",
    /blue-cat-normal\.png/,
  );

  await page.reload();
  await expect(page.getByRole("heading", { name: "泡泡" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "和泡泡互动" }).locator("img"),
  ).toHaveAttribute("src", /blue-cat-normal\.png/);
});
