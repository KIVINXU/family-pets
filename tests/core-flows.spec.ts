import { expect, test, type Page } from "@playwright/test";
import { seedState, type AppState } from "../src/domain";

const APP_STATE_KEY = "family_pets_app_state_v1";
const DEFAULT_TEST_PIN = "2468";
const PARENT_SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const BACKUP_SETUP_AT_KEY = "family_pets_backup_setup_at";

function configuredState(pin = DEFAULT_TEST_PIN) {
  const state = seedState();
  state.setupCompleted = true;
  state.parentPin = pin;
  return state;
}

async function installAppState(
  page: Page,
  state: unknown,
  schemaVersion = 4,
) {
  await page.goto("/");
  await page.evaluate(
    async ({ key, state: nextState, schemaVersion: version }) => {
      const request = indexedDB.open("family-pets", 4);
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction("app", "readwrite");
      transaction.objectStore("app").put(
        {
          schemaVersion: version,
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
    { key: APP_STATE_KEY, state, schemaVersion },
  );
  await page.reload();
}

function asLegacyState(state: AppState) {
  const {
    claimedLevelMilestones: _claimedLevels,
    claimedCompanionRewards: _claimedCompanion,
    ...legacy
  } = state;
  return legacy;
}

async function enterPin(page: Page, pin: string) {
  for (const digit of pin) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

async function unlockParent(page: Page, pin = DEFAULT_TEST_PIN) {
  await page.goto("/parent/unlock");
  await enterPin(page, pin);
  await expect(page).toHaveURL(/\/parent$/);
}

async function completeSetup(page: Page, pin = DEFAULT_TEST_PIN) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel("孩子昵称").fill("安安");
  await page.getByLabel("宠物名称").fill("糯米");
  await page.getByLabel("设置 4 位家长 PIN").fill(pin);
  await page.getByLabel("再次输入 PIN", { exact: true }).fill(pin);
  await page.getByRole("button", { name: "开始使用" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("fresh install completes the minimal setup with real zero progress", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("link", { name: "任务", exact: true })).toHaveCount(0);
  await expect(page.getByText("已有备份，直接恢复")).toBeVisible();

  await completeSetup(page);

  await expect(page.getByText("安安的伙伴")).toBeVisible();
  await expect(page.getByRole("heading", { name: "糯米" })).toBeVisible();
  await expect(page.getByText("Lv.1")).toBeVisible();
  await expect(page.getByText("0 积分")).toBeVisible();
  await expect(page.getByText("默认演示 PIN")).toHaveCount(0);
  await expect(page.getByText("2580")).toHaveCount(0);
});

test("reserved PIN is rejected during setup", async ({ page }) => {
  await page.goto("/setup");
  await page.getByLabel("孩子昵称").fill("安安");
  await page.getByLabel("宠物名称").fill("团团");
  await page.getByLabel("设置 4 位家长 PIN").fill("2580");
  await page.getByLabel("再次输入 PIN", { exact: true }).fill("2580");
  await page.getByRole("button", { name: "开始使用" }).click();
  await expect(page.getByText(/这个 PIN 不能使用/)).toBeVisible();
  await expect(page).toHaveURL(/\/setup$/);
});

test("legacy 2580 data is gated by setup without losing progress", async ({
  page,
}) => {
  const state = seedState();
  state.progress.pointsBalance = 88;
  await installAppState(page, asLegacyState(state), 2);

  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel("孩子昵称").fill("安安");
  await page.getByLabel("宠物名称").fill("团团");
  await page.getByLabel("设置 4 位家长 PIN").fill(DEFAULT_TEST_PIN);
  await page.getByLabel("再次输入 PIN", { exact: true }).fill(DEFAULT_TEST_PIN);
  await page.getByRole("button", { name: "开始使用" }).click();
  await expect(page.getByText("88 积分")).toBeVisible();
});

test("setup can preview a backup and restore it with a new device PIN", async ({
  page,
}) => {
  const backup = configuredState("9999");
  backup.child.name = "小禾";
  backup.progress.level = 3;
  backup.progress.pointsBalance = 42;
  const { parentPin: _parentPin, setupCompleted: _setupCompleted, ...family } =
    backup;

  await page.goto("/setup");
  await page.locator('.restore-entry input[type="file"]').setInputFiles({
    name: "family-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: 4,
        exportedAt: "2026-07-14T08:00:00.000Z",
        state: family,
      }),
    ),
  });
  await expect(page.getByRole("heading", { name: "恢复这个家庭备份？" })).toBeVisible();
  await expect(page.getByText(/小禾，Lv\.3，42 积分/)).toBeVisible();
  await page.getByLabel("这台设备的新 PIN").fill("1357");
  await page.getByLabel("再次输入新 PIN").fill("1357");
  await page.getByRole("button", { name: "设置新 PIN 并恢复" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("小禾的伙伴")).toBeVisible();
  await unlockParent(page, "1357");
});

test("invalid or cancelled setup restore never replaces the fresh state", async ({
  page,
}) => {
  await page.goto("/setup");
  await page.locator('.restore-entry input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("not-json"),
  });
  await expect(page.getByText("备份文件不是有效 JSON")).toBeVisible();
  await expect(page).toHaveURL(/\/setup$/);

  const backup = configuredState();
  backup.child.name = "不应写入";
  const { parentPin: _parentPin, setupCompleted: _setupCompleted, ...family } =
    backup;
  await page.locator('.restore-entry input[type="file"]').setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ schemaVersion: 4, exportedAt: new Date().toISOString(), state: family }),
    ),
  });
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.reload();
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByLabel("孩子昵称")).toHaveValue("小满");
});

test("an unlocked parent session automatically locks after ten idle minutes", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-07-14T10:00:00") });
  await installAppState(page, configuredState());
  await unlockParent(page);
  await page.clock.fastForward(PARENT_SESSION_TIMEOUT_MS + 15_000);
  await expect(page).toHaveURL(/\/parent\/unlock$/);
});

test("today overview refreshes automatically across local midnight", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-07-14T23:59:00+08:00") });
  const state = configuredState();
  state.taskCompletions.push({
    id: "approved-before-midnight",
    taskTemplateId: "task-brush",
    dateKey: "2026-07-14",
    status: "approved",
    submittedAt: "2026-07-14T12:00:00.000Z",
    reviewedAt: "2026-07-14T12:01:00.000Z",
    bonusPoints: 0,
    bonusGrowthValue: 0,
  });
  await installAppState(page, state);
  const completedToday = page
    .getByLabel("今日概览")
    .getByText("今天完成")
    .locator("..").locator("strong");
  await expect(completedToday).toHaveText("1");
  await page.clock.fastForward(121_000);
  await expect(completedToday).toHaveText("0");
});

test.describe("configured family flows", () => {
  test.beforeEach(async ({ page }) => {
    await installAppState(page, configuredState());
  });

  test("parent changes PIN, is locked, and only the new PIN works", async ({
    page,
  }) => {
    await unlockParent(page);
    await page.getByRole("button", { name: "管理", exact: true }).click();
    await page.getByLabel("当前 PIN").fill(DEFAULT_TEST_PIN);
    await page.getByLabel("新 PIN", { exact: true }).fill("1357");
    await page.getByLabel("再次输入新 PIN").fill("1357");
    await page.getByRole("button", { name: "更新 PIN" }).click();
    await expect(page).toHaveURL(/\/parent\/unlock$/);

    await enterPin(page, DEFAULT_TEST_PIN);
    await expect(page.getByText("PIN 不正确，请重新输入。"))
      .toBeVisible();
    await enterPin(page, "1357");
    await expect(page).toHaveURL(/\/parent$/);
  });

  test("forgotten PIN reset preserves family progress", async ({ page }) => {
    await page.goto("/parent/unlock");
    await page.getByRole("link", { name: "忘记 PIN？重新设置" }).click();
    await page.getByLabel("新的 4 位 PIN").fill("1357");
    await page.getByLabel("再次输入新 PIN").fill("1357");
    await page.getByRole("button", { name: "继续" }).click();
    await page.getByRole("button", { name: "确认设置新 PIN" }).click();
    await expect(page).toHaveURL(/\/parent\/unlock$/);
    await enterPin(page, "1357");
    await expect(page).toHaveURL(/\/parent$/);
    await page.getByRole("button", { name: "回到孩子端" }).click();
    await expect(page.getByText("Lv.1")).toBeVisible();
  });

  test("task approval confirmation can cancel or commit exactly once", async ({
    page,
  }) => {
    await page.goto("/tasks");
    await page.getByRole("button", { name: "我完成了" }).first().click();
    await unlockParent(page);
    const review = page.locator(".review-card").first();
    await review.getByLabel("额外积分").fill("3");
    await review.getByRole("button", { name: "确认通过" }).click();
    await expect(page.getByText(/增加 13 积分和 8 成长/)).toBeVisible();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await expect(review).toBeVisible();
    await review.getByRole("button", { name: "确认通过" }).click();
    await page
      .locator(".confirm-dialog")
      .getByRole("button", { name: "确认通过" })
      .click();
    await expect(page.getByText("暂时没有等待确认的任务。"))
      .toBeVisible();
    await page.getByRole("button", { name: "回到孩子端" }).click();
    await expect(page.getByText("今天获得").locator("..").getByText("+13"))
      .toBeVisible();
  });

  test("restore preview rejects a wrong PIN, preserves device PIN, and locks", async ({
    page,
  }) => {
    const backup = configuredState("9999");
    backup.child.name = "小禾";
    backup.progress.pointsBalance = 76;
    const { parentPin: _parentPin, setupCompleted: _setupCompleted, ...family } =
      backup;
    await unlockParent(page);
    await page.getByRole("button", { name: "记录与备份" }).click();
    await page.locator('.backup-actions input[type="file"]').setInputFiles({
      name: "restore.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          schemaVersion: 4,
          exportedAt: "2026-07-14T08:00:00.000Z",
          state: family,
        }),
      ),
    });
    await expect(page.getByText(/小禾.*76 积分/)).toBeVisible();
    await page.getByLabel("再次输入当前家长 PIN").fill("0000");
    await page.getByRole("button", { name: "确认恢复" }).click();
    await expect(page.getByText(/PIN 不正确/)).toBeVisible();
    await expect(page).toHaveURL(/\/parent$/);
    await page.getByLabel("再次输入当前家长 PIN").fill(DEFAULT_TEST_PIN);
    await page.getByRole("button", { name: "确认恢复" }).click();
    await expect(page).toHaveURL(/\/parent\/unlock$/);
    await enterPin(page, DEFAULT_TEST_PIN);
    await page.getByRole("button", { name: "回到孩子端" }).click();
    await expect(page.getByText("小禾的伙伴")).toBeVisible();
  });

  test("reward approval and fulfillment both require confirmation", async ({
    page,
  }) => {
    const state = configuredState();
    state.progress.pointsBalance = 30;
    await installAppState(page, state);
    await page.goto("/rewards");
    await page.getByRole("button", { name: /20 分申请/ }).click();
    await unlockParent(page);
    const redemption = page.locator(".review-card").last();
    await redemption.getByRole("button", { name: "确认兑换" }).click();
    await expect(page.getByText(/扣除 20 积分/)).toBeVisible();
    await page
      .locator(".confirm-dialog")
      .getByRole("button", { name: "确认兑换" })
      .click();
    await page.getByRole("button", { name: "标记已兑现" }).click();
    await expect(page.getByText(/孩子端会显示奖励已经兑现/)).toBeVisible();
    await page
      .locator(".confirm-dialog")
      .getByRole("button", { name: "标记已兑现" })
      .click();
    await page.getByRole("button", { name: "回到孩子端" }).click();
    await page.getByRole("link", { name: "奖励", exact: true }).click();
    await expect(page.locator(".reward-grid article").first().getByText("已兑现"))
      .toBeVisible();
  });

  test("parent route locks after leaving for the child side", async ({ page }) => {
    await unlockParent(page);
    await page.getByRole("button", { name: "回到孩子端" }).click();
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/parent\/unlock$/);
  });

  test("local reset requires confirmation and returns to first setup", async ({
    page,
  }) => {
    await unlockParent(page);
    await page.getByRole("button", { name: "记录与备份" }).click();
    await page.getByRole("button", { name: "重置数据" }).click();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    await expect(page).toHaveURL(/\/parent$/);
    await page.getByRole("button", { name: "重置数据" }).click();
    await page.getByLabel("再次输入当前家长 PIN").fill(DEFAULT_TEST_PIN);
    await page.getByRole("button", { name: "确认重置" }).click();
    await expect(page).toHaveURL(/\/setup$/);
  });

  test("core feedback remains readable with reduced motion and enlarged text", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.addStyleTag({ content: "html { font-size: 21px; }" });
    const petButton = page.getByRole("button", { name: "和团团互动" });
    await petButton.click();
    await expect(page.getByText("摸摸头收到啦，我很开心")).toBeVisible();
    const animationDuration = await petButton.locator("img").evaluate(
      (element) => getComputedStyle(element).animationDuration,
    );
    expect(Number.parseFloat(animationDuration)).toBeLessThan(0.001);

    await unlockParent(page);
    await page.getByRole("button", { name: "记录与备份" }).click();
    await page.getByRole("button", { name: "重置数据" }).click();
    const dialog = page.locator(".confirm-dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(viewport!.width);
    expect(box!.height).toBeLessThanOrEqual(viewport!.height);
  });

  test("growth gifts aggregate, survive closing, and claim only once", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-07-14T12:00:00+08:00") });
    const state = configuredState();
    state.progress.level = 10;
    for (let day = 1; day <= 14; day += 1) {
      const dateKey = `2026-07-${String(day).padStart(2, "0")}`;
      state.taskCompletions.push({
        id: `growth-${day}`,
        taskTemplateId: "task-read",
        dateKey,
        status: "approved",
        submittedAt: `${dateKey}T01:00:00.000Z`,
        reviewedAt: `${dateKey}T02:00:00.000Z`,
        bonusPoints: 0,
        bonusGrowthValue: 0,
      });
    }
    await installAppState(page, state);

    const dialog = page.getByTestId("growth-reward-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("li")).toHaveCount(8);
    await dialog.getByRole("button", { name: "稍后领取" }).click();
    await expect(page.getByTestId("growth-gift-button")).toBeVisible();
    await page.getByTestId("growth-gift-button").click();
    await dialog.getByRole("button", { name: "打开全部礼物" }).click();

    await expect(page.getByText("85 积分", { exact: true })).toBeVisible();
    await expect(page.getByTestId("room-decoration-streak-3")).toBeVisible();
    await expect(page.getByTestId("room-decoration-streak-7")).toBeVisible();
    await expect(page.getByTestId("room-decoration-streak-14")).toBeVisible();
    await expect(page.getByTestId("companion-streak")).toContainText("14 天");
    await expect(page.getByTestId("growth-gift-button")).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("room-decoration-streak-3")).toBeVisible();
    await expect(page.getByTestId("growth-reward-dialog")).toHaveCount(0);
    await expect(page.getByText("85 积分", { exact: true })).toBeVisible();
  });

  test("night ambient dialogue stays restful even with pending tasks", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Math.random = () => 0;
    });
    await page.clock.install({ time: new Date("2026-07-14T22:00:00+08:00") });
    const state = configuredState();
    state.taskCompletions.push({
      id: "night-pending",
      taskTemplateId: "task-read",
      dateKey: "2026-07-14",
      status: "pending_review",
      submittedAt: "2026-07-14T12:00:00.000Z",
      bonusPoints: 0,
      bonusGrowthValue: 0,
    });
    await installAppState(page, state);
    await page.clock.fastForward(8_100);

    const speech = page.locator(".pet-speech");
    await expect(speech).toBeVisible();
    await expect(speech).toContainText(/晚安|休息|好梦|夜深/);
    await expect(speech).not.toContainText(/还没|来不及|待确认/);
  });

  test("backup reminder appears after seven days and can be dismissed locally", async ({
    page,
  }) => {
    await page.evaluate(
      ({ key, value }) => window.localStorage.setItem(key, String(value)),
      {
        key: BACKUP_SETUP_AT_KEY,
        value: Date.now() - 8 * 24 * 60 * 60 * 1000,
      },
    );
    await page.reload();
    await unlockParent(page);
    await page.getByRole("button", { name: "记录与备份" }).click();
    await expect(page.getByText("记得保存一份家庭备份")).toBeVisible();
    await expect(page.getByText("上次导出时间：尚未导出")).toBeVisible();
    await page.getByRole("button", { name: "关闭提醒" }).click();
    await expect(page.getByText("记得保存一份家庭备份")).toHaveCount(0);

    await page.reload();
    await enterPin(page, DEFAULT_TEST_PIN);
    await page.getByRole("button", { name: "记录与备份" }).click();
    await expect(page.getByText("记得保存一份家庭备份")).toHaveCount(0);
  });
});
