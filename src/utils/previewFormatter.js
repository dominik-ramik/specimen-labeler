import { applyFormatting } from './formatter'

/**
 * Apply formatting to data for preview display
 * This reuses the existing formatter but ensures it works for preview
 * @param {Array} data - Array of records
 * @param {Object} config - Configuration object
 * @returns {Array} - Formatted data
 */
export function formatDataForPreview(data, config) {
  if (!data || data.length === 0) {
    return []
  }
  
  // Clone data to avoid mutations, preserving __spreadsheetRow
  const clonedData = data.map(record => {
    const clone = { ...record }
    if (record.__spreadsheetRow !== undefined) {
      Object.defineProperty(clone, '__spreadsheetRow', {
        value: record.__spreadsheetRow,
        enumerable: false,
        writable: false,
        configurable: true
      })
    }
    return clone
  })
  
  // Apply the same formatting used in label generation
  return applyFormatting(clonedData, config)
}
