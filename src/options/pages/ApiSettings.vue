<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ApiSettings } from '@/shared/types'
import { DEFAULT_API_SETTINGS } from '@/shared/constants'
import { storageClient } from '@/shared/storage-client'

const form = ref<ApiSettings>({ ...DEFAULT_API_SETTINGS })
const saving = ref(false)
const testing = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

onMounted(async () => {
  const res = await storageClient.getApiSettings()
  if (res.success && res.data) {
    form.value = res.data
  }
})

async function save(): Promise<void> {
  saving.value = true
  message.value = null
  try {
    const res = await storageClient.saveApiSettings(form.value)
    message.value = res.success
      ? { type: 'success', text: '保存成功' }
      : { type: 'error', text: res.error ?? '保存失败' }
  } finally {
    saving.value = false
  }
}

async function testConnection(): Promise<void> {
  testing.value = true
  message.value = null
  try {
    const res = await storageClient.testConnection()
    if (res.success && res.data) {
      message.value = { type: res.data.ok ? 'success' : 'error', text: res.data.message }
    } else {
      message.value = { type: 'error', text: res.error ?? '连接失败' }
    }
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">API 配置</h2>
      <p class="text-sm text-gray-500 mt-1">配置 LLM API 连接信息，支持 OpenAI 兼容接口</p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">API Key</label>
        <input
          v-model="form.apiKey"
          type="password"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="sk-..."
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
        <input
          v-model="form.baseUrl"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://api.openai.com/v1"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">模型</label>
        <input
          v-model="form.model"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="gpt-4o"
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
        {{ saving ? '保存中...' : '保存' }}
      </button>
      <button
        class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        :disabled="testing"
        @click="testConnection"
      >
        {{ testing ? '测试中...' : '测试连接' }}
      </button>
    </div>
  </div>
</template>
