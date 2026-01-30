<template>
  <div class="data-selection-section">
    <v-card>
      <v-card-title class="data-selection-title">
        Data Selection
      </v-card-title>
      
      <v-card-text>
        <!-- Record Selection -->
        <div class="selection-field">
          <v-label class="field-label mb-2">Record Selection</v-label>
          <v-radio-group v-model="localConfig.recordSelection.mode" @update:model-value="emitUpdate" hide-details>
            <v-radio label="All Records" value="all"></v-radio>
            
            <v-radio value="from-to-end">
              <template v-slot:label>
                <div class="d-flex align-center ga-2 flex-wrap">
                  <span>From Row</span>
                  <v-text-field
                    v-model.number="localConfig.recordSelection.startRow"
                    type="number"
                    min="1"
                    :max="totalRows"
                    :disabled="localConfig.recordSelection.mode !== 'from-to-end'"
                    @update:model-value="handleStartRowChange"
                    hide-details
                    density="compact"
                    style="width: 80px"
                    @click.stop
                  ></v-text-field>
                  <span>to End</span>
                </div>
              </template>
            </v-radio>
            
            <v-radio value="from-to-row">
              <template v-slot:label>
                <div class="d-flex align-center ga-2 flex-wrap">
                  <span>From Row</span>
                  <v-text-field
                    v-model.number="localConfig.recordSelection.startRow"
                    type="number"
                    min="1"
                    :max="totalRows"
                    :disabled="localConfig.recordSelection.mode !== 'from-to-row'"
                    @update:model-value="handleStartRowChange"
                    hide-details
                    density="compact"
                    style="width: 80px"
                    @click.stop
                  ></v-text-field>
                  <span>to Row</span>
                  <v-text-field
                    v-model.number="localConfig.recordSelection.endRow"
                    type="number"
                    :min="minEndRow"
                    :max="totalRows"
                    :disabled="localConfig.recordSelection.mode !== 'from-to-row'"
                    @update:model-value="handleEndRowChange"
                    hide-details
                    density="compact"
                    style="width: 80px"
                    @click.stop
                  ></v-text-field>
                </div>
              </template>
            </v-radio>
          </v-radio-group>
        </div>

        <v-divider class="my-4"></v-divider>

        <!-- Duplicates Handling -->
        <div class="selection-field">
          <v-label class="field-label mb-2">How many copies of each label to generate</v-label>
          <v-radio-group v-model="localConfig.duplicates.mode" @update:model-value="emitUpdate" hide-details>
            <v-radio label="Get from Column" value="column"></v-radio>
            
            <div v-if="localConfig.duplicates.mode === 'column'" class="nested-controls ml-8 mt-2">
              <div class="d-flex align-center ga-2">
                <v-label>Column:</v-label>
                <v-select
                  v-model="localConfig.duplicates.column"
                  :items="headers"
                  :disabled="localConfig.duplicates.mode !== 'column'"
                  @update:model-value="emitUpdate"
                  placeholder="Select a column..."
                  density="compact"
                  hide-details
                  class="flex-grow-1"
                ></v-select>
              </div>
              <div class="d-flex align-center ga-2 mt-2">
                <v-label title="Add or subtract from the column value">+/-:</v-label>
                <v-text-field
                  v-model.number="localConfig.duplicates.addSubtract"
                  type="number"
                  placeholder="0"
                  @update:model-value="emitUpdate"
                  hide-details
                  density="compact"
                  style="width: 80px"
                ></v-text-field>
              </div>
              <v-alert type="info" density="compact" class="mt-2">
                Example: If column value is 3 and +/- is -1, you'll get 2 copies
              </v-alert>
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
                    style="width: 80px"
                    @click.stop
                  ></v-text-field>
                </div>
              </template>
            </v-radio>
            
            <!-- Collate option -->
            <v-card v-if="shouldShowCollateOption" variant="outlined" class="mt-3 pa-3">
              <v-label class="font-weight-bold mb-2">Order:</v-label>
              <v-radio-group v-model="localConfig.duplicates.collate" @update:model-value="emitUpdate" hide-details>
                <v-radio label="Sets Together (A,B,C,A,B,C)" value="collated"></v-radio>
                <v-radio label="Duplicates Together (A,A,A,B,B,B)" value="uncollated"></v-radio>
              </v-radio-group>
            </v-card>
          </v-radio-group>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  headers: {
    type: Array,
    default: () => []
  },
  totalRows: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['update:config'])

const localConfig = ref(JSON.parse(JSON.stringify(props.config)))
const isInitialized = ref(false) // 🔧 Track initialization state

// Computed minimum for endRow (must be >= startRow)
const minEndRow = computed(() => {
  return Math.max(1, localConfig.value.recordSelection.startRow || 1)
})

const shouldShowCollateOption = computed(() => {
  const mode = localConfig.value.duplicates.mode
  const fixed = localConfig.value.duplicates.fixed
  const column = localConfig.value.duplicates.column
  
  return (mode === 'fixed' && fixed > 1) || (mode === 'column' && column !== '')
})

watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = JSON.parse(JSON.stringify(newConfig))
  },
  { deep: true }
)

// Watch for mode changes and set default endRow to totalRows
watch(
  () => localConfig.value.recordSelection.mode,
  (newMode, oldMode) => {
    if (!isInitialized.value) return // 🔧 Don't emit during initialization
    
    if (newMode === 'from-to-row' && oldMode !== 'from-to-row') {
      // Set endRow to totalRows when switching to 'from-to-row' mode
      localConfig.value.recordSelection.endRow = props.totalRows
      emitUpdate()
    }
  }
)

// Watch for totalRows changes and update endRow if in from-to-row mode
watch(
  () => props.totalRows,
  (newTotal) => {
    if (newTotal > 0 && localConfig.value.recordSelection.endRow !== newTotal) {
      localConfig.value.recordSelection.endRow = newTotal
      
      // Only emit if initialized
      if (isInitialized.value) {
        emitUpdate()
      }
    }
  },
  { immediate: true }
)

// Initialize endRow to totalRows when component mounts
onMounted(() => {
  nextTick(() => {
    // Set endRow to totalRows if it's still at default value
    if (localConfig.value.recordSelection.endRow < props.totalRows) {
      localConfig.value.recordSelection.endRow = props.totalRows
    }
    
    // Mark as initialized after a short delay
    setTimeout(() => {
      isInitialized.value = true
    }, 100)
  })
})

const handleStartRowChange = () => {
  // Validate startRow
  if (localConfig.value.recordSelection.startRow < 1) {
    localConfig.value.recordSelection.startRow = 1
  }
  if (localConfig.value.recordSelection.startRow > props.totalRows) {
    localConfig.value.recordSelection.startRow = props.totalRows
  }
  
  // Ensure endRow is >= startRow
  if (localConfig.value.recordSelection.endRow < localConfig.value.recordSelection.startRow) {
    localConfig.value.recordSelection.endRow = localConfig.value.recordSelection.startRow
  }
  
  emitUpdate()
}

const handleEndRowChange = () => {
  // Validate endRow
  if (localConfig.value.recordSelection.endRow < localConfig.value.recordSelection.startRow) {
    localConfig.value.recordSelection.endRow = localConfig.value.recordSelection.startRow
  }
  if (localConfig.value.recordSelection.endRow > props.totalRows) {
    localConfig.value.recordSelection.endRow = props.totalRows
  }
  
  emitUpdate()
}

const emitUpdate = () => {
  if (!isInitialized.value) return // 🔧 Prevent emission during initialization
  
  const cloned = JSON.parse(JSON.stringify(localConfig.value))
  emit('update:config', cloned)
}
</script>

<style scoped>
.data-selection-section {
  height: 100%;
}

.data-selection-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white !important;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.selection-field {
  margin-bottom: 16px;
}

.selection-field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.nested-controls {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
}
</style>