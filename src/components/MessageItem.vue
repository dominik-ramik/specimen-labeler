<template>
  <v-card
    :color="cardColor"
    variant="tonal"
    class="message-item"
  >
    <v-card-text class="pa-3">
      <div class="d-flex align-start">
        <v-icon :color="iconColor" size="20" class="mr-2 mt-1">{{ icon }}</v-icon>
        <div class="flex-grow-1">
          <div class="message-title">{{ message.title }}</div>
          <div v-if="message.message" class="message-body mt-1">
            {{ message.message }}
          </div>
          <div v-if="message.items?.length" class="message-items mt-2">
            <code v-for="item in displayItems" :key="item" class="item-chip">
              {{ formatItem(item) }}
            </code>
            <span v-if="message.items.length > maxItems" class="text-grey text-caption">
              ...and {{ message.items.length - maxItems }} more
            </span>
          </div>
          <div v-if="message.suggestion" class="message-suggestion mt-2">
            💡 {{ message.suggestion }}
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { MESSAGE_TYPES, MESSAGE_CATEGORIES } from '@/composables/useMessages'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  maxItems: {
    type: Number,
    default: 5
  }
})

defineEmits(['dismiss'])

const cardColor = computed(() => {
  switch (props.message.type) {
    case MESSAGE_TYPES.ERROR: return 'error'
    case MESSAGE_TYPES.WARNING: return 'warning'
    case MESSAGE_TYPES.SUCCESS: return 'success'
    default: return 'info'
  }
})

const iconColor = computed(() => cardColor.value)

const icon = computed(() => {
  switch (props.message.type) {
    case MESSAGE_TYPES.ERROR: return 'mdi-alert-circle'
    case MESSAGE_TYPES.WARNING: return 'mdi-alert'
    case MESSAGE_TYPES.SUCCESS: return 'mdi-check-circle'
    default: return 'mdi-information'
  }
})

const displayItems = computed(() => 
  props.message.items.slice(0, props.maxItems)
)

const formatItem = (item) => {
  // Add braces for placeholder-like items in validation category
  if (props.message.category === MESSAGE_CATEGORIES.VALIDATION && !item.startsWith('{')) {
    return `{${item}}`
  }
  return item
}
</script>

<style scoped>
.message-item {
  border-radius: 8px;
}

.message-title {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.4;
}

.message-body {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.4;
}

.message-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.item-chip {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.message-suggestion {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}
</style>
