# 方向 1 Flutter 可点击原型 - 技术设计

## Architecture

继续使用现有 Flutter 工程和本地状态结构：

- 领域层：`lib/src/domain/models.dart`、`lib/src/domain/seed_data.dart`
- 应用层：`lib/src/application/app_controller.dart`
- 数据层：`lib/src/data/local_app_repository.dart`
- 主题层：`lib/src/theme/app_theme.dart`
- 新增 UI 层：`lib/src/app.dart`、`lib/src/ui/pages/*`、`lib/src/ui/widgets/*`

`AppController` 是状态变更的唯一入口。UI 不直接改 `AppState`，只读取状态并调用 controller 方法。

## UI Structure

计划新增或完善：

```text
lib/src/app.dart
lib/src/ui/app_scope.dart
lib/src/ui/pages/pet_room_page.dart
lib/src/ui/pages/tasks_page.dart
lib/src/ui/pages/rewards_page.dart
lib/src/ui/pages/dex_placeholder_page.dart
lib/src/ui/pages/parent_pin_page.dart
lib/src/ui/pages/parent_home_page.dart
lib/src/ui/pages/task_review_page.dart
lib/src/ui/pages/exchange_review_page.dart
lib/src/ui/pages/points_log_page.dart
lib/src/ui/widgets/app_bottom_nav.dart
lib/src/ui/widgets/app_cards.dart
```

如现有代码已经部分存在，保持文件职责，不进行无关迁移。

## Routing

使用 Flutter `Navigator` 和命名路由：

```text
/                     宠物房
/tasks                今日任务
/rewards              奖励商店
/dex                  图鉴占位
/parent-pin           家长 PIN
/parent-home          家长中心
/task-review          任务审核
/exchange-review      兑换审核
/points-log           积分记录
```

底部导航只出现在孩子端主页面：宠物房、任务、奖励、图鉴。

## State Flow

### 任务流程

```text
TasksPage
-> AppController.submitTask(taskId)
-> TaskCompletion.status = pendingReview
-> Parent TaskReviewPage
-> AppController.approveTask(completionId)
-> progress.pointsBalance / growthValue / moodValue / energyValue 更新
-> ledger 新增记录
-> PetRoomPage 自动刷新
```

### 奖励流程

```text
RewardsPage
-> AppController.requestReward(rewardId)
-> RedemptionRequest.status = pending
-> progress.frozenPoints 增加
-> Parent ExchangeReviewPage
-> AppController.approveRedemption(redemptionId)
-> progress.pointsBalance / frozenPoints 更新
-> ledger 新增记录
-> RewardsPage / PointsLogPage 自动刷新
```

## Asset Usage

必须使用现有图片路径：

```dart
Image.asset(
  'assets/images/rooms/pet-room-background-mvp.png',
  key: const ValueKey('pet-room-background'),
)

Image.asset(
  'assets/images/pets/pet-tuantu-normal-mvp.png',
  key: const ValueKey('pet-tuantu-image'),
)
```

宠物图选择规则：

- 刚审核通过任务后优先展示 `pet-tuantu-happy-mvp.png`
- 低活力时展示 `pet-tuantu-low-energy-mvp.png`
- 成长接近升级或升级反馈时展示 `pet-tuantu-level-up-mvp.png`
- 其他情况展示 `pet-tuantu-normal-mvp.png`

MVP 中可以用简单条件和短时 UI 状态表达反馈，不引入复杂动画框架。

## Visual System

沿用 `lib/src/theme/app_theme.dart`：

- 背景：温暖浅绿色
- 主色：薄荷绿色
- 奖励色：柔和黄色
- 文字：深绿色墨色
- 卡片：白色或轻量浅色面板

首页不应被大量卡片占满。宠物和房间背景占主导位置，状态、任务和奖励入口作为低干扰叠层或下方面板。

## Testing Strategy

- Widget test 覆盖孩子端导航和资产展示。
- Widget test 覆盖任务提交后待确认状态。
- Widget test 覆盖 PIN 进入家长中心。
- 现有 controller 单元测试继续作为业务规则保障。
- 验证命令：

```powershell
flutter test
flutter analyze
```

## Compatibility

- Android 竖屏优先。
- 不增加需要网络的依赖。
- 不改本地存储格式，避免影响现有 repository 测试。
- 不引入新图片资产，降低素材成本。

## Risks

- 当前 seed 数据或测试中若存在乱码，UI 应使用正常中文展示，必要时同步修正 seed 数据和对应测试。
- 如果 `lib/src/app.dart` 缺失，需要将 `main.dart` 改为启动 `FamilyPetsApp`。
- 如果测试已引用 UI key，保留 `pet-room-background` 和 `pet-tuantu-image`。
