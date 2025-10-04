<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import FileDropZone from './components/FileDropZone.vue'
import ConfigurationSection from './components/ConfigurationSection.vue'
import DataSelectionSection from './components/DataSelectionSection.vue'
import OutputMessage from './components/OutputMessage.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'
import HowToUse from './components/HowToUse.vue'
import { useAppState } from './composables/useAppState'
import { useStorage } from './composables/useStorage'
import { loadExcelMetadata, loadColumnNames, getExcelData, saveSheetName } from './utils/excelHandler'
import { labelGenerator } from './services/labelGenerator'
import { deleteFileFromIndexedDB } from './utils/indexedDBStorage'

const {
  templateFile,
  excelFile,
  sheetName,
  headers,
  isReady,
  setTemplateFile,
  setExcelFile,
  setSheetName,
  setHeaders,
  setCachedExcelData, // 🆕 Import new functions
  getCachedExcelData
} = useAppState()

const {
  configuration,
  saveConfiguration,
  loadConfiguration,
  saveTemplateToStorage,
  loadStoredTemplate,
  getStoredTemplateArrayBuffer, // 🆕 Use ArrayBuffer directly
  useStoredTemplate,
  saveExcelToStorage,
  loadStoredExcel,
  useStoredExcel,
  initializeStorage
} = useStorage()

// UI State
const loading = ref(false)
const loadingMessage = ref('Processing...')
const loadingProgress = ref(0)
const outputMessage = ref('');
const outputType = ref('info');
const showOutput = ref(false);
const showOptions = ref(false);
const isGenerating = ref(false);

// Sheet selection
const availableSheets = ref([]);
const selectedSheet = ref('');
const fileType = ref(''); // Track if it's 'excel' or 'csv'

// File display
const templateFilename = ref('');
const templateFilesize = ref('')
const excelFilename = ref('');
const excelFilesize = ref('')
const isTemplateSaved = ref(false);
const isExcelSaved = ref(false);

// Handle template file upload
const handleTemplateFile = async (file) => {
  try {
    setTemplateFile(file)
    templateFilename.value = file.name
    templateFilesize.value = formatFileSize(file.size)
    isTemplateSaved.value = false

    // Save template to storage
    try {
      await saveTemplateToStorage(file)
      isTemplateSaved.value = true
    } catch (error) {
      console.warn('Failed to save template to storage:', error)
    }
  } catch (error) {
    console.error('Error handling template file:', error)
    displayOutput(`❌ Error: ${error.message}`, 'error')
  }
}

// Handle Excel file upload
const handleExcelFile = async (file) => {
  try {
    setExcelFile(file)
    excelFilename.value = file.name
    excelFilesize.value = formatFileSize(file.size)
    isExcelSaved.value = false
    
    // Reset sheet selection when new file is uploaded
    selectedSheet.value = ''
    setSheetName(null) // Clear the sheet name in state
    setHeaders([]) // Clear headers

    showLoading('Loading data file...')
    const result = await loadExcelMetadata(file)
    availableSheets.value = result.sheets
    fileType.value = result.fileType

    // Save Excel to storage
    try {
      await saveExcelToStorage(file)
      isExcelSaved.value = true
    } catch (error) {
      console.warn('Failed to save data file to storage:', error)
    }

    // Auto-select sheet if available
    if (result.sheetSelected && result.selectedSheet) {
      selectedSheet.value = result.selectedSheet
      await handleSheetSelection(result.selectedSheet)
    }

    hideLoading()
  } catch (error) {
    hideLoading()
    console.error('Error handling data file:', error)
    displayOutput(`❌ Error reading data file: ${error.message}`, 'error')
  }
}

// Handle sheet selection
const handleSheetSelection = async (sheet) => {
  if (!sheet || !excelFile.value) return

  try {
    showLoading('Loading column headers...')
    setSheetName(sheet)
    
    // 🆕 Save sheet name to localStorage for persistence across reloads
    saveSheetName(sheet)

    const headerList = await loadColumnNames(excelFile.value, sheet)
    setHeaders(headerList)

    // Pre-load and cache the Excel data
    const excelData = await getExcelData(excelFile.value, sheet)
    setCachedExcelData(excelData)

    // Auto-detect duplicate column
    const duplicateColumn = headerList.find((h) =>
      h.toLowerCase().includes('duplicate')
    )
    if (duplicateColumn) {
      configuration.value.duplicates.column = duplicateColumn
    }

    hideLoading()
  } catch (error) {
    hideLoading()
    console.error('Error loading sheet:', error)
    displayOutput(`❌ Error loading sheet: ${error.message}`, 'error')
  }
}

// Generate labels
const generateLabels = async () => {
  try {
    isGenerating.value = true
    showLoading('Preparing to generate labels...')
    showOutput.value = false

    if (!isReady.value) {
      throw new Error('Please select both Excel file, Word template, and sheet')
    }

    // Get fresh ArrayBuffer directly from storage
    updateProgress('Loading template...')
    const templateArrayBuffer = getStoredTemplateArrayBuffer()
    
    if (!templateArrayBuffer) {
      throw new Error(
        'Template file not available. Please re-upload your template using the drop zone above.'
      )
    }

    // Use cached Excel data instead of reading file again
    updateProgress('Reading data...')
    let data = getCachedExcelData()
    
    // If no cached data, read from file (fallback)
    if (!data) {
      console.log('No cached data, reading from file...')
      data = await getExcelData(excelFile.value, sheetName.value)
      setCachedExcelData(data) // Cache for next time
    }

    if (data.length === 0) {
      throw new Error('No data found in the Excel sheet')
    }

    // Generate labels with ArrayBuffer directly
    const result = await labelGenerator.generateLabels(
      templateArrayBuffer,
      data, // Use cached data
      configuration.value,
      (message) => updateProgress(message)
    )

    // Save the file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    await labelGenerator.saveDocument(result.data, `labels_${timestamp}.docx`)

    hideLoading()
    displayOutput(
      `Success! Generated ${result.stats.pages} pages (${result.stats.itemsPerPage} labels per page)`,
      'success'
    )
  } catch (error) {
    hideLoading()
    console.error('[ERROR] Generation failed:', error.message)
    
    // Handle file access errors specially
    if (error.name === 'NotReadableError' || error.message?.includes('could not be read')) {
      displayOutput(
        `❌ Cannot read the file. This usually happens when:<br><br>
        • The file is open in another application<br>
        • The file was edited and needs to be re-uploaded<br>
        • The cached file reference is stale<br><br>
        💡 <strong>Solution:</strong> Please refresh this page and re-upload your files using the drop zones above.`,
        'error'
      )
    } else {
      displayOutput(`❌ Error: ${error.message}`, 'error')
    }
  } finally {
    isGenerating.value = false
  }
}

// Handle configuration updates
const handleConfigUpdate = (newConfig) => {
  configuration.value = newConfig
  saveConfiguration(newConfig)
}

// Add validation summary
const validationSummary = computed(() => {
  if (!isReady.value) return null
  
  const issues = []
  
  // Check if duplicate column is selected when mode is 'column'
  if (configuration.value.duplicates.mode === 'column' && !configuration.value.duplicates.column) {
    issues.push('⚠️ Please select a duplicates column')
  }
  
  // Check if date column is selected when mode is 'column'
  if (configuration.value.formatting.date.mode === 'column' && !configuration.value.formatting.date.column) {
    issues.push('⚠️ Please select a date column')
  }
  
  // Check if geocoord columns are selected when mode is active
  if (configuration.value.formatting.geocoord.mode === 'single' && !configuration.value.formatting.geocoord.singleColumn) {
    issues.push('⚠️ Please select a geocoordinate column')
  }
  if (configuration.value.formatting.geocoord.mode === 'separate') {
    if (!configuration.value.formatting.geocoord.latColumn || !configuration.value.formatting.geocoord.lonColumn) {
      issues.push('⚠️ Please select both latitude and longitude columns')
    }
  }
  
  return issues.length > 0 ? issues : null
})

// Add computed for total rows
const totalDataRows = computed(() => {
  return getCachedExcelData()?.length || 1
})

// UI Helper functions
const showLoading = (message, progress = 0) => {
  loading.value = true
  loadingMessage.value = message
  loadingProgress.value = progress
}

const hideLoading = () => {
  loading.value = false
}

const updateProgress = (message, progress = 0) => {
  loadingMessage.value = message
  loadingProgress.value = progress
}

const displayOutput = (message, type = 'info') => {
  outputMessage.value = message
  outputType.value = type
  showOutput.value = true
}

// Watch for ready state to show/hide options
const watchReadyState = computed(() => isReady.value)
if (watchReadyState) {
  showOptions.value = true
}

// Initialize on mount
onMounted(async () => {
  // 🆕 Initialize storage (cleanup legacy data)
  await initializeStorage()
  
  loadConfiguration()

  // Load stored template if exists
  const storedTemplateData = await loadStoredTemplate()
  if (storedTemplateData) {
    const file = useStoredTemplate()
    if (file) {
      setTemplateFile(file)
      templateFilename.value = file.name
      templateFilesize.value = formatFileSize(file.size)
      isTemplateSaved.value = true
    }
  }

  // Load stored Excel file if exists
  const storedExcelData = await loadStoredExcel()
  if (storedExcelData) {
    const file = useStoredExcel()
    if (file) {
      try {
        await handleExcelFile(file)
      } catch (error) {
        console.error('Failed to restore Excel file:', error)
      }
    }
  }
})

// Format file size helper
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Add computed property for collate option visibility
const shouldShowCollateOption = computed(() => {
  const mode = configuration.value.duplicates.mode
  const fixed = configuration.value.duplicates.fixed
  const column = configuration.value.duplicates.column
  
  return (mode === 'fixed' && fixed > 1) || (mode === 'column' && column !== '')
})

// Handle template file clear
const handleTemplateClear = async () => {
  try {
    // Clear from state
    setTemplateFile(null)
    templateFilename.value = ''
    templateFilesize.value = ''
    isTemplateSaved.value = false
    
    // Clear from IndexedDB
    await deleteFileFromIndexedDB('template')
    
    console.log('Template file cleared')
  } catch (error) {
    console.error('Error clearing template:', error)
  }
}

// Handle Excel file clear
const handleExcelClear = async () => {
  try {
    // Clear from state
    setExcelFile(null)
    excelFilename.value = ''
    excelFilesize.value = ''
    isExcelSaved.value = false
    
    // Clear sheet selection
    selectedSheet.value = ''
    setSheetName(null)
    setHeaders([])
    setCachedExcelData(null)
    availableSheets.value = []
    fileType.value = ''
    
    // Clear from IndexedDB
    await deleteFileFromIndexedDB('excel')
    
    // Clear from localStorage
    localStorage.removeItem('specimensLabeler_excelFileName')
    localStorage.removeItem('specimensLabeler_sheetName')
    
    console.log('Excel file cleared')
  } catch (error) {
    console.error('Error clearing Excel file:', error)
  }
}

// Add ref for template help
const templateHelpRef = ref(null)

const scrollToTemplateHelp = () => {
  nextTick(() => {
    if (templateHelpRef.value) {
      // First open the examples section
      templateHelpRef.value.openExamples()
      
      // Wait a bit for the section to expand
      setTimeout(() => {
        // Scroll to the help section
        templateHelpRef.value.$el.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
        
        // Additional scroll adjustment to show the "How to Construct" heading
        setTimeout(() => {
          window.scrollBy({ 
            top: 100, 
            behavior: 'smooth' 
          })
        }, 300)
      }, 100)
    }
  })
}
</script>

<template>
  <div class="app-container">
    <div class="header">
      <h1>🌿 Specimens Labeler</h1>
      <p class="subtitle">Streamline your specimen labeling</p>
    </div>

    <!-- Output Messages -->
    <OutputMessage
      :show="showOutput"
      :message="outputMessage"
      :type="outputType"
      @close="showOutput = false"
    />

    <form @submit.prevent="generateLabels">
      <div class="main-content-grid">
        
        <!-- Section 1: Files Block -->
        <div class="section-block files-block">
          <h2>Upload Files</h2>
          <div class="files-content">
            <FileDropZone
              heading="Template"
              text="Drop Word template here"
              subtext="or click to browse (.docx)"
              accept=".docx"
              :filename="templateFilename"
              :file-size="templateFilesize"
              :is-saved="isTemplateSaved"
              file-type="template"
              @file-selected="handleTemplateFile"
              @file-cleared="handleTemplateClear"
              @show-template-help="scrollToTemplateHelp"
            />
            
            <FileDropZone
              heading="Collection Spreadsheet"
              text="Drop Excel or CSV file here"
              subtext="or click to browse (.xlsx, .csv)"
              accept=".xlsx,.xls,.csv,.tsv"
              :filename="excelFilename"
              :file-size="excelFilesize"
              :is-saved="isExcelSaved"
              file-type="excel"
              @file-selected="handleExcelFile"
              @file-cleared="handleExcelClear"
            >
              <template #extra-content>
                <div
                  v-if="availableSheets.length > 0 && fileType === 'excel'"
                  class="sheet-selector-container"
                  :class="{ 'no-sheet-selected': !selectedSheet }"
                  @click.stop
                >
                  <label for="sheet-name">Select Sheet:</label>
                  <select
                    id="sheet-name"
                    v-model="selectedSheet"
                    :class="{ 'invalid-selection': !selectedSheet }"
                    @change="handleSheetSelection(selectedSheet)"
                  >
                    <option value="">Select a sheet...</option>
                    <option v-for="sheet in availableSheets" :key="sheet" :value="sheet">
                      {{ sheet }}
                    </option>
                  </select>
                </div>
                
                <div
                  v-if="fileType === 'csv' && excelFilename"
                  class="csv-info"
                  @click.stop
                >
                  <span class="csv-badge">✓ CSV File - Ready to use</span>
                </div>
              </template>
            </FileDropZone>
          </div>
        </div>

        <!-- Section 2: Data Selection Block -->
        <div v-if="isReady" class="section-block data-selection-block">
          <DataSelectionSection
            :config="configuration"
            :headers="headers"
            :total-rows="totalDataRows"
            @update:config="handleConfigUpdate"
          />
        </div>

        <!-- Section 3: Configuration Block -->
        <div v-if="isReady" class="section-block config-block">
          <ConfigurationSection 
            :config="configuration" 
            :headers="headers" 
            @update:config="handleConfigUpdate" 
          />
        </div>

        <!-- Section 4: Generate Block -->
        <div v-if="isReady" class="section-block generate-block">
          <h2>Generate Labels</h2>
          
          <div v-if="validationSummary" class="validation-warnings">
            <div v-for="(issue, index) in validationSummary" :key="index" class="validation-item">
              {{ issue }}
            </div>
          </div>
          
          <button
            type="button"
            class="generate-btn"
            :disabled="!isReady || isGenerating"
            @click="generateLabels"
            :title="isReady ? 'Generate labels' : 'Please upload files first'"
          >
            {{ isGenerating ? 'Processing...' : 'Generate Labels' }}
          </button>
        </div>

      </div>
    </form>

    <!-- Loading Overlay -->
    <LoadingOverlay
      :show="loading"
      :message="loadingMessage"
      :progress="loadingProgress"
    />

    <!-- How to Use Section -->
    <HowToUse ref="templateHelpRef" />

    <!-- Copyright -->
    <div class="copyright">
      © 2025
      <a href="https://dominicweb.eu" target="_blank" rel="noopener noreferrer">Dominik M. Ramík</a>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  margin: 0 0 0 0;
  font-size: 2rem;
  padding: 24px 24px 16px 24px;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  letter-spacing: 0.5px;
}

.subtitle {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  padding: 0 24px 20px 24px;
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.3px;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  font-style: italic;
}

/* Four-column grid layout - equal width columns, no wrapping until breakpoint */
.main-content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
  max-width: 1800px;
  margin-left: auto;
  margin-right: auto;
  overflow-x: auto; /* Allow horizontal scroll if needed rather than wrapping */
}

/* Section block base styling */
.section-block {
  background: white;
  border: none;
  border-radius: 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-height: 200px;
  height: auto;
  overflow: hidden;
  align-self: start; /* 🔑 Prevent stretching to match tallest column */
}

.section-block h2 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  padding: 16px 20px;
  border-bottom: none;
  letter-spacing: 0.5px;
}

/* Files block specific */
.files-block {
  border: none;
}

.files-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
  background: white;
}

/* Data Selection block specific */
.data-selection-block {
  background: white;
  border: none;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

/* Config block specific */
.config-block {
  background: white;
  border: none;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

/* Generate block specific */
.generate-block {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  text-align: center;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  /* Removed height: fit-content to match other columns */
}

.generate-block h2 {
  background: transparent;
  color: white;
  margin: 0;
  padding: 16px 20px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.sheet-selector-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(10px);
  width: 100%;
  transition: all 0.3s ease;
}

.sheet-selector-container label {
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.sheet-selector-container select {
  padding: 10px 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  background: white;
  font-weight: 500;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Orange border when no sheet selected */
.sheet-selector-container select.invalid-selection {
  border-color: #ff9800;
  border-width: 3px;
  background: #fff8e1;
  color: #e65100;
  font-weight: 600;
}

.sheet-selector-container select:hover {
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.sheet-selector-container select:focus {
  outline: none;
  border-color: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

/* Override focus state when invalid */
.sheet-selector-container select.invalid-selection:focus {
  border-color: #ff9800;
  box-shadow: 0 0 0 3px rgba(255, 152, 0, 0.3);
}

.csv-info {
  display: flex;
  justify-content: center;
  margin-top: 12px;
  padding: 10px 14px;
}

.csv-badge {
  font-size: 0.9rem;
  color: white;
  background: rgba(255, 255, 255, 0.25);
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  border: 2px solid rgba(255, 255, 255, 0.4);
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.generate-btn {
  background: white;
  color: #667eea;
  padding: 14px 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  transition: all 0.3s;
  width: calc(100% - 40px);
  margin: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  letter-spacing: 0.5px;
}

.generate-btn:hover:not(:disabled) {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.generate-btn:disabled {
  background: rgba(255, 255, 255, 0.5);
  color: rgba(102, 126, 234, 0.5);
  cursor: not-allowed;
  transform: none;
}

/* Validation warnings */
.validation-warnings {
  background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%);
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 14px 18px;
  margin: 0 20px 15px 20px;
  text-align: left;
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
}

.validation-item {
  font-size: 0.9rem;
  color: #856404;
  margin-bottom: 8px;
  line-height: 1.4;
}

.validation-item:last-child {
  margin-bottom: 0;
}

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

.progress-bar {
  margin-top: 15px;
  overflow: hidden;
  border-radius: 4px;
  background: #e0e0e0;
  height: 8px;
  width: 250px;
}

.progress-fill {
  transition: width 0.3s ease;
  background: linear-gradient(90deg, #2c5530 0%, #4CAF50 100%);
  height: 100%;
}

.spinner {
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
  border-radius: 50%;
  border-top: 4px solid #2c5530;
  border: 4px solid #f3f3f3;
  height: 40px;
  width: 40px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-content {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: white;
  padding: 30px;
  text-align: center;
}

.loading-overlay {
  z-index: 1000;
  align-items: center;
  justify-content: center;
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  height: 100%;
  width: 100%;
  left: 0;
  top: 0;
  position: fixed;
}

.copyright {
  margin-top: 30px;
  text-align: center;
  font-size: 14px;
  color: #666;
  max-width: 1800px;
  margin-left: auto;
  margin-right: auto;
}

.copyright a {
  color: #667eea;
  text-decoration: none;
}

.copyright a:hover {
  text-decoration: underline;
}

/* Tablet Layout (1200px to 1600px) - 3 columns */
@media (max-width: 1600px) {
  .main-content-grid {
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto;
  }

  .files-block {
    grid-column: 1;
    grid-row: 1;
  }

  .data-selection-block {
    grid-column: 2;
    grid-row: 1;
  }

  .config-block {
    grid-column: 3;
    grid-row: 1;
  }

  .generate-block {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}

/* Stack all columns vertically below 1200px */
@media (max-width: 1200px) {
  .main-content-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    overflow-x: visible; /* Reset overflow */
  }

  .files-block,
  .data-selection-block,
  .config-block,
  .generate-block {
    grid-column: 1;
    grid-row: auto;
  }
}

/* Mobile adjustments for very small screens */
@media (max-width: 768px) {
  .app-container {
    padding: 15px;
  }
}
</style>