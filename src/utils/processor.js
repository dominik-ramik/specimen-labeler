export function applyRecordSelection(data, config) {
  const { mode, startRow, endRow } = config.recordSelection

  switch (mode) {
    case 'all':
      return data
    case 'from-to-end':
      return data.slice(startRow - 1)
    case 'from-to-row':
      return data.slice(startRow - 1, endRow)
    default:
      return data
  }
}

export function applySorting(data, config) {
  if (!config.sorting || !config.sorting.enabled || !config.sorting.column) {
    return data
  }

  const { column, direction } = config.sorting
  
  // Create a copy to avoid mutating original data
  const sortedData = [...data]
  
  sortedData.sort((a, b) => {
    let aVal = a[column]
    let bVal = b[column]
    
    // Handle null/undefined values - put them at the end
    if (aVal === null || aVal === undefined || aVal === '') {
      return 1
    }
    if (bVal === null || bVal === undefined || bVal === '') {
      return -1
    }
    
    // Try to detect the type and sort accordingly
    const aNum = Number(aVal)
    const bNum = Number(bVal)
    
    // If both are valid numbers, sort numerically
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' ? aNum - bNum : bNum - aNum
    }
    
    // Try to parse as dates
    const aDate = new Date(aVal)
    const bDate = new Date(bVal)
    
    if (aDate instanceof Date && !isNaN(aDate) && bDate instanceof Date && !isNaN(bDate)) {
      return direction === 'asc' ? aDate - bDate : bDate - aDate
    }
    
    // Default to string comparison (case-insensitive)
    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    
    if (direction === 'asc') {
      return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
    } else {
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
    }
  })
  
  return sortedData
}

export async function applyDuplicatesHandling(data, config) {
  const { mode, column, addSubtract, fixed } = config.duplicates
  const result = []

  for (let i = 0; i < data.length; i++) {
    const record = data[i]
    let duplicateCount = 1

    if (mode === 'column') {
      const value = record[column]
      if (value !== undefined && value !== null && value !== '') {
        duplicateCount = Math.max(1, parseInt(value) + addSubtract)
      }
    } else if (mode === 'fixed') {
      duplicateCount = fixed
    }

    for (let j = 0; j < duplicateCount; j++) {
      result.push({ ...record })
    }

    // Yield control periodically for better UX
    if (i % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1))
    }
  }

  return result
}

export async function generatePages(data, itemsPerPage) {
  const pages = []

  for (let i = 0; i < data.length; i += itemsPerPage) {
    const pageItems = []

    for (let j = 0; j < itemsPerPage; j++) {
      const dataIndex = i + j
      const item = {}

      if (dataIndex < data.length) {
        const record = data[dataIndex]
        Object.keys(record).forEach((key) => {
          item[`${key}#${j + 1}`] = record[key]
        })
      } else {
        if (data.length > 0) {
          Object.keys(data[0]).forEach((key) => {
            item[`${key}#${j + 1}`] = ''
          })
        }
      }

      pageItems.push(item)
    }

    const flattenedPage = {}
    pageItems.forEach((item) => {
      Object.assign(flattenedPage, item)
    })

    pages.push(flattenedPage)

    // Yield control periodically
    if (pages.length % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1))
    }
  }

  return pages
}
