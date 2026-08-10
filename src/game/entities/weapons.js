import * as THREE from 'three'

/**
 * 武器数据 + 模型构建
 * 见 docs/combat-system.md §4
 */

export const WEAPONS = [
  {
    id: 'fist',
    name: '徒手',
    attack: 0,
    defense: 0,
    attackSpeed: 0,
    attackRange: 0,
    attackArc: 120,
    modelType: null,
    color: 0x000000,
  },
  {
    id: 'wooden_sword',
    name: '木剑',
    attack: 8,
    defense: 0,
    attackSpeed: 0.5,
    attackRange: 0.8,
    attackArc: 180,
    modelType: 'sword',
    color: 0x8b5a2b,
  },
  {
    id: 'iron_sword',
    name: '铁剑',
    attack: 18,
    defense: 2,
    attackSpeed: 0.3,
    attackRange: 1.0,
    attackArc: 180,
    modelType: 'sword',
    color: 0xb0b0b8,
  },
  {
    id: 'stone_club',
    name: '石锤',
    attack: 25,
    defense: 3,
    attackSpeed: -0.2,
    attackRange: 0.5,
    attackArc: 210,
    modelType: 'club',
    color: 0x7a7a7a,
  },
  {
    id: 'wooden_spear',
    name: '木矛',
    attack: 12,
    defense: 0,
    attackSpeed: 0.2,
    attackRange: 2.5,
    attackArc: 60,
    modelType: 'spear',
    color: 0x6b4a2b,
  },
]

export const WEAPON_MAP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]))

/**
 * 创建武器模型（简单几何体组合）
 * 模型朝向 +Z（前方），挂载在 rightHand 下
 */
export function createWeaponModel(weapon) {
  if (!weapon.modelType) return null

  const g = new THREE.Group()

  if (weapon.modelType === 'sword') {
    // 剑柄
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 })
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8), handleMat)
    handle.rotation.x = Math.PI / 2 // 沿 Z 轴方向
    handle.position.z = 0.12
    g.add(handle)

    // 护手
    const guardMat = new THREE.MeshStandardMaterial({ color: weapon.color, roughness: 0.5, metalness: 0.3 })
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.08), guardMat)
    guard.position.z = 0.25
    g.add(guard)

    // 剑身
    const bladeMat = new THREE.MeshStandardMaterial({ color: weapon.color, roughness: 0.3, metalness: 0.6 })
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.8), bladeMat)
    blade.position.z = 0.7
    blade.castShadow = true
    g.add(blade)

    // 剑尖
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 4), bladeMat)
    tip.rotation.x = Math.PI / 2
    tip.position.z = 1.18
    g.add(tip)
  } else if (weapon.modelType === 'club') {
    // 锤柄
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 })
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), handleMat)
    handle.rotation.x = Math.PI / 2
    handle.position.z = 0.25
    g.add(handle)

    // 锤头
    const headMat = new THREE.MeshStandardMaterial({ color: weapon.color, roughness: 0.7 })
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), headMat)
    head.position.z = 0.6
    head.castShadow = true
    g.add(head)

    // 石刺点缀
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.1, 4),
        headMat,
      )
      const angle = (i / 6) * Math.PI * 2
      spike.position.set(Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0.6)
      spike.lookAt(
        Math.cos(angle) * 0.4,
        Math.sin(angle) * 0.4,
        0.6,
      )
      spike.rotateX(Math.PI / 2)
      g.add(spike)
    }
  } else if (weapon.modelType === 'spear') {
    // 矛柄
    const handleMat = new THREE.MeshStandardMaterial({ color: weapon.color, roughness: 0.9 })
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), handleMat)
    handle.rotation.x = Math.PI / 2
    handle.position.z = 0.8
    handle.castShadow = true
    g.add(handle)

    // 矛头
    const headMat = new THREE.MeshStandardMaterial({ color: 0xa0a0a8, roughness: 0.3, metalness: 0.5 })
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), headMat)
    head.rotation.x = Math.PI / 2
    head.position.z = 1.75
    g.add(head)

    // 尾部装饰
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.03, 0.1, 6),
      handleMat,
    )
    cap.rotation.x = Math.PI / 2
    cap.position.z = -0.05
    g.add(cap)
  }

  return g
}

/**
 * 创建武器拾取物（发光小箱子）
 */
export function createWeaponPickup(weapon) {
  const group = new THREE.Group()

  // 底座箱子
  const boxMat = new THREE.MeshStandardMaterial({
    color: weapon.color,
    emissive: weapon.color,
    emissiveIntensity: 0.4,
    roughness: 0.4,
    metalness: 0.3,
  })
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), boxMat)
  box.castShadow = true
  group.add(box)

  // 发光光柱（视觉提示）
  const beamMat = new THREE.MeshBasicMaterial({
    color: weapon.color,
    transparent: true,
    opacity: 0.15,
  })
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3, 8), beamMat)
  beam.position.y = 1.5
  group.add(beam)

  group.userData.weaponId = weapon.id
  group.userData.baseY = 0.5

  return group
}
