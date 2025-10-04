<template>
  <div v-if="show" class="output" :class="type">
    <button class="output-close" @click="$emit('close')" aria-label="Close message">×</button>
    <div v-html="message"></div>
  </div>
</template>

<script setup>
defineProps({
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
</script>

<style scoped>
.output {
  position: relative;
  margin: 0 auto 20px;
  padding: 16px 48px 16px 20px;
  border-radius: 12px;
  border: none;
  max-width: 1800px;
  animation: slideDown 0.3s ease-out;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  font-weight: 500;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.output-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 20px;
  line-height: 1;
  color: white;
  cursor: pointer;
  opacity: 0.9;
  transition: all 0.2s;
  padding: 4px 8px;
  width: auto;
  height: auto;
}

.output-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.output.success {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  color: white;
}

.output.error {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
}
</style>
