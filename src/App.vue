<script setup>
import { ref, computed, onMounted, watch } from "vue";
import packageJson from "../package.json";
import FileDropZone from "./components/FileDropZone.vue";
import ConfigurationPanels from "./components/ConfigurationPanels.vue";
import LoadingOverlay from "./components/LoadingOverlay.vue";
import HelpDrawer from "./components/HelpDrawer.vue";
import DataPreviewModal from "./components/DataPreviewModal.vue";
import MessageDrawer from "./components/MessageDrawer.vue";
import MessageIndicator from "./components/MessageIndicator.vue";
import { useAppState } from "./composables/useAppState";
import { useStorage } from "./composables/useStorage";
import { usePlaceholderValidation } from "./composables/usePlaceholderValidation";
import {
  useMessages,
  MESSAGE_TYPES,
  MESSAGE_CATEGORIES,
} from "./composables/useMessages";
import {
  loadExcelMetadata,
  loadColumnNames,
  getExcelData,
  saveSheetName,
} from "./utils/excelHandler";
import { labelGenerator } from "./services/labelGenerator";
import { deleteFileFromIndexedDB } from "./utils/indexedDBStorage";
import { formatDataForPreview } from "./utils/previewFormatter";

const {
  templateFile,
  excelFile,
  sheetName,
  headers,
  isReady,
  cachedExcelData,
  setTemplateFile,
  setExcelFile,
  setSheetName,
  setHeaders,
  setCachedExcelData,
  getCachedExcelData,
} = useAppState();

const {
  configuration,
  saveConfiguration,
  loadConfiguration,
  saveTemplateToStorage,
  loadStoredTemplate,
  getStoredTemplateArrayBuffer,
  useStoredTemplate,
  saveExcelToStorage,
  loadStoredExcel,
  useStoredExcel,
  initializeStorage,
} = useStorage();

const { validatePlaceholders, clearValidation } = usePlaceholderValidation();

const {
  addMessage,
  clearCategory,
  clearTransient,
  removeMessageByKey,
  hasMessages,
  hasErrors,
} = useMessages();

// UI State
const loading = ref(false);
const isGenerating = ref(false);
const loadingMessage = ref("Processing...");
const loadingProgress = ref(0);
const showHelpDrawer = ref(false);
const helpDrawerRef = ref(null);
const showPreviewModal = ref(false);
const previewData = ref([]);
const templateColumns = ref([]);
const showMessageDrawer = ref(false);

// Sheet selection
const availableSheets = ref([]);
const selectedSheet = ref("");
const fileType = ref("");

// File display
const templateFilename = ref("");
const templateFilesize = ref("");
const excelFilename = ref("");
const excelFilesize = ref("");
const isTemplateSaved = ref(false);
const isExcelSaved = ref(false);

// Handle template file upload
const handleTemplateFile = async (file) => {
  try {
    setTemplateFile(file);
    templateFilename.value = file.name;
    templateFilesize.value = formatFileSize(file.size);
    isTemplateSaved.value = false;

    try {
      await saveTemplateToStorage(file);
      isTemplateSaved.value = true;
    } catch (error) {
      console.warn("Failed to save template to storage:", error);
      addMessage({
        type: MESSAGE_TYPES.WARNING,
        category: MESSAGE_CATEGORIES.FILE,
        title: "Template not saved to browser storage",
        message:
          "The template was loaded but could not be saved for future sessions.",
        suggestion: error.message,
        key: "template-storage-warning",
      });
    }
  } catch (error) {
    console.error("Error handling template file:", error);
    addMessage({
      type: MESSAGE_TYPES.ERROR,
      category: MESSAGE_CATEGORIES.FILE,
      title: "Failed to load template",
      message: error.message,
      key: "template-load-error",
    });
  }
};

const totalDataRows = computed(() => {
  return cachedExcelData.value ? cachedExcelData.value.length : 0;
});

// Handle Excel file upload
const handleExcelFile = async (file) => {
  try {
    setExcelFile(file);
    excelFilename.value = file.name;
    excelFilesize.value = formatFileSize(file.size);
    isExcelSaved.value = false;

    selectedSheet.value = "";
    setSheetName(null);
    setHeaders([]);

    showLoading("Loading data file...");
    const result = await loadExcelMetadata(file);
    availableSheets.value = result.sheets;
    fileType.value = result.fileType;

    try {
      await saveExcelToStorage(file);
      isExcelSaved.value = true;
    } catch (error) {
      console.warn("Failed to save data file to storage:", error);
      addMessage({
        type: MESSAGE_TYPES.WARNING,
        category: MESSAGE_CATEGORIES.FILE,
        title: "Data file not saved to browser storage",
        message:
          "The file was loaded but could not be saved for future sessions.",
        suggestion: error.message,
        key: "excel-storage-warning",
      });
    }

    if (result.sheetSelected && result.selectedSheet) {
      selectedSheet.value = result.selectedSheet;
      await handleSheetSelection(result.selectedSheet);
    }

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error handling data file:", error);
    addMessage({
      type: MESSAGE_TYPES.ERROR,
      category: MESSAGE_CATEGORIES.FILE,
      title: "Failed to load data file",
      message: error.message,
      key: "excel-load-error",
    });
  }
};

// Handle sheet selection
const handleSheetSelection = async (sheet) => {
  if (!sheet || !excelFile.value) return;

  try {
    showLoading("Loading column headers...");
    setSheetName(sheet);
    saveSheetName(sheet);

    const headerList = await loadColumnNames(excelFile.value, sheet);
    setHeaders(headerList);

    const excelData = await getExcelData(excelFile.value, sheet);
    setCachedExcelData(excelData);

    const duplicateColumn = headerList.find((h) =>
      h.toLowerCase().includes("duplicate"),
    );
    if (duplicateColumn) {
      configuration.value.duplicates.column = duplicateColumn;
    }

    hideLoading();
  } catch (error) {
    hideLoading();
    console.error("Error loading sheet:", error);
    addMessage({
      type: MESSAGE_TYPES.ERROR,
      category: MESSAGE_CATEGORIES.FILE,
      title: "Failed to load sheet",
      message: error.message,
      key: "sheet-load-error",
    });
  }
};

// Generate labels
const generateLabels = async () => {
  try {
    isGenerating.value = true;
    showLoading("Preparing to generate labels...");
    clearTransient(); // Clear non-persistent messages

    if (!isReady.value) {
      throw new Error(
        "Please select both Excel file, Word template, and sheet",
      );
    }

    updateProgress("Loading template...");
    const templateArrayBuffer = getStoredTemplateArrayBuffer();

    if (!templateArrayBuffer) {
      throw new Error(
        "Template file not available. Please re-upload your template using the drop zone above.",
      );
    }

    updateProgress("Reading data...");
    let data = getCachedExcelData();

    if (!data) {
      data = await getExcelData(excelFile.value, sheetName.value);
      setCachedExcelData(data);
    }

    if (data.length === 0) {
      throw new Error("No data found in the Excel sheet");
    }

    const result = await labelGenerator.generateLabels(
      templateArrayBuffer,
      data,
      configuration.value,
      (message) => updateProgress(message),
    );

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    await labelGenerator.saveDocument(result.data, `labels_${timestamp}.docx`);

    hideLoading();
    addMessage({
      type: MESSAGE_TYPES.SUCCESS,
      category: MESSAGE_CATEGORIES.GENERATION,
      title: "Labels generated successfully!",
      message: `Generated ${result.stats.pages} pages with ${result.stats.totalLabels} labels (${result.stats.itemsPerPage} per page)`,
      key: "generation-success",
    });
  } catch (error) {
    hideLoading();
    console.error("[ERROR] Generation failed:", error.message);

    addMessage({
      type: MESSAGE_TYPES.ERROR,
      category: MESSAGE_CATEGORIES.GENERATION,
      title: "Generation failed",
      message: error.message,
      key: "generation-error",
    });
    showMessageDrawer.value = true; // Auto-open drawer on error
  } finally {
    isGenerating.value = false;
  }
};

// Preview selected records
const previewRecords = async () => {
  try {
    showLoading("Preparing preview...");

    // Get template placeholders
    const templateArrayBuffer = getStoredTemplateArrayBuffer();
    if (templateArrayBuffer) {
      templateColumns.value =
        labelGenerator.extractTemplatePlaceholders(templateArrayBuffer);
    } else {
      templateColumns.value = [];
    }

    // Get data
    let data = getCachedExcelData();
    if (!data) {
      data = await getExcelData(excelFile.value, sheetName.value);
      setCachedExcelData(data);
    }

    if (data.length === 0) {
      hideLoading();
      addMessage({
        type: MESSAGE_TYPES.WARNING,
        category: MESSAGE_CATEGORIES.VALIDATION,
        title: "No data found to preview",
        suggestion: "Make sure your data file contains records.",
        key: "preview-no-data",
      });
      return;
    }

    // Check for template placeholders that don't have matching data columns
    if (templateColumns.value.length > 0) {
      const dataColumns = Object.keys(data[0] || {});
      const unmatchedPlaceholders = templateColumns.value.filter(
        (placeholder) => !dataColumns.includes(placeholder),
      );

      if (unmatchedPlaceholders.length > 0) {
        addMessage({
          type: MESSAGE_TYPES.WARNING,
          category: MESSAGE_CATEGORIES.VALIDATION,
          title: "Template references columns not found in data",
          items: unmatchedPlaceholders,
          suggestion:
            "These placeholders will be empty in the output. Check for typos or add the columns to your data.",
          key: "preview-unmatched-columns",
        });
      } else {
        // Clear the warning if all columns now match
        removeMessageByKey("preview-unmatched-columns");
      }
    }

    // Apply record selection
    let selectedData = labelGenerator.applyRecordSelection(
      data,
      configuration.value,
    );

    // Apply sorting
    selectedData = labelGenerator.applySorting(
      selectedData,
      configuration.value,
    );

    // Apply formatting for preview
    const formattedData = formatDataForPreview(
      selectedData,
      configuration.value,
    );

    previewData.value = formattedData;
    hideLoading();
    showPreviewModal.value = true;
  } catch (error) {
    hideLoading();
    console.error("Error preparing preview:", error);
    addMessage({
      type: MESSAGE_TYPES.ERROR,
      category: MESSAGE_CATEGORIES.GENERATION,
      title: "Failed to prepare preview",
      message: error.message,
      key: "preview-error",
    });
  }
};

// Handle configuration updates
const handleConfigUpdate = (newConfig) => {
  configuration.value = newConfig;
  saveConfiguration(newConfig);
};

// Compute skipped rows based on duplicates configuration - now adds message
watch(
  () => {
    if (!isReady.value) return null;
    if (configuration.value.duplicates.mode !== "column") return null;
    if (!configuration.value.duplicates.column) return null;

    const data = getCachedExcelData();
    if (!data || data.length === 0) return null;

    const column = configuration.value.duplicates.column;
    const addSubtract = configuration.value.duplicates.addSubtract || 0;

    const skippedRows = [];
    const selectedData = labelGenerator.applyRecordSelection(
      data,
      configuration.value,
    );

    selectedData.forEach((row) => {
      const rawValue = row[column];
      const columnValue =
        rawValue === "" || rawValue === undefined || rawValue === null
          ? 0
          : parseInt(rawValue) || 0;
      const copies = Math.max(0, columnValue + addSubtract);

      if (copies === 0) {
        const rowNum = row.__spreadsheetRow || "?";
        skippedRows.push(rowNum);
      }
    });

    return skippedRows;
  },
  (skippedRows) => {
    // Clear previous skipped rows message
    removeMessageByKey("skipped-rows-info");

    if (skippedRows && skippedRows.length > 0) {
      const rowsDisplay =
        skippedRows.length <= 5
          ? skippedRows.join(", ")
          : `${skippedRows.slice(0, 5).join(", ")}... and ${skippedRows.length - 5} more`;

      addMessage({
        type: MESSAGE_TYPES.INFO,
        category: MESSAGE_CATEGORIES.CONFIGURATION,
        title: `${skippedRows.length} row${skippedRows.length > 1 ? "s" : ""} will be skipped`,
        message: `Rows ${rowsDisplay} have 0 copies based on current settings.`,
        key: "skipped-rows-info",
      });
    }
  },
  { immediate: true },
);

// Remove the old skippedRowsInfo computed - no longer needed
// const skippedRowsInfo = computed(() => { ... })

// Remove the old validationSummary computed - no longer needed (handled by watch on configuration)
// const validationSummary = computed(() => { ... })

// UI Helper functions
const showLoading = (message, progress = 0) => {
  loading.value = true;
  loadingMessage.value = message;
  loadingProgress.value = progress;
};

const hideLoading = () => {
  loading.value = false;
};

const updateProgress = (message, progress = 0) => {
  loadingMessage.value = message;
  loadingProgress.value = progress;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

// Handle file clears - also clear related messages
const handleTemplateClear = async () => {
  try {
    setTemplateFile(null);
    templateFilename.value = "";
    templateFilesize.value = "";
    isTemplateSaved.value = false;
    await deleteFileFromIndexedDB("template");

    // Clear template-related messages
    removeMessageByKey("template-load-error");
    removeMessageByKey("template-storage-warning");
    removeMessageByKey("preview-unmatched-columns");
    clearValidation();
  } catch (error) {
    console.error("Error clearing template:", error);
  }
};

const handleExcelClear = async () => {
  try {
    setExcelFile(null);
    excelFilename.value = "";
    excelFilesize.value = "";
    isExcelSaved.value = false;
    selectedSheet.value = "";
    setSheetName(null);
    setHeaders([]);
    setCachedExcelData(null);
    availableSheets.value = [];
    fileType.value = "";
    await deleteFileFromIndexedDB("excel");
    localStorage.removeItem("specimensLabeler_excelFileName");
    localStorage.removeItem("specimensLabeler_sheetName");

    // Clear data-related messages
    removeMessageByKey("excel-load-error");
    removeMessageByKey("excel-storage-warning");
    removeMessageByKey("sheet-load-error");
    removeMessageByKey("preview-no-data");
    removeMessageByKey("skipped-rows-info");
    clearValidation();
  } catch (error) {
    console.error("Error clearing Excel file:", error);
  }
};

// Toggle help drawer
const toggleHelpDrawer = () => {
  showHelpDrawer.value = !showHelpDrawer.value;
};

// Open help drawer with template guide
const showTemplateHelp = () => {
  helpDrawerRef.value?.openWithTemplateGuide();
};

// Extract template columns when template is loaded
const currentTemplateColumns = computed(() => {
  const templateArrayBuffer = getStoredTemplateArrayBuffer();
  if (templateArrayBuffer) {
    return labelGenerator.extractTemplatePlaceholders(templateArrayBuffer);
  }
  return [];
});

// Watch for changes to trigger validation
watch(
  [currentTemplateColumns, headers],
  ([placeholders, headerList]) => {
    if (placeholders.length > 0 && headerList.length > 0) {
      validatePlaceholders(placeholders, headerList);
    } else {
      clearValidation();
    }
  },
  { immediate: true },
);

// Validation messages for configuration
watch(
  () => configuration.value,
  (config) => {
    // Clear previous config warnings
    clearCategory(MESSAGE_CATEGORIES.CONFIGURATION);

    // Check for configuration issues
    if (isReady.value) {
      if (config.duplicates.mode === "column" && !config.duplicates.column) {
        addMessage({
          type: MESSAGE_TYPES.WARNING,
          category: MESSAGE_CATEGORIES.CONFIGURATION,
          title: "Duplicates column not selected",
          suggestion: "Select a column to determine the number of copies.",
          key: "config-duplicates",
        });
      }

      const dateColumns = config.formatting.date.columns || [];
      if (
        config.formatting.date.mode === "column" &&
        dateColumns.length === 0
      ) {
        addMessage({
          type: MESSAGE_TYPES.WARNING,
          category: MESSAGE_CATEGORIES.CONFIGURATION,
          title: "No date columns selected",
          suggestion: "Select at least one date column to format.",
          key: "config-date",
        });
      }

      if (
        config.formatting.geocoord.mode === "single" &&
        !config.formatting.geocoord.singleColumn
      ) {
        addMessage({
          type: MESSAGE_TYPES.WARNING,
          category: MESSAGE_CATEGORIES.CONFIGURATION,
          title: "Geocoordinate column not selected",
          suggestion: "Select a column containing coordinates.",
          key: "config-geocoord",
        });
      }

      if (config.formatting.geocoord.mode === "separate") {
        if (
          !config.formatting.geocoord.latColumn ||
          !config.formatting.geocoord.lonColumn
        ) {
          addMessage({
            type: MESSAGE_TYPES.WARNING,
            category: MESSAGE_CATEGORIES.CONFIGURATION,
            title: "Lat/Lon columns not selected",
            suggestion: "Select both latitude and longitude columns.",
            key: "config-geocoord-separate",
          });
        }
      }
    }
  },
  { deep: true },
);

// Initialize on mount
onMounted(async () => {
  await initializeStorage();
  loadConfiguration();

  const storedTemplateData = await loadStoredTemplate();
  if (storedTemplateData) {
    const file = useStoredTemplate();
    if (file) {
      setTemplateFile(file);
      templateFilename.value = file.name;
      templateFilesize.value = formatFileSize(file.size);
      isTemplateSaved.value = true;
    }
  }

  const storedExcelData = await loadStoredExcel();
  if (storedExcelData) {
    const file = useStoredExcel();
    if (file) {
      try {
        await handleExcelFile(file);
      } catch (error) {
        console.error("Failed to restore Excel file:", error);
      }
    }
  }
});

// Watch for message changes to auto-show/hide drawer
watch(
  hasMessages,
  (hasAnyMessages) => {
    showMessageDrawer.value = hasAnyMessages;
  },
  { immediate: true },
);
</script>

<template>
  <v-app class="app-layout">
    <!-- App Bar -->
    <v-app-bar class="main-gradient" density="comfortable" elevation="2">
      <v-app-bar-title class="font-weight-bold">
        🌿 Specimens Labeler
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Message Indicator -->
      <MessageIndicator @click="showMessageDrawer = true" class="mr-4" />

      <v-btn
        variant="outlined"
        color="white"
        @click="toggleHelpDrawer"
        prepend-icon="mdi-book-open-variant"
        class="mr-8"
      >
        User Guide
      </v-btn>
    </v-app-bar>

    <!-- Help Drawer -->
    <HelpDrawer ref="helpDrawerRef" v-model="showHelpDrawer" />

    <!-- Message Drawer - now controlled by hasMessages -->
    <MessageDrawer v-model="showMessageDrawer" />

    <!-- Data Preview Modal -->
    <DataPreviewModal
      v-model="showPreviewModal"
      :data="previewData"
      :template-columns="templateColumns"
      :all-headers="headers"
      :duplicates-config="configuration.duplicates"
    />

    <!-- Main Content -->
    <v-main class="main-content">
      <div class="app-grid">
        <!-- Left Column: File Uploads -->
        <div class="input-zone">
          <div class="zone-header">
            <v-icon start>mdi-upload</v-icon>
            Input Files
          </div>

          <div class="files-container">
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
              @show-template-help="showTemplateHelp"
            />

            <FileDropZone
              heading="Data File"
              text="Drop Excel or CSV here"
              subtext="or click to browse"
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
                  class="sheet-selector mt-3"
                  @click.stop
                >
                  <v-select
                    v-model="selectedSheet"
                    :items="availableSheets"
                    label="Select Sheet"
                    :class="{ 'sheet-warning': !selectedSheet }"
                    @update:model-value="handleSheetSelection(selectedSheet)"
                    density="comfortable"
                    bg-color="white"
                    hide-details
                  ></v-select>
                </div>

                <div
                  v-if="fileType === 'csv' && excelFilename"
                  class="csv-ready mt-3"
                  @click.stop
                >
                  <v-chip color="success" variant="flat" size="small">
                    <v-icon start size="small">mdi-check</v-icon>
                    CSV Ready
                  </v-chip>
                </div>
              </template>
            </FileDropZone>
          </div>
        </div>

        <!-- Right Column: Configuration & Generate -->
        <div class="config-zone">
          <!-- Configuration Area (scrollable) -->
          <div class="config-scroll-area">
            <template v-if="isReady">
              <ConfigurationPanels
                :config="configuration"
                :headers="headers"
                :total-rows="totalDataRows"
                :template-columns="currentTemplateColumns"
                @update:config="handleConfigUpdate"
              />
            </template>

            <template v-else>
              <v-card variant="tonal" class="pa-6 text-center">
                <v-icon size="48" color="grey">mdi-arrow-left</v-icon>
                <div class="text-h6 mt-4 text-grey">Upload Files to Begin</div>
                <div class="text-body-2 text-grey mt-2">
                  Drop your Word template and Excel/CSV data file in the left
                  panel (select the sheet to work on if you uploaded an Excel spreadsheet)
                </div>
              </v-card>
            </template>
          </div>

          <!-- Spacer -->
          <div class="generate-spacer"></div>

          <!-- Generate Button (fixed at bottom) -->
          <div class="generate-section">
            <v-card
              :color="isReady ? '#6b77bf' : 'grey-lighten-1'"
              class="generate-card"
            >
              <v-card-text class="pa-4">
                <div class="d-flex ga-3">
                  <v-btn
                    size="large"
                    :disabled="!isReady"
                    @click="previewRecords"
                    color="white"
                    variant="outlined"
                  >
                    <v-icon start>mdi-table-eye</v-icon>
                    Preview data
                  </v-btn>

                  <v-btn
                    size="large"
                    class="main-gradient flex-grow-1"
                    :disabled="!isReady || isGenerating"
                    @click="generateLabels"
                    :color="isReady ? 'white' : 'grey-lighten-3'"
                    :class="{ 'generate-btn-active': isReady }"
                    elevation="2"
                  >
                    <v-icon start v-if="!isGenerating"
                      >mdi-file-document-plus</v-icon
                    >
                    <v-progress-circular
                      v-else
                      indeterminate
                      size="20"
                      width="2"
                      class="mr-2"
                    ></v-progress-circular>
                    {{ isGenerating ? "Generating..." : "Generate Labels" }}
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="app-footer">
        © 2025
        <a
          href="https://dominicweb.eu"
          target="_blank"
          rel="noopener noreferrer"
          >Dominik M. Ramík</a
        >
        <span class="version">v{{ packageJson.version }}</span>
      </div>
    </v-main>

    <!-- Loading Overlay -->
    <LoadingOverlay
      :show="loading"
      :message="loadingMessage"
      :progress="loadingProgress"
    />
  </v-app>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  overflow: hidden;
}

.main-content {
  height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.app-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Left Column - Input Zone */
.input-zone {
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.zone-header {
  padding: 16px 20px;
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4338ca;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.files-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.sheet-selector {
  width: 100%;
}

.sheet-selector :deep(.v-field.sheet-warning) {
  border-color: #ff9800;
  border-width: 2px;
}

/* Right Column - Config Zone */
.config-zone {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.output-message-container {
  flex-shrink: 0;
  padding: 16px 16px 0 16px;
}

.output-message {
  flex-shrink: 0;
  margin: 16px 16px 0 16px;
}

.config-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

.generate-section {
  flex-shrink: 0;
  padding: 0 16px 16px 16px;
}

.generate-card {
  border-radius: 8px;
}

.generate-btn-active {
  color: #4338ca !important;
  font-weight: 700;
}

/* Spacer for Generate button */
.generate-spacer {
  flex-shrink: 0;
  height: 16px;
}

/* Footer */
.app-footer {
  flex-shrink: 0;
  text-align: center;
  padding: 12px;
  font-size: 12px;
  color: #666;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.app-footer a {
  color: #4338ca;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}

.version {
  margin-left: 8px;
  color: #999;
}

/* Responsive - Tablet and below */
@media (max-width: 960px) {
  .app-grid {
    grid-template-columns: 1fr;
  }
}

/* Mobile */
@media (max-width: 600px) {
  .app-grid {
    grid-template-rows: auto 1fr;
  }

  .input-zone {
    max-height: 50vh;
  }

  .files-container {
    flex-direction: column;
  }

  .files-container > * {
    min-width: 100%;
  }
}

.preview-btn {
  border-color: rgba(255, 255, 255, 0.5) !important;
  color: white !important;
}

.preview-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

.main-gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
}
</style>
