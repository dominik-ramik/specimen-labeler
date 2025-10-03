<script setup>
import { ref, computed, onMounted } from 'vue'
import FileDropZone from './components/FileDropZone.vue'
import ConfigurationSection from './components/ConfigurationSection.vue'
import HowToUse from './components/HowToUse.vue'
import { useAppState } from './composables/useAppState'
import { useStorage } from './composables/useStorage'
import { loadExcelMetadata, loadColumnNames, getExcelData } from './utils/excelHandler'
import { labelGenerator } from './services/labelGenerator'

const {
  templateFile,
  excelFile,
  sheetName,
  headers,
  isReady,
  setTemplateFile,
  setExcelFile,
  setSheetName,
  setHeaders
} = useAppState()

const {
  configuration,
  saveConfiguration,
  loadConfiguration,
  saveTemplateToStorage,
  loadStoredTemplate,
  useStoredTemplate,
  saveExcelToStorage,
  loadStoredExcel,
  useStoredExcel,
  saveIndividualValue
} = useStorage()

// UI State
const loading = ref(false)
const loadingMessage = ref('Processing...')
const loadingProgress = ref(0) // Add progress tracking
const outputMessage = ref('');
const outputType = ref('info');
const showOutput = ref(false);
const showOptions = ref(false);
const isGenerating = ref(false);

// Sheet selection
const availableSheets = ref([]);
const selectedSheet = ref('');

// File display
const templateFilename = ref('');
const templateFilesize = ref('') // Add
const excelFilename = ref('');
const excelFilesize = ref('') // Add
const isTemplateSaved = ref(false);
const isExcelSaved = ref(false);

// Handle template file upload
const handleTemplateFile = async (file) => {
  try {
    console.log('New template file uploaded:', file.name, 'Size:', file.size)
    setTemplateFile(file)
    templateFilename.value = file.name
    templateFilesize.value = formatFileSize(file.size) // Add file size
    isTemplateSaved.value = false

    // Save template to storage
    try {
      await saveTemplateToStorage(file)
      isTemplateSaved.value = true
      console.log('Template saved to storage successfully')
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
    excelFilesize.value = formatFileSize(file.size) // Add file size
    isExcelSaved.value = false

    showLoading('Loading Excel sheets...')
    const result = await loadExcelMetadata(file)
    availableSheets.value = result.sheets

    // Save Excel to storage
    try {
      await saveExcelToStorage(file)
      isExcelSaved.value = true
      console.log('Excel file saved to storage successfully')
    } catch (error) {
      console.warn('Failed to save Excel file to storage:', error)
    }

    // Auto-select sheet if available
    if (result.sheetSelected && result.selectedSheet) {
      selectedSheet.value = result.selectedSheet
      await handleSheetSelection(result.selectedSheet)
    }

    hideLoading()
  } catch (error) {
    hideLoading()
    console.error('Error handling Excel file:', error)
    displayOutput(`❌ Error reading Excel file: ${error.message}`, 'error')
  }
}

// Handle sheet selection
const handleSheetSelection = async (sheet) => {
  if (!sheet || !excelFile.value) return

  try {
    showLoading('Loading column headers...')
    setSheetName(sheet)
    saveIndividualValue('sheetName', sheet)

    const headerList = await loadColumnNames(excelFile.value, sheet)
    setHeaders(headerList)

    // Auto-detect duplicate column
    const duplicateColumn = headerList.find((h) =>
      h.toLowerCase().includes('duplicate')
    )
    if (duplicateColumn) {
      configuration.value.duplicates.column = duplicateColumn
    }

    hideLoading()
    console.log(`Loaded ${headerList.length} column headers from sheet: ${sheet}`)
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

    console.log('[DEBUG] Starting label generation...')
    console.log('[DEBUG] Template file:', templateFile.value)
    console.log('[DEBUG] Excel file:', excelFile.value)
    console.log('[DEBUG] Sheet name:', sheetName.value)
    
    // Force a fresh read of the configuration right before generation
    const currentConfig = JSON.parse(JSON.stringify(configuration.value))
    console.log('[DEBUG] Current configuration at generation time:', currentConfig)

    if (!isReady.value) {
      throw new Error('Please select both Excel file, Word template, and sheet')
    }

    // Read Excel data
    updateProgress('Reading Excel data...')
    const data = await getExcelData(excelFile.value, sheetName.value)
    console.log('[DEBUG] Loaded data rows:', data.length)

    if (data.length === 0) {
      throw new Error('No data found in the Excel sheet')
    }

    console.log(`Loaded ${data.length} records from Excel for processing`)

    // Generate labels with the fresh configuration
    console.log('[DEBUG] Calling labelGenerator.generateLabels...')
    const result = await labelGenerator.generateLabels(
      templateFile.value,
      data,
      currentConfig, // Use the fresh copy we just created
      (message) => updateProgress(message)
    )
    console.log('[DEBUG] Label generation completed:', result)

    // Save the file
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    await labelGenerator.saveDocument(result.data, `labels_${timestamp}.docx`)

    hideLoading()
    displayOutput(
      `✅ Success! Generated ${result.stats.totalLabels} labels across ${result.stats.pages} pages.<br>
       📄 File downloaded: labels_${timestamp}.docx (${result.stats.fileSizeMB} MB)<br>
       📊 Layout: ${result.stats.itemsPerPage} labels per page<br>
       📊 Records: ${result.stats.originalRecords} → ${result.stats.filteredRecords} → ${result.stats.totalLabels}`,
      'success'
    )
  } catch (error) {
    hideLoading()
    console.error('[ERROR] Generation failed:', error)
    console.error('[ERROR] Error name:', error.name)
    console.error('[ERROR] Error message:', error.message)
    console.error('[ERROR] Error stack:', error.stack)
    if (error.properties) {
      console.error('[ERROR] Error properties:', error.properties)
    }
    
    // Handle file access errors specially
    if (error.name === 'NotReadableError' || error.message?.includes('could not be read')) {
      displayOutput(
        `❌ Cannot read the template file. This usually happens when:<br><br>
        • The file is open in Word or another application<br>
        • The file was edited and needs to be re-uploaded<br>
        • The cached file reference is stale<br><br>
        💡 <strong>Solution:</strong> Please refresh this page and re-upload your template file using the drop zone above.`,
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
  console.log('[DEBUG] App received config update:', newConfig)
  console.log('[DEBUG] Before update:', JSON.parse(JSON.stringify(configuration.value)))
  
  // Direct assignment - Vue will handle reactivity
  configuration.value = newConfig
  
  console.log('[DEBUG] After update:', JSON.parse(JSON.stringify(configuration.value)))
  
  // Force save to localStorage
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
  console.log('Progress:', message, progress ? `${progress}%` : '')
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
  // Load saved configuration
  loadConfiguration()

  // Load stored template if exists
  const storedTemplate = loadStoredTemplate()
  if (storedTemplate) {
    console.log('Found stored template:', storedTemplate.name)
    const file = useStoredTemplate()
    if (file) {
      setTemplateFile(file)
      templateFilename.value = file.name
      isTemplateSaved.value = true
      console.log('Restored template from storage:', file.name)
    }
  }

  // Load stored Excel file if exists
  const storedExcel = loadStoredExcel()
  if (storedExcel) {
    console.log('Found stored Excel file:', storedExcel.name)
    const file = useStoredExcel()
    if (file) {
      try {
        await handleExcelFile(file)
        console.log('Restored Excel file from storage:', file.name)
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
</script>

<template>
  <div class="app-container">
    <div class="container">
      <h1>🌿 Specimens Labeler</h1>

      <form @submit.prevent="generateLabels">
        <!-- File Upload Section -->
        <div class="dropzone-container">
          <div class="field-group">
            <FileDropZone
              icon="📄"
              text="Drop Word template here"
              subtext="or click to browse (.docx)"
              accept=".docx"
              :filename="templateFilename"
              :file-size="templateFilesize"
              :is-saved="isTemplateSaved"
              file-type="template"
              @file-selected="handleTemplateFile"
            />
          </div>

          <div class="field-group">
            <FileDropZone
              icon="📊"
              text="Drop Excel or CSV file here"
              subtext="or click to browse (.xlsx, .csv)"
              accept=".xlsx,.xls,.csv,.tsv"
              :filename="excelFilename"
              :file-size="excelFilesize"
              :is-saved="isExcelSaved"
              file-type="excel"
              @file-selected="handleExcelFile"
            >

              <template #extra-content>
                <div
                  v-if="availableSheets.length > 0"
                  class="sheet-selector-container"
                  @click.stop
                >
                  <label for="sheet-name">Select Sheet:</label>
                  <select
                    id="sheet-name"
                    v-model="selectedSheet"
                    @change="handleSheetSelection(selectedSheet)"
                  >
                    <option value="">Select a sheet...</option>
                    <option v-for="sheet in availableSheets" :key="sheet" :value="sheet">
                      {{ sheet }}
                    </option>
                  </select>
                </div>
              </template>
            </FileDropZone>
          </div>
        </div>

        <!-- Configuration Section -->
        <div v-if="isReady" class="options-section visible">
          <ConfigurationSection 
            :config="configuration" 
            :headers="headers" 
            @update:config="handleConfigUpdate" 
          />
        </div>
      </form>

      <!-- Generate Button -->
      <div style="text-align: center; margin: 20px 0">
        <!-- Validation warnings -->
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

      <!-- Output Messages -->
      <div v-if="showOutput" class="output" :class="outputType">
        <button class="output-close" @click="showOutput = false" aria-label="Close message">×</button>
        <div v-html="outputMessage"></div>
      </div>

      <!-- Loading Overlay -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-content">
          <div class="spinner"></div>
          <div class="loading-message">{{ loadingMessage }}</div>
          <div v-if="loadingProgress > 0" class="progress-bar">
            <div class="progress-fill" :style="{ width: `${loadingProgress}%` }"></div>
          </div>
          <div v-if="loadingProgress > 0" class="progress-text">{{ loadingProgress }}%</div>
        </div>
      </div>

      <!-- How to Use Section -->
      <HowToUse />

      <!-- Copyright -->
      <div class="copyright">
        © 2025
        <a href="https://dominicweb.eu" target="_blank" rel="noopener noreferrer">Dominik M. Ramík</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: #f5f5f5;
  line-height: 1.5;
  min-height: 100vh;
}

.container {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #2c5530;
  text-align: center;
  margin: 0 0 30px 0;
  font-size: 2rem;
}

.dropzone-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  align-items: stretch;
}

.dropzone-container .field-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px; /* Ensure minimum height for both zones */
}

.sheet-selector-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
  width: 100%;
}

.sheet-selector-container label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
}

.sheet-selector-container select {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
}

.options-section {
  display: none;
}

.options-section.visible {
  display: block;
}

.generate-btn {
  background: #2c5530;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background: #1e3a21;
}

.generate-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.output {
  position: relative;
  margin-top: 20px;
  padding: 15px 40px 15px 15px;
  border-radius: 4px;
  border-left: 4px solid #ccc;
}

.output-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: inherit;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
  padding: 0;
  width: 24px;
  height: 24px;
}

.output-close:hover {
  opacity: 1;
}

.output.success {
  background: #e8f5e8;
  border-left-color: #2e7d32;
  color: #2e7d32;
}

.output.error {
  background: #f8d7da;
  border-left-color: #d32f2f;
  color: #d32f2f;
}

.validation-warnings {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 12px 15px;
  margin-bottom: 15px;
  text-align: left;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.validation-item {
  font-size: 0.9rem;
  color: #856404;
  margin-bottom: 6px;
}

.validation-item:last-child {
  margin-bottom: 0;
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
  margin-top: 15px;
  overflow: hidden;
  border-radius: 4px;
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

.color-swatch {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  margin-right: 8px;
}

.copyright {
  margin-top: 30px;
  text-align: center;
  font-size: 14px;
  color: #666;
}

.copyright a {
  color: #2c5530;
  text-decoration: none;
}

.copyright a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .dropzone-container {
    flex-direction: column;
    gap: 15px;
  }
}
</style>