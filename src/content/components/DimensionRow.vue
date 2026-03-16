<script setup lang="ts">
import { computed } from 'vue'
import { getScoreColor } from '@/shared/utils'

const props = defineProps<{
  label: string
  score: number
  weight: number
  comment: string
}>()

const barColor = computed(() => getScoreColor(props.score))
const barWidth = computed(() => `${props.score}%`)
</script>

<template>
  <div class="rp-dim">
    <div class="rp-dim-header">
      <span class="rp-dim-label">{{ label }}</span>
      <span class="rp-dim-meta">
        <span class="rp-dim-score" :style="{ color: barColor }">{{ score }}</span>
        <span class="rp-dim-weight">({{ weight }}%)</span>
      </span>
    </div>
    <div class="rp-dim-bar-bg">
      <div class="rp-dim-bar" :style="{ width: barWidth, backgroundColor: barColor }" />
    </div>
    <p v-if="comment" class="rp-dim-comment">{{ comment }}</p>
  </div>
</template>
