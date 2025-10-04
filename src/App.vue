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

    // Force a fresh read of the configuration right before generation
    const currentConfig = JSON.parse(JSON.stringify(configuration.value))

    if (!isReady.value) {
      throw new Error('Please select both Excel file, Word template, and sheet')
    }

    // Read Excel data
    updateProgress('Reading data...')
    const data = await getExcelData(excelFile.value, sheetName.value)

    if (data.length === 0) {
      throw new Error('No data found in the Excel sheet')
    }

    // Generate labels with the fresh configuration
    const result = await labelGenerator.generateLabels(
      templateFile.value,
      data,
      currentConfig,
      (message) => updateProgress(message)
    )

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
    console.error('[ERROR] Generation failed:', error.message)
    
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
</script>

<template>
  <div class="app-container">
    <h1>🌿 Specimens Labeler</h1>

    <form @submit.prevent="generateLabels">
      <!-- Three-column grid layout -->
      <div class="main-content-grid">
        
        <!-- Section 1: Files Block -->
        <div class="section-block files-block">
          <h2>📁 Upload Files</h2>
          <div class="files-content">
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
                <!-- Only show sheet selector for Excel files, not CSV -->
                <div
                  v-if="availableSheets.length > 0 && fileType === 'excel'"
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
                
                <!-- Show info for CSV files -->
                <div
                  v-if="fileType === 'csv' && excelFilename"
                  class="csv-info"
                  @click.stop
                >
                  <span class="csv-badge">📄 CSV File - Ready to use</span>
                </div>
              </template>
            </FileDropZone>

            <!-- Data Selection Section - Only shown when files are ready -->
            <div v-if="isReady" class="data-selection-section">
              <h3>📋 Data Selection</h3>
              
              <!-- Record Selection -->
              <div class="selection-field">
                <label class="field-label">Record Selection</label>
                <div class="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="all"
                      v-model="configuration.recordSelection.mode"
                    />
                    All Records
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="from-to-end"
                      v-model="configuration.recordSelection.mode"
                    />
                    From Row
                    <input
                      type="number"
                      min="1"
                      v-model.number="configuration.recordSelection.startRow"
                      :disabled="configuration.recordSelection.mode !== 'from-to-end'"
                    />
                    to End
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="from-to-row"
                      v-model="configuration.recordSelection.mode"
                    />
                    From Row
                    <input
                      type="number"
                      min="1"
                      v-model.number="configuration.recordSelection.startRow"
                      :disabled="configuration.recordSelection.mode !== 'from-to-row'"
                    />
                    to Row
                    <input
                      type="number"
                      min="1"
                      v-model.number="configuration.recordSelection.endRow"
                      :disabled="configuration.recordSelection.mode !== 'from-to-row'"
                    />
                  </label>
                </div>
              </div>

              <!-- Duplicates Handling -->
              <div class="selection-field">
                <label class="field-label">How many copies of each label to generate</label>
                <div class="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="column"
                      v-model="configuration.duplicates.mode"
                    />
                    Get from Column
                  </label>
                  
                  <div class="nested-controls">
                    <div class="nested-row">
                      <label for="duplicates-column">Column:</label>
                      <select
                        id="duplicates-column"
                        v-model="configuration.duplicates.column"
                        :disabled="configuration.duplicates.mode !== 'column'"
                      >
                        <option value="">Select a column...</option>
                        <option v-for="header in headers" :key="header" :value="header">
                          {{ header }}
                        </option>
                      </select>
                      <label for="add-subtract" title="Add or subtract from the column value">+/-:</label>
                      <input
                        id="add-subtract"
                        type="number"
                        v-model.number="configuration.duplicates.addSubtract"
                        placeholder="0"
                      />
                    </div>
                    <div class="helper-text">
                      Example: If column value is 3 and +/- is -1, you'll get 2 copies
                    </div>
                  </div>
                  
                  <label>
                    <input
                      type="radio"
                      value="fixed"
                      v-model="configuration.duplicates.mode"
                    />
                    Fixed Number
                    <input
                      type="number"
                      min="1"
                      v-model.number="configuration.duplicates.fixed"
                      :disabled="configuration.duplicates.mode !== 'fixed'"
                    />
                  </label>
                  
                  <!-- Collate option -->
                  <div 
                    v-if="shouldShowCollateOption" 
                    class="collate-option"
                  >
                    <label class="collate-label">Order:</label>
                    <div class="radio-group-inline">
                      <label>
                        <input
                          type="radio"
                          value="collated"
                          v-model="configuration.duplicates.collate"
                        />
                        Sets Together (A,B,C,A,B,C)
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="uncollated"
                          v-model="configuration.duplicates.collate"
                        />
                        Duplicates Together (A,A,A,B,B,B)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Configuration Block - Only show when isReady -->
        <div v-if="isReady" class="section-block config-block">
          <ConfigurationSection 
            :config="configuration" 
            :headers="headers" 
            @update:config="handleConfigUpdate" 
          />
        </div>

        <!-- Section 3: Generate Block - Only show when isReady -->
        <div v-if="isReady" class="section-block generate-block">
          <h2>🚀 Generate Labels</h2>
          
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
            :title="isReady ? 'Generate labels (Ctrl+Enter)' : 'Please upload files first'"
          >
            {{ isGenerating ? 'Processing...' : 'Generate Labels' }}
          </button>
        </div>

      </div>
    </form>

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
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
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
</template>

<style scoped>
.app-container {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
}

h1 {
  color: #2c5530;
  text-align: center;
  margin: 0 0 30px 0;
  font-size: 2rem;
}

/* Three-column grid layout - equal width columns */
.main-content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
  max-width: 1800px;
  margin-left: auto;
  margin-right: auto;
}

/* Section block base styling */
.section-block {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 200px; /* Minimum height for all sections */
  height: auto; /* Allow natural expansion */
}

.section-block h2 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #2c5530;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 2px solid #e8f5e8;
}

/* Files block specific */
.files-block {
  background: white;
  border: 2px solid #e5e7eb;
}

.files-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1; /* Allow to grow within parent */
  min-height: 0; /* Allow children to define their own heights */
}

/* Config block specific - transparent to show ConfigurationSection's styling */
.config-block {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
}

/* Generate block specific */
.generate-block {
  background: white;
  border: 2px solid #2c5530;
  text-align: center;
  position: sticky;
  top: 20px;
  height: fit-content;
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

.csv-info {
  display: flex;
  justify-content: center;
  margin-top: 10px;
  padding: 8px 12px;
}

.csv-badge {
  font-size: 0.85rem;
  color: #2e7d32;
  background: rgba(46, 125, 50, 0.1);
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid rgba(46, 125, 50, 0.3);
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
  width: 100%;
}

.generate-btn:hover:not(:disabled) {
  background: #1e3a21;
}

.generate-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.validation-warnings {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 12px 15px;
  margin-bottom: 15px;
  text-align: left;
}

.validation-item {
  font-size: 0.9rem;
  color: #856404;
  margin-bottom: 6px;
}

.validation-item:last-child {
  margin-bottom: 0;
}

.output {
  position: relative;
  margin: 20px auto;
  padding: 15px 40px 15px 15px;
  border-radius: 4px;
  border-left: 4px solid #ccc;
  max-width: 1800px;
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
  color: #2c5530;
  text-decoration: none;
}

.copyright a:hover {
  text-decoration: underline;
}

/* Tablet Layout (768px to 1200px) */
@media (max-width: 1200px) {
  .main-content-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }

  .files-block {
    grid-column: 1;
    grid-row: 1;
  }

  .config-block {
    grid-column: 2;
    grid-row: 1;
  }

  .generate-block {
    grid-column: 1 / -1;
    grid-row: 2;
    position: relative;
    top: 0;
  }
}

/* Mobile Layout (below 768px) */
@media (max-width: 768px) {
  .app-container {
    padding: 15px;
  }

  .main-content-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-block {
    padding: 16px;
  }

  .files-block,
  .config-block,
  .generate-block {
    grid-column: 1;
    position: relative;
    top: 0;
  }
}

/* Data Selection Section - appears below Excel dropzone */
.data-selection-section {
  margin-top: 16px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.data-selection-section h3 {
  margin: 0 0 15px 0;
  font-size: 15px;
  color: #2c5530;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 2px solid #e8f5e8;
}

.selection-field {
  margin-bottom: 20px;
}

.selection-field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.radio-group {
  background: white;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: normal;
  margin-bottom: 0;
}

.radio-group input[type='number'] {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

#add-subtract {
  width: 60px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.nested-controls {
  margin-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.nested-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nested-row label {
  font-size: 14px;
  color: #555;
  margin: 0;
  font-weight: 500;
}

.nested-row select {
  flex: 1;
  min-width: 150px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.helper-text {
  margin-top: 6px;
  margin-left: 0;
  font-size: 13px;
  color: #666;
  font-style: italic;
  padding: 8px 10px;
  background: #f0f8ff;
  border-radius: 4px;
  border-left: 2px solid #2196f3;
}

.collate-option {
  margin-top: 12px;
  margin-left: 0;
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.collate-label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
}

.radio-group-inline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group-inline label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  margin-bottom: 0;
  font-size: 14px;
}
</style>