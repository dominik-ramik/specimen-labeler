<template>
  <div class="data-selection-section">
    <h3 class="data-selection-title">Data Selection</h3>
    
    <!-- Record Selection -->
    <div class="selection-field">
      <label class="field-label">Record Selection</label>
      <div class="radio-group">
        <label>
          <input
            type="radio"
            value="all"
            v-model="localConfig.recordSelection.mode"
            @change="emitUpdate"
          />
          All Records
        </label>
        <label>
          <input
            type="radio"
            value="from-to-end"
            v-model="localConfig.recordSelection.mode"
            @change="emitUpdate"
          />
          From Row
          <input
            type="number"
            min="1"
            :max="totalRows"
            v-model.number="localConfig.recordSelection.startRow"
            :disabled="localConfig.recordSelection.mode !== 'from-to-end'"
            @change="handleStartRowChange"
          />
          to End
        </label>
        <label>
          <input
            type="radio"
            value="from-to-row"
            v-model="localConfig.recordSelection.mode"
            @change="emitUpdate"
          />
          From Row
          <input
            type="number"
            min="1"
            :max="totalRows"
            v-model.number="localConfig.recordSelection.startRow"
            :disabled="localConfig.recordSelection.mode !== 'from-to-row'"
            @change="handleStartRowChange"
          />
          to Row
          <input
            type="number"
            :min="minEndRow"
            :max="totalRows"
            v-model.number="localConfig.recordSelection.endRow"
            :disabled="localConfig.recordSelection.mode !== 'from-to-row'"
            @change="handleEndRowChange"
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
            v-model="localConfig.duplicates.mode"
            @change="emitUpdate"
          />
          Get from Column
        </label>
        
        <div class="nested-controls">
          <div class="nested-row">
            <label for="duplicates-column">Column:</label>
            <select
              id="duplicates-column"
              v-model="localConfig.duplicates.column"
              :disabled="localConfig.duplicates.mode !== 'column'"
              @change="emitUpdate"
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
              v-model.number="localConfig.duplicates.addSubtract"
              placeholder="0"
              @change="emitUpdate"
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
            v-model="localConfig.duplicates.mode"
            @change="emitUpdate"
          />
          Fixed Number
          <input
            type="number"
            min="1"
            v-model.number="localConfig.duplicates.fixed"
            :disabled="localConfig.duplicates.mode !== 'fixed'"
            @change="emitUpdate"
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
                v-model="localConfig.duplicates.collate"
                @change="emitUpdate"
              />
              Sets Together (A,B,C,A,B,C)
            </label>
            <label>
              <input
                type="radio"
                value="uncollated"
                v-model="localConfig.duplicates.collate"
                @change="emitUpdate"
              />
              Duplicates Together (A,A,A,B,B,B)
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

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
  const cloned = JSON.parse(JSON.stringify(localConfig.value))
  emit('update:config', cloned)
}
</script>

<style scoped>
.data-selection-section {
  background: white;
  border: none;
  border-radius: 0;
  padding: 0;
  margin: 0;
  margin-top: 0 !important;
}

.data-selection-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  padding: 16px 20px;
  border-bottom: none;
  letter-spacing: 0.5px;
}

.selection-field {
  margin-bottom: 0;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.selection-field:last-child {
  border-bottom: none;
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

.radio-group input[type='radio'] {
  accent-color: #667eea;
  cursor: pointer;
  width: 16px;
  height: 16px;
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
  background: #f0f4ff;
  border-radius: 4px;
  border-left: 2px solid #667eea;
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