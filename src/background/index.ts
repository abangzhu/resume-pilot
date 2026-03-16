import { onMessage } from '@/shared/messaging'
import type {
  Message,
  MessageResponse,
  ApiSettings,
  ScoringTemplate,
  ScoreRequest,
  CaptureRequest,
  StitchRequest,
  CachedScore,
  CachedResume,
} from '@/shared/types'
import { STORAGE_KEYS } from '@/shared/constants'
import {
  getSettings,
  saveSettings,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  clearCache,
} from './storage'
import { captureAndCrop, stitchScreenshots } from './capture'
import { scoreResume, testApiConnection } from './llm'
import { now } from '@/shared/utils'

console.log('[Resume Pilot] Background service worker started')

onMessage(async (message: Message, sender): Promise<MessageResponse> => {
  const { type, payload } = message

  switch (type) {
    case 'GET_SETTINGS': {
      const { key } = payload as { key: string }
      return getSettings(key)
    }

    case 'SAVE_SETTINGS': {
      const { key, value } = payload as { key: string; value: unknown }
      return saveSettings(key, value)
    }

    case 'GET_TEMPLATES':
      return getTemplates()

    case 'SAVE_TEMPLATE': {
      const { template } = payload as { template: unknown }
      return saveTemplate(template)
    }

    case 'DELETE_TEMPLATE': {
      const { id } = payload as { id: string }
      return deleteTemplate(id)
    }

    case 'TEST_CONNECTION': {
      try {
        const settingsRes = await getSettings(STORAGE_KEYS.API_SETTINGS)
        if (!settingsRes.success || !settingsRes.data) {
          return { success: false, error: '未配置 API' }
        }
        const result = await testApiConnection(settingsRes.data as ApiSettings)
        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    case 'CAPTURE_SCREENSHOT': {
      try {
        const tabId = sender.tab?.id
        if (!tabId) {
          return { success: false, error: 'No tab ID' }
        }
        const screenshot = await captureAndCrop(payload as CaptureRequest, tabId)
        return { success: true, data: { screenshot } }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    case 'STITCH_SCREENSHOTS': {
      try {
        const screenshot = await stitchScreenshots(payload as StitchRequest)
        return { success: true, data: { screenshot } }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    case 'SCORE_RESUME': {
      try {
        const request = payload as ScoreRequest
        const settingsRes = await getSettings(STORAGE_KEYS.API_SETTINGS)
        if (!settingsRes.success || !settingsRes.data) {
          return { success: false, error: '请先配置 API 设置' }
        }

        const templatesRes = await getTemplates()
        if (!templatesRes.success || !templatesRes.data) {
          return { success: false, error: '未找到评分模板' }
        }

        const templates = templatesRes.data as ScoringTemplate[]
        const template =
          templates.find((t) => t.id === request.templateId) ??
          templates.find((t) => t.isDefault)

        if (!template) {
          return { success: false, error: '未找到指定模板' }
        }

        const result = await scoreResume(settingsRes.data as ApiSettings, template, request)

        const advRes = await getSettings(STORAGE_KEYS.ADVANCED_SETTINGS)
        const ttl = (advRes.data as { cacheTtlMinutes?: number } | null)?.cacheTtlMinutes ?? 1440

        if (ttl > 0) {
          const cacheRes = await chrome.storage.local.get(STORAGE_KEYS.SCORE_CACHE)
          const cache: Record<string, CachedScore> = cacheRes[STORAGE_KEYS.SCORE_CACHE] ?? {}
          const cacheKey = `${request.candidateId}_${template.id}`
          cache[cacheKey] = {
            result,
            expiresAt: now() + ttl * 60 * 1000,
          }
          await chrome.storage.local.set({ [STORAGE_KEYS.SCORE_CACHE]: cache })
        }

        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) }
      }
    }

    case 'GET_CACHED_SCORE': {
      try {
        const { candidateId, templateId } = payload as {
          candidateId: string
          templateId: string
        }
        const cacheRes = await chrome.storage.local.get(STORAGE_KEYS.SCORE_CACHE)
        const cache: Record<string, CachedScore> = cacheRes[STORAGE_KEYS.SCORE_CACHE] ?? {}
        const cacheKey = `${candidateId}_${templateId}`
        const entry = cache[cacheKey]

        if (entry && entry.expiresAt > now()) {
          return { success: true, data: entry.result }
        }

        return { success: true, data: null }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    case 'GET_ANY_CACHED_SCORE': {
      try {
        const { candidateId } = payload as { candidateId: string }
        const cacheRes = await chrome.storage.local.get(STORAGE_KEYS.SCORE_CACHE)
        const cache: Record<string, CachedScore> = cacheRes[STORAGE_KEYS.SCORE_CACHE] ?? {}
        const currentTime = now()

        for (const [key, entry] of Object.entries(cache)) {
          if (key.startsWith(`${candidateId}_`) && entry.expiresAt > currentTime) {
            return { success: true, data: entry.result }
          }
        }

        return { success: true, data: null }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    case 'GET_CACHED_RESUME': {
      try {
        const { candidateId } = payload as { candidateId: string }
        const cacheRes = await chrome.storage.local.get(STORAGE_KEYS.RESUME_CACHE)
        const cache: Record<string, CachedResume> = cacheRes[STORAGE_KEYS.RESUME_CACHE] ?? {}
        const entry = cache[candidateId]

        if (entry && entry.expiresAt > now()) {
          return { success: true, data: entry }
        }

        return { success: true, data: null }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    case 'SAVE_CACHED_RESUME': {
      try {
        const { candidateId, text, screenshot } = payload as {
          candidateId: string
          text: string
          screenshot: string
        }
        const advRes = await getSettings(STORAGE_KEYS.ADVANCED_SETTINGS)
        const ttl = (advRes.data as { cacheTtlMinutes?: number } | null)?.cacheTtlMinutes ?? 1440

        if (ttl > 0) {
          const cacheRes = await chrome.storage.local.get(STORAGE_KEYS.RESUME_CACHE)
          const cache: Record<string, CachedResume> = cacheRes[STORAGE_KEYS.RESUME_CACHE] ?? {}

          const MAX_ENTRIES = 20
          const entries = Object.entries(cache)
          let evicted: Record<string, CachedResume> = cache
          if (entries.length >= MAX_ENTRIES) {
            const sorted = entries.sort(([, a], [, b]) => a.extractedAt - b.extractedAt)
            evicted = Object.fromEntries(sorted.slice(entries.length - MAX_ENTRIES + 1))
          }

          const updated = {
            ...evicted,
            [candidateId]: {
              text,
              screenshot,
              extractedAt: now(),
              expiresAt: now() + ttl * 60 * 1000,
            },
          }
          await chrome.storage.local.set({ [STORAGE_KEYS.RESUME_CACHE]: updated })
        }

        return { success: true }
      } catch (error) {
        return { success: false, error: String(error) }
      }
    }

    case 'CLEAR_CACHE':
      return clearCache()

    default:
      return { success: false, error: `Unknown message type: ${type}` }
  }
})
