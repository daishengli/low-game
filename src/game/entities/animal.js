import * as THREE from 'three'
import { calcDamage } from '../combat.js'

/**
 * 动物系统：数据 + 模型 + AI 状态机 + 生成
 * 见 docs/combat-system.md §5
 */

// ---- 动物种类数据 ----
export const ANIMAL_TYPES = {
  rabbit: {
    type: 'rabbit', name: '兔子',
    maxHp: 15, attack: 3, defense: 0,
    attackRange: 1.0, attackCooldown: 1.5, detectRange: 8,
    moveSpeed: 5.0, behavior: 'flee', canAttackPlayer: false,
    scale: 0.6, color: 0xeeeeee,
  },
  deer: {
    type: 'deer', name: '鹿',
    maxHp: 40, attack: 5, defense: 1,
    attackRange: 1.5, attackCooldown: 1.5, detectRange: 12,
    moveSpeed: 4.0, behavior: 'flee', canAttackPlayer: false,
    scale: 1.0, color: 0x8b6b3a,
  },
  boar: {
    type: 'boar', name: '野猪',
    maxHp: 70, attack: 14, defense: 4,
    attackRange: 1.8, attackCooldown: 1.2, detectRange: 10,
    moveSpeed: 4.0, behavior: 'passive', canAttackPlayer: true,
    scale: 1.0, color: 0x5a4a3a,
  },
  wolf: {
    type: 'wolf', name: '灰狼',
    maxHp: 60, attack: 12, defense: 2,
    attackRange: 2.0, attackCooldown: 1.2, detectRange: 15,
    moveSpeed: 4.5, behavior: 'aggressive', canAttackPlayer: true,
    scale: 1.0, color: 0x6b6b6b,
  },
  bear: {
    type: 'bear', name: '熊',
    maxHp: 150, attack: 25, defense: 8,
    attackRange: 2.5, attackCooldown: 1.8, detectRange: 14,
    moveSpeed: 3.5, behavior: 'aggressive', canAttackPlayer: true,
    scale: 1.4, color: 0x6b4a2a,
  },
  fox: {
    type: 'fox', name: '狐狸',
    maxHp: 30, attack: 8, defense: 1,
    attackRange: 1.5, attackCooldown: 1.0, detectRange: 10,
    moveSpeed: 4.5, behavior: 'neutral', canAttackPlayer: true,
    scale: 0.8, color: 0xd4742a,
  },
}

// ---- 动物模型构建 ----

function makeLimb(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}

function createAnimalModel(typeId) {
  const data = ANIMAL_TYPES[typeId]
  if (!data) return null

  const g = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8 })
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })

  switch (typeId) {
    case 'rabbit': {
      // 小白球身体 + 长耳朵
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), bodyMat)
      body.position.y = 0.35
      body.castShadow = true
      g.add(body)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bodyMat)
      head.position.set(0, 0.5, 0.18)
      head.castShadow = true
      g.add(head)
      // 耳朵
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), bodyMat)
        ear.position.set(sx * 0.06, 0.7, 0.15)
        ear.castShadow = true
        g.add(ear)
      }
      // 眼睛
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), darkMat)
        eye.position.set(sx * 0.08, 0.52, 0.33)
        g.add(eye)
      }
      break
    }
    case 'deer': {
      // 棕色长腿 + 鹿角
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.7), bodyMat)
      body.position.y = 0.8
      body.castShadow = true
      g.add(body)
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.4, 8), bodyMat)
      neck.position.set(0, 1.1, 0.3)
      neck.rotation.x = -0.4
      neck.castShadow = true
      g.add(neck)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.3), bodyMat)
      head.position.set(0, 1.25, 0.5)
      head.castShadow = true
      g.add(head)
      // 鹿角
      const antlerMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.9 })
      for (const sx of [-1, 1]) {
        const antler = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.3, 4), antlerMat)
        antler.position.set(sx * 0.08, 1.45, 0.45)
        antler.rotation.z = sx * 0.3
        g.add(antler)
      }
      // 四条长腿
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          g.add(makeLimb(0.08, 0.6, 0.08, bodyMat, sx * 0.13, 0.3, sz * 0.25))
        }
      }
      break
    }
    case 'boar': {
      // 灰色矮胖体 + 獠牙
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.8), bodyMat)
      body.position.y = 0.5
      body.castShadow = true
      g.add(body)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), bodyMat)
      head.position.set(0, 0.5, 0.5)
      head.castShadow = true
      g.add(head)
      // 鼻子
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.15), bodyMat)
      snout.position.set(0, 0.42, 0.7)
      g.add(snout)
      // 獠牙
      const tuskMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 })
      for (const sx of [-1, 1]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), tuskMat)
        tusk.position.set(sx * 0.08, 0.38, 0.72)
        tusk.rotation.x = Math.PI
        g.add(tusk)
      }
      // 短腿
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          g.add(makeLimb(0.12, 0.3, 0.12, bodyMat, sx * 0.16, 0.15, sz * 0.3))
        }
      }
      break
    }
    case 'wolf': {
      // 灰色流线身体 + 尖耳
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.9), bodyMat)
      body.position.y = 0.65
      body.castShadow = true
      g.add(body)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.35), bodyMat)
      head.position.set(0, 0.7, 0.55)
      head.castShadow = true
      g.add(head)
      // 尖耳
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), bodyMat)
        ear.position.set(sx * 0.1, 0.9, 0.5)
        g.add(ear)
      }
      // 眼睛
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x442200 })
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat)
        eye.position.set(sx * 0.08, 0.72, 0.7)
        g.add(eye)
      }
      // 尾巴
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.4, 6), bodyMat)
      tail.position.set(0, 0.65, -0.5)
      tail.rotation.x = 0.6
      g.add(tail)
      // 四条腿
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          g.add(makeLimb(0.1, 0.45, 0.1, bodyMat, sx * 0.13, 0.22, sz * 0.3))
        }
      }
      break
    }
    case 'bear': {
      // 大棕色球体
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), bodyMat)
      body.position.y = 0.75
      body.scale.set(1, 0.85, 1.3)
      body.castShadow = true
      g.add(body)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), bodyMat)
      head.position.set(0, 1.0, 0.6)
      head.castShadow = true
      g.add(head)
      // 耳朵
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), bodyMat)
        ear.position.set(sx * 0.18, 1.25, 0.55)
        g.add(ear)
      }
      // 眼睛
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), darkMat)
        eye.position.set(sx * 0.12, 1.05, 0.88)
        g.add(eye)
      }
      // 粗腿
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          g.add(makeLimb(0.18, 0.4, 0.18, bodyMat, sx * 0.22, 0.2, sz * 0.35))
        }
      }
      break
    }
    case 'fox': {
      // 橙色小体 + 蓬松尾巴
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.6), bodyMat)
      body.position.y = 0.45
      body.castShadow = true
      g.add(body)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.25), bodyMat)
      head.position.set(0, 0.5, 0.38)
      head.castShadow = true
      g.add(head)
      // 尖嘴
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 4), bodyMat)
      snout.position.set(0, 0.45, 0.55)
      snout.rotation.x = Math.PI / 2
      g.add(snout)
      // 尖耳
      for (const sx of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 4), bodyMat)
        ear.position.set(sx * 0.07, 0.65, 0.35)
        g.add(ear)
      }
      // 蓬松尾巴
      const tailMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 })
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), tailMat)
      tail.position.set(0, 0.45, -0.38)
      tail.scale.set(0.7, 0.7, 1.5)
      g.add(tail)
      // 腿
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          g.add(makeLimb(0.07, 0.3, 0.07, bodyMat, sx * 0.09, 0.15, sz * 0.2))
        }
      }
      break
    }
  }

  g.scale.setScalar(data.scale)
  return g
}

// ---- 动物类 ----

const STATE = {
  IDLE: 'IDLE',
  ALERT: 'ALERT',
  CHASE: 'CHASE',
  ATTACK: 'ATTACK',
  FLEE: 'FLEE',
  DEAD: 'DEAD',
}

export class Animal {
  constructor(typeId, scene, spawnPos) {
    this.data = { ...ANIMAL_TYPES[typeId] }
    this.typeId = typeId
    this.scene = scene

    // 数值
    this.maxHp = this.data.maxHp
    this.hp = this.data.maxHp
    this.attack = this.data.attack
    this.defense = this.data.defense
    this.dead = false

    // 模型
    this.group = createAnimalModel(typeId)
    this.group.position.set(spawnPos.x, 0, spawnPos.z)
    scene.add(this.group)

    // 保存材质引用（用于受击闪红）
    this._materials = []
    this._originalColors = []
    this.group.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        this._materials.push(obj.material)
        this._originalColors.push(obj.material.color.getHex())
      }
    })

    // AI 状态
    this.state = STATE.IDLE
    this.alertTimer = 0
    this.attackTimer = 0
    this.hitFlash = 0
    this.provoked = false // 被玩家攻击后激怒

    // 漫游
    this._wanderTarget = null
    this._wanderWait = 0

    // 动画
    this._walkPhase = 0
    this._attackAnim = 0

    // 重生
    this.respawnTimer = 0
    this.respawnDelay = 60
    this._spawnPos = { ...spawnPos }

    // 击退
    this._knockback = new THREE.Vector3()
  }

  get position() {
    return this.group.position
  }

  // ---- 受伤 ----
  takeDamage(amount, fromPos) {
    if (this.dead) return
    this.hp -= amount
    this.hitFlash = 0.25
    this.provoked = true

    // 击退
    if (fromPos) {
      const dx = this.group.position.x - fromPos.x
      const dz = this.group.position.z - fromPos.z
      const dist = Math.hypot(dx, dz) || 1
      this._knockback.set((dx / dist) * 3, 0, (dz / dist) * 3)
    }

    // 被动/中立型动物被攻击后转为攻击性
    if (this.data.behavior === 'passive' || this.data.behavior === 'neutral') {
      if (this.state === STATE.IDLE || this.state === STATE.FLEE) {
        this.state = STATE.ALERT
        this.alertTimer = 0.3
      }
    }

    if (this.hp <= 0) {
      this.hp = 0
      this.die()
    }
  }

  die() {
    this.dead = true
    this.state = STATE.DEAD
    this.respawnTimer = this.respawnDelay
    // 倒地效果
    this.group.rotation.x = -Math.PI / 2
    this.group.position.y = 0.3
  }

  respawn() {
    this.dead = false
    this.hp = this.maxHp
    this.state = STATE.IDLE
    this.provoked = false
    this.hitFlash = 0
    this.group.rotation.x = 0
    this.group.position.y = 0
    this.group.scale.setScalar(this.data.scale)
    // 远离玩家的位置重生
    const angle = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * 50
    this.group.position.x = Math.cos(angle) * dist
    this.group.position.z = Math.sin(angle) * dist
    this._spawnPos = { x: this.group.position.x, z: this.group.position.z }
  }

  resetAggro() {
    if (this.dead) return
    this.state = STATE.IDLE
    this.provoked = false
    this.alertTimer = 0
  }

  // ---- AI 更新 ----
  update(dt, player, playerCombat) {
    if (this.dead) {
      this.respawnTimer -= dt
      if (this.respawnTimer <= 0) {
        this.respawn()
      }
      return
    }

    // 击退衰减
    if (this._knockback.lengthSq() > 0.01) {
      this.group.position.x += this._knockback.x * dt
      this.group.position.z += this._knockback.z * dt
      this._knockback.multiplyScalar(1 - Math.min(1, dt * 8))
    } else {
      this._knockback.set(0, 0, 0)
    }

    // 受击闪红
    if (this.hitFlash > 0) {
      this.hitFlash -= dt
      const flashRatio = Math.max(0, this.hitFlash / 0.25)
      for (let i = 0; i < this._materials.length; i++) {
        const orig = this._originalColors[i]
        this._materials[i].color.setHex(orig)
        this._materials[i].color.lerp(new THREE.Color(0xff0000), flashRatio * 0.7)
      }
    }

    // 攻击冷却
    if (this.attackTimer > 0) this.attackTimer -= dt

    // 距离玩家
    const dx = player.position.x - this.group.position.x
    const dz = player.position.z - this.group.position.z
    const distToPlayer = Math.hypot(dx, dz)

    // 状态机
    switch (this.state) {
      case STATE.IDLE:
        this._updateIdle(dt)
        if (this._shouldDetect(distToPlayer)) {
          this.state = STATE.ALERT
          this.alertTimer = 0.4 + Math.random() * 0.4
        }
        break

      case STATE.ALERT:
        this.alertTimer -= dt
        this._faceTowards(player.position, dt)
        if (this.alertTimer <= 0) {
          if (this.data.behavior === 'flee') {
            this.state = STATE.FLEE
          } else if (this.data.behavior === 'passive' && !this.provoked) {
            // 未被激怒的被动动物逃离
            this.state = STATE.FLEE
          } else if (this.data.canAttackPlayer) {
            this.state = STATE.CHASE
          } else {
            this.state = STATE.FLEE
          }
        }
        break

      case STATE.CHASE:
        if (distToPlayer <= this.data.attackRange) {
          this.state = STATE.ATTACK
        } else if (distToPlayer > this.data.detectRange * 1.5) {
          this.state = STATE.IDLE
        } else {
          this._moveTowards(player.position, this.data.moveSpeed * dt)
          this._faceTowards(player.position, dt)
        }
        break

      case STATE.ATTACK:
        if (distToPlayer > this.data.attackRange * 1.3) {
          this.state = STATE.CHASE
        } else {
          this._faceTowards(player.position, dt)
          if (this.attackTimer <= 0) {
            this.attackTimer = this.data.attackCooldown
            this._attackAnim = 0.3
            // 造成伤害
            const damage = calcDamage(this.data.attack, playerCombat.finalDefense)
            playerCombat.takeDamage(damage, this)
          }
        }
        break

      case STATE.FLEE:
        if (distToPlayer > this.data.detectRange * 2) {
          this.state = STATE.IDLE
        } else {
          // 远离玩家方向逃跑
          const awayX = -dx / (distToPlayer || 1)
          const awayZ = -dz / (distToPlayer || 1)
          this._moveTowards(
            {
              x: this.group.position.x + awayX * 10,
              z: this.group.position.z + awayZ * 10,
            },
            this.data.moveSpeed * dt,
          )
          this.group.rotation.y = Math.atan2(awayX, awayZ)
        }
        break
    }

    // 模型动画
    this._updateModel(dt)

    // 世界边界约束
    const bound = 190
    this.group.position.x = Math.max(-bound, Math.min(bound, this.group.position.x))
    this.group.position.z = Math.max(-bound, Math.min(bound, this.group.position.z))
  }

  _shouldDetect(distToPlayer) {
    if (this.data.behavior === 'aggressive') {
      return distToPlayer <= this.data.detectRange
    }
    if (this.data.behavior === 'flee') {
      return distToPlayer <= this.data.detectRange
    }
    if (this.data.behavior === 'passive') {
      if (this.provoked) return distToPlayer <= this.data.detectRange * 1.5
      return distToPlayer <= this.data.attackRange * 1.2
    }
    if (this.data.behavior === 'neutral') {
      if (this.provoked) return distToPlayer <= this.data.detectRange
      return distToPlayer <= this.data.attackRange * 1.0
    }
    return false
  }

  _updateIdle(dt) {
    if (this._wanderWait > 0) {
      this._wanderWait -= dt
      return
    }
    if (!this._wanderTarget) {
      this._wanderTarget = {
        x: this._spawnPos.x + (Math.random() - 0.5) * 10,
        z: this._spawnPos.z + (Math.random() - 0.5) * 10,
      }
    }
    const arrived = this._moveTowards(this._wanderTarget, this.data.moveSpeed * 0.3 * dt)
    if (arrived) {
      this._wanderTarget = null
      this._wanderWait = 1 + Math.random() * 3
    }
  }

  _moveTowards(target, speed) {
    const dx = target.x - this.group.position.x
    const dz = target.z - this.group.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.2) return true
    const step = Math.min(speed, dist)
    this.group.position.x += (dx / dist) * step
    this.group.position.z += (dz / dist) * step
    this._walkPhase += step * 3
    return false
  }

  _faceTowards(target, dt) {
    const dx = target.x - this.group.position.x
    const dz = target.z - this.group.position.z
    if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01) return
    const targetYaw = Math.atan2(dx, dz)
    let diff = targetYaw - this.group.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this.group.rotation.y += diff * Math.min(1, dt * 9)
  }

  _updateModel(dt) {
    // 行走时的上下颠簸
    const moving = this.state === STATE.CHASE || this.state === STATE.FLEE ||
      (this.state === STATE.IDLE && this._wanderTarget)
    if (moving) {
      const bob = Math.sin(this._walkPhase) * 0.05
      this.group.position.y = bob
    }

    // 攻击动画（前扑）
    if (this._attackAnim > 0) {
      this._attackAnim -= dt
      const t = 1 - this._attackAnim / 0.3
      const lunge = Math.sin(t * Math.PI) * 0.3
      // 沿朝向方向前扑
      const fx = Math.sin(this.group.rotation.y) * lunge
      const fz = Math.cos(this.group.rotation.y) * lunge
      // 这里不直接改 position（会被 AI 移动覆盖），用 scale 做视觉提示
      this.group.scale.y = this.data.scale * (1 + Math.sin(t * Math.PI) * 0.1)
    } else {
      this.group.scale.y += (this.data.scale - this.group.scale.y) * Math.min(1, dt * 8)
    }
  }

  dispose(scene) {
    scene.remove(this.group)
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose?.())
      }
    })
  }
}

// ---- 动物生成 ----

/**
 * 在场景中生成动物
 * 近处放被动/逃跑型，远处放危险型
 */
export function spawnAnimals(scene, total = 35) {
  const animals = []

  // 近处（距出生点 < 30）：兔子、鹿、狐狸
  const nearTypes = ['rabbit', 'deer', 'fox']
  const nearCounts = { rabbit: 8, deer: 5, fox: 3 }

  // 远处（距出生点 > 30）：野猪、狼、熊
  const farTypes = ['boar', 'wolf', 'bear']
  const farCounts = { boar: 6, wolf: 8, bear: 5 }

  for (const type of nearTypes) {
    for (let i = 0; i < nearCounts[type]; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 8 + Math.random() * 22
      const pos = { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist }
      animals.push(new Animal(type, scene, pos))
    }
  }

  for (const type of farTypes) {
    for (let i = 0; i < farCounts[type]; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 30 + Math.random() * 50
      const pos = { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist }
      animals.push(new Animal(type, scene, pos))
    }
  }

  return animals
}
