<script setup lang="ts">
function openOptions(): void {
  chrome.runtime.openOptionsPage()
}
</script>

<template>
  <div class="w-72 p-4">
    <div class="flex items-center gap-2 mb-3">
      <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
        <span class="text-white text-sm font-bold">RP</span>
      </div>
      <div>
        <h1 class="text-sm font-semibold text-gray-900">Resume Pilot</h1>
        <p class="text-xs text-gray-500">AI 简历筛选助手</p>
      </div>
    </div>

    <div class="bg-gray-50 rounded-lg p-3 mb-3">
      <p class="text-xs text-gray-600">
        在 Boss 直聘聊天页面查看简历时，使用浮窗进行 AI 评分。
      </p>
    </div>

    <button
      class="w-full px-3 py-2 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
      @click="openOptions"
    >
      打开设置
    </button>
  </div>
</template>
