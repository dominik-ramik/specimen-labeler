<template>
  <v-alert
    v-if="show"
    :type="alertType"
    :icon="alertIcon"
    closable
    @click:close="$emit('close')"
    class="output-message"
    variant="tonal"
    border="start"
  >
    <div v-html="message"></div>
  </v-alert>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info'
  }
})

defineEmits(['close'])

const alertType = computed(() => {
  switch (props.type) {
    case 'success': return 'success'
    case 'error': return 'error'
    case 'warning': return 'warning'
    default: return 'info'
  }
})

const alertIcon = computed(() => {
  switch (props.type) {
    case 'success': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    case 'warning': return 'mdi-alert'
    default: return 'mdi-information'
  }
})
</script>

<style scoped>
.output-message {
  margin-bottom: 0;
}
</style>
