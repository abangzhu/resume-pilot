<script setup lang="ts">
import { computed } from 'vue'
import type { ScoreResult } from '@/shared/types'
import { getRecommendationLabel, getRecommendationColor, getScoreColor } from '@/shared/utils'
import DimensionRow from './DimensionRow.vue'

const props = defineProps<{
  result: ScoreResult
  resumeText: string
}>()

const truncatedText = computed(() => {
  if (!props.resumeText) return ''
  return props.resumeText.length > 100
    ? props.resumeText.slice(0, 100) + '...'
    : props.resumeText
})

defineEmits<{
  rescore: []
}>()

const recLabel = computed(() => getRecommendationLabel(props.result.recommendation))
const recColor = computed(() => getRecommendationColor(props.result.recommendation))
const scoreColor = computed(() => getScoreColor(props.result.overallScore))

const dimensionList = computed(() =>
  Object.entries(props.result.dimensions).map(([id, d]) => ({
    id,
    ...d,
  })),
)
</script>

<template>
  <div class="rp-scored">
    <!-- Candidate Info -->
    <div v-if="result.candidateName || result.candidateId" class="rp-candidate-info">
      <span v-if="result.candidateName" class="rp-candidate-name">{{ result.candidateName }}</span>
      <span class="rp-candidate-id">{{ result.candidateId }}</span>
      <span v-if="resumeText" class="rp-resume-text-trigger" :data-tooltip="truncatedText">
        简历原文
      </span>
    </div>

    <!-- Overall -->
    <div class="rp-overall">
      <div class="rp-overall-score" :style="{ color: scoreColor }">
        {{ result.overallScore }}
      </div>
      <div
        class="rp-overall-rec"
        :style="{ backgroundColor: recColor + '18', color: recColor }"
      >
        {{ recLabel }}
      </div>
    </div>

    <!-- Dimensions -->
    <div class="rp-dims">
      <DimensionRow
        v-for="dim in dimensionList"
        :key="dim.id"
        :label="dim.id"
        :score="dim.score"
        :weight="dim.weight"
        :comment="dim.comment"
      />
    </div>

    <!-- Summary -->
    <div v-if="result.summary" class="rp-summary">
      <p class="rp-summary-text">{{ result.summary }}</p>
    </div>

    <!-- Highlights & Concerns -->
    <div v-if="result.highlights.length" class="rp-section">
      <h4 class="rp-section-title rp-highlight-title">亮点</h4>
      <ul class="rp-list">
        <li v-for="(h, i) in result.highlights" :key="i">{{ h }}</li>
      </ul>
    </div>

    <div v-if="result.concerns.length" class="rp-section">
      <h4 class="rp-section-title rp-concern-title">顾虑</h4>
      <ul class="rp-list">
        <li v-for="(c, i) in result.concerns" :key="i">{{ c }}</li>
      </ul>
    </div>

    <button class="rp-rescore-btn" @click="$emit('rescore')">重新评分</button>
  </div>
</template>
