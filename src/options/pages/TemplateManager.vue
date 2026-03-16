<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ScoringTemplate } from '@/shared/types'
import { storageClient } from '@/shared/storage-client'

const emit = defineEmits<{
  editTemplate: [template: ScoringTemplate]
  newTemplate: []
}>()

const templates = ref<ScoringTemplate[]>([])
const loading = ref(true)

onMounted(loadTemplates)

async function loadTemplates(): Promise<void> {
  loading.value = true
  try {
    const res = await storageClient.getTemplates()
    if (res.success && res.data) {
      templates.value = res.data
    }
  } finally {
    loading.value = false
  }
}

async function deleteTemplate(id: string): Promise<void> {
  const tpl = templates.value.find((t) => t.id === id)
  if (!tpl) return
  if (tpl.isDefault) return

  await storageClient.deleteTemplate(id)
  await loadTemplates()
}

async function setDefault(id: string): Promise<void> {
  const tpl = templates.value.find((t) => t.id === id)
  if (!tpl || tpl.isDefault) return

  const updated: ScoringTemplate = { ...tpl, isDefault: true }
  await storageClient.saveTemplate(updated)
  await loadTemplates()
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">评分模板</h2>
        <p class="text-sm text-gray-500 mt-1">管理评分模板，每个模板包含评分维度和 Prompt 配置</p>
      </div>
      <button
        class="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors"
        @click="emit('newTemplate')"
      >
        新建模板
      </button>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">加载中...</div>

    <div v-else class="space-y-3">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-medium text-gray-900 truncate">{{ tpl.name }}</h3>
            <span
              v-if="tpl.isDefault"
              class="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-full"
            >
              默认
            </span>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            {{ tpl.dimensions.length }} 个维度 &middot; 更新于 {{ formatDate(tpl.updatedAt) }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="!tpl.isDefault"
            class="px-3 py-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            @click="setDefault(tpl.id)"
          >
            设为默认
          </button>
          <button
            class="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            @click="emit('editTemplate', tpl)"
          >
            编辑
          </button>
          <button
            v-if="!tpl.isDefault"
            class="px-3 py-1 text-xs text-red-500 hover:text-red-700 transition-colors"
            @click="deleteTemplate(tpl.id)"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
