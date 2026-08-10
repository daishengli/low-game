import { PlayerCombat } from './entities/player.js'
import { spawnAnimals } from './entities/animal.js'
import { WEAPON_MAP, createWeaponModel, createWeaponPickup } from './entities/weapons.js'
import { CombatUI } from './ui.js'

/**
 * 战斗系统与 forest.js 的桥接层
 * 见 docs/combat-system.md §10
 *
 * 通过 hooks 注入方式集成战斗系统，不破坏已有森林场景逻辑。
 */
export function createCombatHooks() {
  let playerCombat
  let animals = []
  let ui
  let scene, camera, player, rightHand, armR
  let weaponPickups = []

  // ---- 初始化 ----
  function onInit(ctx) {
    scene = ctx.scene
    camera = ctx.camera
    player = ctx.player
    rightHand = ctx.rightHand
    armR = ctx.armR

    // 玩家战斗模块
    playerCombat = new PlayerCombat(player)

    // 回调绑定
    playerCombat.onEquip = (weapon) => {
      updateWeaponModel(weapon)
    }

    playerCombat.onTakeDamage = () => {
      ui.showDamageVignette()
    }

    playerCombat.onDie = () => {
      ui.showDeathScreen()
    }

    playerCombat.onRespawn = () => {
      ui.hideDeathScreen()
      // 重置所有动物仇恨
      for (const animal of animals) {
        animal.resetAggro()
      }
    }

    // UI
    ui = new CombatUI(ctx.container, camera)

    // 动物生成
    animals = spawnAnimals(scene, 35)

    // 武器拾取物
    createWeaponPickups()

    // 初始装备武器模型
    updateWeaponModel(playerCombat.currentWeapon)
  }

  // ---- 武器拾取物 ----
  function createWeaponPickups() {
    const pickupWeapons = [
      { id: 'wooden_sword', x: 12, z: 8 },
      { id: 'wooden_spear', x: -15, z: 12 },
      { id: 'iron_sword', x: 35, z: -30 },
      { id: 'stone_club', x: -40, z: -35 },
    ]

    for (const pw of pickupWeapons) {
      const weapon = WEAPON_MAP[pw.id]
      if (!weapon) continue
      const group = createWeaponPickup(weapon)
      group.position.set(pw.x, 0.5, pw.z)
      scene.add(group)
      weaponPickups.push({
        group,
        weaponId: pw.id,
        position: { x: pw.x, z: pw.z },
        baseY: 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  // ---- 更新武器模型 ----
  function updateWeaponModel(weapon) {
    // 移除旧模型
    while (rightHand.children.length > 0) {
      const child = rightHand.children[0]
      rightHand.remove(child)
      child.traverse?.((obj) => {
        if (obj.geometry) obj.geometry.dispose?.()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => m.dispose?.())
        }
      })
    }
    // 挂载新模型
    if (weapon.modelType) {
      const model = createWeaponModel(weapon)
      if (model) rightHand.add(model)
    }
  }

  // ---- 每帧更新 ----
  function onUpdate(dt, ctx) {
    // 玩家战斗更新（攻击动画、冷却、死亡/重生）
    playerCombat.update(dt, {
      armR,
      animals,
      onHitAnimal: (animal, damage) => {
        // 飘字
        const pos = {
          x: animal.position.x,
          y: 1.5 * animal.data.scale + 0.5,
          z: animal.position.z,
        }
        ui.showFloatingText(pos, `-${damage}`, 'damage')
      },
    })

    // 动物 AI 更新
    for (const animal of animals) {
      animal.update(dt, player, playerCombat)
    }

    // 武器拾取物
    for (let i = weaponPickups.length - 1; i >= 0; i--) {
      const pickup = weaponPickups[i]
      // 浮动动画
      pickup.phase += dt * 2
      pickup.group.position.y = pickup.baseY + Math.sin(pickup.phase) * 0.2
      pickup.group.rotation.y += dt * 1.5

      // 拾取检测
      const dist = Math.hypot(
        player.position.x - pickup.position.x,
        player.position.z - pickup.position.z,
      )
      if (dist < 2.0 && !playerCombat.hasWeapon(pickup.weaponId)) {
        playerCombat.addWeapon(pickup.weaponId)
        // 显示拾取提示
        ui.showFloatingText(
          { x: pickup.position.x, y: 2, z: pickup.position.z },
          `获得 ${WEAPON_MAP[pickup.weaponId].name}!`,
          'damage',
        )
        // 移除拾取物
        scene.remove(pickup.group)
        pickup.group.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose?.()
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            mats.forEach((m) => m.dispose?.())
          }
        })
        weaponPickups.splice(i, 1)
      }
    }

    // UI 更新
    ui.update(dt, playerCombat, animals, player)
  }

  // ---- 鼠标按下：攻击 ----
  function onMouseDown(e, ctx) {
    if (e.button !== 0) return false
    if (!ctx.pointerLocked) return false
    // 死亡时不攻击但消耗事件
    if (playerCombat.isDead) return true
    playerCombat.tryAttack(animals)
    return true // 阻止 forest.js 的拖拽行为
  }

  // ---- 键盘按下：切换武器 ----
  function onKeyDown(e) {
    if (e.code === 'KeyR') {
      playerCombat.switchWeapon()
    }
  }

  // ---- 窗口大小变化 ----
  function onResize() {
    ui?.onResize()
  }

  // ---- 清理 ----
  function onDispose() {
    ui?.dispose()
    for (const animal of animals) {
      animal.dispose?.(scene)
    }
    for (const pickup of weaponPickups) {
      scene?.remove(pickup.group)
    }
    animals = []
    weaponPickups = []
  }

  return { onInit, onUpdate, onMouseDown, onKeyDown, onResize, onDispose }
}
