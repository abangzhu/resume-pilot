<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    defaultCollapsed?: boolean
  }>(),
  { title: 'Resume Pilot', defaultCollapsed: false },
)

const collapsed = ref(props.defaultCollapsed)
const dragging = ref(false)
const pos = ref({ x: 0, y: 0 })
const offset = ref({ x: 0, y: 0 })
const panelRef = ref<HTMLElement | null>(null)

function toggle(): void {
  collapsed.value = !collapsed.value
}

function onMouseDown(e: MouseEvent): void {
  if ((e.target as HTMLElement).closest('.no-drag')) return
  dragging.value = true
  offset.value = {
    x: e.clientX - pos.value.x,
    y: e.clientY - pos.value.y,
  }
  e.preventDefault()
}

function onMouseMove(e: MouseEvent): void {
  if (!dragging.value) return
  pos.value = {
    x: e.clientX - offset.value.x,
    y: e.clientY - offset.value.y,
  }
}

function onMouseUp(): void {
  dragging.value = false
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    ref="panelRef"
    class="rp-panel"
    :class="{ 'rp-collapsed': collapsed, 'rp-dragging': dragging }"
    :style="pos.x || pos.y ? { position: 'fixed', left: pos.x + 'px', top: pos.y + 'px', right: 'auto', bottom: 'auto' } : {}"
  >
    <div class="rp-header" @mousedown="onMouseDown">
      <span class="rp-title">{{ title }}</span>
      <button class="rp-toggle no-drag" @click="toggle">
        {{ collapsed ? '+' : '-' }}
      </button>
    </div>
    <div v-show="!collapsed" class="rp-body">
      <slot />
    </div>
  </div>
</template>
