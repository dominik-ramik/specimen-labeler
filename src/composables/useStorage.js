import { ref, watch } from 'vue'
import { 
  saveFileToIndexedDB, 
  loadFileFromIndexedDB, 
  indexedDBDataToFile,
  deleteFileFromIndexedDB,
  migrateFromLocalStorage
} from '../utils/indexedDBStorage'

const STORAGE_PREFIX = 'specimensLabeler_'

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
      mode: 'none', // 'none' or 'column'
      column: '',
      format: 'roman' // 'roman', 'iso', 'english', 'threeletter'
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

// Template storage
const storedTemplate = ref(null)
const storedExcel = ref(null)

export function useStorage() {
  // Load configuration from localStorage (configuration is small, keep in LocalStorage)
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
            format: parsed.formatting.dateFormat || 'roman'
          }
          delete parsed.formatting.dateFormat
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

  // Watch for configuration changes and auto-save
  watch(
    configuration,
    (newConfig) => {
      saveConfiguration(newConfig)
    },
    { deep: true, immediate: false, flush: 'post' }
  )

  // Save individual value
  const saveIndividualValue = (key, value) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, value)
    } catch (error) {
      console.warn('Failed to save individual value:', error)
    }
  }

  // Load individual value
  const loadIndividualValue = (key, defaultValue = '') => {
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${key}`) || defaultValue
    } catch (error) {
      console.warn('Failed to load individual value:', error)
      return defaultValue
    }
  }

  // Template storage functions (using IndexedDB)
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

  const clearStoredTemplate = async () => {
    try {
      await deleteFileFromIndexedDB('template')
      storedTemplate.value = null
    } catch (error) {
      console.warn('Failed to clear stored template:', error)
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

  // Load saved form values
  const loadSavedFormValues = () => {
    const values = {}
    const keys = [
      'sheetName',
      'start-row',
      'end-row',
      'duplicates-column',
      'add-subtract',
      'fixed-duplicates',
      'date-format',
      'geocoord-single-column',
      'geocoord-lat-column',
      'geocoord-lon-column',
      'record-selection',
      'duplicates-mode',
      'decimal-format',
      'geocoord-mode'
    ]

    keys.forEach((key) => {
      const value = loadIndividualValue(key)
      if (value) {
        values[key] = value
      }
    })

    return values
  }

  return {
    configuration,
    storedTemplate,
    loadConfiguration,
    saveConfiguration,
    saveIndividualValue,
    loadIndividualValue,
    saveTemplateToStorage,
    loadStoredTemplate,
    useStoredTemplate,
    clearStoredTemplate,
    saveExcelToStorage,
    loadStoredExcel,
    useStoredExcel,
    loadSavedFormValues
  }
}