import { ref, watch } from 'vue'

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
    collate: 'collated' // Add new collate option (default: collated)
  },
  formatting: {
    dateFormat: 'english',
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

export function useStorage() {
  // Load configuration from localStorage
  const loadConfiguration = () => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}configuration`)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Ensure collate has a default value if not present
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
      console.log('[DEBUG] Saving configuration to localStorage:', configToSave)
      localStorage.setItem(`${STORAGE_PREFIX}configuration`, JSON.stringify(configToSave))
    } catch (error) {
      console.warn('Failed to save configuration:', error)
    }
  }

  // Watch for configuration changes and auto-save
  watch(
    configuration,
    (newConfig) => {
      console.log('[DEBUG] Storage watcher triggered, saving:', JSON.parse(JSON.stringify(newConfig)))
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

  // Template storage functions
  const saveTemplateToStorage = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      const templateData = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
        savedAt: new Date().toISOString()
      }

      localStorage.setItem(`${STORAGE_PREFIX}template`, JSON.stringify(templateData))
      storedTemplate.value = templateData
      console.log('Template saved to storage:', file.name)
    } catch (error) {
      console.warn('Failed to save template to storage:', error)
      throw error
    }
  }

  const loadStoredTemplate = () => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}template`)
      if (saved) {
        const templateData = JSON.parse(saved)
        storedTemplate.value = templateData
        return templateData
      }
    } catch (error) {
      console.warn('Failed to load stored template:', error)
    }
    return null
  }

  const useStoredTemplate = () => {
    try {
      if (!storedTemplate.value && !loadStoredTemplate()) {
        return null
      }

      const { name, type, data } = storedTemplate.value

      // Convert base64 back to binary
      const binaryString = atob(data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Create a File object
      const blob = new Blob([bytes], { type })
      const file = new File([blob], name, { type })

      return file
    } catch (error) {
      console.warn('Failed to use stored template:', error)
      return null
    }
  }

  const clearStoredTemplate = () => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}template`)
      storedTemplate.value = null
    } catch (error) {
      console.warn('Failed to clear stored template:', error)
    }
  }

  // Save Excel file to storage
  const saveExcelToStorage = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      )
      localStorage.setItem(
        'excelFile',
        JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        })
      )
    } catch (error) {
      console.error('Failed to save Excel file:', error)
      throw error
    }
  }

  // Load stored Excel file
  const loadStoredExcel = () => {
    try {
      const stored = localStorage.getItem('excelFile')
      if (!stored) return null
      return JSON.parse(stored)
    } catch (error) {
      console.error('Failed to load stored Excel:', error)
      return null
    }
  }

  // Convert stored Excel back to File object
  const useStoredExcel = () => {
    const stored = loadStoredExcel()
    if (!stored) return null

    try {
      const binaryString = atob(stored.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return new File([bytes], stored.name, { type: stored.type })
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
