import type {
  ApiSettings,
  ScoringTemplate,
  ScoreResult,
  ScoreRequest,
} from '@/shared/types'
import { DEFAULT_PROMPT_SECTIONS, LLM_RESPONSE_FORMAT } from '@/shared/constants'
import { now } from '@/shared/utils'

interface ChatMessage {
  role: 'system' | 'user'
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

export function buildPrompt(template: ScoringTemplate, resumeText: string): ChatMessage[] {
  const sections = template.promptSections
  const roleSetup = sections.roleSetup ?? DEFAULT_PROMPT_SECTIONS.roleSetup
  const taskGuide = sections.taskGuide ?? DEFAULT_PROMPT_SECTIONS.taskGuide
  const scoringRules = sections.scoringRules ?? DEFAULT_PROMPT_SECTIONS.scoringRules

  const dimensionDesc = template.dimensions
    .map((d) => `- ${d.label}（权重 ${d.weight}%）: ${d.criteria}`)
    .join('\n')

  const systemMessage = [
    roleSetup,
    '',
    taskGuide,
    '',
    scoringRules,
    '',
    '## 评分维度',
    dimensionDesc,
    '',
    template.jd ? `## 岗位 JD\n${template.jd}` : '',
    '',
    '## 输出格式',
    LLM_RESPONSE_FORMAT,
  ]
    .filter(Boolean)
    .join('\n')

  const userMessage = `请评估以下简历：\n\n${resumeText}`

  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage },
  ]
}

export function buildMultimodalPrompt(
  template: ScoringTemplate,
  screenshot: string,
  resumeText: string,
): ChatMessage[] {
  const sections = template.promptSections
  const roleSetup = sections.roleSetup ?? DEFAULT_PROMPT_SECTIONS.roleSetup
  const taskGuide = sections.taskGuide ?? DEFAULT_PROMPT_SECTIONS.taskGuide
  const scoringRules = sections.scoringRules ?? DEFAULT_PROMPT_SECTIONS.scoringRules

  const dimensionDesc = template.dimensions
    .map((d) => `- ${d.label}（权重 ${d.weight}%）: ${d.criteria}`)
    .join('\n')

  const systemContent = [
    roleSetup,
    '',
    taskGuide,
    '',
    scoringRules,
    '',
    '## 评分维度',
    dimensionDesc,
    '',
    template.jd ? `## 岗位 JD\n${template.jd}` : '',
    '',
    '## 输出格式',
    LLM_RESPONSE_FORMAT,
  ]
    .filter(Boolean)
    .join('\n')

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

  if (screenshot) {
    userContent.push({
      type: 'image_url',
      image_url: { url: screenshot },
    })
  }

  userContent.push({
    type: 'text',
    text: resumeText
      ? `请根据以下简历截图和文本内容进行评估：\n\n${resumeText}`
      : '请根据以上简历截图进行评估。',
  })

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ]
}

export async function callLlm(
  settings: ApiSettings,
  messages: ChatMessage[],
): Promise<string> {
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.3,
      max_completion_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`API request failed (${response.status}): ${errorBody}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('Unexpected API response format')
  }

  return content
}

export function parseScoreResponse(
  raw: string,
  candidateId: string,
  templateId: string,
): ScoreResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from LLM response')
  }

  const parsed = JSON.parse(jsonMatch[0])

  return {
    candidateId,
    templateId,
    scoredAt: now(),
    recommendation: parsed.recommendation ?? 'hold',
    overallScore: Number(parsed.overallScore) || 0,
    dimensions: parsed.dimensions ?? {},
    summary: parsed.summary ?? '',
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
    concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
  }
}

export async function scoreResume(
  settings: ApiSettings,
  template: ScoringTemplate,
  request: ScoreRequest,
): Promise<ScoreResult> {
  const messages = request.screenshot
    ? buildMultimodalPrompt(template, request.screenshot, request.text)
    : buildPrompt(template, request.text)

  const raw = await callLlm(settings, messages)
  return parseScoreResponse(raw, request.candidateId, template.id)
}

export async function testApiConnection(settings: ApiSettings): Promise<{ ok: boolean; message: string }> {
  try {
    const url = `${settings.baseUrl.replace(/\/+$/, '')}/models`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
      },
    })

    if (response.ok) {
      return { ok: true, message: '连接成功' }
    }

    return { ok: false, message: `连接失败 (${response.status}): ${await response.text()}` }
  } catch (error) {
    return { ok: false, message: `连接失败: ${error instanceof Error ? error.message : String(error)}` }
  }
}
