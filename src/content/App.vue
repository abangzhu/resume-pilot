<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { ScoreResult, CachedResume } from '@/shared/types'
import { sendMessage } from '@/shared/messaging'
import {
  detectResumePanel,
  detectResumeButton,
  extractResumeText,
  getResumePanelRect,
  getCandidateId,
  getCandidateName,
  observeResumeState,
  scrollCaptureResume,
} from './extractor'
import FloatingPanel from './components/FloatingPanel.vue'
import IdleState from './components/IdleState.vue'
import LoadingState from './components/LoadingState.vue'
import ScoredState from './components/ScoredState.vue'
import ErrorState from './components/ErrorState.vue'
import TemplatePicker from './components/TemplatePicker.vue'

type State = 'idle' | 'extracting' | 'ready' | 'scoring' | 'scored' | 'error'

const state = ref<State>('idle')
const resumeDetected = ref(false)
const resumeButtonVisible = ref(false)
const selectedTemplate = ref('')
const scoreResult = ref<ScoreResult | null>(null)
const errorMessage = ref('')

const currentCandidateId = ref('')
const lastResumeText = ref('')
const lastScreenshot = ref('')
const hasCachedScore = ref(false)

let observer: MutationObserver | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

onMounted(() => {
  resumeDetected.value = detectResumePanel()
  resumeButtonVisible.value = detectResumeButton()
  currentCandidateId.value = getCandidateId()

  if (resumeDetected.value) {
    extractResume()
  }

  observer = observeResumeState(({ buttonVisible, panelOpen }) => {
    resumeButtonVisible.value = buttonVisible
    resumeDetected.value = panelOpen
    if (panelOpen && state.value === 'idle') {
      extractResume()
    }
  })

  pollTimer = setInterval(() => {
    const newId = getCandidateId()
    if (newId === currentCandidateId.value) return

    currentCandidateId.value = newId
    lastResumeText.value = ''
    lastScreenshot.value = ''
    scoreResult.value = null
    errorMessage.value = ''
    hasCachedScore.value = false
    state.value = 'idle'

    if (resumeDetected.value) {
      extractResume()
    }
  }, 500)
})

onUnmounted(() => {
  observer?.disconnect()
  if (pollTimer) clearInterval(pollTimer)
})

async function extractResume(skipCache = false): Promise<void> {
  state.value = 'extracting'
  errorMessage.value = ''
  hasCachedScore.value = false

  try {
    const candidateId = getCandidateId()

    let text = ''
    let screenshot = ''

    // 1. Check resume extraction cache (skip when re-extracting)
    if (!skipCache) {
      const resumeCacheRes = await sendMessage<
        { candidateId: string },
        CachedResume | null
      >('GET_CACHED_RESUME', { candidateId })

      if (resumeCacheRes.success && resumeCacheRes.data) {
        text = resumeCacheRes.data.text
        screenshot = resumeCacheRes.data.screenshot
      }
    }

    if (!text && !screenshot) {
      // 2. Extract text from DOM (up to 2 attempts)
      await delay(500)
      text = extractResumeText()
      if (!text) {
        await delay(500)
        text = extractResumeText()
      }

      // 3. Scroll capture (screenshot + scroll text)
      const scrollResult = await scrollCaptureResume()
      if (scrollResult) {
        screenshot = scrollResult.screenshot
        if (scrollResult.text && scrollResult.text.length > text.length) {
          text = scrollResult.text
        }
      }

      // 4. Fallback: single screenshot if no scroll capture
      if (!screenshot) {
        const rect = getResumePanelRect()
        if (rect) {
          const captureRes = await sendMessage<
            { rect: typeof rect },
            { screenshot: string }
          >('CAPTURE_SCREENSHOT', { rect })
          if (captureRes.success && captureRes.data) {
            screenshot = captureRes.data.screenshot
          }
        }
      }

      // 5. Text < 500 chars: keep screenshot as LLM fallback
      //    Text >= 500 chars: screenshot still cached but text is primary
      // (both are always stored; buildMultimodalPrompt handles the logic)

      if (!text && !screenshot) {
        errorMessage.value = '简历内容提取失败，请重试'
        state.value = 'error'
        return
      }

      // 6. Cache extraction result (fire-and-forget)
      sendMessage('SAVE_CACHED_RESUME', { candidateId, text, screenshot })
    }

    lastResumeText.value = text
    lastScreenshot.value = screenshot

    // 7. Check score cache (any template for this candidate)
    const anyCacheRes = await sendMessage<
      { candidateId: string },
      ScoreResult | null
    >('GET_ANY_CACHED_SCORE', { candidateId })

    if (anyCacheRes.success && anyCacheRes.data) {
      scoreResult.value = anyCacheRes.data
      state.value = 'scored'
      return
    }

    // 8. Check if there's a cached score (for button text)
    hasCachedScore.value = false
    state.value = 'ready'
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '简历提取失败'
    state.value = 'error'
  }
}

function handleReExtract(): void {
  lastResumeText.value = ''
  lastScreenshot.value = ''
  scoreResult.value = null
  extractResume(true)
}

async function startScoring(): Promise<void> {
  state.value = 'scoring'
  errorMessage.value = ''

  try {
    const candidateId = getCandidateId()
    const candidateName = getCandidateName()

    const res = await sendMessage<
      { screenshot: string; text: string; templateId: string; candidateId: string; candidateName?: string },
      ScoreResult
    >('SCORE_RESUME', {
      screenshot: lastScreenshot.value,
      text: lastResumeText.value,
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
  state.value = 'ready'
  scoreResult.value = null
}

function handleRetry(): void {
  if (lastResumeText.value || lastScreenshot.value) {
    startScoring()
  } else {
    extractResume()
  }
}
</script>

<template>
  <FloatingPanel>
    <TemplatePicker v-model="selectedTemplate" />

    <IdleState
      v-if="state === 'idle' || state === 'extracting' || state === 'ready'"
      :resume-button-visible="resumeButtonVisible"
      :resume-detected="resumeDetected"
      :extracting="state === 'extracting'"
      :extract-done="state === 'ready'"
      :resume-text="lastResumeText"
      :resume-screenshot="lastScreenshot"
      :has-cached-score="hasCachedScore"
      @score="startScoring"
      @re-extract="handleReExtract"
    />
    <LoadingState v-else-if="state === 'scoring'" />
    <ScoredState
      v-else-if="state === 'scored' && scoreResult"
      :result="scoreResult"
      :resume-text="lastResumeText"
      :resume-screenshot="lastScreenshot"
      @rescore="handleRescore"
      @re-extract="handleReExtract"
    />
    <ErrorState
      v-else-if="state === 'error'"
      :message="errorMessage"
      @retry="handleRetry"
    />
  </FloatingPanel>
</template>
