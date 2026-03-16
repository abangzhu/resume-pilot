<script setup lang="ts">
defineProps<{
  resumeDetected: boolean
}>()

defineEmits<{
  score: []
}>()
</script>

<template>
  <div class="rp-idle">
    <template v-if="resumeDetected">
      <p class="rp-idle-text">已检测到简历</p>
      <button class="rp-score-btn" @click="$emit('score')">
        开始评分
      </button>
    </template>
    <template v-else>
      <p class="rp-idle-text rp-idle-waiting">等待简历页面打开...</p>
    </template>
  </div>
</template>
