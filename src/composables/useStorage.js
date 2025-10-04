import { ref, watch } from 'vue'
import { 
  saveFileToIndexedDB, 
  loadFileFromIndexedDB, 
  getArrayBuffer,
  indexedDBDataToFile,
  deleteFileFromIndexedDB,
  migrateFromLocalStorage,
  cleanupLegacyStorage
} from '../utils/indexedDBStorage'

const STORAGE_PREFIX = 'specimensLabeler_'
const DEBOUNCE_DELAY_MS = 500

// Configuration state
const configuration = ref({
  recordSelection: {
    mode: 'all',
    startRow: 1,
    endRow: 1
  },
  duplicates: {
    mode: 'column',
    column: '',
    addSubtract: 0,
    fixed: 1,
    collate: 'collated'
  },
  formatting: {
    date: {
      mode: 'none',
      column: '',
      format: 'english',
      locale: 'en-US' // 🆕 Simplified - just the locale code
    },
    decimalFormat: 'dot',
    geocoord: {
      mode: 'none',
      singleColumn: '',
      latColumn: '',
      lonColumn: '',
      outputFormat: 'dms'
    }
  }
})

// Template storage - store file data with ArrayBuffer
const storedTemplate = ref(null)
const storedExcel = ref(null)

// Debounce timer for auto-save
let saveDebounceTimer = null

export function useStorage() {
  // Load configuration from localStorage
  const loadConfiguration = () => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}configuration`)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Handle legacy dateFormat
        if (parsed.formatting && !parsed.formatting.date) {
          parsed.formatting.date = {
            mode: 'none',
            column: '',
            format: parsed.formatting.dateFormat || 'english',
            locale: 'en-US'
          }
          delete parsed.formatting.dateFormat
        }
        // 🆕 Remove legacy customLocale if it exists
        if (parsed.formatting?.date) {
          if (parsed.formatting.date.customLocale) {
            delete parsed.formatting.date.customLocale
          }
          if (!parsed.formatting.date.locale) {
            parsed.formatting.date.locale = 'en-US'
          }
        }
        if (parsed.duplicates && !parsed.duplicates.collate) {
          parsed.duplicates.collate = 'collated'
        }
        configuration.value = { ...configuration.value, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load configuration:', error)
    }
  }

  // Save configuration to localStorage
  const saveConfiguration = (config) => {
    try {
      const configToSave = config || configuration.value
      localStorage.setItem(`${STORAGE_PREFIX}configuration`, JSON.stringify(configToSave))
    } catch (error) {
      console.warn('Failed to save configuration:', error)
    }
  }

  // Debounced save function
  const debouncedSave = (newConfig) => {
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer)
    }
    
    saveDebounceTimer = setTimeout(() => {
      saveConfiguration(newConfig)
      saveDebounceTimer = null
    }, DEBOUNCE_DELAY_MS)
  }

  // Watch for configuration changes with debouncing
  watch(
    configuration,
    (newConfig) => {
      debouncedSave(newConfig)
    },
    { deep: true, immediate: false }
  )

  // Template storage functions (using IndexedDB with ArrayBuffer)
  const saveTemplateToStorage = async (file) => {
    try {
      const fileData = await saveFileToIndexedDB('template', file)
      storedTemplate.value = fileData
      console.log('Template saved to IndexedDB:', file.name)
    } catch (error) {
      console.warn('Failed to save template to IndexedDB:', error)
      throw error
    }
  }

  const loadStoredTemplate = async () => {
    try {
      // Try migration from LocalStorage first
      await migrateFromLocalStorage('template')
      
      const fileData = await loadFileFromIndexedDB('template')
      storedTemplate.value = fileData
      return fileData
    } catch (error) {
      console.warn('Failed to load stored template:', error)
    }
    return null
  }

  // Get ArrayBuffer for generation (avoids stale File references)
  const getStoredTemplateArrayBuffer = () => {
    try {
      if (!storedTemplate.value) {
        return null
      }
      return getArrayBuffer(storedTemplate.value)
    } catch (error) {
      console.warn('Failed to get template ArrayBuffer:', error)
      return null
    }
  }

  // Get File object for display purposes only
  const useStoredTemplate = () => {
    try {
      if (!storedTemplate.value) {
        return null
      }
      return indexedDBDataToFile(storedTemplate.value)
    } catch (error) {
      console.warn('Failed to use stored template:', error)
      return null
    }
  }

  // Excel file storage functions (using IndexedDB)
  const saveExcelToStorage = async (file) => {
    try {
      const fileData = await saveFileToIndexedDB('excel', file)
      storedExcel.value = fileData
      console.log('Excel file saved to IndexedDB:', file.name)
    } catch (error) {
      console.error('Failed to save Excel file to IndexedDB:', error)
      throw error
    }
  }

  const loadStoredExcel = async () => {
    try {
      // Try migration from LocalStorage first
      await migrateFromLocalStorage('excel')
      
      const fileData = await loadFileFromIndexedDB('excel')
      storedExcel.value = fileData
      return fileData
    } catch (error) {
      console.error('Failed to load stored Excel:', error)
      return null
    }
  }

  const useStoredExcel = () => {
    try {
      if (!storedExcel.value) {
        return null
      }
      return indexedDBDataToFile(storedExcel.value)
    } catch (error) {
      console.error('Failed to restore Excel file:', error)
      return null
    }
  }

  // Initialize: cleanup legacy storage on first load
  const initializeStorage = async () => {
    cleanupLegacyStorage()
  }

  return {
    configuration,
    storedTemplate,
    loadConfiguration,
    saveConfiguration,
    saveTemplateToStorage,
    loadStoredTemplate,
    getStoredTemplateArrayBuffer, // 🆕 Use this for generation
    useStoredTemplate,
    saveExcelToStorage,
    loadStoredExcel,
    useStoredExcel,
    initializeStorage // 🆕 Call on app mount
  }
}