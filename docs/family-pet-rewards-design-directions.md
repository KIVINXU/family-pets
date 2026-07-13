# 家庭幻兽奖励 App 设计方向

**日期**：2026-06-30  
**来源**：`docs/family-pet-rewards-prd.md`  
**阶段**：低保真流程与视觉方向选择  

## 1. 当前判断

PRD 已经足够进入原型设计。首版设计应围绕一个主路径展开：

```text
孩子打开宠物房
-> 查看今日任务
-> 提交任务完成
-> 等待家长确认
-> 获得成长值和积分
-> 申请兑换奖励
-> 等待家长确认
-> 记录成长和积分变化
```

家长路径作为第二层：

```text
输入 PIN
-> 审核任务
-> 审核兑换
-> 管理任务和奖励
-> 查看积分记录
```

当前工程已有 3D 软萌宠物“团团”和温暖房间背景，适合作为主视觉基线继续发展。

## 2. 信息架构

孩子端底部导航：

```text
宠物房 / 任务 / 奖励 / 图鉴
```

家长入口：

```text
宠物房右上角 PIN
```

家长中心：

```text
审核 / 任务管理 / 奖励管理 / 积分记录 / 设置
```

首版可以先做单孩子，本机数据，所有任务和兑换都需要家长确认。

## 3. 低保真页面方案

### 3.1 宠物房

目标：孩子 5 秒内知道宠物状态、今天要做什么、积分够不够兑换奖励。

页面结构：

- 顶部：孩子名、当前积分、家长 PIN 入口。
- 主区域：房间背景 + 主宠物大图。
- 宠物旁：一句短台词，例如“今天也一起加油呀”。
- 状态区：等级、成长条、心情、活力。
- 今日任务预览：最多展示 2 个任务，进入任务页。
- 奖励入口：展示一个可兑换奖励或“还差 X 分”。

关键状态：

- 普通：宠物微笑。
- 待确认：任务入口显示“等家长确认”。
- 升级：宠物变大、光效、短祝贺语。
- 低活力：宠物动作慢一些，文案保持温和。

### 3.2 今日任务

目标：孩子能看懂今天要做什么，并知道提交后需要家长确认。

页面结构：

- 顶部：今日任务数量，例如“今天 4 个小任务”。
- 任务列表：任务名、积分、成长值、状态。
- 主按钮：未完成显示“我完成了”，待确认显示“等家长确认”。
- 页面底部：温和说明“确认后，团团会成长，积分也会增加”。

状态表达：

- 未完成：浅色按钮。
- 待确认：沙漏或时钟图标 + 黄色提示。
- 已完成：星星或勾选图标 + 成长反馈。
- 驳回：显示家长备注和“重新提交”。

### 3.3 奖励商店

目标：孩子理解积分可以换现实奖励，但兑换需要家长同意。

页面结构：

- 顶部：可用积分、等待确认积分、总积分。
- 奖励列表：奖励名、所需积分、是否可兑换。
- 可兑换奖励：主按钮“申请兑换”。
- 积分不足奖励：按钮显示“还差 X 分”。
- 待确认奖励：显示“等家长确认”。

文案原则：

- 孩子端不强调“冻结积分”，改成“已帮你留住积分”。
- 不用失败感强的文案，例如“不能兑换”。

### 3.4 幻兽图鉴

目标：孩子有收集期待，但首页只保留一只主宠物。

页面结构：

- 顶部：当前伙伴。
- 图鉴网格：约 10 只幻兽。
- 已解锁：显示名字、元素、选择按钮。
- 未解锁：显示轮廓、解锁条件。
- 预览区：点击幻兽后展示大图和一句台词。

首版规则：

- 成长值跟着孩子走，不跟单只宠物绑定。
- 切换宠物不改变等级和积分。
- 未解锁宠物可以展示条件，例如“Lv.4 解锁”。

### 3.5 成长记录

目标：让孩子和家长看到长期进步，不制造排名压力。

页面结构：

- 顶部：最近 7 天完成情况。
- 成长时间线：升级、连续完成任务、兑换奖励。
- 徽章区：阅读、整理、刷牙、坚持等主题徽章。
- 家长视角入口：查看积分记录。

首版可以先弱化此页，把成长记录合并到家长中心和宠物房摘要里。

### 3.6 家长中心

目标：家长快速完成审核和配置，不干扰孩子主流程。

页面结构：

- 顶部：待审核任务数、待审核兑换数。
- 审核区：任务审核、兑换审核。
- 管理区：任务管理、奖励管理。
- 记录区：积分记录、本机备份与恢复。
- 设置区：孩子资料、PIN 设置。

审核动作：

- 任务通过：发放积分、成长值，提升心情和活力。
- 任务退回：不扣分，给温和备注。
- 兑换通过：扣除积分，记录原因。
- 兑换退回：返还等待确认的积分，记录原因。

## 4. 三个视觉方向

### 方向 1：软萌盲盒宠物房

定位：最适合作为当前 MVP 主方向。

视觉特点：

- 3D 软萌幻兽，大头小短手，材质像搪胶和软玩具。
- 房间是暖色儿童房，带植物、书架、星星地毯、小任务板。
- UI 是圆润、轻量、白色或浅绿色半透明面板。
- 色彩以薄荷绿、奶油黄、浅木色、星星金为主。

适合原因：

- 与现有“团团”和房间背景一致。
- 陪伴感强，儿童友好。
- 后续做宠物状态图比较容易。

风险：

- 如果面板太多，会让首页像一堆卡片盖在背景上。首页需要保留宠物和房间的主导地位。

生成提示词：

```text
Create a realistic production-quality mobile app UI mockup for a children's family pet reward app.
Target dimensions: 390 x 844.
Screen: pet room home screen.
Visual direction: soft 3D blind-box creature companion in a warm children's room.
Subject: one large round mint-green fantasy pet, friendly face, tiny horns, soft toy material, standing in the center of a cozy room.
Layout: top area shows child name, points balance, and a small parent PIN icon; center is the pet and speech bubble; lower area shows level progress, mood, energy, today's tasks preview, and reward entry.
Style: warm, polished, child-friendly mobile H5/PWA, rounded but not cluttered, clear hierarchy, readable Chinese UI labels.
Palette: mint green, cream, soft yellow, warm wood, small star-gold accents.
Constraints: one main pet only, no classroom, no leaderboard, no public social features, no device chrome, no busy card grid.
Text should be short Chinese UI copy such as "宠物房", "Lv.3", "今日任务", "奖励", "等家长确认".
```

### 方向 2：绘本陪伴屋

定位：适合更低龄、更温柔的家庭习惯养成。

视觉特点：

- 宠物更像绘本角色，线条柔和，表情更明显。
- 背景像儿童绘本里的小房间，有手绘边缘和纸感。
- UI 更扁平，少拟物材质，按钮和列表更清楚。
- 色彩以浅蓝、嫩绿、蜂蜜黄、珊瑚粉点缀。

适合原因：

- 阅读感更强，适合帮助孩子认字。
- 长期使用不容易视觉疲劳。
- 任务页和成长记录页会更清晰。

风险：

- 不如 3D 盲盒方向有“想点它”的吸引力。

生成提示词：

```text
Create a realistic production-quality mobile app UI mockup for a children's family pet reward app.
Target dimensions: 390 x 844.
Screen: today's tasks screen.
Visual direction: warm storybook companion app, hand-drawn softness, gentle family habit-building.
Layout: top shows "今日任务" and a small pet companion illustration; main area is a simple grouped list of four daily tasks; each row shows task name, points, growth reward, and review state; bottom has a calm message explaining parent confirmation.
Style: illustrated but usable, readable Chinese typography, fewer decorative panels, clear states for not completed, waiting for parent, completed, and returned.
Palette: soft sky blue, leaf green, honey yellow, warm white, small coral accents.
Constraints: no pressure, no punishment, no sick pet, no social ranking, no classroom management, no device chrome.
Text should be short Chinese UI copy such as "阅读 15 分钟", "整理玩具", "我完成了", "等家长确认", "已完成".
```

### 方向 3：轻游戏幻兽基地

定位：适合更游戏化、更有收集动力的版本。

视觉特点：

- 宠物房像小型幻兽基地，有任务板、奖励柜、图鉴门。
- UI 更像轻游戏 HUD，但保持家庭应用清晰度。
- 图鉴和升级反馈更突出，能强化“逐步解锁”的期待。
- 色彩更鲜明：青绿、星黄、湖蓝、少量紫色。

适合原因：

- 对 7 到 10 岁孩子吸引力更强。
- 图鉴、升级、成就会更有期待。
- 后续扩展宠物、装饰、节日活动更顺。

风险：

- 过度游戏化会让任务和家长确认显得像阻碍。设计时要让家长审核像“守护确认”，不是打断。

生成提示词：

```text
Create a realistic production-quality mobile app UI mockup for a children's family pet reward app.
Target dimensions: 390 x 844.
Screen: creature dex and reward loop hub.
Visual direction: light game fantasy creature base for kids, playful but still a clear family utility app.
Layout: top shows current pet level, growth progress, and points; center shows a creature preview portal; lower half shows three large navigation areas for tasks, rewards, and creature dex; include small locked creature silhouettes as future unlock hints.
Style: polished mobile game-inspired UI, large touch targets, readable Chinese labels, purposeful spacing, not crowded.
Palette: fresh teal, star yellow, lake blue, warm white, small purple accents.
Constraints: one active main pet, no battle mechanics, no leaderboard, no online social features, no dark fantasy, no device chrome.
Text should be short Chinese UI copy such as "幻兽图鉴", "Lv.3", "下一只 Lv.4 解锁", "任务", "奖励".
```

## 5. 推荐选择

推荐优先选择方向 1：软萌盲盒宠物房。

原因：

- 已有资产可以继续使用，不需要重做第一批视觉素材。
- 它贴合“孩子打开 App 看到一只主宠物”的核心体验。
- 它比纯绘本更有互动欲望，又比轻游戏方向更温和。

方向 2 可作为低龄版本参考，方向 3 可保留给图鉴和成就系统增强。

## 6. 原型制作顺序

下一步建议制作一个可点击原型，范围如下：

```text
宠物房
-> 任务页
-> 提交任务
-> 家长 PIN
-> 任务审核通过
-> 回到宠物房看到成长和积分变化
-> 奖励商店
-> 申请兑换
-> 家长审核兑换
-> 积分记录
```

首个原型不建议一次做完整 10 只宠物图鉴。更合适的是先做：

- 当前宠物“团团”。
- 3 个已解锁或可预览宠物。
- 6 到 7 个未解锁轮廓。

这样能验证“选择宠物”和“逐步解锁”的吸引力，同时控制素材成本。

## 7. 设计验收重点

- 孩子是否能在 5 秒内理解今天要做什么。
- 宠物是否足够像一个伙伴，而不是页面装饰。
- 待家长确认状态是否清楚、温和。
- 奖励兑换是否让孩子知道“申请成功了”，但不会误以为已经获得奖励。
- 家长是否能在 30 秒内完成一次审核。
- 首页是否没有被任务、奖励、图鉴入口挤满。
