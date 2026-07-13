# Family Pets H5/PWA

家庭幻兽奖励是一款面向手机浏览器的本地优先家庭任务与奖励应用。项目根目录就是完整的 Vue 3 + TypeScript + Vite + Pinia + IndexedDB PWA 工程。

核心功能包括：

- 孩子提交任务，家长通过 PIN 审核并发放积分与成长值。
- 奖励申请、积分冻结、家长确认和实际兑现。
- 5 只宠物的等级解锁、图鉴切换、四种表情状态和刷新持久化。
- 本地 JSON 备份与恢复、任务和奖励管理、积分流水及轻量周报。
- Service Worker 离线缓存应用壳、宠物图片和房间背景。

## 本地开发

```powershell
$ErrorActionPreference = 'Stop'
npm install
npm run dev
```

默认家长 PIN：`2580`。

## 质量检查

```powershell
$ErrorActionPreference = 'Stop'
npm run type-check
npm run test
npm run test:e2e
npm run build
```

产品路线见 [docs/h5-product-roadmap.md](docs/h5-product-roadmap.md)，界面截图见 [docs/screenshots](docs/screenshots)。
