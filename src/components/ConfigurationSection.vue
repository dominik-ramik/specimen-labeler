<template>
  <div class="configuration-section">
    <h3 class="configuration-title">⚙️ Configuration Options</h3>

    <!-- Add section headers for better organization -->
    <div class="config-group">
      <h4 class="config-group-title">📋 Data Selection</h4>
      <div class="grid">
        <!-- Record Selection -->
        <div class="field-group">
          <label>Record Selection</label>
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
              From Row to End
              <input
                type="number"
                min="1"
                v-model.number="localConfig.recordSelection.startRow"
                :disabled="localConfig.recordSelection.mode !== 'from-to-end'"
                @input="emitUpdate"
              />
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
                v-model.number="localConfig.recordSelection.startRow"
                :disabled="localConfig.recordSelection.mode !== 'from-to-row'"
                @input="emitUpdate"
              />
              to Row
              <input
                type="number"
                min="1"
                v-model.number="localConfig.recordSelection.endRow"
                :disabled="localConfig.recordSelection.mode !== 'from-to-row'"
                @input="emitUpdate"
              />
            </label>
          </div>
        </div>

        <!-- Duplicates Handling -->
        <div class="field-group">
          <label>
            Duplicates Handling
            <span class="help-icon" title="Control how many copies of each label to generate">ℹ️</span>
          </label>
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
                  @input="emitUpdate"
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
                v-model="localConfig.duplicates.mode"
                @change="emitUpdate"
              />
              Fixed Number
              <input
                type="number"
                min="1"
                v-model.number="localConfig.duplicates.fixed"
                :disabled="localConfig.duplicates.mode !== 'fixed'"
                @input="emitUpdate"
              />
            </label>
            
            <!-- Collate option - shown when duplicates will be generated -->
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
    </div>

    <div class="config-group">
      <h4 class="config-group-title">✨ Formatting Options</h4>
      <div class="grid">
        <!-- Date Format -->
        <div class="field-group">
          <label for="date-format">Date Format</label>
          <select id="date-format" v-model="localConfig.formatting.dateFormat" @change="emitUpdate">
            <option value="roman">Roman numeral month (26-V-2025)</option>
            <option value="iso">Year Month Day (2025-05-26)</option>
            <option value="english">Month name Day, Year (May 26, 2025)</option>
            <option value="threeletter">Three-letter month (26 MAY 2025)</option>
          </select>
        </div>

        <!-- Decimal Format -->
        <div class="field-group">
          <label>Decimal Format</label>
          <div class="radio-group horizontal">
            <label>
              <input
                type="radio"
                value="dot"
                v-model="localConfig.formatting.decimalFormat"
                @change="emitUpdate"
              />
              Dot (1.5)
            </label>
            <label>
              <input
                type="radio"
                value="comma"
                v-model="localConfig.formatting.decimalFormat"
                @change="emitUpdate"
              />
              Comma (1,5)
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Geocoordinate Transformation -->
    <div class="config-group">
      <h4 class="config-group-title">🌍 Geocoordinate Transformation</h4>
      <div class="field-group">
        <label>Geocoordinate Transformation</label>
        <div class="radio-group">
          <div class="geocoord-main-row">
            <div class="geocoord-modes">
              <label>
                <input
                  type="radio"
                  value="none"
                  v-model="localConfig.formatting.geocoord.mode"
                  @change="emitUpdate"
                />
                No transformation
              </label>
              <label>
                <input
                  type="radio"
                  value="single"
                  v-model="localConfig.formatting.geocoord.mode"
                  @change="emitUpdate"
                />
                Single column (lat lon in one cell)
              </label>
              <div class="nested-controls">
                <div class="nested-row">
                  <label for="geocoord-single-column">Column:</label>
                  <select
                    id="geocoord-single-column"
                    v-model="localConfig.formatting.geocoord.singleColumn"
                    :disabled="localConfig.formatting.geocoord.mode !== 'single'"
                    @change="emitUpdate"
                  >
                    <option value="">Select column...</option>
                    <option v-for="header in headers" :key="header" :value="header">
                      {{ header }}
                    </option>
                  </select>
                </div>
              </div>
              <label>
                <input
                  type="radio"
                  value="separate"
                  v-model="localConfig.formatting.geocoord.mode"
                  @change="emitUpdate"
                />
                Separate columns
              </label>
              <div class="nested-controls">
                <div class="nested-row">
                  <label for="geocoord-lat-column">Latitude:</label>
                  <select
                    id="geocoord-lat-column"
                    v-model="localConfig.formatting.geocoord.latColumn"
                    :disabled="localConfig.formatting.geocoord.mode !== 'separate'"
                    @change="emitUpdate"
                  >
                    <option value="">Select column...</option>
                    <option v-for="header in headers" :key="header" :value="header">
                      {{ header }}
                    </option>
                  </select>
                  <label for="geocoord-lon-column">Longitude:</label>
                  <select
                    id="geocoord-lon-column"
                    v-model="localConfig.formatting.geocoord.lonColumn"
                    :disabled="localConfig.formatting.geocoord.mode !== 'separate'"
                    @change="emitUpdate"
                  >
                    <option value="">Select column...</option>
                    <option v-for="header in headers" :key="header" :value="header">
                      {{ header }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Output Format on the right -->
            <div 
              v-if="localConfig.formatting.geocoord.mode !== 'none'" 
              class="format-selection-right"
            >
              <label for="geocoord-output-format">Output Format:</label>
              <select
                id="geocoord-output-format"
                v-model="localConfig.formatting.geocoord.outputFormat"
                @change="emitUpdate"
              >
                <option value="dms">Degrees Minutes Seconds (12°34'56.7"N)</option>
                <option value="decimal-direction">Decimal with Direction (12.582417N)</option>
                <option value="decimal-signed">Signed Decimal (12.582417 or -12.582417)</option>
              </select>
              
              <div class="format-help-inline">
                <strong>Input formats:</strong>
                DMS (12°34'56"N), Decimal+dir (12.345N), Signed (-12.345), Pairs ("12.345 -67.890")
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  headers: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:config'])

const localConfig = ref(JSON.parse(JSON.stringify(props.config)))

// Determine if collate option should be shown
const shouldShowCollateOption = computed(() => {
  const mode = localConfig.value.duplicates.mode
  const fixed = localConfig.value.duplicates.fixed
  const column = localConfig.value.duplicates.column
  
  // Show if fixed mode with value > 1, or column mode with a column selected
  return (mode === 'fixed' && fixed > 1) || (mode === 'column' && column !== '')
})

watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = JSON.parse(JSON.stringify(newConfig))
  },
  { deep: true }
)

const emitUpdate = () => {
  // Create a deep clone to ensure no reference issues
  const cloned = JSON.parse(JSON.stringify(localConfig.value))
  console.log('[DEBUG] ConfigurationSection emitting update:', cloned)
  // Use nextTick to ensure DOM has updated
  emit('update:config', cloned)
}
</script>

<style scoped>
.configuration-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-top: 10px;
}

.configuration-title {
  margin: 0 0 20px 0;
  color: #2d3748;
  font-size: 18px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}

.config-group {
  margin-bottom: 25px;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.config-group-title {
  margin: 0 0 15px 0;
  color: #2c5530;
  font-size: 16px;
  font-weight: 600;
  padding-bottom: 8px;
  border-bottom: 2px solid #e8f5e8;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-group > label {
  font-weight: 500;
  color: #333;
}

input[type='text'],
input[type='number'],
select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

/* Narrow number inputs for row selection */
.radio-group input[type='number'] {
  width: 80px; /* Enough for 5 digits */
  padding: 6px 8px;
}

/* Narrower input for +/- (3 digits max) */
#add-subtract {
  width: 60px; /* Enough for 3 digits like +99 or -99 */
  padding: 6px 8px;
}

/* Keep fixed duplicates input at normal width */
.radio-group label input[type='number'][min='1'] {
  width: 80px;
}

input:focus,
select:focus {
  outline: none;
  border-color: #2c5530;
  box-shadow: 0 0 0 2px rgba(44, 85, 48, 0.2);
}

.radio-group {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.radio-group.horizontal {
  display: flex;
  gap: 20px;
  flex-wrap: nowrap;
  align-items: center;
}

.radio-group.horizontal label {
  margin-bottom: 0; /* Override the default margin-bottom for horizontal labels */
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  font-weight: normal;
}

.radio-group label:last-child {
  margin-bottom: 0;
}

.nested-controls {
  margin-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nested-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nested-row label {
  margin: 0;
  font-size: 0.9rem;
}

.format-selection {
  margin-top: 12px;
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.format-selection > label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.format-selection-right {
  flex: 0 0 375px;
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.format-selection-right > label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.format-selection-right select {
  width: 100%;
}

.format-help {
  margin-top: 12px;
  padding: 10px;
  background: #f8f9fa;
  border-left: 3px solid #2c5530;
  font-size: 0.85rem;
  color: #555;
}

.format-help strong {
  display: block;
  margin-bottom: 6px;
  color: #2c5530;
}

.format-help ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.6;
}

.format-help li {
  margin-bottom: 4px;
}

.format-help-inline {
  margin-top: 8px;
  padding: 6px 10px;
  background: #f8f9fa;
  border-left: 3px solid #2c5530;
  font-size: 0.75rem;
  color: #555;
  line-height: 1.4;
}

.format-help-inline strong {
  color: #2c5530;
  margin-right: 4px;
}

.geocoord-main-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.geocoord-modes {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.help-icon {
  display: inline-block;
  margin-left: 6px;
  font-size: 0.85em;
  cursor: help;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.help-icon:hover {
  opacity: 1;
}

.helper-text {
  margin-top: 8px;
  margin-left: 24px;
  font-size: 0.8rem;
  color: #666;
  font-style: italic;
  padding: 6px 10px;
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
  font-size: 0.9rem;
}

.radio-group-inline {
  display: flex;
  gap: 20px;
  margin-bottom: 8px;
}

.radio-group-inline label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  margin-bottom: 0;
}

.helper-text-small {
  margin-top: 6px;
  margin-left: 0;
  font-size: 0.75rem;
  color: #666;
  font-style: italic;
  padding: 6px 10px;
  background: #f0f8ff;
  border-radius: 4px;
  border-left: 2px solid #2196f3;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .radio-group.horizontal {
    flex-direction: column;
    gap: 8px;
  }
  
  .geocoord-main-row {
    flex-direction: column;
  }
  
  .format-selection-right {
    flex: 1 1 auto;
    width: 100%;
  }
}
</style>