<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { AdvancedSettings } from '@/shared/types'
import { DEFAULT_ADVANCED_SETTINGS } from '@/shared/constants'
import { storageClient } from '@/shared/storage-client'

const form = ref<AdvancedSettings>({ ...DEFAULT_ADVANCED_SETTINGS })
const saving = ref(false)
const clearing = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

onMounted(async () => {
  const res = await storageClient.getAdvancedSettings()
  if (res.success && res.data) {
    form.value = res.data
  }
})

async function save(): Promise<void> {
  saving.value = true
  message.value = null
  try {
    const res = await storageClient.saveAdvancedSettings(form.value)
    message.value = res.success
      ? { type: 'success', text: '保存成功' }
      : { type: 'error', text: res.error ?? '保存失败' }
  } finally {
    saving.value = false
  }
}

async function clearCache(): Promise<void> {
  clearing.value = true
  message.value = null
  try {
    const res = await storageClient.clearCache()
    message.value = res.success
      ? { type: 'success', text: '缓存已清除' }
      : { type: 'error', text: res.error ?? '清除失败' }
  } finally {
    clearing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">高级设置</h2>
      <p class="text-sm text-gray-500 mt-1">缓存和其他高级配置</p>
    </div>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          缓存有效期（分钟）
        </label>
        <input
          v-model.number="form.cacheTtlMinutes"
          type="number"
          min="0"
          class="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p class="text-xs text-gray-400 mt-1">设为 0 禁用缓存，默认 1440 分钟（24 小时）</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">缓存管理</label>
        <button
          class="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          :disabled="clearing"
          @click="clearCache"
        >
          {{ clearing ? '清除中...' : '清除所有缓存' }}
        </button>
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
