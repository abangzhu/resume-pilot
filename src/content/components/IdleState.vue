<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  resumeButtonVisible: boolean
  resumeDetected: boolean
  extracting: boolean
  extractDone: boolean
  resumeText: string
  resumeScreenshot: string
  hasCachedScore: boolean
}>()

defineEmits<{
  score: []
  reExtract: []
}>()

const showFullResume = ref(false)

const truncatedText = computed(() => {
  if (!props.resumeText) return ''
  return props.resumeText.length > 100
    ? props.resumeText.slice(0, 100) + '...'
    : props.resumeText
})
</script>

<template>
  <div class="rp-idle">
    <!-- Phase 1: no button, no panel -->
    <template v-if="!resumeDetected && !resumeButtonVisible">
      <p class="rp-idle-text rp-idle-waiting">等待简历页面打开...</p>
    </template>

    <!-- Phase 2: button visible, panel not open yet -->
    <template v-else-if="!resumeDetected && resumeButtonVisible">
      <div class="rp-step rp-step-done">
        <span class="rp-step-icon">✓</span>
        <span class="rp-step-label">已检测到候选人简历</span>
      </div>
      <p class="rp-guidance-text">请点击「在线简历」查看完整简历</p>
      <button class="rp-score-btn" disabled>开始评分</button>
    </template>

    <!-- Phase 3 & 4: panel open -->
    <template v-else>
      <div class="rp-step rp-step-done">
        <span class="rp-step-icon">✓</span>
        <span class="rp-step-label">已打开在线简历</span>
      </div>

      <!-- Extracting -->
      <div v-if="extracting" class="rp-step rp-step-active">
        <span class="rp-step-spinner" />
        <span class="rp-step-label">正在提取简历信息...</span>
      </div>

      <!-- Extract done: screenshot only (iframe case) -->
      <template v-if="extractDone && !resumeText && resumeScreenshot">
        <div class="rp-step rp-step-done">
          <span class="rp-step-icon">✓</span>
          <span class="rp-step-label">已通过截图提取简历</span>
          <span class="rp-reextract-link" @click="$emit('reExtract')">重新解析</span>
        </div>
      </template>

      <!-- Extract done: has text -->
      <template v-else-if="extractDone && resumeText">
        <div class="rp-step rp-step-done">
          <span class="rp-step-icon">✓</span>
          <span
            class="rp-step-label rp-resume-text-trigger"
            :data-tooltip="truncatedText"
            @click="showFullResume = !showFullResume"
          >
            {{ showFullResume ? '收起原文' : '简历原文' }}
          </span>
          <span class="rp-reextract-link" @click="$emit('reExtract')">重新解析</span>
        </div>

        <!-- Expanded resume detail -->
        <div v-if="showFullResume" class="rp-resume-detail">
          <div class="rp-resume-detail-header">
            <span class="rp-resume-detail-title">提取的简历内容</span>
            <button class="rp-resume-close-btn" @click="showFullResume = false">✕</button>
          </div>
          <img
            v-if="resumeScreenshot"
            :src="resumeScreenshot"
            class="rp-resume-detail-img"
            alt="简历截图"
          />
          <pre class="rp-resume-detail-text">{{ resumeText }}</pre>
        </div>
      </template>

      <!-- Score button -->
      <button
        class="rp-score-btn"
        :disabled="!extractDone"
        @click="$emit('score')"
      >
        {{ hasCachedScore ? '查看历史结果' : '开始评分' }}
      </button>
    </template>
  </div>
</template>
