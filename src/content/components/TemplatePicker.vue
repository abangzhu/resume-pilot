<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ScoringTemplate } from '@/shared/types'
import { sendMessage } from '@/shared/messaging'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const templates = ref<ScoringTemplate[]>([])

onMounted(async () => {
  const res = await sendMessage<void, ScoringTemplate[]>('GET_TEMPLATES')
  if (res.success && res.data) {
    templates.value = res.data
    if (!props.modelValue) {
      const defaultTpl = res.data.find((t) => t.isDefault) ?? res.data[0]
      if (defaultTpl) emit('update:modelValue', defaultTpl.id)
    }
  }
})
</script>

<template>
  <div class="rp-picker">
    <select
      class="rp-select"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
        {{ tpl.name }}
      </option>
    </select>
  </div>
</template>
