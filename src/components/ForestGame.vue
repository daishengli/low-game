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
        <div class="repo-link">
          <span class="repo-divider"></span>
          <a
            href="https://github.com/daishengli/low-game"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
          >
            <svg
              class="github-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.35.78 1.04.78 2.1 0 1.51-.01 2.73-.01 3.1 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z"
              />
            </svg>
            <span>开源 · GitHub</span>
            <svg
              class="external-icon"
              viewBox="0 0 16 16"
              width="10"
              height="10"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M10.604 1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 8.28 8.78a.75.75 0 0 1-1.06-1.06l4.75-4.75-1.543-1.543A.25.25 0 0 1 10.604 1ZM3.75 2A1.75 1.75 0 0 0 2 3.75v8.5C2 13.216 2.784 14 3.75 14h8.5A1.75 1.75 0 0 0 14 12.25v-3.5a.75.75 0 0 0-1.5 0v3.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25h3.5a.75.75 0 0 0 0-1.5h-3.5Z"
              />
            </svg>
          </a>
        </div>
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

.repo-link {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.repo-divider {
  display: block;
  width: 56px;
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
}

.repo-link a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-decoration: none;
  transition: color 0.15s;
}

.repo-link a:hover {
  color: #fff;
}

.github-icon,
.external-icon {
  flex-shrink: 0;
  display: block;
}

.external-icon {
  margin-left: 2px;
  opacity: 0.7;
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
