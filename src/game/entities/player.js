import { WEAPONS, WEAPON_MAP } from './weapons.js'
import { calcDamage, sectorHit } from '../combat.js'

/**
 * 玩家战斗模块
 * 见 docs/combat-system.md §3
 *
 * 管理玩家属性、武器装备、攻击流程、受伤与死亡重生。
 * 通过回调通知外部（UI、动物仇恨重置等）。
 */
export class PlayerCombat {
  constructor(player) {
    this.player = player

    // ---- 基础属性（裸装）----
    this.maxHp = 100
    this.hp = 100
    this.baseAttack = 10
    this.baseDefense = 5
    this.baseAttackSpeed = 1.0
    this.baseAttackRange = 2.5
    this.baseAttackArc = 120

    // ---- 武器背包 ----
    this.weapons = [WEAPONS[0]] // 徒手始终在第 0 位
    this.currentWeaponIndex = 0

    // ---- 冷却 ----
    this.attackCooldown = 0
    this.switchCooldown = 0

    // ---- 攻击动画状态 ----
    this.isAttacking = false
    this.attackTimer = 0
    this.attackDuration = 0.4 // 单次挥砍动画时长
    this.hitFrameTime = 0.22 // 命中帧时刻
    this.hasHit = false
    this._hitTargets = null

    // ---- 死亡/重生 ----
    this.isDead = false
    this.deathTimer = 0
    this.respawnTime = 3

    // 出生点（世界中心）
    this.spawnPoint = { x: 0, z: 0 }

    // ---- 回调 ----
    this.onEquip = null // (weapon) => void
    this.onTakeDamage = null // (amount, source) => void
    this.onDie = null // () => void
    this.onRespawn = null // () => void
    this.onAttackHit = null // (hits) => void
    this.onAttackStart = null // () => void
  }

  // ---- 最终属性 = 基础 + 武器加成 ----
  get currentWeapon() {
    return this.weapons[this.currentWeaponIndex]
  }

  get finalAttack() {
    return this.baseAttack + (this.currentWeapon?.attack || 0)
  }

  get finalDefense() {
    return this.baseDefense + (this.currentWeapon?.defense || 0)
  }

  get finalAttackSpeed() {
    return Math.min(4.0, this.baseAttackSpeed + (this.currentWeapon?.attackSpeed || 0))
  }

  get finalAttackRange() {
    return this.baseAttackRange + (this.currentWeapon?.attackRange || 0)
  }

  get finalAttackArc() {
    return this.currentWeapon?.attackArc ?? this.baseAttackArc
  }

  // ---- 武器管理 ----
  hasWeapon(id) {
    return this.weapons.some((w) => w.id === id)
  }

  addWeapon(id) {
    const weapon = WEAPON_MAP[id]
    if (weapon && !this.hasWeapon(id)) {
      this.weapons.push(weapon)
      return true
    }
    return false
  }

  switchWeapon() {
    if (this.switchCooldown > 0 || this.isDead || this.isAttacking) return
    this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length
    this.switchCooldown = 0.3
    this.onEquip?.(this.currentWeapon)
  }

  // ---- 攻击 ----
  tryAttack(animals) {
    if (this.attackCooldown > 0 || this.isAttacking || this.switchCooldown > 0 || this.isDead) {
      return false
    }
    this.isAttacking = true
    this.attackTimer = 0
    this.hasHit = false
    this._hitTargets = animals
    this.onAttackStart?.()
    return true
  }

  // ---- 受伤 ----
  takeDamage(amount, source) {
    if (this.isDead) return
    this.hp -= amount
    this.onTakeDamage?.(amount, source)
    if (this.hp <= 0) {
      this.hp = 0
      this.die()
    }
  }

  die() {
    this.isDead = true
    this.deathTimer = 0
    this.isAttacking = false
    this.onDie?.()
  }

  respawn() {
    this.hp = this.maxHp
    this.isDead = false
    this.deathTimer = 0
    this.attackCooldown = 0
    this.switchCooldown = 0
    // 传送回出生点
    this.player.position.x = this.spawnPoint.x
    this.player.position.z = this.spawnPoint.z
    this.onRespawn?.()
  }

  // ---- 每帧更新 ----
  update(dt, ctx) {
    // 冷却递减
    if (this.attackCooldown > 0) this.attackCooldown -= dt
    if (this.switchCooldown > 0) this.switchCooldown -= dt

    // 死亡/重生
    if (this.isDead) {
      this.deathTimer += dt
      // 冻结玩家位置（forest.js 每帧移动后 onUpdate 覆写）
      this.player.position.x = this.spawnPoint.x
      this.player.position.z = this.spawnPoint.z
      if (this.deathTimer >= this.respawnTime) {
        this.respawn()
      }
      return
    }

    // 攻击动画
    if (this.isAttacking) {
      this.attackTimer += dt
      const t = this.attackTimer / this.attackDuration

      // 手臂挥砍动画：蓄力 → 挥击 → 回收
      if (ctx.armR) {
        let rot
        if (t < 0.3) {
          // 蓄力：手臂后摆 0 → 0.9
          rot = (t / 0.3) * 0.9
        } else if (t < 0.6) {
          // 挥击：0.9 → -1.3（向前下方劈砍）
          rot = 0.9 - ((t - 0.3) / 0.3) * 2.2
        } else {
          // 回收：-1.3 → 0
          rot = -1.3 + ((t - 0.6) / 0.4) * 1.3
        }
        ctx.armR.rotation.x = rot
      }

      // 命中帧：执行扇形判定
      if (!this.hasHit && this.attackTimer >= this.hitFrameTime) {
        this.hasHit = true
        this._executeHit(ctx)
      }

      // 攻击结束
      if (t >= 1) {
        this.isAttacking = false
        this.attackCooldown = 1 / this.finalAttackSpeed
      }
    }
  }

  _executeHit(ctx) {
    const hits = sectorHit(
      this.player.position,
      this.player.rotation.y,
      this.finalAttackRange,
      this.finalAttackArc,
      this._hitTargets || [],
    )

    for (const animal of hits) {
      const damage = calcDamage(this.finalAttack, animal.defense)
      animal.takeDamage(damage, this.player.position)
      ctx.onHitAnimal?.(animal, damage)
    }

    this.onAttackHit?.(hits)
  }
}
