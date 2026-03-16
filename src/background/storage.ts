import type { MessageResponse, ScoringTemplate } from '@/shared/types'
import {
  STORAGE_KEYS,
  DEFAULT_API_SETTINGS,
  DEFAULT_FIELD_CONFIG,
  DEFAULT_ADVANCED_SETTINGS,
  DEFAULT_TEMPLATE,
} from '@/shared/constants'
import { generateId, now } from '@/shared/utils'

const DEFAULTS: Record<string, unknown> = {
  [STORAGE_KEYS.API_SETTINGS]: DEFAULT_API_SETTINGS,
  [STORAGE_KEYS.FIELD_CONFIG]: DEFAULT_FIELD_CONFIG,
  [STORAGE_KEYS.ADVANCED_SETTINGS]: DEFAULT_ADVANCED_SETTINGS,
}

export async function getSettings(key: string): Promise<MessageResponse> {
  try {
    const result = await chrome.storage.local.get(key)
    const data = result[key] ?? DEFAULTS[key] ?? null
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function saveSettings(key: string, value: unknown): Promise<MessageResponse> {
  try {
    await chrome.storage.local.set({ [key]: value })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getTemplates(): Promise<MessageResponse<ScoringTemplate[]>> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TEMPLATES)
    let templates: ScoringTemplate[] = result[STORAGE_KEYS.TEMPLATES] ?? []

    if (templates.length === 0) {
      const defaultTemplate: ScoringTemplate = {
        ...DEFAULT_TEMPLATE,
        id: generateId(),
        createdAt: now(),
        updatedAt: now(),
      }
      templates = [defaultTemplate]
      await chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: templates })
    }

    return { success: true, data: templates }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function saveTemplate(template: unknown): Promise<MessageResponse> {
  try {
    const t = template as ScoringTemplate
    const result = await chrome.storage.local.get(STORAGE_KEYS.TEMPLATES)
    const templates: ScoringTemplate[] = result[STORAGE_KEYS.TEMPLATES] ?? []

    const idx = templates.findIndex((item) => item.id === t.id)
    const updated = { ...t, updatedAt: now() }

    if (t.isDefault) {
      const withoutDefault = templates.map((item) => ({ ...item, isDefault: false }))
      if (idx >= 0) {
        withoutDefault[idx] = updated
      } else {
        withoutDefault.push({ ...updated, createdAt: now() })
      }
      await chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: withoutDefault })
    } else if (idx >= 0) {
      const next = [...templates]
      next[idx] = updated
      await chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: next })
    } else {
      await chrome.storage.local.set({
        [STORAGE_KEYS.TEMPLATES]: [...templates, { ...updated, createdAt: now() }],
      })
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function deleteTemplate(id: string): Promise<MessageResponse> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TEMPLATES)
    const templates: ScoringTemplate[] = result[STORAGE_KEYS.TEMPLATES] ?? []
    const filtered = templates.filter((t) => t.id !== id)
    await chrome.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: filtered })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function clearCache(): Promise<MessageResponse> {
  try {
    await chrome.storage.local.remove([STORAGE_KEYS.SCORE_CACHE, STORAGE_KEYS.RESUME_CACHE])
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
