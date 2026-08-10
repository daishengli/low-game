# 树林漫步 — 战斗系统需求文档

> 版本：v1.0  日期：2026-08-08
> 在现有树林场景与人物控制基础上，新增动物生态与战斗系统。

---

## 1. 目标概述

在可自由探索的树林场景中引入战斗玩法：

- 场景中生成多种动物，各有不同的行为模式与数值属性。
- 玩家可装备武器，武器数值叠加到人物基础属性上。
- 鼠标左键发起攻击，前方扇形范围内的动物受到伤害。
- 动物可反击玩家，玩家有血量、防御等属性，存在死亡与重生。

---

## 2. 操作方式

沿用现有第三人称 + 鼠标指针锁定视角，新增战斗操作：

| 按键 | 行为 | 说明 |
|------|------|------|
| 鼠标左键 | 攻击 | 指针锁定状态下点击即攻击；攻击有冷却（攻速决定） |
| 鼠标移动 | 转动视角 | 不变 |
| ESC | 退出指针锁定 | 不变 |
| WASD / Space / Ctrl / Shift | 移动/跳跃/下蹲/加速 | 不变 |
| R | 切换/装备武器 | 循环切换背包中的武器（初期可只有1把） |

> **冲突处理**：指针锁定时左键用于攻击；退出锁定（ESC）后左键点击画布会重新请求锁定。攻击仅在锁定状态下生效，避免误触。

---

## 3. 人物属性系统

### 3.1 基础属性（裸装）

| 属性 | 说明 | 初始值 |
|------|------|--------|
| `maxHp` | 最大生命值 | 100 |
| `hp` | 当前生命值 | 100 |
| `attack` | 基础攻击力 | 10 |
| `defense` | 基础防御力 | 5 |
| `attackSpeed` | 攻击速度（次/秒） | 1.0 |
| `attackRange` | 攻击范围（米，扇形半径） | 2.5 |
| `attackArc` | 攻击扇形角度（度） | 120° |
| `moveSpeed` | 移动速度 | 沿用现有 WALK_SPEED 等 |

### 3.2 最终属性 = 基础属性 + 武器加成

```
finalAttack      = baseAttack      + weapon.attack
finalDefense     = baseDefense     + weapon.defense
finalAttackSpeed = baseAttackSpeed + weapon.attackSpeed   （有上限，如 4.0）
finalAttackRange = baseAttackRange + weapon.attackRange
finalAttackArc   = weapon.attackArc ?? baseAttackArc       （武器可覆盖扇形角度）
```

- 生命值不随武器变化。
- 攻速有硬上限 4.0 次/秒，防止数值溢出。
- 攻击冷却 = `1 / finalAttackSpeed` 秒。

### 3.3 受伤与死亡

- 受到动物攻击时：`实际伤害 = max(1, 敌方攻击力 - finalDefense * 0.5)`
  - 防御力提供减伤，但最低受 1 点伤害，避免完全免疫。
- `hp <= 0` 时玩家死亡：画面变暗，显示「你已倒下」，3 秒后在出生点重生，`hp` 恢复满，动物仇恨重置。

### 3.4 攻击流程

1. 按下左键，检查攻击冷却是否结束。
2. 播放攻击动画（挥武器）。
3. 在动画「命中帧」时刻，执行扇形范围判定：
   - 以人物位置为圆心，`finalAttackRange` 为半径。
   - 朝向为人物 `rotation.y`，扇形半角 = `finalAttackArc / 2`。
   - 计算每个动物相对玩家的方向角，若在扇形内且距离 ≤ 范围，则命中。
4. 命中的动物扣血、播放受击反馈（闪红 + 后退）、触发其行为状态变更。
5. 进入攻击冷却。

---

## 4. 武器系统

### 4.1 武器数据结构

```js
{
  id: 'wooden_sword',
  name: '木剑',
  attack: 8,
  defense: 0,
  attackSpeed: 0.5,
  attackRange: 0.8,
  attackArc: 100,
  modelType: 'sword', // sword | club | spear
  color: 0x8b5a2b,
}
```

### 4.2 初始武器列表

| ID | 名称 | 攻击 | 防御 | 攻速 | 范围 | 扇角 | 模型 |
|----|------|------|------|------|------|------|------|
| `fist` | 徒手 | +0 | +0 | +0 | +0 | 120° | — |
| `wooden_sword` | 木剑 | +8 | +0 | +0.5 | +0.8 | 180° | sword |
| `iron_sword` | 铁剑 | +18 | +2 | +0.3 | +1.0 | 180° | sword |
| `stone_club` | 石锤 | +25 | +3 | -0.2 | +0.5 | 210° | club |
| `wooden_spear` | 木矛 | +12 | +0 | +0.2 | +2.5 | 60° | spear |

### 4.3 装备与切换

- 玩家有一个武器背包（数组），按 `R` 循环切换当前装备。
- 切换有 0.3 秒的「换武器」冷却，期间不能攻击。
- 装备后人物右手持对应模型（简单几何体组合）。
- 徒手始终在背包第 0 位。

### 4.4 武器获取

- 场景中散落武器拾取物（发光的小箱子），走到附近自动拾取加入背包。

---

## 5. 动物系统

### 5.1 动物数据结构

```js
{
  type: 'wolf',
  name: '灰狼',
  maxHp: 60, hp: 60,
  attack: 12, defense: 2,
  attackRange: 2.0, attackCooldown: 1.2, detectRange: 15, moveSpeed: 4.5,
  behavior: 'aggressive', canAttackPlayer: true,
  scale: 1.0, color: 0x6b6b6b,
}
```

### 5.2 行为类型

- `aggressive` 主动追击型
- `passive` 被动反击型
- `flee` 逃跑型
- `neutral` 中立型

### 5.3 AI 状态机

```
IDLE / FLEE / CHASE / ATTACK / ALERT / DEAD
```

详见原文档。

### 5.4 动物种类与数值

| 类型 | 名称 | 血量 | 攻击 | 防御 | 攻击范围 | 攻击间隔 | 侦测范围 | 速度 | 行为 | 可攻击玩家 |
|------|------|------|------|------|----------|----------|----------|------|------|------------|
| `rabbit` | 兔子 | 15 | 3 | 0 | 1.0 | 1.5 | 8 | 5.0 | flee | 否 |
| `deer` | 鹿 | 40 | 5 | 1 | 1.5 | 1.5 | 12 | 4.0 | flee | 否 |
| `boar` | 野猪 | 70 | 14 | 4 | 1.8 | 1.2 | 10 | 4.0 | passive | 是 |
| `wolf` | 灰狼 | 60 | 12 | 2 | 2.0 | 1.2 | 15 | 4.5 | aggressive | 是 |
| `bear` | 熊 | 150 | 25 | 8 | 2.5 | 1.8 | 14 | 3.5 | aggressive | 是 |
| `fox` | 狐狸 | 30 | 8 | 1 | 1.5 | 1.0 | 10 | 4.5 | neutral | 是 |

### 5.5 动物模型

用基础几何体组合：
- 兔子：小白球身体 + 长耳朵
- 鹿：棕色长腿 + 鹿角
- 野猪：灰色矮胖体 + 獠牙
- 狼：灰色流线身体 + 尖耳
- 熊：大棕色球体
- 狐狸：橙色小体 + 蓬松尾巴

### 5.6 动物生成

- 总数约 30~40 只。
- 离出生点较近的区域放被动/逃跑型，远处放危险型。
- 击杀后过 60 秒在远离玩家位置重生。

---

## 6. 伤害结算公式

```
实际伤害 = max(1, 攻击力 - 防御力 * 0.5)
```

防御减伤系数 0.5，最低 1 点伤害。

---

## 7. UI 显示

- 玩家状态（左下角）：血量条 + 武器信息
- 动物状态：被攻击时头顶显示血量条
- 战斗反馈：命中闪红 + 飘字；玩家受伤屏幕红边闪；死亡画面
- 死亡画面：全屏变暗 + 3 秒倒计时后重生

---

## 8. 攻击判定

扇形判定：
```
to = target.position - player.position
dist = length(to.xz)
if dist > range: miss
angleTo = atan2(to.x, to.z)
diff = normalize(angleTo - player.rotation.y)
if abs(diff) <= arc/2: hit
```

---

## 9. 文件结构规划

```
src/game/
  forest.js              # 现有：场景搭建、人物控制、相机（保持不变）
  entities/
    weapons.js           # 武器数据 + 模型
    player.js            # PlayerCombat 战斗模块
    animal.js            # 动物模型 + AI
  combat.js              # 伤害结算 + 扇形判定 + 飘字
  ui.js                  # 战斗 UI 叠加层
  combat-integration.js  # 战斗系统与 forest.js 的桥接（hooks 注入）
```

---

## 10. 集成方案：Hooks 注入

为了不破坏已工作的森林场景（f1928a7），战斗系统通过 hooks 方式集成：

```js
createForestGame(container, {
  hooks: {
    onInit({ scene, camera, player, rightHand }) { ... },
    onUpdate(dt, ctx) { ... },      // 每帧调用
    onMouseDown(e, ctx) { ... },     // 鼠标按下
    onKeyDown(e, ctx) { ... },       // 键盘按下
    onResize() { ... },
    onDispose() { ... },
  }
})
```

forest.js 内部完全不变（除了：1. 接受 hooks 参数；2. 在关键点调用 hooks；3. return 增加 player/scene/camera 引用）。

---

## 11. 实现优先级

| 阶段 | 内容 | 验证点 |
|------|------|--------|
| P1 | forest.js 加 hooks 扩展点（最小改动） | 现有功能完全不变 |
| P2 | weapons.js + combat.js + ui.js 基础模块 | 可独立加载 |
| P3 | entities/player.js PlayerCombat | 切武器+属性正确 |
| P4 | 鼠标左键攻击 + 扇形判定 | 能挥砍 |
| P5 | entities/animal.js 动物生成 + IDLE | 场景里有动物走动 |
| P6 | 动物 AI 状态机 | 4 种行为正常 |
| P7 | 受伤/死亡/重生 | 完整循环 |
| P8 | 武器拾取物 | 完整循环 |