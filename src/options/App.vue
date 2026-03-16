<script setup lang="ts">
import { ref } from 'vue'
import type { ScoringTemplate } from '@/shared/types'
import ApiSettings from './pages/ApiSettings.vue'
import FieldConfig from './pages/FieldConfig.vue'
import TemplateManager from './pages/TemplateManager.vue'
import TemplateEditor from './pages/TemplateEditor.vue'
import AdvancedSettings from './pages/AdvancedSettings.vue'

const tabs = ['API 设置', '字段配置', '评分模板', '高级设置'] as const
type Tab = (typeof tabs)[number]
const activeTab = ref<Tab>('API 设置')

const editingTemplate = ref<ScoringTemplate | undefined>(undefined)
const showEditor = ref(false)

function handleEditTemplate(tpl: ScoringTemplate): void {
  editingTemplate.value = tpl
  showEditor.value = true
}

function handleNewTemplate(): void {
  editingTemplate.value = undefined
  showEditor.value = true
}

function handleEditorBack(): void {
  showEditor.value = false
  editingTemplate.value = undefined
}

function handleEditorSaved(): void {
  showEditor.value = false
  editingTemplate.value = undefined
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Resume Pilot 设置</h1>

      <div class="flex border-b border-gray-200 mb-6">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === tab
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          "
          @click="activeTab = tab; showEditor = false"
        >
          {{ tab }}
        </button>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <ApiSettings v-if="activeTab === 'API 设置'" />
        <FieldConfig v-else-if="activeTab === '字段配置'" />
        <template v-else-if="activeTab === '评分模板'">
          <TemplateEditor
            v-if="showEditor"
            :template="editingTemplate"
            @back="handleEditorBack"
            @saved="handleEditorSaved"
          />
          <TemplateManager
            v-else
            @edit-template="handleEditTemplate"
            @new-template="handleNewTemplate"
          />
        </template>
        <AdvancedSettings v-else-if="activeTab === '高级设置'" />
      </div>
    </div>
  </div>
</template>
