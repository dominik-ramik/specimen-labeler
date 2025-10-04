import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'
import { applyFormatting } from '../utils/formatter'
import { VALIDATION_LIMITS, PROGRESS_UPDATE } from '../utils/constants'

export class LabelGenerator {
  async validateTemplate(templateArrayBuffer, data) {
    if (data.length === 0) {
      throw new Error('No data to validate against')
    }

    try {
      const zip = new PizZip(templateArrayBuffer)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true
      })
      const templateContent = doc.getFullText()

      const headers = Object.keys(data[0])
      
      // Match both numbered and simple placeholders, but exclude loop tags like {#pages} and {/pages}
      const numberedPattern = /\{([^}#\/]+)#(\d+)\}/g
      const simplePattern = /\{([^}#\/]+)\}/g
      
      const numberedMatches = [...templateContent.matchAll(numberedPattern)]
      const simpleMatches = [...templateContent.matchAll(simplePattern)]

      const missingColumns = []
      const placeholderNumbers = new Set()
      
      // Check numbered placeholders
      numberedMatches.forEach((match) => {
        const columnName = match[1].trim()
        const number = parseInt(match[2])
        
        // Skip if it's a loop tag
        if (columnName === 'pages' || columnName.startsWith('#') || columnName.startsWith('/')) {
          return
        }
        
        if (!headers.includes(columnName)) {
          missingColumns.push(columnName)
        }
        
        placeholderNumbers.add(number)
      })
      
      // Check simple placeholders (treat as #1)
      simpleMatches.forEach((match) => {
        const columnName = match[1].trim()
        
        // Skip loop tags and special tags
        if (columnName === 'pages' || columnName.startsWith('#') || columnName.startsWith('/')) {
          return
        }
        
        if (!headers.includes(columnName)) {
          missingColumns.push(columnName)
        }
        
        // Simple placeholders count as #1
        placeholderNumbers.add(1)
      })

      if (missingColumns.length > 0) {
        throw new Error(`Template references missing columns: ${[...new Set(missingColumns)].join(', ')}`)
      }
      
      // Validate placeholder numbering (no gaps)
      if (placeholderNumbers.size > 0) {
        const numbers = Array.from(placeholderNumbers).sort((a, b) => a - b)
        const maxNumber = Math.max(...numbers)
        
        for (let i = 1; i <= maxNumber; i++) {
          if (!numbers.includes(i)) {
            throw new Error(
              `❌ Template has placeholder numbering gap: Missing #${i}\n\n` +
              `Found placeholders: ${numbers.map(n => `#${n}`).join(', ')}\n\n` +
              `💡 Fix: Make sure your placeholders are numbered sequentially starting from #1 without gaps.`
            )
          }
        }
      }
    } catch (error) {
      if (error.properties && error.properties.errors) {
        const errorMessages = error.properties.errors.map(e => {
          if (e.properties?.id === 'unclosed_loop') {
            const tag = e.properties.xtag?.trim()
            return `• Placeholder "{${tag}}" has an extra space after the opening brace. Remove the space to fix this.`
          }
          return `• ${e.properties?.explanation || e.message}`
        })
        
        throw new Error(
          `❌ Template has placeholder formatting errors:\n\n${errorMessages.join('\n')}\n\n` +
          `💡 Fix: Open your Word template and remove any spaces immediately after the opening brace "{" in placeholders.\n` +
          `✅ Correct: {Duplicates#1}\n` +
          `❌ Wrong: { Duplicates#1} (space after {)`
        )
      }
      throw error
    }
  }

  async ensurePagesLoop(templateArrayBuffer) {
    try {
      const zip = new PizZip(templateArrayBuffer)
      let content = zip.files['word/document.xml']?.asText()

      if (!content) {
        throw new Error('Invalid Word template format')
      }

      // Check if pages loop already exists
      if (content.includes('{#pages}') && content.includes('{/pages}')) {
        // Check if page break exists before closing tag
        const pagesLoopPattern = /{#pages}([\s\S]*?){\/pages}/
        const match = content.match(pagesLoopPattern)
        
        if (match) {
          const loopContent = match[1]
          // Check if there's already a page break before the closing {/pages} tag
          const hasPageBreak = loopContent.includes('<w:br w:type="page"/>')
          
          if (!hasPageBreak) {
            // Add page break before the closing {/pages} tag
            const pageBreakXml = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
            content = content.replace(
              '{/pages}',
              pageBreakXml + '{/pages}'
            )
            
            // Save the modified content back
            zip.file('word/document.xml', content)
            return zip.generate({ type: 'arraybuffer' })
          }
        }
        
        return templateArrayBuffer
      }
      
      // Don't auto-modify - return original template
      return templateArrayBuffer
    } catch (error) {
      console.warn('Template check failed, using original:', error)
      return templateArrayBuffer
    }
  }

  async detectItemsPerPage(templateArrayBuffer) {
    const zip = new PizZip(templateArrayBuffer)
    const doc = new Docxtemplater(zip)
    const templateContent = doc.getFullText()

    // Match both numbered and simple placeholders, excluding loop tags
    const numberedPattern = /\{([^}#\/]+)#(\d+)\}/g
    const simplePattern = /\{([^}#\/]+)\}/g
    
    const numberedMatches = [...templateContent.matchAll(numberedPattern)]
    const simpleMatches = [...templateContent.matchAll(simplePattern)]

    let maxNumber = 0
    
    // Check numbered placeholders
    numberedMatches.forEach((match) => {
      const columnName = match[1].trim()
      const number = parseInt(match[2])
      
      // Skip loop tags
      if (columnName === 'pages' || columnName.startsWith('#') || columnName.startsWith('/')) {
        return
      }
      
      if (number > maxNumber) {
        maxNumber = number
      }
    })
    
    // If only simple placeholders exist, check them
    if (maxNumber === 0) {
      simpleMatches.forEach((match) => {
        const columnName = match[1].trim()
        
        // Skip loop tags
        if (columnName === 'pages' || columnName.startsWith('#') || columnName.startsWith('/')) {
          return
        }
        
        maxNumber = 1
      })
    }

    return maxNumber || 4
  }

  async generateLabels(templateArrayBuffer, data, config, progressCallback) {
    try {
      if (!templateArrayBuffer) {
        throw new Error('No template data provided')
      }

      progressCallback?.('Validating template...')
      
      // Use ArrayBuffer directly - no more stale File references!
      const modifiedTemplateArrayBuffer = await this.ensurePagesLoop(templateArrayBuffer)
      
      await this.validateTemplate(modifiedTemplateArrayBuffer, data)

      progressCallback?.('Processing data...')
      const itemsPerPage = await this.detectItemsPerPage(modifiedTemplateArrayBuffer)

      // Apply record selection
      let processedData = this.applyRecordSelection(data, config)

      // Apply filters
      if (config.filters && config.filters.length > 0) {
        config.filters.forEach((filter) => {
          if (filter.column && filter.value) {
            processedData = processedData.filter((row) => {
              const cellValue = row[filter.column]?.toString().toLowerCase() || ''
              const filterValue = filter.value.toLowerCase()
              return cellValue.includes(filterValue)
            })
          }
        })
      }

      // Apply formatting
      processedData = applyFormatting(processedData, config)

      // Apply duplicates handling
      const duplicatedData = await this.applyDuplicatesHandling(processedData, config, progressCallback)

      // VALIDATION: Check if duplicate count is reasonable
      if (duplicatedData.length > processedData.length * VALIDATION_LIMITS.MAX_DUPLICATE_MULTIPLIER) {
        throw new Error(
          `⚠️ Duplicate handling created ${duplicatedData.length} labels from ${processedData.length} records. ` +
          `This seems excessive. Please check your duplicate settings.`
        )
      }

      // Split data into pages
      const totalPages = Math.ceil(duplicatedData.length / itemsPerPage)
      
      // VALIDATION: Check if page count is reasonable
      if (totalPages > VALIDATION_LIMITS.MAX_PAGE_COUNT) {
        throw new Error(
          `⚠️ Would generate ${totalPages} pages (${duplicatedData.length} labels ÷ ${itemsPerPage} per page). ` +
          `This is too large. Please check:\n` +
          `• Your duplicate column values\n` +
          `• Record selection settings\n` +
          `• Template structure (#1, #2, etc.)`
        )
      }

      progressCallback?.(`Processing data (preparing ${totalPages} pages)...`)
      
      const pages = []
      for (let i = 0; i < duplicatedData.length; i += itemsPerPage) {
        const pageData = duplicatedData.slice(i, i + itemsPerPage)

        const numberedItems = {}
        
        // Process actual data items
        for (let j = 0; j < itemsPerPage; j++) {
          const item = pageData[j] || {}
          Object.keys(item).forEach((key) => {
            // Create both numbered and simple placeholders
            numberedItems[`${key}#${j + 1}`] = item[key] || ''
            // For #1, also create simple placeholder
            if (j === 0) {
              numberedItems[key] = item[key] || ''
            }
          })
        }

        // Add empty placeholders if needed
        if (pageData.length < itemsPerPage && data.length > 0) {
          const sampleKeys = Object.keys(data[0])
          for (let j = pageData.length; j < itemsPerPage; j++) {
            sampleKeys.forEach((key) => {
              numberedItems[`${key}#${j + 1}`] = ''
              if (j === 0) {
                numberedItems[key] = ''
              }
            })
          }
        }

        pages.push(numberedItems)

        // Update progress and yield control periodically
        if (pages.length % PROGRESS_UPDATE.CHUNK_SIZE === 0) {
          progressCallback?.(`Processing data (page ${pages.length} of ${totalPages})...`)
          await new Promise((resolve) => setTimeout(resolve, PROGRESS_UPDATE.YIELD_INTERVAL_MS))
        }
      }

      progressCallback?.(`Creating document (${pages.length} pages)...`)
      const zip = new PizZip(modifiedTemplateArrayBuffer)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true
      })
      
      progressCallback?.(`Rendering document (${pages.length} pages)...`)
      try {
        doc.render({ pages })
      } catch (error) {
        if (error.properties && error.properties.errors) {
          const errorMessages = error.properties.errors.map(e => e.properties?.explanation || e.message)
          throw new Error(`Template rendering failed: ${errorMessages.join('; ')}`)
        }
        throw error
      }

      progressCallback?.('Generating final document (this may take a moment)...')
      
      const outputArrayBuffer = doc.getZip().generate({
        type: 'arraybuffer',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE'
      })

      // VALIDATION: Check output size
      const sizeMB = outputArrayBuffer.byteLength / 1024 / 1024
      if (sizeMB > VALIDATION_LIMITS.MAX_FILE_SIZE_MB) {
        console.warn(`⚠️ Generated file is ${sizeMB.toFixed(2)} MB - this is unusually large!`)
      }

      return {
        data: outputArrayBuffer,
        stats: {
          originalRecords: data.length,
          filteredRecords: processedData.length,
          totalLabels: duplicatedData.length,
          pages: pages.length,
          itemsPerPage,
          fileSizeMB: sizeMB.toFixed(2)
        }
      }
    } catch (error) {
      console.error('[ERROR] Generation failed:', error.message)
      throw error
    }
  }

  applyRecordSelection(data, config) {
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

  async applyDuplicatesHandling(data, config, progressCallback) {
    const { mode, column, addSubtract, fixed, collate } = config.duplicates
    const result = []
    const totalRecords = data.length

    if (collate === 'uncollated') {
      // Uncollated: Group all copies together (1,1,1,2,2,2,3,3,3)
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        let duplicateCount = 1

        if (mode === 'column') {
          if (column && row[column]) {
            const columnValue = parseInt(row[column]) || 1
            duplicateCount = Math.max(1, columnValue + addSubtract)
          }
        } else if (mode === 'fixed') {
          duplicateCount = fixed
        }

        if (duplicateCount > VALIDATION_LIMITS.MAX_DUPLICATE_COUNT) {
          console.warn(`⚠️ Row ${i} has duplicate count of ${duplicateCount} - this seems high`)
        }
        
        if (duplicateCount < 1) duplicateCount = 1

        // Add all copies of this record together
        for (let j = 0; j < duplicateCount; j++) {
          result.push({ ...row })
        }

        if (i % PROGRESS_UPDATE.FREQUENCY === 0) {
          const progress = Math.round((i / totalRecords) * 100)
          progressCallback?.(`Processing duplicates (${i + 1} of ${totalRecords} records, ${progress}%)...`)
          await new Promise((resolve) => setTimeout(resolve, PROGRESS_UPDATE.YIELD_INTERVAL_MS))
        }
      }
    } else {
      // Collated (default): Interleave copies (1,2,3,1,2,3,1,2,3)
      const recordCounts = []
      let maxCopies = 0
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        let duplicateCount = 1

        if (mode === 'column') {
          if (column && row[column]) {
            const columnValue = parseInt(row[column]) || 1
            duplicateCount = Math.max(1, columnValue + addSubtract)
          }
        } else if (mode === 'fixed') {
          duplicateCount = fixed
        }

        if (duplicateCount < 1) duplicateCount = 1
        if (duplicateCount > VALIDATION_LIMITS.MAX_DUPLICATE_COUNT) {
          console.warn(`⚠️ Row ${i} has duplicate count of ${duplicateCount} - this seems high`)
        }

        recordCounts.push(duplicateCount)
        maxCopies = Math.max(maxCopies, duplicateCount)
      }

      // Now interleave: for each copy number, go through all records
      for (let copyNum = 0; copyNum < maxCopies; copyNum++) {
        for (let i = 0; i < data.length; i++) {
          if (copyNum < recordCounts[i]) {
            result.push({ ...data[i], __setNumber: i + 1, __copyNumber: copyNum + 1 })
          }
        }
        
        if (copyNum % PROGRESS_UPDATE.CHUNK_SIZE === 0) {
          const progress = Math.round((copyNum / maxCopies) * 100)
          progressCallback?.(`Processing duplicates (set ${copyNum + 1} of ${maxCopies}, ${progress}%)...`)
          await new Promise((resolve) => setTimeout(resolve, PROGRESS_UPDATE.YIELD_INTERVAL_MS))
        }
      }
    }

    return result
  }

  async saveDocument(outputArrayBuffer, filename) {
    const blob = new Blob([outputArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    })

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const finalFilename = filename || `labels_${timestamp}.docx`
    saveAs(blob, finalFilename)
    return finalFilename
  }
}

export const labelGenerator = new LabelGenerator()