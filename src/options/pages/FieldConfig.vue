<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { FieldConfig } from '@/shared/types'
import { DEFAULT_FIELD_CONFIG, AVAILABLE_FIELDS } from '@/shared/constants'
import { storageClient } from '@/shared/storage-client'

const config = ref<FieldConfig>({ ...DEFAULT_FIELD_CONFIG })
const newField = ref('')
const saving = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

onMounted(async () => {
  const res = await storageClient.getFieldConfig()
  if (res.success && res.data) {
    config.value = res.data
  }
})

function toggleField(field: string): void {
  const idx = config.value.enabledFields.indexOf(field)
  config.value = {
    ...config.value,
    enabledFields:
      idx >= 0
        ? config.value.enabledFields.filter((f) => f !== field)
        : [...config.value.enabledFields, field],
  }
}

function addCustomField(): void {
  const trimmed = newField.value.trim()
  if (!trimmed || config.value.customFields.includes(trimmed)) return
  config.value = {
    ...config.value,
    customFields: [...config.value.customFields, trimmed],
    enabledFields: [...config.value.enabledFields, trimmed],
  }
  newField.value = ''
}

function removeCustomField(field: string): void {
  config.value = {
    ...config.value,
    customFields: config.value.customFields.filter((f) => f !== field),
    enabledFields: config.value.enabledFields.filter((f) => f !== field),
  }
}

async function save(): Promise<void> {
  saving.value = true
  message.value = null
  try {
    const res = await storageClient.saveFieldConfig(config.value)
    message.value = res.success
      ? { type: 'success', text: '保存成功' }
      : { type: 'error', text: res.error ?? '保存失败' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">字段配置</h2>
      <p class="text-sm text-gray-500 mt-1">选择简历提取时关注的字段</p>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-700 mb-3">预设字段</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="field in AVAILABLE_FIELDS"
          :key="field"
          class="px-3 py-1.5 text-sm rounded-full border transition-colors"
          :class="
            config.enabledFields.includes(field)
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
              : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
          "
          @click="toggleField(field)"
        >
          {{ field }}
        </button>
      </div>
    </div>

    <div>
      <h3 class="text-sm font-medium text-gray-700 mb-3">自定义字段</h3>
      <div class="flex gap-2 mb-3">
        <input
          v-model="newField"
          type="text"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="输入自定义字段名称"
          @keyup.enter="addCustomField"
        />
        <button
          class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
          @click="addCustomField"
        >
          添加
        </button>
      </div>
      <div v-if="config.customFields.length" class="flex flex-wrap gap-2">
        <span
          v-for="field in config.customFields"
          :key="field"
          class="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-sm rounded-full"
        >
          {{ field }}
          <button class="text-purple-400 hover:text-purple-600" @click="removeCustomField(field)">
            &times;
          </button>
        </span>
      </div>
    </div>

    <div
      v-if="message"
      class="px-4 py-2 rounded-lg text-sm"
      :class="message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
    >
      {{ message.text }}
    </div>

    <button
      class="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
      :disabled="saving"
      @click="save"
    >
      {{ saving ? '保存中...' : '保存' }}
    </button>
  </div>
</template>
