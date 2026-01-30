import { ref, computed } from 'vue'
import { useMessages, MESSAGE_TYPES, MESSAGE_CATEGORIES } from './useMessages'

const templatePlaceholders = ref([])
const isValidating = ref(false)

export function usePlaceholderValidation() {
  const { addMessage, removeMessageByKey } = useMessages()

  /**
   * Validate placeholders against available data columns
   * @param {string[]} placeholders - Array of placeholder names from template
   * @param {string[]} dataColumns - Array of column names from the data file
   */
  const validatePlaceholders = (placeholders, dataColumns) => {
    isValidating.value = true
    
    // Clear previous validation messages
    removeMessageByKey('placeholder-unmatched')
    removeMessageByKey('placeholder-unused')
    removeMessageByKey('placeholder-none')
    
    try {
      templatePlaceholders.value = placeholders || []
      
      if (!placeholders || placeholders.length === 0) {
        addMessage({
          type: MESSAGE_TYPES.WARNING,
          category: MESSAGE_CATEGORIES.VALIDATION,
          title: 'No placeholders found in template',
          suggestion: 'Make sure to use {ColumnName} syntax in your Word template.',
          key: 'placeholder-none'
        })
        return
      }
      
      if (!dataColumns || dataColumns.length === 0) {
        return // No data columns yet, skip validation
      }
      
      // Normalize column names for comparison (trim whitespace)
      const normalizedColumns = dataColumns.map(col => col.trim())
      
      // Find placeholders without matching columns
      const unmatchedPlaceholders = placeholders.filter(
        placeholder => !normalizedColumns.includes(placeholder)
      )
      
      if (unmatchedPlaceholders.length > 0) {
        addMessage({
          type: MESSAGE_TYPES.WARNING,
          category: MESSAGE_CATEGORIES.VALIDATION,
          title: 'Template placeholders without matching data columns',
          items: unmatchedPlaceholders,
          suggestion: 'These will appear empty in the output. Check for typos or add the missing columns.',
          key: 'placeholder-unmatched'
        })
      }
      
      /* we don't need this info message for now
      // Find columns that aren't used in the template (informational)
      const unusedColumns = normalizedColumns.filter(
        col => !placeholders.includes(col)
      )
      
      if (unusedColumns.length > 0 && unusedColumns.length < normalizedColumns.length) {
        addMessage({
          type: MESSAGE_TYPES.INFO,
          category: MESSAGE_CATEGORIES.VALIDATION,
          title: 'Data columns not used in template',
          items: unusedColumns.slice(0, 8),
          key: 'placeholder-unused'
        })
      }
      */
      
    } finally {
      isValidating.value = false
    }
  }

  /**
   * Clear validation state
   */
  const clearValidation = () => {
    templatePlaceholders.value = []
    removeMessageByKey('placeholder-unmatched')
    removeMessageByKey('placeholder-unused')
    removeMessageByKey('placeholder-none')
  }

  return {
    templatePlaceholders,
    isValidating,
    validatePlaceholders,
    clearValidation
  }
}
