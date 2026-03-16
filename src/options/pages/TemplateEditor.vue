<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ScoringTemplate, Dimension } from '@/shared/types'
import { DEFAULT_PROMPT_SECTIONS } from '@/shared/constants'
import { generateId, now } from '@/shared/utils'
import { storageClient } from '@/shared/storage-client'

const props = defineProps<{
  template?: ScoringTemplate
}>()

const emit = defineEmits<{
  back: []
  saved: []
}>()

const isNew = !props.template

const form = ref<ScoringTemplate>(
  props.template
    ? { ...props.template }
    : {
        id: generateId(),
        name: '',
        description: '',
        dimensions: [],
        jd: '',
        promptSections: { roleSetup: null, taskGuide: null, scoringRules: null },
        isDefault: false,
        createdAt: now(),
        updatedAt: now(),
      },
)

const saving = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const activeSection = ref<'dimensions' | 'prompt' | 'jd'>('dimensions')

const totalWeight = computed(() =>
  form.value.dimensions.reduce((sum, d) => sum + d.weight, 0),
)

const weightValid = computed(() => totalWeight.value === 100 || form.value.dimensions.length === 0)

function addDimension(): void {
  const dim: Dimension = {
    id: generateId(),
    label: '',
    criteria: '',
    weight: 0,
  }
  form.value = {
    ...form.value,
    dimensions: [...form.value.dimensions, dim],
  }
}

function updateDimension(index: number, updates: Partial<Dimension>): void {
  const dims = form.value.dimensions.map((d, i) => (i === index ? { ...d, ...updates } : d))
  form.value = { ...form.value, dimensions: dims }
}

function removeDimension(index: number): void {
  form.value = {
    ...form.value,
    dimensions: form.value.dimensions.filter((_, i) => i !== index),
  }
}

function getEffectivePrompt(key: keyof typeof DEFAULT_PROMPT_SECTIONS): string {
  return form.value.promptSections[key] ?? DEFAULT_PROMPT_SECTIONS[key]
}

function setPromptSection(key: keyof typeof DEFAULT_PROMPT_SECTIONS, value: string): void {
  const isDefault = value === DEFAULT_PROMPT_SECTIONS[key]
  form.value = {
    ...form.value,
    promptSections: {
      ...form.value.promptSections,
      [key]: isDefault ? null : value,
    },
  }
}

async function save(): Promise<void> {
  if (!form.value.name.trim()) {
    message.value = { type: 'error', text: '请输入模板名称' }
    return
  }
  if (!weightValid.value) {
    message.value = { type: 'error', text: `权重总和必须为 100，当前为 ${totalWeight.value}` }
    return
  }

  saving.value = true
  message.value = null
  try {
    const res = await storageClient.saveTemplate(form.value)
    if (res.success) {
      message.value = { type: 'success', text: '保存成功' }
      emit('saved')
    } else {
      message.value = { type: 'error', text: res.error ?? '保存失败' }
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <button class="text-gray-500 hover:text-gray-700 text-sm" @click="emit('back')">&larr; 返回</button>
      <h2 class="text-lg font-semibold text-gray-900">
        {{ isNew ? '新建模板' : '编辑模板' }}
      </h2>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
        <input
          v-model="form.name"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="例如：高级前端工程师"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <input
          v-model="form.description"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="模板用途描述"
        />
      </div>
    </div>

    <div class="flex border-b border-gray-200">
      <button
        v-for="sec in (['dimensions', 'jd', 'prompt'] as const)"
        :key="sec"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="
          activeSection === sec
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
        @click="activeSection = sec"
      >
        {{ sec === 'dimensions' ? '评分维度' : sec === 'jd' ? '岗位 JD' : 'Prompt 配置' }}
      </button>
    </div>

    <!-- Dimensions -->
    <div v-if="activeSection === 'dimensions'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-500">
          权重总和:
          <span :class="weightValid ? 'text-green-600' : 'text-red-600'" class="font-medium">
            {{ totalWeight }}/100
          </span>
        </div>
        <button
          class="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          @click="addDimension"
        >
          添加维度
        </button>
      </div>

      <div
        v-for="(dim, i) in form.dimensions"
        :key="dim.id"
        class="p-4 border border-gray-200 rounded-lg space-y-3"
      >
        <div class="flex gap-3">
          <div class="flex-1">
            <input
              :value="dim.label"
              type="text"
              class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="维度名称"
              @input="updateDimension(i, { label: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="w-24">
            <input
              :value="dim.weight"
              type="number"
              min="0"
              max="100"
              class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm text-center"
              placeholder="权重"
              @input="updateDimension(i, { weight: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <button class="text-red-400 hover:text-red-600 text-sm" @click="removeDimension(i)">
            删除
          </button>
        </div>
        <textarea
          :value="dim.criteria"
          class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm resize-none"
          rows="2"
          placeholder="评分标准描述"
          @input="updateDimension(i, { criteria: ($event.target as HTMLTextAreaElement).value })"
        />
      </div>
    </div>

    <!-- JD -->
    <div v-if="activeSection === 'jd'" class="space-y-3">
      <p class="text-sm text-gray-500">粘贴岗位 JD，用于评分时参考</p>
      <textarea
        v-model="form.jd"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        rows="12"
        placeholder="粘贴岗位描述..."
      />
    </div>

    <!-- Prompt Sections -->
    <div v-if="activeSection === 'prompt'" class="space-y-6">
      <div v-for="(label, key) in { roleSetup: '角色设定', taskGuide: '任务指引', scoringRules: '评分规则' }" :key="key">
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-gray-700">{{ label }}</label>
          <span
            v-if="form.promptSections[key as keyof typeof form.promptSections] === null"
            class="text-xs text-gray-400"
          >
            使用默认值
          </span>
        </div>
        <textarea
          :value="getEffectivePrompt(key as keyof typeof DEFAULT_PROMPT_SECTIONS)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows="4"
          @input="setPromptSection(key as keyof typeof DEFAULT_PROMPT_SECTIONS, ($event.target as HTMLTextAreaElement).value)"
        />
      </div>
    </div>

    <div
      v-if="message"
      class="px-4 py-2 rounded-lg text-sm"
      :class="message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
    >
      {{ message.text }}
    </div>

    <div class="flex gap-3">
      <button
        class="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? '保存中...' : '保存模板' }}
      </button>
      <button
        class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        @click="emit('back')"
      >
        取消
      </button>
    </div>
  </div>
</template>
