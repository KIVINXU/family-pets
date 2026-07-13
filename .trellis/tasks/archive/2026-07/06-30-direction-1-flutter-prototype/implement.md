# 方向 1 Flutter 可点击原型 - 实现计划

## Step 1. 盘点现有代码

- 阅读 `lib/main.dart`
- 阅读 `lib/src/application/app_controller.dart`
- 阅读 `lib/src/domain/models.dart`
- 阅读 `lib/src/domain/seed_data.dart`
- 阅读 `lib/src/theme/app_theme.dart`
- 阅读现有测试文件

验证目标：确认哪些 UI 文件已经存在，哪些需要创建。

## Step 2. 修正应用入口

- 确认 `lib/src/app.dart` 是否存在。
- 若不存在，创建 `FamilyPetsApp`。
- 修改 `lib/main.dart`，使用 `FamilyPetsApp` 而不是 Flutter counter demo。
- 创建或确认 `AppScope`，让页面可以访问 `AppController`。

验证目标：`flutter test` 至少能加载应用入口。

## Step 3. 创建共享 UI 组件

- `app_bottom_nav.dart`：孩子端底部导航。
- `app_cards.dart`：状态标签、信息面板、统一卡片。
- 组件使用现有主题，避免局部硬编码过多颜色。

验证目标：宠物房、任务页、奖励页可以复用组件。

## Step 4. 实现孩子端页面

- `pet_room_page.dart`
  - 使用房间背景。
  - 使用团团图片。
  - 展示等级、成长、心情、活力、积分。
  - 点击宠物显示短台词。
  - 提供任务、奖励和家长入口。
- `tasks_page.dart`
  - 展示任务列表和状态。
  - 支持提交任务。
- `rewards_page.dart`
  - 展示积分统计和奖励列表。
  - 支持申请兑换。
- `dex_placeholder_page.dart`
  - 作为图鉴占位，不扩大功能。

验证目标：孩子端主路径可点击。

## Step 5. 实现家长端页面

- `parent_pin_page.dart`
  - 4 位 PIN 输入。
  - 错误提示。
  - 正确进入家长中心。
- `parent_home_page.dart`
  - 展示待审核数量。
  - 进入任务审核、兑换审核和积分记录。
- `task_review_page.dart`
  - 通过或退回任务。
- `exchange_review_page.dart`
  - 通过或退回兑换。
- `points_log_page.dart`
  - 展示积分流水。

验证目标：家长审核后孩子端状态同步更新。

## Step 6. 补充和更新测试

- 更新 `test/widget_test.dart`，覆盖资产展示和导航。
- 如需要，新增家长 PIN 和审核流程 widget test。
- 保留现有 domain、repository、controller 测试。

验证目标：

```powershell
flutter test
flutter analyze
```

## Step 7. 手动体验检查

- 打开 App，确认宠物房为首屏。
- 点击宠物，确认反馈出现。
- 提交任务，确认状态为待家长确认。
- 输入 PIN `2580`，通过任务审核。
- 回到宠物房，确认积分和成长值更新。
- 申请奖励兑换，通过家长审核。
- 查看积分记录。

## Rollback Points

- 如 UI 路由实现失败，回退 `lib/main.dart` 和 `lib/src/app.dart` 的入口改动。
- 如状态展示错误，优先检查页面读取状态逻辑，不改 controller 业务规则。
- 如测试失败，优先保证现有 controller 和 repository 行为不变。
