<template>
  <v-btn
    v-if="hasMessages"
    :color="indicatorColor"
    variant="tonal"
    size="small"
    @click="$emit('click')"
    class="message-indicator"
  >
    <v-icon start size="small">{{ indicatorIcon }}</v-icon>
    <span v-if="errorCount > 0">{{ errorCount }} error{{ errorCount > 1 ? 's' : '' }}</span>
    <span v-else-if="warningCount > 0">{{ warningCount }} warning{{ warningCount > 1 ? 's' : '' }}</span>
    <span v-else>{{ infoCount }} message{{ infoCount > 1 ? 's' : '' }}</span>
  </v-btn>
</template>

<script setup>
import { computed } from 'vue'
import { useMessages, MESSAGE_TYPES } from '@/composables/useMessages'

defineEmits(['click'])

const { hasMessages, errorCount, warningCount, infoCount, messages } = useMessages()

const indicatorColor = computed(() => {
  if (errorCount.value > 0) return 'error'
  if (warningCount.value > 0) return 'warning'
  return 'info'
})

const indicatorIcon = computed(() => {
  if (errorCount.value > 0) return 'mdi-alert-circle'
  if (warningCount.value > 0) return 'mdi-alert'
  return 'mdi-information'
})
</script>

<style scoped>
.message-indicator {
  text-transform: none;
  font-weight: 500;
}
</style>
