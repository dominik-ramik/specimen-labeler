<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
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
  validateCopiesColumn,
} from "./utils/excelHandler";
import { labelGenerator } from "./services/labelGenerator";
import {
  deleteFileFromIndexedDB,
  indexedDBDataToFile,
} from "./utils/indexedDBStorage";
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
  isDrawerOpen,
  clearCategory,
  clearTransient,
  removeMessageByKey,
  hasMessages,
  hasErrors,
} = useMessages();

// Copies-column validation dialog
const showCopiesColumnDialog = ref(false);
const copiesColumnProblems = ref([]);
const MAX_DISPLAYED_PROBLEMS = 50;
const copiesColumnProblemsDisplay = computed(() =>
  copiesColumnProblems.value.slice(0, MAX_DISPLAYED_PROBLEMS),
);
const copiesColumnProblemLabel = (reason) => {
  switch (reason) {
    case "date":
      return "Date value — would generate an enormous number of copies";
    case "non-numeric":
      return "Non-numeric text";
    case "float":
      return "Decimal number — would be truncated to an integer";
    default:
      return "Invalid value";
  }
};
const setCopiesInvalidHandling = (choice) => {
  configuration.value.duplicates.invalidValueHandling = choice;
  showCopiesColumnDialog.value = false;
};

// Excessive-copies warning dialog
const EXCESSIVE_COPIES_THRESHOLD = 30;
const showExcessiveCopiesDialog = ref(false);
const excessiveCopiesEntries = ref([]);
const excessiveCopiesIsFixed = ref(false);
const MAX_DISPLAYED_EXCESSIVE = 50;
const excessiveCopiesEntriesDisplay = computed(() =>
  excessiveCopiesEntries.value.slice(0, MAX_DISPLAYED_EXCESSIVE),
);
let resolveExcessiveCopiesPrompt = null;

// Mirrors resolveCopiesValue from labelGenerator.js to resolve copy count for a single row
const resolveRowCopies = (row, config) => {
  const { mode, column, addSubtract, fixed, invalidValueHandling } =
    config.duplicates;
  const handling = invalidValueHandling || "skip";
  const offset = addSubtract || 0;
  if (mode === "fixed") return Math.max(0, fixed || 1);
  if (mode === "column" && column) {
    const rawValue = row[column];
    const meta = row.__metadata?.[column] ?? null;
    const fallback = handling === "assume1" ? 1 : 0;
    if (rawValue === "" || rawValue === null || rawValue === undefined)
      return 0;
    if (meta?.isDate) return fallback;
    const str = rawValue.toString().trim();
    const num = Number(str);
    if (!isFinite(num) || isNaN(num) || !Number.isInteger(num)) return fallback;
    return Math.max(0, num + offset);
  }
  return 1;
};

const promptExcessiveCopies = (entries, isFixed) => {
  return new Promise((resolve) => {
    excessiveCopiesEntries.value = entries;
    excessiveCopiesIsFixed.value = isFixed;
    showExcessiveCopiesDialog.value = true;
    resolveExcessiveCopiesPrompt = resolve;
  });
};

const confirmExcessiveCopies = () => {
  showExcessiveCopiesDialog.value = false;
  resolveExcessiveCopiesPrompt?.(true);
  resolveExcessiveCopiesPrompt = null;
};

const cancelExcessiveCopies = () => {
  showExcessiveCopiesDialog.value = false;
  resolveExcessiveCopiesPrompt?.(false);
  resolveExcessiveCopiesPrompt = null;
};

// Track the last column for which the dialog was shown to avoid re-triggering
// on unrelated config changes (e.g. only invalidValueHandling changed).
let lastValidatedCopiesColumn = null;

// Run copies-column validation against the given data and show the dialog
// if problematic values are found. Marks the column as validated so the
// watcher does not open the dialog a second time for the same column.
const checkAndShowCopiesColumnDialog = (column, data) => {
  if (!column || !data || data.length === 0) return;
  lastValidatedCopiesColumn = column;
  const problems = validateCopiesColumn(data, column);
  if (problems.length > 0) {
    copiesColumnProblems.value = problems;
    showCopiesColumnDialog.value = true;
  }
};

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

// Check if there are actual records to generate based on selection and duplicate settings
const hasProcessableRecords = computed(() => {
  if (
    !isReady.value ||
    !cachedExcelData.value ||
    cachedExcelData.value.length === 0
  ) {
    return false;
  }

  // 1. Check if rows exist within the selected range (Start/End/Specific)
  const selectedData = labelGenerator.applyRecordSelection(
    cachedExcelData.value,
    configuration.value,
  );

  if (selectedData.length === 0) return false;

  // 2. If "Column" mode is active, ensure at least one row produces > 0 copies
  if (
    configuration.value.duplicates.mode === "column" &&
    configuration.value.duplicates.column
  ) {
    const colName = configuration.value.duplicates.column;
    const offset = configuration.value.duplicates.addSubtract || 0;
    const handling =
      configuration.value.duplicates.invalidValueHandling || "skip";

    // Returns true if AT LEAST ONE row has a copy count > 0
    return selectedData.some((row) => {
      const rawVal = row[colName];
      const meta = row.__metadata?.[colName] ?? null;
      // Reuse the same resolution logic as labelGenerator
      let numVal = 0;
      if (rawVal === "" || rawVal === null || rawVal === undefined) {
        numVal = 0;
      } else if (meta?.isDate) {
        numVal = handling === "assume1" ? 1 : 0;
      } else {
        const n = Number(rawVal.toString().trim());
        numVal =
          !isFinite(n) || isNaN(n) || !Number.isInteger(n)
            ? handling === "assume1"
              ? 1
              : 0
            : n;
      }
      return Math.max(0, numVal + offset) > 0;
    });
  }

  // If simple mode or no column selected yet, we have records
  return true;
});

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

    // Reset validated-column tracking so the fresh data is always checked,
    // including on page reload where the column was already persisted in config.
    lastValidatedCopiesColumn = null;

    const duplicateColumn = headerList.find((h) =>
      h.toLowerCase().includes("duplicate"),
    );
    if (duplicateColumn) {
      configuration.value.duplicates.column = duplicateColumn;
    }

    // Validate the active copies column immediately with the freshly loaded data.
    // This handles both the reload case (column persisted, no user interaction)
    // and the auto-detect case above.
    if (
      configuration.value.duplicates.mode === "column" &&
      configuration.value.duplicates.column
    ) {
      checkAndShowCopiesColumnDialog(
        configuration.value.duplicates.column,
        excelData,
      );
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

    // Check for suspiciously high copy counts before proceeding
    {
      const selectedData = labelGenerator.applyRecordSelection(
        data,
        configuration.value,
      );
      const mode = configuration.value.duplicates.mode;
      const isFixed = mode === "fixed";
      const excessiveEntries = [];

      if (isFixed) {
        const fixedCount = configuration.value.duplicates.fixed || 1;
        if (fixedCount > EXCESSIVE_COPIES_THRESHOLD) {
          excessiveEntries.push({
            copies: fixedCount,
            rowCount: selectedData.length,
          });
        }
      } else {
        for (let i = 0; i < selectedData.length; i++) {
          const copies = resolveRowCopies(selectedData[i], configuration.value);
          if (copies > EXCESSIVE_COPIES_THRESHOLD) {
            const rowNum = selectedData[i].__spreadsheetRow ?? i + 2;
            excessiveEntries.push({ rowNum, copies });
          }
        }
      }

      if (excessiveEntries.length > 0) {
        hideLoading();
        const confirmed = await promptExcessiveCopies(
          excessiveEntries,
          isFixed,
        );
        if (!confirmed) {
          isGenerating.value = false;
          return;
        }
        showLoading("Preparing to generate labels...");
      }
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
    const handling =
      configuration.value.duplicates.invalidValueHandling || "skip";

    const skippedRows = [];
    const selectedData = labelGenerator.applyRecordSelection(
      data,
      configuration.value,
    );

    selectedData.forEach((row) => {
      const rawValue = row[column];
      const meta = row.__metadata?.[column] ?? null;
      let columnValue = 0;
      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        columnValue = 0;
      } else if (meta?.isDate) {
        columnValue = handling === "assume1" ? 1 : 0;
      } else {
        const n = Number(rawValue.toString().trim());
        columnValue =
          !isFinite(n) || isNaN(n) || !Number.isInteger(n)
            ? handling === "assume1"
              ? 1
              : 0
            : n;
      }
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
      const start = config.recordSelection.startRow;
      const end = config.recordSelection.endRow;

      // If invalid range -> show a keyed warning in message drawer
      if (end < start) {
        console.log("added message");
        addMessage({
          type: MESSAGE_TYPES.WARNING,
          category: MESSAGE_CATEGORIES.CONFIGURATION,
          title: "Invalid record range",
          message: `End row (${end}) is less than start row (${start}).`,
          suggestion:
            "Ensure the end row is greater than or equal to the start row.",
          key: "config-invalid-range",
        });
      }

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

// Watch for copies-column selection and validate values for suitability.
// This handles the case where the user manually changes the column after
// data is already loaded. The reload / initial-load case is handled directly
// in handleSheetSelection once data is available.
watch(
  () => [
    configuration.value.duplicates.mode,
    configuration.value.duplicates.column,
  ],
  ([mode, column]) => {
    if (mode !== "column" || !column) {
      lastValidatedCopiesColumn = null;
      return;
    }
    // Skip if this column was already validated (e.g. just set by handleSheetSelection)
    if (column === lastValidatedCopiesColumn) return;

    const data = getCachedExcelData();
    // If data isn't loaded yet the handleSheetSelection call will cover validation
    if (!data || data.length === 0) return;

    checkAndShowCopiesColumnDialog(column, data);
  },
);

// Initialize on mount
onMounted(async () => {
  await initializeStorage();
  loadConfiguration();

  // Load Template
  const storedTemplateData = await loadStoredTemplate();
  if (storedTemplateData) {
    // Convert raw DB data to File object
    const file = indexedDBDataToFile(storedTemplateData);
    if (file) {
      handleTemplateFile(file);
    }
  }

  // Load Excel
  const storedExcelData = await loadStoredExcel();
  if (storedExcelData) {
    // Convert raw DB data to File object
    const file = indexedDBDataToFile(storedExcelData);
    if (file) {
      handleExcelFile(file);
    }
  }

  // Show user guide if first visit (no config and not seen before)
  const configKey = "specimensLabeler_configuration";
  const seenGuideKey = "specimensLabeler_seenGuide";
  const hasConfig = !!localStorage.getItem(configKey);
  const hasSeenGuide = !!localStorage.getItem(seenGuideKey);

  if (!hasSeenGuide) {
    showHelpDrawer.value = true;
    localStorage.setItem(seenGuideKey, "1");
  }
});
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
      <MessageIndicator @click="isDrawerOpen = true" class="mr-4" />

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
    <MessageDrawer v-model="isDrawerOpen" />

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
                  panel (select the sheet to work on if you uploaded an Excel
                  spreadsheet)
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
                    :disabled="
                      !isReady || isGenerating || !hasProcessableRecords
                    "
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
        <a href="https://dominicweb.eu" target="_blank">Dominik M. Ramík</a>
        <span class="version">v{{ packageJson.version }}</span> | Originally created for
        the
        <a href="https://pvnh.net/plants-and-people-of-vanuatu/" target="_blank"
          >Plants and People of Vanuatu</a
        >
        research project |
        <a
          href="https://github.com/dominik-ramik/specimen-labeler"
          ,
          target="_blank"
          >Specimen Labeler on GitHub</a
        >
      </div>
    </v-main>

    <!-- Loading Overlay -->
    <LoadingOverlay
      :show="loading"
      :message="loadingMessage"
      :progress="loadingProgress"
    />

    <!-- Excessive-copies warning dialog -->
    <v-dialog v-model="showExcessiveCopiesDialog" max-width="560" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="warning">mdi-content-copy</v-icon>
          Unusually high copy counts detected
        </v-card-title>
        <v-card-text>
          <p class="mb-3">
            The following
            <span v-if="excessiveCopiesIsFixed"
              >fixed copies setting exceeds</span
            >
            <span v-else>{{
              excessiveCopiesEntries.length === 1
                ? "entry has a copy count that exceeds"
                : "entries have copy counts that exceed"
            }}</span>
            the warning threshold of
            <strong>{{ EXCESSIVE_COPIES_THRESHOLD }}</strong> copies:
          </p>

          <!-- Fixed mode: single summary row -->
          <v-alert
            v-if="excessiveCopiesIsFixed"
            type="warning"
            variant="tonal"
            density="compact"
            icon="mdi-numeric-positive-1"
            class="mb-4"
          >
            Fixed copies:
            <strong>{{ excessiveCopiesEntries[0]?.copies }}</strong>
            &nbsp;&mdash;&nbsp;
            {{ excessiveCopiesEntries[0]?.rowCount }} record{{
              excessiveCopiesEntries[0]?.rowCount === 1 ? "" : "s"
            }}
            will each get
            <strong>{{ excessiveCopiesEntries[0]?.copies }}</strong> copies
            (total:
            <strong>{{
              (excessiveCopiesEntries[0]?.copies ?? 0) *
              (excessiveCopiesEntries[0]?.rowCount ?? 0)
            }}</strong>
            labels)
          </v-alert>

          <!-- Column mode: list of individual rows -->
          <v-list
            v-else
            lines="two"
            class="mb-4 rounded"
            style="
              max-height: 220px;
              overflow-y: auto;
              border: 1px solid #e0e0e0;
            "
          >
            <v-list-item
              v-for="(entry, i) in excessiveCopiesEntriesDisplay"
              :key="i"
              prepend-icon="mdi-content-copy"
            >
              <v-list-item-title
                >Row {{ entry.rowNum }}:
                {{ entry.copies }} copies</v-list-item-title
              >
            </v-list-item>
            <v-list-item
              v-if="excessiveCopiesEntries.length > MAX_DISPLAYED_EXCESSIVE"
              prepend-icon="mdi-dots-horizontal"
            >
              <v-list-item-title class="text-medium-emphasis">
                &hellip; and
                {{ excessiveCopiesEntries.length - MAX_DISPLAYED_EXCESSIVE }}
                more
              </v-list-item-title>
            </v-list-item>
          </v-list>

          <v-alert
            type="warning"
            variant="tonal"
            density="compact"
            icon="mdi-alert"
          >
            Generating a large number of copies may produce a very large
            document and take significant time. Please confirm this is
            intentional before proceeding.
          </v-alert>
        </v-card-text>
        <v-card-actions class="d-flex ga-2 pa-4 pt-0">
          <v-btn
            variant="tonal"
            color="error"
            prepend-icon="mdi-cancel"
            @click="cancelExcessiveCopies"
          >
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            variant="tonal"
            color="warning"
            prepend-icon="mdi-check"
            @click="confirmExcessiveCopies"
          >
            Proceed anyway
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Copies-column invalid-value dialog -->
    <v-dialog v-model="showCopiesColumnDialog" max-width="560" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="warning">mdi-alert</v-icon>
          Non-numeric values in copies column
        </v-card-title>
        <v-card-text>
          <p class="mb-3">
            The selected column
            <strong>"{{ configuration.duplicates?.column }}"</strong>
            contains {{ copiesColumnProblems.length }} value{{
              copiesColumnProblems.length === 1 ? "" : "s"
            }}
            that cannot be used as a label copy count:
          </p>
          <v-list
            lines="two"
            class="mb-4 rounded"
            style="
              max-height: 220px;
              overflow-y: auto;
              border: 1px solid #e0e0e0;
            "
          >
            <v-list-item
              v-for="(problem, i) in copiesColumnProblemsDisplay"
              :key="i"
              :prepend-icon="
                problem.reason === 'date'
                  ? 'mdi-calendar-alert'
                  : problem.reason === 'float'
                    ? 'mdi-decimal'
                    : 'mdi-text-search'
              "
            >
              <v-list-item-title
                >Row {{ problem.spreadsheetRow }}: &ldquo;{{
                  problem.value
                }}&rdquo;</v-list-item-title
              >
              <v-list-item-subtitle>{{
                copiesColumnProblemLabel(problem.reason)
              }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item
              v-if="copiesColumnProblems.length > MAX_DISPLAYED_PROBLEMS"
              prepend-icon="mdi-dots-horizontal"
            >
              <v-list-item-title class="text-medium-emphasis">
                … and
                {{ copiesColumnProblems.length - MAX_DISPLAYED_PROBLEMS }} more
              </v-list-item-title>
            </v-list-item>
          </v-list>
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
            icon="mdi-information"
          >
            <strong>Tip:</strong> You can fix this by opening the spreadsheet,
            ensuring all cells in this column contain integer numbers and the
            column is formatted in numeric format (or leaving them empty to
            skip), saving the file, and reloading it here.
          </v-alert>
          <p class="text-body-2">How should these entries be handled?</p>
        </v-card-text>
        <v-card-actions class="flex-wrap ga-2 pa-4 pt-0">
          <v-btn
            variant="tonal"
            color="warning"
            prepend-icon="mdi-skip-next"
            @click="setCopiesInvalidHandling('skip')"
          >
            Skip them (0 copies)
          </v-btn>
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-numeric-1-box-outline"
            @click="setCopiesInvalidHandling('assume1')"
          >
            Assume 1 copy
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
