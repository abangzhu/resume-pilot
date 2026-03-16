<script setup lang="ts">
defineProps<{
  message: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="rp-error">
    <div class="rp-error-icon">!</div>
    <p class="rp-error-msg">{{ message }}</p>
    <button class="rp-retry-btn" @click="$emit('retry')">重试</button>
  </div>
</template>
