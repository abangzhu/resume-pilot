export interface ApiSettings {
  apiKey: string
  baseUrl: string
  model: string
}

export interface ScoringTemplate {
  id: string
  name: string
  description: string
  dimensions: Dimension[]
  jd: string
  promptSections: PromptSections
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export interface Dimension {
  id: string
  label: string
  criteria: string
  weight: number
}

export interface PromptSections {
  roleSetup: string | null
  taskGuide: string | null
  scoringRules: string | null
}

export interface ScoreResult {
  candidateId: string
  candidateName?: string
  templateId: string
  scoredAt: number
  recommendation: 'pass' | 'hold' | 'reject'
  overallScore: number
  dimensions: Record<string, { score: number; comment: string; weight: number }>
  summary: string
  highlights: string[]
  concerns: string[]
}

export interface CachedScore {
  result: ScoreResult
  expiresAt: number
}

export interface FieldConfig {
  enabledFields: string[]
  customFields: string[]
}

export interface AdvancedSettings {
  cacheTtlMinutes: number
}

export type MessageType =
  | 'SCORE_RESUME'
  | 'SCORE_RESULT'
  | 'SCORE_ERROR'
  | 'CAPTURE_SCREENSHOT'
  | 'CAPTURE_RESULT'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'GET_TEMPLATES'
  | 'SAVE_TEMPLATE'
  | 'DELETE_TEMPLATE'
  | 'TEST_CONNECTION'
  | 'GET_CACHED_SCORE'
  | 'CLEAR_CACHE'
  | 'STITCH_SCREENSHOTS'

export interface Message<T = unknown> {
  type: MessageType
  payload?: T
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ScoreRequest {
  screenshot: string
  text: string
  templateId: string
  candidateId: string
  candidateName?: string
}

export interface CaptureRequest {
  rect: { x: number; y: number; width: number; height: number }
}

export interface StitchRequest {
  strips: string[]
  stripHeight: number
  panelWidth: number
  totalHeight: number
  overlap: number
}
