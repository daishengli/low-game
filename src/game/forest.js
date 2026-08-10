import * as THREE from 'three'

/**
 * 树林场景 + 第三人称人物控制
 *
 * 控制方式：
 *   W / ↑  前进
 *   S / ↓  后退
 *   A / ←  左移
 *   D / →  右移
 *   Space  跳跃
 *   Ctrl   下蹲（按住）
 *   Shift  加速（按住）
 *
 * 返回一个 dispose() 用于在组件卸载时释放资源。
 */
export function createForestGame(container, opts = {}) {
  const hooks = opts.hooks || {}
  // ---- 基础三件套 ----
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb) // 天空蓝
  scene.fog = new THREE.Fog(0x87ceeb, 40, 140) // 远处雾化，营造纵深

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    500,
  )
  camera.position.set(0, 6, 10)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // ---- 灯光 ----
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a6a3a, 0.85)
  scene.add(hemi)

  const sun = new THREE.DirectionalLight(0xfff3d6, 1.6)
  sun.position.set(60, 90, 40)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 300
  sun.shadow.camera.left = -80
  sun.shadow.camera.right = 80
  sun.shadow.camera.top = 80
  sun.shadow.camera.bottom = -80
  sun.shadow.bias = -0.0004
  scene.add(sun)

  // ---- 地面 ----
  const groundSize = 400
  const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 1, 1)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4f7a3a,
    roughness: 1,
    metalness: 0,
  })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // 草地色块随机点缀，避免一片纯色
  const patchMat = new THREE.MeshStandardMaterial({ color: 0x6a9a4a, roughness: 1 })
  for (let i = 0; i < 60; i++) {
    const r = 2 + Math.random() * 6
    const patchGeo = new THREE.CircleGeometry(r, 12)
    const patch = new THREE.Mesh(patchGeo, patchMat)
    patch.rotation.x = -Math.PI / 2
    patch.position.set((Math.random() - 0.5) * groundSize, 0.01, (Math.random() - 0.5) * groundSize)
    patch.receiveShadow = true
    scene.add(patch)
  }

  // ---- 树 ----
  // 用 cone（树冠）+ cylinder（树干）组合，简单但有层次
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 })
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x2f6b2f, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x3a7d3a, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x2a5f2a, roughness: 1 }),
  ]

  const TREE_COUNT = 160
  const treeData = [] // {x, z, radius} 用于碰撞
  const treeGroup = new THREE.Group()

  for (let i = 0; i < TREE_COUNT; i++) {
    const x = (Math.random() - 0.5) * (groundSize - 20)
    const z = (Math.random() - 0.5) * (groundSize - 20)
    // 避开出生点
    if (Math.hypot(x, z) < 6) continue

    const tree = makeTree(leafMats, trunkMat)
    tree.position.set(x, 0, z)
    const s = 0.8 + Math.random() * 0.9
    tree.scale.setScalar(s)
    tree.rotation.y = Math.random() * Math.PI * 2
    treeGroup.add(tree)

    treeData.push({ x, z, radius: 0.9 * s })
  }
  scene.add(treeGroup)

  // 几块散落的石头作为额外点缀
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 1 })
  for (let i = 0; i < 25; i++) {
    const rockGeo = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.8, 0)
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.set((Math.random() - 0.5) * 200, 0.3, (Math.random() - 0.5) * 200)
    rock.rotation.set(Math.random(), Math.random(), Math.random())
    rock.castShadow = true
    rock.receiveShadow = true
    scene.add(rock)
  }

  function makeTree(leaves, trunk) {
    const g = new THREE.Group()
    const trunkH = 2.2 + Math.random() * 1.5
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, trunkH, 8)
    const trunkMesh = new THREE.Mesh(trunkGeo, trunk)
    trunkMesh.position.y = trunkH / 2
    trunkMesh.castShadow = true
    trunkMesh.receiveShadow = true
    g.add(trunkMesh)

    // 2~3 层树冠
    const layers = 2 + Math.floor(Math.random() * 2)
    const leafMat = leaves[Math.floor(Math.random() * leaves.length)] ?? leaves[0]
    let yBase = trunkH
    let layerR = 1.8 + Math.random() * 0.6
    for (let l = 0; l < layers; l++) {
      const coneGeo = new THREE.ConeGeometry(layerR, layerR * 1.6, 9)
      const cone = new THREE.Mesh(coneGeo, leafMat)
      cone.position.y = yBase + layerR * 0.7
      cone.castShadow = true
      cone.receiveShadow = true
      g.add(cone)
      yBase += layerR * 0.85
      layerR *= 0.78
    }
    return g
  }

  // ---- 人物 ----
  // 用基础几何拼一个简单的角色：身体 + 头 + 四肢，加一点颜色辨识
  const player = new THREE.Group()
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c79a, roughness: 0.7 })
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xd14b3a, roughness: 0.8 })
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2f4a6b, roughness: 0.8 })
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), shirtMat)
  torso.position.y = 1.35
  torso.castShadow = true
  player.add(torso)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skinMat)
  head.position.y = 2.05
  head.castShadow = true
  player.add(head)

  // 简单的"脸朝向"指示：一个鼻子小球
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat)
  nose.position.set(0, 2.02, 0.28)
  player.add(nose)

  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), shirtMat)
  armL.position.set(-0.5, 1.35, 0)
  armL.castShadow = true
  player.add(armL)
  const armR = armL.clone()
  armR.position.x = 0.5
  player.add(armR)

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), pantsMat)
  legL.position.set(-0.18, 0.45, 0)
  legL.castShadow = true
  player.add(legL)
  const legR = legL.clone()
  legR.position.x = 0.18
  player.add(legR)

  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.4), shoeMat)
  shoeL.position.set(-0.18, 0.08, 0.05)
  shoeL.castShadow = true
  player.add(shoeL)
  const shoeR = shoeL.clone()
  shoeR.position.x = 0.18
  player.add(shoeR)

  scene.add(player)

  // ---- Hooks: 初始化回调（战斗系统等扩展用）----
  hooks.onInit?.({ scene, camera, player, container, THREE })

  // ---- 输入 ----
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    crouch: false,
    sprint: false,
  }

  function setKey(e, down) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = down
        break
      case 'KeyS':
      case 'ArrowDown':
        keys.backward = down
        break
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = down
        break
      case 'KeyD':
      case 'ArrowRight':
        keys.right = down
        break
      case 'Space':
        keys.jump = down
        e.preventDefault() // 防止页面滚动
        break
      case 'ControlLeft':
      case 'ControlRight':
        keys.crouch = down
        e.preventDefault()
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.sprint = down
        break
      default:
        return
    }
  }

  function onKeyDown(e) {
    setKey(e, true)
    hooks.onKeyDown?.(e)
  }
  function onKeyUp(e) {
    setKey(e, false)
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // ---- 物理状态 ----
  const STAND_HEIGHT = 2.3 // 角色站立总高（脚到头顶），用于碰撞/相机
  const CROUCH_HEIGHT = 1.4
  const WALK_SPEED = 5.0
  const SPRINT_SPEED = 9.5
  const CROUCH_SPEED = 2.2
  const GRAVITY = 22
  const JUMP_VELOCITY = 8.2

  const velocity = new THREE.Vector3()
  let onGround = true
  let currentHeight = STAND_HEIGHT
  let walkPhase = 0 // 行走动画相位

  // 相机围绕人物的球坐标参数
  // yaw: 水平偏航角（左右看）；pitch: 俯仰角（上下看）
  let yaw = 0
  let pitch = -0.15
  const camDist = 7 // 相机到人物的距离
  const camHeight = 1.4 // 相机相对人物中心的高度偏移
  const camTarget = new THREE.Vector3()
  const camDesired = new THREE.Vector3()
  const MIN_PITCH = -1.2 // 最向下看
  const MAX_PITCH = 0.6 // 最向上看
  const MOUSE_SENS = 0.0022

  // 鼠标输入：指针锁定（沉浸式）+ 未锁定时按住左键拖动
  let pointerLocked = false
  let dragging = false
  let lastX = 0
  let lastY = 0

  function onPointerMove(e) {
    if (pointerLocked) {
      yaw -= e.movementX * MOUSE_SENS
      pitch -= e.movementY * MOUSE_SENS
    } else if (dragging) {
      yaw -= (e.clientX - lastX) * MOUSE_SENS
      pitch -= (e.clientY - lastY) * MOUSE_SENS
      lastX = e.clientX
      lastY = e.clientY
    }
    pitch = THREE.MathUtils.clamp(pitch, MIN_PITCH, MAX_PITCH)
  }

  function requestLock() {
    if (!pointerLocked) renderer.domElement.requestPointerLock?.()
  }
  function onPointerLockChange() {
    pointerLocked = document.pointerLockElement === renderer.domElement
  }
  function onMouseDown(e) {
    // 先给 hook 处理（如攻击）
    if (hooks.onMouseDown?.(e, { pointerLocked })) return
    if (pointerLocked) return
    if (e.button === 0) {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
    }
  }
  function onMouseUp() {
    dragging = false
  }

  renderer.domElement.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onPointerMove)
  document.addEventListener('pointerlockchange', onPointerLockChange)
  // 点击画布请求指针锁定；右键和点击按钮不触发
  renderer.domElement.addEventListener('click', requestLock)

  const clock = new THREE.Clock()
  let rafId = 0

  // ---- 边界 ----
  const halfWorld = groundSize / 2 - 2

  function clampToWorld(pos) {
    pos.x = THREE.MathUtils.clamp(pos.x, -halfWorld, halfWorld)
    pos.z = THREE.MathUtils.clamp(pos.z, -halfWorld, halfWorld)
  }

  // 简单的圆柱碰撞：玩家与树
  const playerRadius = 0.5
  function resolveTreeCollisions(pos) {
    for (let i = 0; i < treeData.length; i++) {
      const t = treeData[i]
      const dx = pos.x - t.x
      const dz = pos.z - t.z
      const dist = Math.hypot(dx, dz)
      const minDist = playerRadius + t.radius
      if (dist < minDist && dist > 1e-4) {
        const push = (minDist - dist) / dist
        pos.x += dx * push
        pos.z += dz * push
      }
    }
  }

  function animate() {
    rafId = requestAnimationFrame(animate)
    const dt = Math.min(clock.getDelta(), 0.05) // 限制最大步长，避免切后台后跳跃

    // 目标高度（下蹲/站立平滑过渡）
    const targetHeight = keys.crouch ? CROUCH_HEIGHT : STAND_HEIGHT
    currentHeight += (targetHeight - currentHeight) * Math.min(1, dt * 12)

    // ---- 水平移动方向（基于相机偏航角 yaw）----
    // 相机位于人物 -sin(yaw)/-cos(yaw) 一侧，看向人物即 +sin(yaw)/+cos(yaw) 方向
    const forwardDir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    // 右方 = forward × up（右手坐标系，up=(0,1,0)）
    const rightDir = new THREE.Vector3(-Math.cos(yaw), 0, Math.sin(yaw))

    const move = new THREE.Vector3()
    if (keys.forward) move.add(forwardDir)
    if (keys.backward) move.sub(forwardDir)
    if (keys.right) move.add(rightDir)
    if (keys.left) move.sub(rightDir)

    let speed = WALK_SPEED
    if (keys.crouch) speed = CROUCH_SPEED
    else if (keys.sprint) speed = SPRINT_SPEED

    const isMoving = move.lengthSq() > 0
    if (isMoving) {
      move.normalize().multiplyScalar(speed)
    }

    // 人物身体始终朝向视野方向（相机水平前方）
    // forwardDir = (-sin(yaw), 0, -cos(yaw))，对应 yaw 角作为 rotation.y
    const targetYaw = yaw
    let pyaw = player.rotation.y
    let diff = targetYaw - pyaw
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    player.rotation.y = pyaw + diff * Math.min(1, dt * 14)

    velocity.x = move.x
    velocity.z = move.z

    // ---- 跳跃 & 重力 ----
    if (keys.jump && onGround && !keys.crouch) {
      velocity.y = JUMP_VELOCITY
      onGround = false
    }
    velocity.y -= GRAVITY * dt

    // 应用位移
    player.position.x += velocity.x * dt
    player.position.y += velocity.y * dt
    player.position.z += velocity.z * dt

    // 地面检测（脚下为 y=0；下蹲时模型整体降低）
    const groundY = STAND_HEIGHT - currentHeight // 下蹲时把模型往下沉
    if (player.position.y <= groundY) {
      player.position.y = groundY
      velocity.y = 0
      onGround = true
    }

    clampToWorld(player.position)
    resolveTreeCollisions(player.position)

    // ---- 行走动画：四肢摆动 ----
    if (isMoving && onGround) {
      walkPhase += dt * (keys.sprint ? 16 : 10)
      const swing = Math.sin(walkPhase) * (keys.sprint ? 0.9 : 0.6)
      armL.rotation.x = swing
      armR.rotation.x = -swing
      legL.rotation.x = -swing * 0.8
      legR.rotation.x = swing * 0.8
      shoeL.position.z = 0.05 + Math.sin(walkPhase) * 0.12
      shoeR.position.z = 0.05 - Math.sin(walkPhase) * 0.12
    } else {
      // 回到静止姿态
      armL.rotation.x *= 1 - Math.min(1, dt * 8)
      armR.rotation.x *= 1 - Math.min(1, dt * 8)
      legL.rotation.x *= 1 - Math.min(1, dt * 8)
      legR.rotation.x *= 1 - Math.min(1, dt * 8)
    }
    // 下蹲时整体压低一点头部/躯干（视觉提示）
    const crouchBlend = (STAND_HEIGHT - currentHeight) / (STAND_HEIGHT - CROUCH_HEIGHT)
    torso.position.y = 1.35 - crouchBlend * 0.45
    head.position.y = 2.05 - crouchBlend * 0.65
    nose.position.y = 2.02 - crouchBlend * 0.65
    armL.position.y = 1.35 - crouchBlend * 0.45
    armR.position.y = 1.35 - crouchBlend * 0.45

    // ---- 相机跟随（球坐标，围绕人物）----
    // 相机位于人物后上方，方向由 yaw/pitch 决定
    const cp = Math.cos(pitch)
    camDesired.set(
      player.position.x - Math.sin(yaw) * cp * camDist,
      player.position.y + camHeight - Math.sin(pitch) * camDist,
      player.position.z - Math.cos(yaw) * cp * camDist,
    )
    camera.position.lerp(camDesired, Math.min(1, dt * 10))
    camTarget.copy(player.position)
    camTarget.y += camHeight
    camera.lookAt(camTarget)

    // ---- Hooks: 每帧更新回调 ----
    hooks.onUpdate?.(dt, { scene, camera, player })

    renderer.render(scene, camera)
  }
  animate()

  // ---- 自适应 ----
  function onResize() {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  const resizeObs = new ResizeObserver(onResize)
  resizeObs.observe(container)

  // ---- 清理 ----
  function dispose() {
    hooks.onDispose?.()
    cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    renderer.domElement.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('mousemove', onPointerMove)
    document.removeEventListener('pointerlockchange', onPointerLockChange)
    renderer.domElement.removeEventListener('click', requestLock)
    if (document.pointerLockElement === renderer.domElement) {
      document.exitPointerLock?.()
    }
    resizeObs.disconnect()
    renderer.dispose()
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose?.())
      }
    })
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement)
    }
  }

  return { dispose, scene, camera, player }
}
