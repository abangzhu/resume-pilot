import type { ApiSettings, AdvancedSettings, FieldConfig, ScoringTemplate } from './types'

export const DEFAULT_API_SETTINGS: ApiSettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o',
}

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  cacheTtlMinutes: 1440,
}

export const DEFAULT_FIELD_CONFIG: FieldConfig = {
  enabledFields: [
    '基本信息',
    '工作经历',
    '教育背景',
    '项目经验',
    '技能清单',
    '求职意向',
  ],
  customFields: [],
}

export const AVAILABLE_FIELDS = [
  '基本信息',
  '工作经历',
  '教育背景',
  '项目经验',
  '技能清单',
  '求职意向',
  '自我评价',
  '证书资质',
  '语言能力',
] as const

export const DEFAULT_PROMPT_SECTIONS = {
  roleSetup: `你是一位资深的技术招聘专家，拥有丰富的简历筛选经验。
你需要根据岗位 JD 和评分维度，对候选人简历进行客观、专业的评估。`,

  taskGuide: `请根据以下岗位 JD 和评分维度，对候选人简历进行评分。
对每个维度给出 0-100 的分数和简要评语。
最后给出综合评分、推荐结论、亮点和顾虑。`,

  scoringRules: `评分规则：
- 每个维度 0-100 分
- 90+ 优秀，80-89 良好，70-79 中等，60-69 一般，<60 不足
- 综合评分 = 各维度加权平均
- 推荐结论：80+ pass，60-79 hold，<60 reject
- 评语要具体，引用简历中的实际内容`,
} as const

export const DEFAULT_TEMPLATE: Omit<ScoringTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '通用技术岗位模板',
  description: '适用于大多数技术岗位的简历评估',
  dimensions: [
    { id: 'exp', label: '工作经验匹配度', criteria: '工作年限、行业经验与岗位要求的匹配程度', weight: 30 },
    { id: 'skill', label: '技术能力', criteria: '核心技术栈的掌握程度和深度', weight: 25 },
    { id: 'proj', label: '项目经验', criteria: '项目复杂度、规模、个人贡献和成果', weight: 25 },
    { id: 'edu', label: '教育背景', criteria: '学历、专业相关性', weight: 10 },
    { id: 'fit', label: '综合适配度', criteria: '求职意向、稳定性、职业发展方向', weight: 10 },
  ],
  jd: '',
  promptSections: {
    roleSetup: null,
    taskGuide: null,
    scoringRules: null,
  },
  isDefault: true,
}

export const STORAGE_KEYS = {
  API_SETTINGS: 'apiSettings',
  TEMPLATES: 'templates',
  FIELD_CONFIG: 'fieldConfig',
  ADVANCED_SETTINGS: 'advancedSettings',
  SCORE_CACHE: 'scoreCache',
} as const

export const LLM_RESPONSE_FORMAT = `请严格按以下 JSON 格式返回结果，不要包含其他内容：
{
  "recommendation": "pass" | "hold" | "reject",
  "overallScore": number,
  "dimensions": {
    "<维度ID>": { "score": number, "comment": "string", "weight": number }
  },
  "summary": "综合评价",
  "highlights": ["亮点1", "亮点2"],
  "concerns": ["顾虑1", "顾虑2"]
}` as const
