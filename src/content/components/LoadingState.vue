<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { formatTime } from '@/shared/utils'

const elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const start = Date.now()
  timer = setInterval(() => {
    elapsed.value = Date.now() - start
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="rp-loading">
    <div class="rp-spinner" />
    <p class="rp-loading-text">AI 评分中...</p>
    <p class="rp-loading-time">已用时 {{ formatTime(elapsed) }}</p>
  </div>
</template>
