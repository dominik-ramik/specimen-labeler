import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'
import { applyFormatting } from '../utils/formatter'

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
      const placeholderPattern = /\{([^}]+)#\d+\}/g
      const matches = templateContent.match(placeholderPattern) || []

      console.log('Template placeholders found:', matches)
      console.log('Excel headers available:', headers)

      const missingColumns = []
      matches.forEach((match) => {
        const columnName = match.replace(/\{([^}]+)#\d+\}/, '$1').trim()
        if (!headers.includes(columnName)) {
          missingColumns.push(columnName)
        }
      })

      if (missingColumns.length > 0) {
        throw new Error(`Template references missing columns: ${missingColumns.join(', ')}`)
      }
    } catch (error) {
      if (error.properties && error.properties.errors) {
        console.error('Template validation errors:', error.properties.errors)
        
        // Provide better error messages for common issues
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
        console.log('Template already has pages loop')
        return templateArrayBuffer // Already has the loop
      }

      console.log('⚠️ Template does not have pages loop')
      console.log('⚠️ Please add {#pages} at the start and {/pages} at the end of your Word template manually')
      console.log('⚠️ Using template without pages loop - this may cause issues')
      
      // Don't auto-modify - return original template
      // Auto-modification can corrupt complex templates
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

    const placeholderPattern = /\{[^}]+#(\d+)\}/g
    const matches = templateContent.match(placeholderPattern) || []

    let maxNumber = 0
    matches.forEach((match) => {
      const number = parseInt(match.replace(/\{[^}]+#(\d+)\}/, '$1'))
      if (number > maxNumber) {
        maxNumber = number
      }
    })

    console.log('[DEBUG] Template placeholders found:', matches.length)
    console.log('[DEBUG] Max item number detected:', maxNumber)
    console.log('[DEBUG] Sample placeholders:', matches.slice(0, 5))

    return maxNumber || 4
  }

  async generateLabels(templateFile, data, config, progressCallback) {
    try {
      console.log('[LabelGenerator] Starting generation...')
      console.log('[LabelGenerator] Template file:', templateFile)
      console.log('[LabelGenerator] Data rows:', data?.length)
      console.log('[LabelGenerator] Config:', config)

      if (!templateFile) {
        throw new Error('No template file provided')
      }

      progressCallback?.('Validating template...')
      
      // Try to read the file with better error handling
      let templateArrayBuffer
      try {
        templateArrayBuffer = await templateFile.arrayBuffer()
      } catch (readError) {
        console.error('[LabelGenerator] Failed to read template file:', readError)
        throw new Error(
          'Cannot read template file. If you just edited the file in Word, please re-upload it. ' +
          'Make sure the file is not open in another application.'
        )
      }
      
      console.log('[LabelGenerator] Template loaded, size:', templateArrayBuffer.byteLength)
      
      // First, ensure pages loop before validation
      progressCallback?.('Preparing template...')
      const modifiedTemplateArrayBuffer = await this.ensurePagesLoop(templateArrayBuffer)
      console.log('[LabelGenerator] Template modified, size:', modifiedTemplateArrayBuffer.byteLength)
      
      await this.validateTemplate(modifiedTemplateArrayBuffer, data)

      progressCallback?.('Processing data...')
      console.log('[LabelGenerator] Detecting items per page...')
      const itemsPerPage = await this.detectItemsPerPage(modifiedTemplateArrayBuffer)
      console.log('[LabelGenerator] Items per page:', itemsPerPage)

      // Apply record selection
      console.log('[LabelGenerator] Applying record selection...')
      let processedData = this.applyRecordSelection(data, config)
      console.log('[LabelGenerator] After record selection:', processedData.length, 'rows')

      // Apply filters
      if (config.filters && config.filters.length > 0) {
        console.log('[LabelGenerator] Applying filters...')
        config.filters.forEach((filter) => {
          if (filter.column && filter.value) {
            processedData = processedData.filter((row) => {
              const cellValue = row[filter.column]?.toString().toLowerCase() || ''
              const filterValue = filter.value.toLowerCase()
              return cellValue.includes(filterValue)
            })
          }
        })
        console.log('[LabelGenerator] After filters:', processedData.length, 'rows')
      }

      // Apply formatting
      console.log('[LabelGenerator] Applying formatting...')
      processedData = applyFormatting(processedData, config)
      console.log('[LabelGenerator] Formatting complete')

      // Apply duplicates handling
      console.log('[LabelGenerator] Applying duplicates handling...')
      const duplicatedData = await this.applyDuplicatesHandling(processedData, config, progressCallback)
      console.log('[LabelGenerator] After duplicates:', duplicatedData.length, 'rows')

      // VALIDATION: Check if duplicate count is reasonable
      if (duplicatedData.length > processedData.length * 100) {
        throw new Error(
          `⚠️ Duplicate handling created ${duplicatedData.length} labels from ${processedData.length} records. ` +
          `This seems excessive. Please check your duplicate settings.`
        )
      }

      // Split data into pages
      console.log('[LabelGenerator] Splitting data into pages...')
      const totalPages = Math.ceil(duplicatedData.length / itemsPerPage)
      
      // VALIDATION: Check if page count is reasonable
      if (totalPages > 10000) {
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

        // Create numbered items for this page
        const numberedItems = {}
        
        // Only process actual data items
        for (let j = 0; j < itemsPerPage; j++) {
          const item = pageData[j] || {}
          Object.keys(item).forEach((key) => {
            numberedItems[`${key}#${j + 1}`] = item[key] || ''
          })
        }

        // Add empty placeholders if needed
        if (pageData.length < itemsPerPage && data.length > 0) {
          const sampleKeys = Object.keys(data[0])
          for (let j = pageData.length; j < itemsPerPage; j++) {
            sampleKeys.forEach((key) => {
              numberedItems[`${key}#${j + 1}`] = ''
            })
          }
        }

        pages.push(numberedItems)

        // Update progress and yield control periodically
        if (pages.length % 5 === 0) {
          progressCallback?.(`Processing data (page ${pages.length} of ${totalPages})...`)
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }
      
      console.log('[LabelGenerator] Created', pages.length, 'pages')
      console.log('[LabelGenerator] Sample page data:', JSON.stringify(pages[0], null, 2).substring(0, 500))

      progressCallback?.(`Creating document (${pages.length} pages)...`)
      console.log('[LabelGenerator] Initializing Docxtemplater...')
      const zip = new PizZip(modifiedTemplateArrayBuffer)
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true
      })
      
      console.log('[LabelGenerator] Rendering document with', pages.length, 'pages...')
      progressCallback?.(`Rendering document (${pages.length} pages)...`)
      try {
        doc.render({ pages })
        console.log('[LabelGenerator] Document rendered successfully')
      } catch (error) {
        if (error.properties && error.properties.errors) {
          console.error('Rendering errors:', error.properties.errors)
          const errorMessages = error.properties.errors.map(e => e.properties?.explanation || e.message)
          throw new Error(`Template rendering failed: ${errorMessages.join('; ')}`)
        }
        throw error
      }

      console.log('[LabelGenerator] Generating output file...')
      progressCallback?.('Generating final document (this may take a moment)...')
      
      const outputArrayBuffer = doc.getZip().generate({
        type: 'arraybuffer',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE'
      })
      console.log('[LabelGenerator] Output file generated, size:', (outputArrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB')

      // VALIDATION: Check output size
      const sizeMB = outputArrayBuffer.byteLength / 1024 / 1024
      if (sizeMB > 50) {
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
      console.error('[LabelGenerator] Generation error:', error)
      console.error('[LabelGenerator] Error type:', error.constructor.name)
      console.error('[LabelGenerator] Error message:', error.message)
      if (error.properties) {
        console.error('[LabelGenerator] Docxtemplater errors:', error.properties)
      }
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

    console.log('[DEBUG] Duplicates config:', { mode, column, addSubtract, fixed, collate })

    if (collate === 'uncollated') {
      // Uncollated: Group all copies together (1,1,1,2,2,2,3,3,3)
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        let duplicateCount = 1

        if (mode === 'column') {
          if (column && row[column]) {
            const columnValue = parseInt(row[column]) || 1
            duplicateCount = Math.max(1, columnValue + addSubtract)
            
            if (i < 5) {
              console.log(`[DEBUG] Row ${i}: column="${column}", value="${row[column]}", duplicateCount=${duplicateCount}`)
            }
          }
        } else if (mode === 'fixed') {
          duplicateCount = fixed
          if (i === 0) {
            console.log(`[DEBUG] Using fixed duplicate count: ${duplicateCount}`)
          }
        }

        if (duplicateCount > 50) {
          console.warn(`⚠️ Row ${i} has duplicate count of ${duplicateCount} - this seems high`)
        }
        
        if (duplicateCount < 1) {
          console.warn(`⚠️ Row ${i} has duplicate count of ${duplicateCount} - setting to 1`)
          duplicateCount = 1
        }

        // Add all copies of this record together
        for (let j = 0; j < duplicateCount; j++) {
          result.push({ ...row })
        }

        if (i % 10 === 0) {
          const progress = Math.round((i / totalRecords) * 100)
          progressCallback?.(`Processing duplicates (${i + 1} of ${totalRecords} records, ${progress}%)...`)
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }
    } else {
      // Collated (default): Interleave copies (1,2,3,1,2,3,1,2,3)
      // First, calculate how many copies each record needs
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
        if (duplicateCount > 50) {
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
        
        if (copyNum % 5 === 0) {
          const progress = Math.round((copyNum / maxCopies) * 100)
          progressCallback?.(`Processing duplicates (set ${copyNum + 1} of ${maxCopies}, ${progress}%)...`)
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }
    }

    console.log(`[DEBUG] Duplicates result: ${data.length} rows → ${result.length} rows (${collate})`)
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