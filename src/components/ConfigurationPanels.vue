<template>
  <div class="configuration-panels">
    <div class="config-grid">
      <!-- Left Column: Record Selection & Label Copies -->
      <div class="config-column">
        <v-expansion-panels v-model="leftPanels" multiple>
          <!-- Record Selection Panel -->
          <v-expansion-panel value="records">
            <v-expansion-panel-title>
              <v-icon start>mdi-table-filter</v-icon>
              <span class="panel-label">Record Selection</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="d-flex align-center ga-2 flex-wrap">
                <v-label style="min-width: 70px">Records:</v-label>
                <span class="text-caption">From</span>
                <v-text-field
                  v-model.number="localConfig.recordSelection.startRow"
                  type="number"
                  min="1"
                  :max="totalRows"
                  @update:model-value="handleRecordRangeChange"
                  hide-details
                  density="compact"
                  style="width: 80px"
                  placeholder="1"
                ></v-text-field>
                <span class="text-caption">to</span>
                <v-text-field
                  v-model.number="localConfig.recordSelection.endRow"
                  type="number"
                  :min="localConfig.recordSelection.startRow || 1"
                  :max="totalRows"
                  @update:model-value="handleRecordRangeChange"
                  hide-details
                  density="compact"
                  style="width: 80px"
                  :placeholder="totalRows.toString()"
                ></v-text-field>
                <v-btn
                  v-if="!isFullRange"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="resetToFullRange"
                  class="ml-2"
                >
                  Reset to All
                </v-btn>
              </div>
              <div class="text-caption text-grey mt-2">
                Processing {{ selectedRecordCount }} of {{ totalRows }} records
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <!-- Label Copies Panel -->
          <v-expansion-panel value="copies">
            <v-expansion-panel-title>
              <v-icon start>mdi-content-copy</v-icon>
              <span class="panel-label">Label Copies</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-radio-group
                v-model="localConfig.duplicates.mode"
                @update:model-value="emitUpdate"
                hide-details
              >
                <v-radio label="Get from Column" value="column"></v-radio>

                <div
                  v-if="localConfig.duplicates.mode === 'column'"
                  class="nested-controls ml-4 mt-2 mb-3"
                >
                  <div class="d-flex align-center ga-2 mb-2 flex-wrap">
                    <v-label style="min-width: 60px">Column:</v-label>
                    <v-select
                      v-model="localConfig.duplicates.column"
                      :items="headers"
                      @update:model-value="emitUpdate"
                      placeholder="Select..."
                      density="compact"
                      hide-details
                      class="flex-grow-1"
                      style="min-width: 120px"
                    ></v-select>
                    <v-label style="white-space: nowrap">offset by</v-label>
                    <v-text-field
                      v-model.number="localConfig.duplicates.addSubtract"
                      type="number"
                      @update:model-value="emitUpdate"
                      hide-details
                      density="compact"
                      style="width: 70px"
                    ></v-text-field>
                  </div>
                  <div
                    class="text-caption text-grey"
                    style="font-size: 11px; line-height: 1.3"
                  >
                    Adjust the column value. Example: if column = 3 and offset
                    by = -1, you get 2 copies
                  </div>
                </div>

                <v-radio value="fixed">
                  <template v-slot:label>
                    <div class="d-flex align-center ga-2">
                      <span>Fixed Number</span>
                      <v-text-field
                        v-model.number="localConfig.duplicates.fixed"
                        type="number"
                        min="1"
                        :disabled="localConfig.duplicates.mode !== 'fixed'"
                        @update:model-value="emitUpdate"
                        hide-details
                        density="compact"
                        style="width: 70px"
                        @click.stop
                      ></v-text-field>
                    </div>
                  </template>
                </v-radio>
              </v-radio-group>

              <!-- Collation Order -->
              <div v-if="shouldShowCollateOption" class="mt-3 pa-3">
                <v-label class="font-weight-medium mb-2"
                  >Collation Order:</v-label
                >
                <v-radio-group
                  v-model="localConfig.duplicates.collate"
                  @update:model-value="emitUpdate"
                  hide-details
                  density="compact"
                  inline
                >
                  <v-radio
                    label="Sets Together (A,B,C,A,B,C)"
                    value="collated"
                    class="mr-4"
                  ></v-radio>
                  <v-radio
                    label="Duplicates Together (A,A,B,B)"
                    value="uncollated"
                  ></v-radio>
                </v-radio-group>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- Right Column: Formatting Options -->
      <div class="config-column">
        <v-expansion-panels v-model="rightPanels" multiple>
          <!-- Formatting Options Panel -->
          <v-expansion-panel value="formatting">
            <v-expansion-panel-title>
              <v-icon start>mdi-format-text</v-icon>
              <span class="panel-label">Formatting Options</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <!-- Date Format -->
              <div class="option-group">
                <v-label class="option-label mb-2">Date Format</v-label>
                <v-radio-group
                  v-model="localConfig.formatting.date.mode"
                  @update:model-value="emitUpdate"
                  hide-details
                  density="compact"
                  inline
                >
                  <v-radio
                    label="No formatting"
                    value="none"
                    class="mr-4"
                  ></v-radio>
                  <v-radio label="Format columns" value="column"></v-radio>
                </v-radio-group>

                <div
                  v-if="localConfig.formatting.date.mode === 'column'"
                  class="nested-controls mt-2"
                >
                  <v-select
                    v-model="localConfig.formatting.date.columns"
                    :items="dateColumnOptions"
                    label="Select date columns"
                    chips
                    multiple
                    @update:model-value="emitUpdate"
                    hide-details
                    class="mb-2"
                  ></v-select>

                  <v-divider class="my-2"></v-divider>

                  <div class="d-flex align-center ga-2 mb-2">
                    <v-select
                      v-model="localConfig.formatting.date.locale"
                      :items="localeOptions"
                      @update:model-value="emitUpdate"
                      label="Locale"
                      hide-details
                      class="flex-grow-1"
                      style="flex-basis: 0; min-width: 120px"
                    ></v-select>
                    <v-select
                      v-model="localConfig.formatting.date.format"
                      :items="dateFormatOptions"
                      @update:model-value="emitUpdate"
                      label="Format"
                      hide-details
                      class="flex-grow-1"
                      style="flex-basis: 0; min-width: 120px"
                    ></v-select>
                  </div>

                  <v-alert
                    type="info"
                    density="compact"
                    variant="tonal"
                    class="mt-2"
                  >
                    Example: {{ formatExample }}
                  </v-alert>
                </div>
              </div>

              <v-divider class="my-4"></v-divider>

              <!-- Decimal Format -->
              <div class="option-group">
                <v-label class="option-label mb-2">Decimal Format</v-label>
                <v-radio-group
                  v-model="localConfig.formatting.decimalFormat"
                  @update:model-value="emitUpdate"
                  hide-details
                  inline
                >
                  <v-radio label="Dot (1.5)" value="dot" class="mr-4"></v-radio>
                  <v-radio label="Comma (1,5)" value="comma"></v-radio>
                </v-radio-group>
              </div>

              <v-divider class="my-4"></v-divider>

              <!-- Geocoordinates -->
              <div class="option-group">
                <v-label class="option-label mb-2">Geocoordinates</v-label>
                <v-radio-group
                  v-model="localConfig.formatting.geocoord.mode"
                  @update:model-value="emitUpdate"
                  hide-details
                  density="compact"
                  inline
                >
                  <v-radio
                    label="No transformation"
                    value="none"
                    class="mr-4"
                  ></v-radio>
                  <v-radio
                    label="Single column"
                    value="single"
                    class="mr-4"
                  ></v-radio>
                  <v-radio label="Separate columns" value="separate"></v-radio>
                </v-radio-group>

                <div
                  v-if="localConfig.formatting.geocoord.mode === 'single'"
                  class="nested-controls mt-2"
                >
                  <v-select
                    v-model="localConfig.formatting.geocoord.singleColumn"
                    :items="dateColumnOptions"
                    @update:model-value="emitUpdate"
                    label="Column"
                    hide-details
                  ></v-select>
                </div>

                <div
                  v-if="localConfig.formatting.geocoord.mode === 'separate'"
                  class="nested-controls mt-2"
                >
                  <div class="d-flex align-center ga-2">
                    <v-select
                      v-model="localConfig.formatting.geocoord.latColumn"
                      :items="dateColumnOptions"
                      @update:model-value="emitUpdate"
                      label="Latitude column"
                      hide-details
                      class="flex-grow-1"
                      style="flex-basis: 0; min-width: 120px"
                    ></v-select>
                    <v-select
                      v-model="localConfig.formatting.geocoord.lonColumn"
                      :items="dateColumnOptions"
                      @update:model-value="emitUpdate"
                      label="Longitude column"
                      hide-details
                      class="flex-grow-1"
                      style="flex-basis: 0; min-width: 120px"
                    ></v-select>
                  </div>
                </div>

                <div
                  v-if="localConfig.formatting.geocoord.mode !== 'none'"
                  class="mt-2"
                >
                  <v-select
                    v-model="localConfig.formatting.geocoord.outputFormat"
                    :items="coordFormatOptions"
                    @update:model-value="emitUpdate"
                    label="Output format"
                    hide-details
                  ></v-select>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from "vue";
import {
  useMessages,
  MESSAGE_TYPES,
  MESSAGE_CATEGORIES,
} from "@/composables/useMessages";

const {
  addMessage,
  clearCategory,
  clearTransient,
  removeMessageByKey,
  hasMessages,
  hasErrors,
} = useMessages();

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
  headers: {
    type: Array,
    default: () => [],
  },
  totalRows: {
    type: Number,
    default: 1,
  },
  templateColumns: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:config"]);

const localConfig = ref(JSON.parse(JSON.stringify(props.config)));

// Separate panels for left and right columns
const leftPanels = ref(["records", "copies"]);
const rightPanels = ref(["formatting"]);

// Options for selects
const localeOptions = [
  { title: "English", value: "en-US" },
  { title: "Czech (Čeština)", value: "cs-CZ" },
  { title: "German (Deutsch)", value: "de-DE" },
  { title: "Spanish (Español)", value: "es-ES" },
  { title: "French (Français)", value: "fr-FR" },
  { title: "Italian (Italiano)", value: "it-IT" },
  { title: "Polish (Polski)", value: "pl-PL" },
  { title: "Portuguese (Português)", value: "pt-BR" },
  { title: "Russian (Русский)", value: "ru-RU" },
  { title: "Chinese (中文)", value: "zh-CN" },
  { title: "Japanese (日本語)", value: "ja-JP" },
  { title: "Korean (한국어)", value: "ko-KR" },
  { title: "Arabic (العربية)", value: "ar-SA" },
  { title: "Hindi (हिन्दी)", value: "hi-IN" },
];

const dateFormatOptions = [
  { title: "Month name Day, Year", value: "english" },
  { title: "Three-letter month", value: "short" },
  { title: "Roman numeral month", value: "roman" },
  { title: "ISO (YYYY-MM-DD)", value: "iso" },
  { title: "Uppercase short", value: "threeletter" },
];

const coordFormatOptions = [
  { title: "DMS (12°34'56.7\"N)", value: "dms" },
  { title: "Decimal with direction (12.58N)", value: "decimal-direction" },
  { title: "Signed decimal (-12.58)", value: "decimal-signed" },
];

const shouldShowCollateOption = computed(() => {
  const mode = localConfig.value.duplicates.mode;
  const fixed = localConfig.value.duplicates.fixed;
  const column = localConfig.value.duplicates.column;
  return (
    (mode === "fixed" && fixed > 1) || (mode === "column" && column !== "")
  );
});

// Format example for date
const formatExample = computed(() => {
  const format = localConfig.value.formatting.date.format;
  const locale = localConfig.value.formatting.date.locale || "en-US";

  const getMonthName = (style) => {
    try {
      const date = new Date(2025, 0, 26);
      return new Intl.DateTimeFormat(locale, { month: style }).format(date);
    } catch {
      return style === "long" ? "January" : "Jan";
    }
  };

  switch (format) {
    case "english":
      return `${getMonthName("long")} 26, 2025`;
    case "short":
      return `${getMonthName("short")} 26, 2025`;
    case "roman":
      return "26-I-2025";
    case "iso":
      return "2025-01-26";
    case "threeletter":
      return `26 ${getMonthName("short").toUpperCase()} 2025`;
    default:
      return "";
  }
});

// Columns available for date formatting (only those in template, or all if no template)
const dateColumnOptions = computed(() => {
  if (props.templateColumns && props.templateColumns.length > 0) {
    // Filter to only columns that exist in both template and data
    return props.templateColumns.filter((col) => props.headers.includes(col));
  }
  // Fallback: show all headers if no template columns detected
  return props.headers;
});

// Watch for prop changes
watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = JSON.parse(JSON.stringify(newConfig));
  },
  { deep: true },
);

// Watch for totalRows changes
watch(
  () => props.totalRows,
  (newTotal) => {
    if (newTotal > 0 && localConfig.value.recordSelection.endRow < newTotal) {
      localConfig.value.recordSelection.endRow = newTotal;
    }
  },
  { immediate: true },
);

const emitUpdate = () => {
  emit("update:config", JSON.parse(JSON.stringify(localConfig.value)));
};

// Handle record range change
const handleRecordRangeChange = () => {
  emitUpdate();
};

// Reset to full range
const resetToFullRange = () => {
  localConfig.value.recordSelection.startRow = 1;
  localConfig.value.recordSelection.endRow = props.totalRows;
  emitUpdate();
};

// Computed: is the current range full (1 to totalRows)?
const isFullRange = computed(() => {
  return (
    localConfig.value.recordSelection.startRow === 1 &&
    localConfig.value.recordSelection.endRow === props.totalRows
  );
});

// Computed: number of records in the selected range
const selectedRecordCount = computed(() => {
  const { startRow, endRow } = localConfig.value.recordSelection;
  if (startRow == null || endRow == null || startRow > endRow) return 0;
  return endRow - startRow + 1;
});
</script>

<style scoped>
.configuration-panels {
  height: 100%;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.config-column {
  min-width: 0;
}

.panel-label {
  font-weight: 600;
}

.nested-controls {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
}

.option-group {
  margin-bottom: 8px;
}

.option-label {
  font-weight: 500;
  color: #333;
}

/* Responsive: stack columns on smaller screens */
@media (max-width: 900px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
