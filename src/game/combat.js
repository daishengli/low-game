import * as THREE from 'three'

/**
 * 战斗核心：伤害结算 + 扇形判定
 * 见 docs/combat-system.md §6, §8
 */

/**
 * 伤害结算公式
 * 实际伤害 = max(1, 攻击力 - 防御力 * 0.5)
 */
export function calcDamage(attack, defense) {
  return Math.max(1, Math.round(attack - defense * 0.5))
}

/**
 * 扇形判定
 * @param {THREE.Vector3} playerPos - 玩家位置
 * @param {number} playerYaw - 玩家朝向（rotation.y）
 * @param {number} range - 扇形半径
 * @param {number} arcDeg - 扇形角度（度）
 * @param {Array} targets - 目标数组（需有 position 和 dead 属性）
 * @returns {Array} 被命中的目标数组
 */
export function sectorHit(playerPos, playerYaw, range, arcDeg, targets) {
  const halfArc = ((arcDeg * Math.PI) / 180) / 2
  const rangeSq = range * range
  const hits = []

  for (const target of targets) {
    if (target.dead) continue
    const dx = target.position.x - playerPos.x
    const dz = target.position.z - playerPos.z
    const distSq = dx * dx + dz * dz
    if (distSq > rangeSq) continue

    // atan2(x, z) 与 rotation.y 同坐标系
    const angleTo = Math.atan2(dx, dz)
    let diff = angleTo - playerYaw
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    if (Math.abs(diff) <= halfArc) {
      hits.push(target)
    }
  }

  return hits
}

/**
 * 将 3D 坐标投影到屏幕 2D 坐标
 * @param {{x,y,z}} worldPos - 世界坐标
 * @returns {{x, y, behind}|null}
 */
export function project3DTo2D(worldPos, camera, width, height) {
  const v = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z).project(camera)
  return {
    x: ((v.x + 1) / 2) * width,
    y: ((-v.y + 1) / 2) * height,
    behind: v.z > 1,
  }
}
