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
