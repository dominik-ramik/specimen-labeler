import * as XLSX from 'xlsx'

let dataCache = {}

function clearCache() {
  dataCache = {}
}

// Helper function to detect if file is CSV
function isCsvFile(file) {
  const name = file.name.toLowerCase()
  return name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')
}

// 🆕 Save sheet name to localStorage for persistence across reloads
export function saveSheetName(sheetName) {
  try {
    localStorage.setItem('specimensLabeler_sheetName', sheetName)
  } catch (error) {
    console.warn('Failed to save sheet name:', error)
  }
}

// Helper function to parse CSV content
async function parseCsvFile(file) {
  const text = await file.text()
  
  // Let XLSX handle CSV parsing with its built-in parser
  const workbook = XLSX.read(text, { 
    type: 'string',
    raw: false, // Parse numbers and dates
    cellDates: false,
    cellNF: true
  })
  
  return workbook
}

export async function loadExcelMetadata(file) {
  try {
    let workbook
    
    if (isCsvFile(file)) {
      workbook = await parseCsvFile(file)
    } else {
      const arrayBuffer = await file.arrayBuffer()
      workbook = XLSX.read(arrayBuffer, { type: 'array' })
    }
    
    const sheets = workbook.SheetNames

    const result = {
      sheets: sheets,
      sheetSelected: false,
      fileType: isCsvFile(file) ? 'csv' : 'excel'
    }

    // Check if this is the same file as previously used
    const savedExcelFileName = localStorage.getItem('specimensLabeler_excelFileName')
    const savedSheetName = localStorage.getItem('specimensLabeler_sheetName')
    
    const isMatchingFile = savedExcelFileName && savedExcelFileName === file.name

    // Auto-select if this is the same file and the saved sheet exists
    if (isMatchingFile && savedSheetName && sheets.includes(savedSheetName)) {
      result.sheetSelected = true
      result.selectedSheet = savedSheetName
    } else if (isCsvFile(file) && sheets.length === 1) {
      // Auto-select the only sheet for CSV files
      result.sheetSelected = true
      result.selectedSheet = sheets[0]
      // 🆕 Save the auto-selected CSV sheet name
      saveSheetName(sheets[0])
    }

    // Save the current filename for future reference
    localStorage.setItem('specimensLabeler_excelFileName', file.name)
    
    return result
  } catch (error) {
    console.error('Error reading file metadata:', error)
    throw new Error('Failed to read file metadata: ' + error.message)
  }
}

export async function loadColumnNames(file, sheetName) {
  try {
    if (!sheetName) {
      throw new Error('No sheet selected')
    }

    // Only cache headers, not full data
    const cacheKey = `${file.name}_${sheetName}_headers`
    if (dataCache[cacheKey]) {
      return dataCache[cacheKey]
    }

    let workbook
    
    if (isCsvFile(file)) {
      workbook = await parseCsvFile(file)
    } else {
      const arrayBuffer = await file.arrayBuffer()
      workbook = XLSX.read(arrayBuffer, { type: 'array' })
    }

    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    const worksheet = workbook.Sheets[sheetName]

    // Only read the first row for headers - much faster
    const range = XLSX.utils.decode_range(worksheet['!ref'])
    const headerRow = []

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = worksheet[cellAddress]
      const headerValue = cell ? XLSX.utils.format_cell(cell).trim() : '' // Trim whitespace
      if (headerValue && headerValue !== '') {
        headerRow.push(headerValue)
      }
    }

    if (headerRow.length === 0) {
      throw new Error('No headers found in the first row')
    }

    dataCache[cacheKey] = headerRow
    return headerRow
  } catch (error) {
    console.error('Error loading column names:', error)
    throw new Error('Failed to load column names: ' + error.message)
  }
}

export async function getExcelData(file, sheetName) {
  try {
    if (!sheetName) {
      throw new Error('No sheet name provided')
    }

    let workbook
    
    if (isCsvFile(file)) {
      workbook = await parseCsvFile(file)
    } else {
      const arrayBuffer = await file.arrayBuffer()
      workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, cellNF: true })
    }

    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Sheet "${sheetName}" not found`)
    }

    const worksheet = workbook.Sheets[sheetName]
    const range = XLSX.utils.decode_range(worksheet['!ref'])

    // Get headers from the first row
    const headers = []
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      const cell = worksheet[cellAddress]
      const headerValue = cell ? XLSX.utils.format_cell(cell).trim() : ''
      if (headerValue && headerValue !== '') {
        headers.push(headerValue)
      }
    }

    // Read data rows starting from row 1 (skip header row), with early termination for consecutive empty rows
    const dataRows = []
    let consecutiveEmptyRows = 0
    const maxConsecutiveEmptyRows = 50

    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const rowData = []
      const rowMetadata = []
      let hasData = false

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = worksheet[cellAddress]
        
        let cellValue = ''
        let cellFormat = null
        let isDate = false
        
        if (cell) {
          cellValue = XLSX.utils.format_cell(cell)
          
          // Check if cell has date format
          if (cell.t === 'd') {
            isDate = true
          } else if (cell.t === 'n' && cell.z) {
            const format = cell.z.toLowerCase()
            const dateIndicators = ['d', 'm', 'y', 'h', 's', 'am', 'pm']
            isDate = dateIndicators.some(indicator => format.includes(indicator))
            
            if (cell.w && !isDate) {
              isDate = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(cell.w)
            }
          }
          
          cellFormat = cell.z || null
        }
        
        rowData.push(cellValue)
        rowMetadata.push({ isDate, format: cellFormat })

        if (cellValue && cellValue.toString().trim() !== '') {
          hasData = true
        }
      }

      if (hasData) {
        consecutiveEmptyRows = 0
        dataRows.push({ values: rowData, metadata: rowMetadata })
      } else {
        consecutiveEmptyRows++
        if (consecutiveEmptyRows >= maxConsecutiveEmptyRows) {
          break
        }
      }
    }

    const result = dataRows
      .map((rowObj) => {
        const rowData = {}
        const rowMeta = {}
        
        headers.forEach((header, index) => {
          if (header && header.toString().trim() !== '') {
            rowData[header] = rowObj.values[index] || ''
            rowMeta[header] = rowObj.metadata[index] || { isDate: false, format: null }
          }
        })
        
        // Attach metadata to the row object (non-enumerable but configurable for Vue reactivity)
        Object.defineProperty(rowData, '__metadata', {
          value: rowMeta,
          enumerable: false,
          writable: false,
          configurable: true // 🆕 Changed from false to true - fixes Vue proxy issue
        })
        
        return rowData
      })
      .filter((row) => {
        // Only include rows that have at least one non-empty value
        return Object.values(row).some((value) => value && value.toString().trim() !== '')
      })
    
    return result
  } catch (error) {
    console.error('Error reading data:', error)
    throw new Error('Failed to read Excel data: ' + error.message)
  }
}