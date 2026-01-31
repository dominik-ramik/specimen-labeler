import { ref, computed } from 'vue'

// Message types
export const MESSAGE_TYPES = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  SUCCESS: 'success'
}

// Message categories for grouping
export const MESSAGE_CATEGORIES = {
  VALIDATION: 'validation',
  CONFIGURATION: 'configuration',
  GENERATION: 'generation',
  FILE: 'file'
}

const messages = ref([])
const isDrawerOpen = ref(false)
let messageIdCounter = 0

export function useMessages() {
  /**
   * Add a message
   * @param {Object} options - Message options
   * @param {string} options.type - Message type (error, warning, info, success)
   * @param {string} options.category - Message category for grouping
   * @param {string} options.title - Message title
   * @param {string} [options.message] - Message body text
   * @param {string[]} [options.items] - List of items to display
   * @param {string} [options.suggestion] - Suggestion text
   * @param {boolean} [options.persistent] - If true, message won't auto-clear
   * @param {string} [options.key] - Unique key for deduplication (replaces existing with same key)
   * @returns {number} - Message ID
   */
  const addMessage = (options) => {
    const id = ++messageIdCounter

    const newMessage = {
      id,
      type: options.type || MESSAGE_TYPES.INFO,
      category: options.category || MESSAGE_CATEGORIES.VALIDATION,
      title: options.title || '',
      message: options.message || '',
      items: options.items || [],
      suggestion: options.suggestion || '',
      persistent: options.persistent || false,
      key: options.key || null,
      timestamp: Date.now()
    }

    // If key is provided, remove existing message with same key
    if (options.key) {
      messages.value = messages.value.filter(m => m.key !== options.key)
    }

    messages.value.push(newMessage)
    isDrawerOpen.value = true

    return id
  }

  /**
   * Remove a message by ID
   */
  const removeMessage = (id) => {
    messages.value = messages.value.filter(m => m.id !== id)
  }

  /**
   * Remove all messages with a specific key
   */
  const removeMessageByKey = (key) => {
    messages.value = messages.value.filter(m => m.key !== key)
  }

  /**
   * Remove all messages in a category
   */
  const clearCategory = (category) => {
    messages.value = messages.value.filter(m => m.category !== category)
  }

  /**
   * Clear all non-persistent messages
   */
  const clearTransient = () => {
    messages.value = messages.value.filter(m => m.persistent)
  }

  /**
   * Clear all messages
   */
  const clearAll = () => {
    messages.value = []
  }

  // Computed properties
  const hasMessages = computed(() => messages.value.length > 0)

  const hasErrors = computed(() =>
    messages.value.some(m => m.type === MESSAGE_TYPES.ERROR)
  )

  const hasWarnings = computed(() =>
    messages.value.some(m => m.type === MESSAGE_TYPES.WARNING)
  )

  const errorCount = computed(() =>
    messages.value.filter(m => m.type === MESSAGE_TYPES.ERROR).length
  )

  const warningCount = computed(() =>
    messages.value.filter(m => m.type === MESSAGE_TYPES.WARNING).length
  )

  const infoCount = computed(() =>
    messages.value.filter(m => m.type === MESSAGE_TYPES.INFO).length
  )

  // Group messages by category
  const messagesByCategory = computed(() => {
    const grouped = {}
    messages.value.forEach(msg => {
      if (!grouped[msg.category]) {
        grouped[msg.category] = []
      }
      grouped[msg.category].push(msg)
    })
    return grouped
  })

  return {
    messages,
    hasMessages,
    hasErrors,
    hasWarnings,
    errorCount,
    warningCount,
    infoCount,
    isDrawerOpen,
    messagesByCategory,
    addMessage,
    removeMessage,
    removeMessageByKey,
    clearCategory,
    clearTransient,
    clearAll,
    MESSAGE_TYPES,
    MESSAGE_CATEGORIES
  }
}
