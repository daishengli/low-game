<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { createForestGame } from '@/game/forest'
import { createCombatHooks } from '@/game/combat-integration'

const stage = ref(null)
const started = ref(false)
const showHelp = ref(true)
const locked = ref(false)
let game = null

function start() {
  if (started.value || !stage.value) return
  game = createForestGame(stage.value, {
    hooks: createCombatHooks(),
  })
  started.value = true
  showHelp.value = false
}

function onLockChange() {
  locked.value = document.pointerLockElement != null
}

onMounted(() => {
  document.addEventListener('pointerlockchange', onLockChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerlockchange', onLockChange)
  game?.dispose()
  game = null
})
</script>

<template>
  <div class="forest-game">
    <div ref="stage" class="stage"></div>

    <!-- 启动遮罩：浏览器要求交互后才有键盘焦点 -->
    <div v-if="!started" class="overlay">
      <div class="card">
        <h1>🌲 树林漫步</h1>
        <p>点击开始后，点击画面进入鼠标视角，ESC 释放</p>
        <button class="btn" @click="start">开始游戏</button>
      </div>
    </div>

    <!-- 沉浸模式提示 -->
    <div v-if="started && !locked" class="hint">
      点击画面进入鼠标视角 · ESC 释放 · 或按住左键拖动
    </div>
    <div v-if="started && locked" class="hint locked">鼠标视角已开启 · 按 ESC 释放</div>

    <!-- 操作提示 -->
    <button v-if="started" class="help-toggle" @click="showHelp = !showHelp">
      {{ showHelp ? '收起' : '操作说明' }}
    </button>
    <div v-if="started && showHelp" class="help">
      <div class="help-row"><kbd>鼠标</kbd><span>移动转动视角</span></div>
      <div class="help-row">
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>前后左右移动</span>
      </div>
      <div class="help-row"><kbd>Space</kbd><span>跳跃</span></div>
      <div class="help-row"><kbd>Ctrl</kbd><span>下蹲（按住）</span></div>
      <div class="help-row"><kbd>Shift</kbd><span>加速冲刺</span></div>
      <div class="help-row"><kbd>左键</kbd><span>攻击（需锁定鼠标）</span></div>
      <div class="help-row"><kbd>R</kbd><span>切换武器</span></div>
      <div class="help-row"><kbd>ESC</kbd><span>退出鼠标视角</span></div>
    </div>
  </div>
</template>

<style scoped>
.forest-game {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #87ceeb;
}

.stage {
  width: 100%;
  height: 100%;
  display: block;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 30, 40, 0.55);
  backdrop-filter: blur(4px);
}

.card {
  text-align: center;
  color: #fff;
  padding: 40px 56px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card h1 {
  margin: 0 0 8px;
  font-size: 32px;
}

.card p {
  margin: 0 0 24px;
  opacity: 0.85;
}

.btn {
  font-size: 16px;
  padding: 12px 36px;
  border: none;
  border-radius: 999px;
  background: #4caf50;
  color: #fff;
  cursor: pointer;
  transition:
    transform 0.15s,
    background 0.15s;
}

.btn:hover {
  background: #5dbf61;
  transform: translateY(-1px);
}

.help {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.9;
  pointer-events: none;
}

.help-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.help-row span {
  margin-left: 8px;
  opacity: 0.9;
}

kbd {
  display: inline-block;
  min-width: 22px;
  text-align: center;
  padding: 2px 6px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  background: #fff;
  color: #222;
  border-radius: 4px;
  border-bottom: 2px solid #aaa;
}

.help-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}

.help-toggle:hover {
  background: rgba(0, 0, 0, 0.65);
}

.hint {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 13px;
  pointer-events: none;
  animation: pulse 2.4s ease-in-out infinite;
}

.hint.locked {
  background: rgba(46, 125, 50, 0.7);
  animation: none;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
</style>
