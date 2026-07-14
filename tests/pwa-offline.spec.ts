import { expect, test, type Page } from "@playwright/test";

const PIN = "2468";

async function enterPin(page: Page, pin: string) {
  for (const digit of pin) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

test("production PWA keeps the child, review, reward, and PIN flows offline", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("孩子昵称").fill("安安");
  await page.getByLabel("宠物名称").fill("团团");
  await page.getByLabel("设置 4 位家长 PIN").fill(PIN);
  await page.getByLabel("再次输入 PIN", { exact: true }).fill(PIN);
  await page.getByRole("button", { name: "开始使用" }).click();

  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await context.setOffline(true);

  await page.goto("/tasks");
  const taskButtons = page.getByRole("button", { name: "我完成了" });
  await taskButtons.nth(0).click();
  await taskButtons.nth(1).click();
  await expect(page.getByText("等待家长确认")).toHaveCount(2);

  await page.goto("/parent/unlock");
  await enterPin(page, PIN);
  await expect(page).toHaveURL(/\/parent$/);
  for (let index = 0; index < 2; index += 1) {
    const review = page.locator(".review-card").first();
    await review.getByRole("button", { name: "确认通过" }).click();
    await page
      .locator(".confirm-dialog")
      .getByRole("button", { name: "确认通过" })
      .click();
  }

  await page.getByRole("button", { name: "回到孩子端" }).click();
  await page.getByRole("link", { name: "奖励", exact: true }).click();
  await page.getByRole("button", { name: /20 分申请/ }).click();
  await expect(page.getByText("确认中")).toBeVisible();

  await page.goto("/parent/unlock");
  await enterPin(page, PIN);
  const redemption = page.locator(".review-card").last();
  await redemption.getByRole("button", { name: "确认兑换" }).click();
  await page
    .locator(".confirm-dialog")
    .getByRole("button", { name: "确认兑换" })
    .click();

  await page.getByRole("button", { name: "管理", exact: true }).click();
  await page.getByLabel("当前 PIN").fill(PIN);
  await page.getByLabel("新 PIN", { exact: true }).fill("1357");
  await page.getByLabel("再次输入新 PIN").fill("1357");
  await page.getByRole("button", { name: "更新 PIN" }).click();
  await expect(page).toHaveURL(/\/parent\/unlock$/);
  await enterPin(page, "1357");
  await expect(page).toHaveURL(/\/parent$/);
});
