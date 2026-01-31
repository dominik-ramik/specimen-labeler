<template>
  <v-navigation-drawer
    v-model="isOpen"
    location="right"
    :width="400"    
    class="message-drawer"
  >
  <!-- never make this navigation drawer temporary -->
    <div class="drawer-header">
      <div class="d-flex align-center">
        <v-icon start>mdi-message-alert-outline</v-icon>
        <span class="drawer-title">Messages</span>
        <v-spacer></v-spacer>
        <v-chip v-if="errorCount > 0" size="small" color="error" variant="flat" class="mr-1">
          {{ errorCount }}
        </v-chip>
        <v-chip v-if="warningCount > 0" size="small" color="warning" variant="flat" class="mr-1">
          {{ warningCount }}
        </v-chip>
        <v-chip v-if="infoCount > 0" size="small" color="info" variant="flat">
          {{ infoCount }}
        </v-chip>
      </div>
    </div>

    <v-divider></v-divider>

    <div class="drawer-content">
      <div v-if="!hasMessages" class="no-messages">
        <v-icon size="48" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
        <div class="text-grey mt-2">No messages</div>
      </div>

      <div v-else class="messages-list">
        <!-- Errors first -->
        <template v-for="msg in errorMessages" :key="msg.id">
          <MessageItem :message="msg" @dismiss="removeMessage(msg.id)" />
        </template>

        <!-- Then warnings -->
        <template v-for="msg in warningMessages" :key="msg.id">
          <MessageItem :message="msg" @dismiss="removeMessage(msg.id)" />
        </template>

        <!-- Then info/success -->
        <template v-for="msg in otherMessages" :key="msg.id">
          <MessageItem :message="msg" @dismiss="removeMessage(msg.id)" />
        </template>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useMessages, MESSAGE_TYPES } from '@/composables/useMessages'
import MessageItem from './MessageItem.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const {
  messages,
  hasMessages,
  errorCount,
  warningCount,
  infoCount,
  removeMessage,
  clearAll
} = useMessages()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Sort messages by type
const errorMessages = computed(() => 
  messages.value.filter(m => m.type === MESSAGE_TYPES.ERROR)
)

const warningMessages = computed(() => 
  messages.value.filter(m => m.type === MESSAGE_TYPES.WARNING)
)

const otherMessages = computed(() => 
  messages.value.filter(m => 
    m.type !== MESSAGE_TYPES.ERROR && m.type !== MESSAGE_TYPES.WARNING
  )
)
</script>

<style scoped>
.message-drawer {
  z-index: 1100;
}

.drawer-header {
  padding: 16px;
  background: #fafafa;
}

.drawer-title {
  font-weight: 600;
  font-size: 16px;
}

.drawer-content {
  padding: 12px;
  overflow-y: auto;
  height: calc(100% - 80px);
}

.no-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
