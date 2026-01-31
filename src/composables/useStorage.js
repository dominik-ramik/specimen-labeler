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

// Default configuration object
const defaultConfig = {
  recordSelection: {
    startRow: 1,
    endRow: 100
  },
  duplicates: {
    mode: 'column',
    column: '',
    addSubtract: 0,
    fixed: 1,
    collate: 'uncollated'
  },
  sorting: {
    enabled: false,
    rules: []
  },
  filters: [],
  formatting: {
    date: {
      mode: 'none',
      columns: [],        // Changed from 'column' to 'columns' array
      format: 'roman',
      locale: 'en-US'
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
}

// Configuration state
const configuration = ref(defaultConfig)

// Template storage - store file data with ArrayBuffer
const storedTemplate = ref(null)
const storedExcel = ref(null)

// Debounce timer for auto-save
let saveDebounceTimer = null

// Utility: Deep merge two objects (simple version)
function deepMerge(target, source) {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export function useStorage() {
  // Load configuration from localStorage
  const loadConfiguration = () => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}configuration`)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Deep merge with defaults to ensure all fields exist
        // Instead of replacing the ref, update its properties
        deepMerge(configuration.value, parsed)
        
        // Migration: convert old single column to array if needed
        if (configuration.value.formatting.date.column && 
            (!configuration.value.formatting.date.columns || configuration.value.formatting.date.columns.length === 0)) {
          configuration.value.formatting.date.columns = [configuration.value.formatting.date.column]
        }
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