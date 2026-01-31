<template>
  <v-dialog v-model="dialogVisible" max-width="90vw" scrollable>
    <v-card>
      <v-card-title class="preview-title d-flex align-center">
        <v-icon start>mdi-table-eye</v-icon>
        Preview Selected Records
        <v-spacer></v-spacer>
        <v-chip color="white" variant="tonal" size="small">
          {{ tableItems.length }} record{{ tableItems.length !== 1 ? 's' : '' }}
        </v-chip>
      </v-card-title>
      
      <v-card-text class="pa-0">
        <v-alert v-if="!templateColumns.length" type="info" variant="tonal" class="ma-4">
          <v-icon start>mdi-information</v-icon>
          No placeholders found in template. Showing all columns from your data.
        </v-alert>
        
        <div class="table-container">
          <v-data-table
            :headers="tableHeaders"
            :items="tableItems"
            :items-per-page="10"
            density="compact"
            class="preview-table"
            fixed-header
          >
            <!-- Custom cell rendering for special columns -->
            <template v-slot:[`item.__spreadsheetRow`]="{ value }">
              <span class="spreadsheet-row-value">{{ value || '—' }}</span>
            </template>
            
            <template v-slot:[`item.__copies`]="{ value }">
              <span class="copies-value">{{ value }}</span>
            </template>
          </v-data-table>
        </div>
        
        <div class="pa-4 text-caption text-grey">
          <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
          <strong>Row:</strong> The exact row number from your spreadsheet file. 
          <strong>Copies:</strong> Number of label copies that will be generated for each record based on your duplication settings.
        </div>
      </v-card-text>
      
      <v-divider></v-divider>
      
      <v-card-actions class="pa-4">
        <v-chip variant="tonal" size="small" class="mr-2">
          <v-icon start size="small">mdi-format-list-bulleted</v-icon>
          {{ displayColumns.length }} column{{ displayColumns.length !== 1 ? 's' : '' }}
        </v-chip>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="flat" @click="close">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  data: {
    type: Array,
    default: () => []
  },
  templateColumns: {
    type: Array,
    default: () => []
  },
  allHeaders: {
    type: Array,
    default: () => []
  },
  duplicatesConfig: {
    type: Object,
    default: () => ({ mode: 'column', column: '', addSubtract: 0, fixed: 1 })
  }
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Determine which columns to display
const displayColumns = computed(() => {
  if (props.templateColumns && props.templateColumns.length > 0) {
    // Show only columns referenced in template that exist in data
    return props.templateColumns.filter(col => props.allHeaders && props.allHeaders.includes(col))
  }
  // Fallback: show all columns
  return props.allHeaders || []
})

// Find columns in template but not in data
const missingColumns = computed(() => {
  if (!props.templateColumns || props.templateColumns.length === 0) return []
  if (!props.allHeaders) return props.templateColumns
  return props.templateColumns.filter(col => !props.allHeaders.includes(col))
})

// Calculate copies for a row based on duplicates config
const calculateCopies = (row) => {
  if (!props.duplicatesConfig) return 1
  
  const { mode, column, addSubtract, fixed } = props.duplicatesConfig
  
  if (mode === 'fixed') {
    return Math.max(0, fixed || 1)
  }
  
  if (mode === 'column' && column) {
    const rawValue = row ? row[column] : undefined
    // Handle empty, undefined, or non-numeric values
    const columnValue = (rawValue === '' || rawValue === undefined || rawValue === null) 
      ? 0 
      : (parseInt(rawValue) || 0)
    const result = columnValue + (addSubtract || 0)
    // Allow 0 copies (skip row), but not negative
    return Math.max(0, result)
  }
  
  return 1
}

// Transform data for the table with copies and spreadsheet row as regular properties
const tableItems = computed(() => {
  if (!props.data || !Array.isArray(props.data)) return []
  
  return props.data.map(row => {
    const item = {}
    
    // Copy all regular properties
    Object.keys(row).forEach(key => {
      item[key] = row[key]
    })
    
    // Add spreadsheet row as a regular property
    item.__spreadsheetRow = row.__spreadsheetRow || '—'
    // Add calculated copies
    item.__copies = calculateCopies(row)
    
    return item
  })
})

// Build table headers
const tableHeaders = computed(() => {
  const headers = [
    { 
      title: 'Row', 
      key: '__spreadsheetRow', 
      width: '70px', 
      align: 'center', 
      sortable: true 
    },
    { 
      title: 'Copies', 
      key: '__copies', 
      width: '70px', 
      align: 'center', 
      sortable: true 
    }
  ]
  
  displayColumns.value.forEach(col => {
    headers.push({
      title: col,
      key: col,
      sortable: true
      // No width specified = auto-width
    })
  })
  
  return headers
})

const close = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.preview-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white !important;
}

.table-container {
  max-height: 60vh;
  overflow: auto;
}

.preview-table {
  font-size: 13px;
}

/* Prevent text wrapping in table cells */
:deep(.v-data-table__td) {
  white-space: nowrap !important;
  overflow: visible !important;
  text-overflow: clip !important;
}

:deep(.v-data-table__th) {
  white-space: nowrap !important;
  background: #fafafa !important;
  font-weight: 600 !important;
}

/* Allow table to expand beyond container width */
:deep(.v-table__wrapper) {
  overflow-x: auto;
}

:deep(.v-table) {
  width: max-content;
  min-width: 100%;
}

.spreadsheet-row-value {
  display: inline-block;
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  font-weight: 600;
  border-radius: 4px;
}

.copies-value {
  display: inline-block;
  padding: 2px 8px;
  background: #fff3e0;
  color: #e65100;
  font-weight: 600;
  border-radius: 4px;
}
</style>
