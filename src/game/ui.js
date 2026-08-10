import { project3DTo2D } from './combat.js'

/**
 * 战斗 UI 叠加层
 * 见 docs/combat-system.md §7
 *
 * 管理：
 * - 玩家血量条 + 武器信息（左下角）
 * - 动物头顶血量条（被攻击时显示）
 * - 飘字伤害数字
 * - 玩家受伤红边闪烁
 * - 死亡画面
 */
export class CombatUI {
  constructor(container, camera) {
    this.container = container
    this.camera = camera
    this.width = container.clientWidth
    this.height = container.clientHeight

    // ---- 创建 UI 根容器 ----
    this.root = document.createElement('div')
    this.root.className = 'combat-ui'
    Object.assign(this.root.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '10',
      fontFamily: 'system-ui, sans-serif',
    })
    container.appendChild(this.root)

    this._createPlayerStatus()
    this._createDeathScreen()
    this._createDamageVignette()
    this._createFloatingLayer()

    // 飘字列表
    this._floats = []
    // 动物血量条映射
    this._animalBars = new Map()

    this._vignetteAlpha = 0
  }

  // ---- 玩家状态（左下角）----
  _createPlayerStatus() {
    this.playerStatus = document.createElement('div')
    Object.assign(this.playerStatus.style, {
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      color: '#fff',
      fontSize: '14px',
      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
      minWidth: '220px',
    })
    this.root.appendChild(this.playerStatus)

    // HP 条
    this.hpBarContainer = document.createElement('div')
    Object.assign(this.hpBarContainer.style, {
      width: '200px',
      height: '18px',
      background: 'rgba(0,0,0,0.5)',
      borderRadius: '4px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.3)',
    })
    this.playerStatus.appendChild(this.hpBarContainer)

    this.hpBarFill = document.createElement('div')
    Object.assign(this.hpBarFill.style, {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(to right, #c0392b, #e74c3c)',
      transition: 'width 0.2s ease',
    })
    this.hpBarContainer.appendChild(this.hpBarFill)

    this.hpText = document.createElement('div')
    Object.assign(this.hpText.style, {
      marginTop: '2px',
      fontSize: '13px',
    })
    this.playerStatus.appendChild(this.hpText)

    // 武器信息
    this.weaponInfo = document.createElement('div')
    Object.assign(this.weaponInfo.style, {
      marginTop: '6px',
      fontSize: '13px',
      opacity: '0.9',
    })
    this.playerStatus.appendChild(this.weaponInfo)

    // 背包提示
    this.inventoryInfo = document.createElement('div')
    Object.assign(this.inventoryInfo.style, {
      marginTop: '2px',
      fontSize: '11px',
      opacity: '0.6',
    })
    this.playerStatus.appendChild(this.inventoryInfo)
  }

  // ---- 死亡画面 ----
  _createDeathScreen() {
    this.deathScreen = document.createElement('div')
    Object.assign(this.deathScreen.style, {
      position: 'absolute',
      inset: '0',
      background: 'rgba(0,0,0,0.7)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      color: '#fff',
      fontSize: '28px',
      fontWeight: 'bold',
      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
    })
    this.root.appendChild(this.deathScreen)

    this.deathTitle = document.createElement('div')
    this.deathTitle.textContent = '你已倒下'
    this.deathScreen.appendChild(this.deathTitle)

    this.deathCountdown = document.createElement('div')
    Object.assign(this.deathCountdown.style, {
      marginTop: '16px',
      fontSize: '20px',
      opacity: '0.8',
      fontWeight: 'normal',
    })
    this.deathScreen.appendChild(this.deathCountdown)
  }

  // ---- 受伤红边 ----
  _createDamageVignette() {
    this.vignette = document.createElement('div')
    Object.assign(this.vignette.style, {
      position: 'absolute',
      inset: '0',
      boxShadow: 'inset 0 0 100px 30px rgba(255,0,0,0)',
      transition: 'box-shadow 0.05s',
      pointerEvents: 'none',
    })
    this.root.appendChild(this.vignette)
  }

  // ---- 飘字 & 动物血量条层 ----
  _createFloatingLayer() {
    this.floatLayer = document.createElement('div')
    Object.assign(this.floatLayer.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
    })
    this.root.appendChild(this.floatLayer)
  }

  // ---- 公共方法 ----

  showDamageVignette() {
    this._vignetteAlpha = 1
  }

  showFloatingText(worldPos, text, type = 'damage') {
    const el = document.createElement('div')
    const color = type === 'damage' ? '#ffdd44' : '#ff4444'
    Object.assign(el.style, {
      position: 'absolute',
      color,
      fontSize: type === 'damage' ? '18px' : '22px',
      fontWeight: 'bold',
      textShadow: '0 2px 4px rgba(0,0,0,0.9)',
      pointerEvents: 'none',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 0.1s',
    })
    el.textContent = text
    this.floatLayer.appendChild(el)

    this._floats.push({
      el,
      worldPos: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      offsetY: 0,
      life: 0,
      maxLife: 1.2,
    })
  }

  showDeathScreen() {
    this.deathScreen.style.display = 'flex'
  }

  hideDeathScreen() {
    this.deathScreen.style.display = 'none'
  }

  updateDeathCountdown(seconds) {
    this.deathCountdown.textContent = `${seconds.toFixed(1)} 秒后重生...`
  }

  // ---- 每帧更新 ----
  update(dt, playerCombat, animals, player) {
    this.width = this.container.clientWidth
    this.height = this.container.clientHeight

    // ---- 玩家状态 ----
    const hpRatio = Math.max(0, playerCombat.hp / playerCombat.maxHp)
    this.hpBarFill.style.width = `${hpRatio * 100}%`
    this.hpText.textContent = `❤ ${Math.ceil(playerCombat.hp)} / ${playerCombat.maxHp}`

    const w = playerCombat.currentWeapon
    const atk = playerCombat.finalAttack
    const def = playerCombat.finalDefense
    const spd = playerCombat.finalAttackSpeed.toFixed(1)
    const rng = playerCombat.finalAttackRange.toFixed(1)
    this.weaponInfo.innerHTML = `⚔ ${w.name}　攻${atk} 防御${def} 攻速${spd} 范围${rng}`

    const weaponCount = playerCombat.weapons.length
    const idx = playerCombat.currentWeaponIndex + 1
    this.inventoryInfo.textContent = `背包 ${idx}/${weaponCount}　按 R 切换武器`

    // ---- 死亡画面倒计时 ----
    if (playerCombat.isDead) {
      const remain = Math.max(0, playerCombat.respawnTime - playerCombat.deathTimer)
      this.updateDeathCountdown(remain)
    }

    // ---- 受伤红边衰减 ----
    if (this._vignetteAlpha > 0) {
      this._vignetteAlpha -= dt * 2
      if (this._vignetteAlpha < 0) this._vignetteAlpha = 0
    }
    const intensity = this._vignetteAlpha * 0.6
    this.vignette.style.boxShadow = `inset 0 0 100px 30px rgba(255,0,0,${intensity})`

    // ---- 飘字更新 ----
    for (let i = this._floats.length - 1; i >= 0; i--) {
      const f = this._floats[i]
      f.life += dt
      f.offsetY += dt * 40 // 向上飘

      if (f.life >= f.maxLife) {
        f.el.remove()
        this._floats.splice(i, 1)
        continue
      }

      const proj = project3DTo2D(
        { x: f.worldPos.x, y: f.worldPos.y + f.offsetY / 50, z: f.worldPos.z },
        this.camera,
        this.width,
        this.height,
      )
      if (proj && !proj.behind) {
        f.el.style.left = `${proj.x}px`
        f.el.style.top = `${proj.y - f.offsetY}px`
      }
      const opacity = 1 - (f.life / f.maxLife)
      f.el.style.opacity = String(opacity)
    }

    // ---- 动物血量条 ----
    for (const animal of animals) {
      if (animal.dead) {
        this._removeAnimalBar(animal)
        continue
      }

      // 只在最近受伤后显示
      if (animal.hitFlash > 0) {
        this._showAnimalBar(animal)
      }
    }

    // 更新所有显示中的血量条位置
    for (const [animal, barInfo] of this._animalBars) {
      if (animal.dead) {
        this._removeAnimalBar(animal)
        continue
      }
      // 3秒未受伤后隐藏
      if (animal.hitFlash <= 0) {
        barInfo.hiddenTime += dt
        if (barInfo.hiddenTime > 2) {
          this._removeAnimalBar(animal)
          continue
        }
      } else {
        barInfo.hiddenTime = 0
      }

      // 投影到屏幕
      const proj = project3DTo2D(
        { x: animal.position.x, y: 2.0 * animal.data.scale, z: animal.position.z },
        this.camera,
        this.width,
        this.height,
      )
      if (proj && !proj.behind) {
        barInfo.container.style.left = `${proj.x}px`
        barInfo.container.style.top = `${proj.y}px`
        barInfo.container.style.display = 'block'
        const ratio = Math.max(0, animal.hp / animal.maxHp)
        barInfo.fill.style.width = `${ratio * 100}%`
      } else {
        barInfo.container.style.display = 'none'
      }
    }
  }

  _showAnimalBar(animal) {
    if (this._animalBars.has(animal)) return

    const container = document.createElement('div')
    Object.assign(container.style, {
      position: 'absolute',
      width: '50px',
      height: '6px',
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '3px',
      overflow: 'hidden',
      transform: 'translate(-50%, -50%)',
      border: '1px solid rgba(255,255,255,0.3)',
    })

    const fill = document.createElement('div')
    Object.assign(fill.style, {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(to right, #27ae60, #2ecc71)',
      transition: 'width 0.15s',
    })
    container.appendChild(fill)

    const nameEl = document.createElement('div')
    Object.assign(nameEl.style, {
      position: 'absolute',
      top: '-16px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '11px',
      color: '#fff',
      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
      whiteSpace: 'nowrap',
    })
    nameEl.textContent = animal.data.name
    container.appendChild(nameEl)

    this.floatLayer.appendChild(container)
    this._animalBars.set(animal, { container, fill, nameEl, hiddenTime: 0 })
  }

  _removeAnimalBar(animal) {
    const barInfo = this._animalBars.get(animal)
    if (!barInfo) return
    barInfo.container.remove()
    this._animalBars.delete(animal)
  }

  onResize() {
    this.width = this.container.clientWidth
    this.height = this.container.clientHeight
  }

  dispose() {
    this.root.remove()
    this._animalBars.clear()
    this._floats = []
  }
}
