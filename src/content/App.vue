<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { ScoreResult } from '@/shared/types'
import { sendMessage } from '@/shared/messaging'
import {
  detectResumePanel,
  extractResumeText,
  getResumePanelRect,
  getCandidateId,
  getCandidateName,
  observeResumePanel,
} from './extractor'
import FloatingPanel from './components/FloatingPanel.vue'
import IdleState from './components/IdleState.vue'
import LoadingState from './components/LoadingState.vue'
import ScoredState from './components/ScoredState.vue'
import ErrorState from './components/ErrorState.vue'
import TemplatePicker from './components/TemplatePicker.vue'

type State = 'idle' | 'loading' | 'scored' | 'error'

const state = ref<State>('idle')
const resumeDetected = ref(false)
const selectedTemplate = ref('')
const scoreResult = ref<ScoreResult | null>(null)
const errorMessage = ref('')

const currentCandidateId = ref('')
const lastResumeText = ref('')

let observer: MutationObserver | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  resumeDetected.value = detectResumePanel()
  currentCandidateId.value = getCandidateId()

  observer = observeResumePanel((visible) => {
    resumeDetected.value = visible
    if (visible && state.value === 'idle') {
      checkCache()
    }
  })

  pollTimer = setInterval(() => {
    const newId = getCandidateId()
    if (newId === currentCandidateId.value) return

    currentCandidateId.value = newId

    if (state.value === 'scored' || state.value === 'error') {
      state.value = 'idle'
      scoreResult.value = null
      errorMessage.value = ''
    }

    if (selectedTemplate.value) {
      checkCache()
    }
  }, 500)
})

onUnmounted(() => {
  observer?.disconnect()
  if (pollTimer) clearInterval(pollTimer)
})

async function checkCache(): Promise<void> {
  if (!selectedTemplate.value) return
  const candidateId = getCandidateId()
  const res = await sendMessage<
    { candidateId: string; templateId: string },
    ScoreResult | null
  >('GET_CACHED_SCORE', { candidateId, templateId: selectedTemplate.value })

  if (res.success && res.data) {
    scoreResult.value = res.data
    state.value = 'scored'
  }
}

async function startScoring(): Promise<void> {
  state.value = 'loading'
  errorMessage.value = ''

  try {
    const text = extractResumeText()
    lastResumeText.value = text
    const rect = getResumePanelRect()
    const candidateId = getCandidateId()

    let screenshot = ''
    if (rect) {
      const captureRes = await sendMessage<
        { rect: typeof rect },
        { screenshot: string }
      >('CAPTURE_SCREENSHOT', { rect })
      if (captureRes.success && captureRes.data) {
        screenshot = captureRes.data.screenshot
      }
    }

    const candidateName = getCandidateName()

    const res = await sendMessage<
      { screenshot: string; text: string; templateId: string; candidateId: string; candidateName?: string },
      ScoreResult
    >('SCORE_RESUME', {
      screenshot,
      text,
      templateId: selectedTemplate.value,
      candidateId,
      candidateName: candidateName || undefined,
    })

    if (res.success && res.data) {
      scoreResult.value = res.data
      state.value = 'scored'
    } else {
      errorMessage.value = res.error ?? '评分失败'
      state.value = 'error'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '未知错误'
    state.value = 'error'
  }
}

function handleRescore(): void {
  state.value = 'idle'
  scoreResult.value = null
}
</script>

<template>
  <FloatingPanel>
    <TemplatePicker v-model="selectedTemplate" />

    <IdleState
      v-if="state === 'idle'"
      :resume-detected="resumeDetected"
      @score="startScoring"
    />
    <LoadingState v-else-if="state === 'loading'" />
    <ScoredState
      v-else-if="state === 'scored' && scoreResult"
      :result="scoreResult"
      :resume-text="lastResumeText"
      @rescore="handleRescore"
    />
    <ErrorState
      v-else-if="state === 'error'"
      :message="errorMessage"
      @retry="startScoring"
    />
  </FloatingPanel>
</template>
