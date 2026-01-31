import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import expressionParser from 'docxtemplater/expressions.js'
import { saveAs } from 'file-saver'
import { applyFormatting } from '../utils/formatter'
import { VALIDATION_LIMITS, PROGRESS_UPDATE } from '../utils/constants'

export class LabelGenerator {
  /**
     * Preprocess the template XML to transform simple placeholders into indexed array syntax.
     * 
     * @param {string} xmlContent - The raw word/document.xml content
     * @param {string[]} headers - Column headers from the data (to distinguish column names from loop tags)
     * @returns {{ processedXml: string, itemsPerPage: number }}
     */
  preprocessTemplate(xmlContent, headers = []) {
    // Create a Set of headers for fast lookup
    const headerSet = new Set(headers)

    // Step 1: Defragment placeholders that Word split across multiple <w:t> tags
    let processedXml = this.defragmentPlaceholders(xmlContent)

    // Extract the full text to find all placeholders and count {:next} tags
    const textContent = this.extractTextFromXml(processedXml)
    console.log('[PREPROCESS] Extracted text content:', textContent.substring(0, 500))

    // Count {:next} tags to determine items per page
    const nextMatches = textContent.match(/\{:next\}/g) || []
    let itemsPerPage = nextMatches.length + 1

    // FIX: Check if the last {:next} is a trailing one (no bindable placeholders after it)
    if (nextMatches.length > 0) {
      const lastNextIndex = textContent.lastIndexOf('{:next}')
      if (lastNextIndex !== -1) {
        // Get text after the last {:next}
        const textAfter = textContent.substring(lastNextIndex + 7) // 7 is length of '{:next}'

        // Check for bindable placeholders in the text after the last {:next}
        const placeholderPattern = /\{([^}:][^}]*)\}/g
        let hasValidPlaceholder = false
        let match

        while ((match = placeholderPattern.exec(textAfter)) !== null) {
          const tag = match[1].trim()

          // Skip {:next}
          if (tag === ':next') continue

          // Check if this is a known column header
          const isKnownColumn = headerSet.has(tag)

          // If not known, check exclusion list (matches replaceAllPlaceholders logic)
          if (!isKnownColumn) {
            if (tag.startsWith('#') || tag.startsWith('/') ||
              tag === 'pages' || tag.startsWith('@') ||
              tag.startsWith('.') || tag.startsWith(':')) {
              continue
            }
          }

          // If we found a placeholder that isn't a control tag, the slot is valid
          hasValidPlaceholder = true
          break
        }

        // If no valid placeholders follow the last {:next}, ignore it
        if (!hasValidPlaceholder) {
          itemsPerPage = Math.max(1, itemsPerPage - 1)
          console.log(`[PREPROCESS] Ignoring trailing {:next} - no placeholders found after it. Adjusted itemsPerPage to ${itemsPerPage}`)
        }
      }
    }

    console.log(`[PREPROCESS] Found ${nextMatches.length} {:next} tags. Final items per page: ${itemsPerPage}`)

    // Step 2: Calculate cursor positions based on {:next} tags
    const cursorPositions = this.calculateCursorPositions(processedXml)

    // Step 3: Replace placeholders with indexed versions based on cursor position
    processedXml = this.replaceAllPlaceholders(processedXml, cursorPositions, headerSet)

    // Step 4: Remove {:next} tags
    processedXml = processedXml.replace(/\{:next\}/g, '')

    return { processedXml, itemsPerPage }
  }

  /**
   * Defragment placeholders that Word has split across multiple <w:t> tags.
   * 
   * Word often splits text like {Species epithet} into:
   * <w:t>{Species </w:t></w:r><w:r><w:t>epithet}</w:t>
   * 
   * This method merges such fragments back together within runs.
   */
  defragmentPlaceholders(xmlContent) {
    // Strategy: Find runs (<w:r>) that contain partial placeholders and merge their text
    // We'll process paragraph by paragraph

    const paragraphPattern = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g

    return xmlContent.replace(paragraphPattern, (paragraph) => {
      // Check if this paragraph might have fragmented placeholders
      if (!paragraph.includes('{') && !paragraph.includes('}')) {
        return paragraph
      }

      // Extract all text content to check for placeholders
      let fullText = ''
      const textMatches = paragraph.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
      textMatches.forEach(match => {
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
        if (textMatch) {
          fullText += textMatch[1]
        }
      })

      // If no placeholders in full text, return as-is
      if (!fullText.includes('{')) {
        return paragraph
      }

      // Check if we have fragmented placeholders (unmatched braces in individual <w:t> tags)
      let hasFragmentation = false
      let braceCount = 0
      for (const match of textMatches) {
        const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
        if (textMatch) {
          const text = textMatch[1]
          const openBraces = (text.match(/\{/g) || []).length
          const closeBraces = (text.match(/\}/g) || []).length
          braceCount += openBraces - closeBraces

          // If we have an open brace without matching close in same segment, it's fragmented
          if (braceCount !== 0) {
            hasFragmentation = true
            break
          }
        }
      }

      // If no fragmentation detected, return as-is
      if (!hasFragmentation) {
        return paragraph
      }

      // We have fragmentation - use a simpler approach: just merge text within <w:t> tags
      // without restructuring the entire paragraph
      return this.mergeFragmentedPlaceholders(paragraph)
    })
  }

  /**
   * Merge fragmented placeholders by combining adjacent <w:t> tag contents
   * This is a simpler approach that doesn't restructure the paragraph
   */
  mergeFragmentedPlaceholders(paragraph) {
    // Find all <w:t> tags and their positions
    const wtPattern = /<w:t([^>]*)>([^<]*)<\/w:t>/g
    const segments = []
    let match

    while ((match = wtPattern.exec(paragraph)) !== null) {
      segments.push({
        fullMatch: match[0],
        attributes: match[1],
        text: match[2],
        start: match.index,
        end: match.index + match[0].length
      })
    }

    if (segments.length === 0) {
      return paragraph
    }

    // Find segments that need merging (contain unbalanced braces)
    let result = paragraph
    let offset = 0

    let i = 0
    while (i < segments.length) {
      const seg = segments[i]
      let combinedText = seg.text
      let braceCount = (combinedText.match(/\{/g) || []).length - (combinedText.match(/\}/g) || []).length

      // If balanced, skip
      if (braceCount === 0) {
        i++
        continue
      }

      // Need to merge with following segments until balanced
      let j = i + 1
      let lastSegmentEnd = seg.end

      while (braceCount !== 0 && j < segments.length) {
        combinedText += segments[j].text
        braceCount = (combinedText.match(/\{/g) || []).length - (combinedText.match(/\}/g) || []).length
        lastSegmentEnd = segments[j].end
        j++
      }

      // If we merged segments, replace them in the result
      if (j > i + 1) {
        const startPos = seg.start + offset
        const endPos = lastSegmentEnd + offset
        const originalLength = lastSegmentEnd - seg.start

        // Create new <w:t> tag with combined text, preserving first segment's attributes
        const newTag = `<w:t${seg.attributes}>${combinedText}</w:t>`

        // Replace the range from first segment start to last segment end
        result = result.substring(0, startPos) + newTag + result.substring(endPos)

        // Update offset for subsequent replacements
        offset += newTag.length - originalLength
      }

      i = j
    }

    return result
  }

  /**
   * Rebuild a paragraph by merging text from adjacent runs that contain placeholder fragments
   * @deprecated Use mergeFragmentedPlaceholders instead - this method has issues with XML structure
   */
  rebuildParagraphMergingText(paragraph) {
    // This method is kept for reference but should not be used
    // Use mergeFragmentedPlaceholders instead
    return this.mergeFragmentedPlaceholders(paragraph)
  }

  /**
   * Escape XML special characters - only the essential ones for text content
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  /**
   * Calculate cursor positions throughout the document by finding {:next} tags
   * Returns a map of character positions to cursor values
   */
  calculateCursorPositions(xmlContent) {
    const positions = []
    let cursor = 0
    let searchStart = 0

    // Find all {:next} tags and record their positions
    while (true) {
      const nextIndex = xmlContent.indexOf('{:next}', searchStart)
      if (nextIndex === -1) break

      positions.push({ position: nextIndex, cursorAfter: cursor + 1 })
      cursor++
      searchStart = nextIndex + 7 // length of '{:next}'
    }

    return positions
  }

  /**
   * Get the cursor value at a given position in the XML
   */
  getCursorAtPosition(position, cursorPositions) {
    let cursor = 0
    for (const cp of cursorPositions) {
      if (position > cp.position) {
        cursor = cp.cursorAfter
      } else {
        break
      }
    }
    return cursor
  }

  /**
   * Replace all placeholders in the XML with indexed versions
   * This works directly on <w:t> tag contents to preserve formatting
   */
  replaceAllPlaceholders(xmlContent, cursorPositions, headerSet) {
    // Match <w:t> tags and their content
    const wtPattern = /<w:t([^>]*)>([^<]*)<\/w:t>/g

    return xmlContent.replace(wtPattern, (match, attributes, textContent, offset) => {
      // Check if this text contains any placeholders
      if (!textContent.includes('{')) {
        return match
      }

      // Get cursor value at this position
      const cursor = this.getCursorAtPosition(offset, cursorPositions)

      // Replace placeholders in this text segment
      // Match placeholders but not {:next} or loop tags
      const placeholderPattern = /\{([^}:][^}]*)\}/g
      const processedText = textContent.replace(placeholderPattern, (placeholder, tagContent) => {
        const trimmedTag = tagContent.trim()

        // Skip {:next} tags - they'll be removed later
        if (trimmedTag === ':next') {
          return placeholder
        }

        // Check if this is a known column header
        const isKnownColumn = headerSet.has(trimmedTag)

        // Skip loop tags and special docxtemplater syntax UNLESS it's a known column
        if (!isKnownColumn) {
          if (trimmedTag.startsWith('#') || trimmedTag.startsWith('/') ||
            trimmedTag === 'pages' || trimmedTag.startsWith('@') ||
            trimmedTag.startsWith('.') || trimmedTag.startsWith(':')) {
            return placeholder
          }
        }

        // Transform to indexed array syntax using bracket notation
        // This handles column names with spaces and special characters
        const escapedTag = trimmedTag.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        return `{items[${cursor}]['${escapedTag}']}`
      })

      return `<w:t${attributes}>${processedText}</w:t>`
    })
  }

  /**
   * Extract plain text from XML content
   */
  extractTextFromXml(xmlContent) {
    let text = ''
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
    textMatches.forEach(match => {
      const textMatch = match.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
      if (textMatch) {
        text += textMatch[1]
      }
    })
    return text
  }

  /**
   * Wrap the document body content with pages loop and ensure page break.
   * Handles both simple documents and table-based templates.
   * @param {string} xmlContent - The document XML
   * @returns {string} - Modified XML with pages loop
   */
  wrapWithPagesLoop(xmlContent) {
    // Check if pages loop already exists
    if (xmlContent.includes('{#pages}') && xmlContent.includes('{/pages}')) {
      console.log('[PREPROCESS] Pages loop already exists in template')
      return xmlContent
    }

    // Find the document body
    const bodyStartMatch = xmlContent.match(/<w:body>/)
    const bodyEndMatch = xmlContent.match(/<\/w:body>/)

    if (!bodyStartMatch || !bodyEndMatch) {
      console.warn('[PREPROCESS] Could not find document body tags')
      return xmlContent
    }

    const bodyStart = bodyStartMatch.index + bodyStartMatch[0].length
    const bodyEnd = bodyEndMatch.index
    const bodyContent = xmlContent.substring(bodyStart, bodyEnd)

    // Find the last <w:sectPr> (section properties) which should stay outside the loop
    const sectPrMatch = bodyContent.match(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/)
    let contentToWrap = bodyContent
    let sectPr = ''

    if (sectPrMatch) {
      sectPr = sectPrMatch[0]
      contentToWrap = bodyContent.substring(0, bodyContent.lastIndexOf(sectPrMatch[0]))
    }

    // Check if the content is primarily a table
    const hasTable = contentToWrap.includes('<w:tbl>')

    let wrappedContent

    if (hasTable) {
      // For table-based templates, we need to wrap at table row level
      // Find all table rows and wrap them with the loop
      wrappedContent = this.wrapTableWithLoop(contentToWrap)
    } else {
      // For simple templates, wrap the entire content
      const pageBreakXml = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
      wrappedContent =
        '<w:p><w:r><w:t>{#pages}</w:t></w:r></w:p>' +
        contentToWrap +
        pageBreakXml +
        '<w:p><w:r><w:t>{/pages}</w:t></w:r></w:p>'
    }

    const result =
      xmlContent.substring(0, bodyStart) +
      wrappedContent +
      sectPr +
      xmlContent.substring(bodyEnd)

    console.log('[PREPROCESS] Template wrapped with {#pages}...{/pages} tags')

    return result
  }

  /**
   * Wrap table content with pages loop at the appropriate level
   */
  wrapTableWithLoop(content) {
    // Strategy: Put loop tags before the first table and after the last table
    // This allows the entire page content (including tables) to be repeated

    const firstTableStart = content.indexOf('<w:tbl>')
    const lastTableEnd = content.lastIndexOf('</w:tbl>') + '</w:tbl>'.length

    if (firstTableStart === -1) {
      // No table found, fall back to simple wrapping
      const pageBreakXml = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
      return '<w:p><w:r><w:t>{#pages}</w:t></w:r></w:p>' +
        content +
        pageBreakXml +
        '<w:p><w:r><w:t>{/pages}</w:t></w:r></w:p>'
    }

    // Content before first table
    const beforeTables = content.substring(0, firstTableStart)
    // All tables and content between them
    const tablesContent = content.substring(firstTableStart, lastTableEnd)
    // Content after last table
    const afterTables = content.substring(lastTableEnd)

    // Page break XML
    const pageBreakXml = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

    // Wrap: put loop start in a paragraph before tables, loop end after tables
    return '<w:p><w:r><w:t>{#pages}</w:t></w:r></w:p>' +
      beforeTables +
      tablesContent +
      afterTables +
      pageBreakXml +
      '<w:p><w:r><w:t>{/pages}</w:t></w:r></w:p>'
  }

  /**
   * Chunk flat data array into pages with items array
   * @param {Array} flatArray - Flat array of records
   * @param {number} chunkSize - Number of items per page
   * @returns {Array} - Array of page objects: [{ items: [...] }, { items: [...] }]
   */
  chunkData(flatArray, chunkSize) {
    const pages = []

    for (let i = 0; i < flatArray.length; i += chunkSize) {
      const pageItems = flatArray.slice(i, i + chunkSize)

      // Pad with empty objects if this is the last page and incomplete
      while (pageItems.length < chunkSize) {
        // Create empty object with same keys but empty values
        const emptyItem = {}
        if (flatArray.length > 0) {
          Object.keys(flatArray[0]).forEach(key => {
            emptyItem[key] = ''
          })
        }
        pageItems.push(emptyItem)
      }

      pages.push({ items: pageItems })
    }

    return pages
  }

  /**
   * Extract placeholder column names from a template
   * @param {ArrayBuffer} templateArrayBuffer - The template file
   * @returns {string[]} - Array of unique column names found in placeholders
   */
  extractTemplatePlaceholders(templateArrayBuffer) {
    try {
      const zip = new PizZip(templateArrayBuffer)
      let xmlContent = zip.files['word/document.xml']?.asText()

      if (!xmlContent) {
        return []
      }

      // Defragment placeholders first
      xmlContent = this.defragmentPlaceholders(xmlContent)

      // Extract text content
      const textContent = this.extractTextFromXml(xmlContent)

      // Match all placeholders, excluding special tags
      const placeholderPattern = /\{([^}:][^}]*)\}/g
      const matches = [...textContent.matchAll(placeholderPattern)]

      const columns = new Set()

      matches.forEach((match) => {
        const tagContent = match[1].trim()

        // Skip loop tags and special docxtemplater syntax
        if (tagContent.startsWith('#') ||
          tagContent.startsWith('/') ||
          tagContent.startsWith('@') ||
          tagContent.startsWith('.') ||
          tagContent === 'pages' ||
          tagContent === ':next') {
          return
        }

        columns.add(tagContent)
      })

      return Array.from(columns)
    } catch (error) {
      console.error('Error extracting placeholders:', error)
      return []
    }
  }

  async validateTemplate(templateArrayBuffer, data) {
    if (data.length === 0) {
      throw new Error('No data to validate against')
    }

    try {
      const zip = new PizZip(templateArrayBuffer)
      let xmlContent = zip.files['word/document.xml']?.asText()

      if (!xmlContent) {
        throw new Error('Invalid Word template format')
      }

      const headers = Object.keys(data[0])

      // Match placeholders, excluding special tags like {:next}
      const placeholderPattern = /\{([^}:][^}]*)\}/g
      const matches = [...xmlContent.matchAll(placeholderPattern)]

      const missingColumns = []

      matches.forEach((match) => {
        const tagContent = match[1].trim()

        // Skip loop tags and special docxtemplater syntax
        if (tagContent.startsWith('#') ||
          tagContent.startsWith('/') ||
          tagContent.startsWith('@') ||
          tagContent.startsWith('.') ||
          tagContent === 'pages') {
          return
        }

        // Check if the column exists
        if (!headers.includes(tagContent)) {
          missingColumns.push(tagContent)
        }
      })

      if (missingColumns.length > 0) {
        throw new Error(`Template references missing columns: ${[...new Set(missingColumns)].join(', ')}`)
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
          `✅ Correct: {genus}\n` +
          `❌ Wrong: { genus} (space after {)`
        )
      }
      throw error
    }
  }

  async generateLabels(templateArrayBuffer, data, config, progressCallback) {
    try {
      if (!templateArrayBuffer) {
        throw new Error('No template data provided')
      }

      progressCallback?.('Processing data...')

      // Apply record selection
      let processedData = this.applyRecordSelection(data, config)

      // Apply sorting
      progressCallback?.('Sorting data...')
      processedData = this.applySorting(processedData, config)

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

      console.log(`[DEBUG] Total labels after duplication: ${duplicatedData.length}`)

      // VALIDATION: Check if duplicate count is reasonable
      if (duplicatedData.length > processedData.length * VALIDATION_LIMITS.MAX_DUPLICATE_MULTIPLIER) {
        throw new Error(
          `⚠️ Duplicate handling created ${duplicatedData.length} labels from ${processedData.length} records. ` +
          `This seems excessive. Please check your duplicate settings.`
        )
      }

      // Load and preprocess template
      progressCallback?.('Preprocessing template...')
      const zip = new PizZip(templateArrayBuffer)
      let xmlContent = zip.files['word/document.xml']?.asText()

      if (!xmlContent) {
        throw new Error('Invalid Word template format')
      }

      console.log('[DEBUG] Original XML sample:', xmlContent.substring(0, 2000))

      // Get headers from data for preprocessing
      const headers = data.length > 0 ? Object.keys(data[0]) : []

      // Step 1: Preprocess placeholders (transform {genus} to {items[0]['genus']})
      const { processedXml, itemsPerPage } = this.preprocessTemplate(xmlContent, headers)

      console.log(`[DEBUG] Detected ${itemsPerPage} items per page from template`)
      console.log('[DEBUG] Processed XML sample:', processedXml.substring(0, 2000))

      // Step 2: Wrap with pages loop
      const finalXml = this.wrapWithPagesLoop(processedXml)

      console.log('[DEBUG] Final XML with loop:', finalXml.substring(0, 3000))

      // Save processed XML back to zip
      zip.file('word/document.xml', finalXml)

      // Step 3: Chunk data into pages
      const pages = this.chunkData(duplicatedData, itemsPerPage)

      const totalPages = pages.length
      console.log(`[DEBUG] Will generate ${totalPages} pages (${duplicatedData.length} labels ÷ ${itemsPerPage} per page)`)
      console.log('[DEBUG] Sample page data:', JSON.stringify(pages[0], null, 2))

      // VALIDATION: Check if page count is reasonable
      if (totalPages > VALIDATION_LIMITS.MAX_PAGE_COUNT) {
        throw new Error(
          `⚠️ Would generate ${totalPages} pages (${duplicatedData.length} labels ÷ ${itemsPerPage} per page). ` +
          `This is too large. Please check:\n` +
          `• Your duplicate column values\n` +
          `• Record selection settings\n` +
          `• Template structure`
        )
      }

      progressCallback?.(`Creating document (${totalPages} pages)...`)

      // Create docxtemplater with angular expression parser for array indexing
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        parser: expressionParser
      })

      progressCallback?.(`Rendering document (${totalPages} pages)...`)

      try {
        console.log('[DEBUG] Rendering with data structure:', {
          pagesCount: pages.length,
          itemsPerPage,
          samplePageKeys: pages[0] ? Object.keys(pages[0]) : [],
          sampleItemKeys: pages[0]?.items?.[0] ? Object.keys(pages[0].items[0]) : []
        })

        doc.render({ pages })

        // Verify rendering worked
        const renderedText = doc.getFullText()
        console.log('[DEBUG] Rendered template sample (first 500 chars):', renderedText.substring(0, 500))

        // Check for unresolved placeholders
        const remainingPlaceholders = renderedText.match(/\{[^}]+\}/g)
        if (remainingPlaceholders && remainingPlaceholders.length > 0) {
          const actualUnresolved = remainingPlaceholders.filter(p =>
            p !== '{#pages}' && p !== '{/pages}' && !p.includes('items[')
          )

          if (actualUnresolved.length > 0) {
            console.warn('[DEBUG] WARNING: Found unresolved placeholders:', actualUnresolved.slice(0, 10))

            // Extract just the column names from unresolved placeholders
            const unresolvedColumns = actualUnresolved.map(p => {
              // Extract from {items[0]['Column Name']} or {items[0].ColumnName}
              const bracketMatch = p.match(/\['([^']+)'\]/)
              if (bracketMatch) return bracketMatch[1]
              const dotMatch = p.match(/\.([a-zA-Z0-9_]+)/)
              if (dotMatch) return dotMatch[1]
              return p.replace(/[{}]/g, '')
            })

            throw new Error(
              `❌ Template rendering incomplete. Found unresolved placeholders:\n\n` +
              `${unresolvedColumns.slice(0, 5).join(', ')}${unresolvedColumns.length > 5 ? '...' : ''}\n\n` +
              `This usually means:\n` +
              `• Placeholder names don't match your Excel column headers exactly (case-sensitive!)\n` +
              `• Your Excel has these columns: ${Object.keys(data[0] || {}).slice(0, 5).join(', ')}...\n\n` +
              `💡 Check that your template placeholders match your column names exactly.`
            )
          }
        }
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

  /**
   * Save the preprocessed template for debugging
   */
  saveDebugTemplate(arrayBuffer) {
    try {
      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      saveAs(blob, `DEBUG_preprocessed_template_${timestamp}.docx`)
      console.log('[DEBUG] Preprocessed template saved for inspection')
    } catch (error) {
      console.warn('[DEBUG] Failed to save debug template:', error)
    }
  }

  applySorting(data, config) {
    if (!config.sorting?.enabled || !config.sorting?.rules?.length) {
      return data
    }

    const sortedData = [...data]

    sortedData.sort((a, b) => {
      for (const rule of config.sorting.rules) {
        const { column, order } = rule
        if (!column) continue

        const valueA = a[column]
        const valueB = b[column]

        const aEmpty = valueA === null || valueA === undefined || valueA === ''
        const bEmpty = valueB === null || valueB === undefined || valueB === ''

        if (aEmpty && bEmpty) continue
        if (aEmpty) return 1
        if (bEmpty) return -1

        const numA = parseFloat(valueA)
        const numB = parseFloat(valueB)
        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA !== numB) {
            return order === 'asc' ? numA - numB : numB - numA
          }
          continue
        }

        const dateA = new Date(valueA)
        const dateB = new Date(valueB)
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          if (dateA.getTime() !== dateB.getTime()) {
            return order === 'asc'
              ? dateA.getTime() - dateB.getTime()
              : dateB.getTime() - dateA.getTime()
          }
          continue
        }

        const strA = String(valueA).toLowerCase()
        const strB = String(valueB).toLowerCase()
        const comparison = strA.localeCompare(strB)
        if (comparison !== 0) {
          return order === 'asc' ? comparison : -comparison
        }
      }
      return 0
    })

    return sortedData
  }

  applyRecordSelection(data, config) {
    const { startRow = 1, endRow } = config.recordSelection

    // Use endRow if provided, otherwise use all records
    const effectiveEndRow = endRow || data.length

    const selected = data.slice(startRow - 1, effectiveEndRow)

    // Preserve __spreadsheetRow property
    return selected.map(row => {
      const newRow = { ...row }
      if (row.__spreadsheetRow !== undefined) {
        Object.defineProperty(newRow, '__spreadsheetRow', {
          value: row.__spreadsheetRow,
          enumerable: false,
          writable: false,
          configurable: true
        })
      }
      return newRow
    })
  }

  async applyDuplicatesHandling(data, config, progressCallback) {
    const { mode, column, addSubtract, fixed, collate } = config.duplicates
    const result = []
    const totalRecords = data.length

    if (collate === 'uncollated') {
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        let duplicateCount = 1

        if (mode === 'column') {
          if (column) {
            const rawValue = row[column]
            // Handle empty, undefined, or non-numeric values
            const columnValue = (rawValue === '' || rawValue === undefined || rawValue === null)
              ? 0
              : (parseInt(rawValue) || 0)
            duplicateCount = columnValue + (addSubtract || 0)
            // Allow 0 copies (skip row), but not negative
            duplicateCount = Math.max(0, duplicateCount)
          }
        } else if (mode === 'fixed') {
          duplicateCount = Math.max(0, fixed || 1)
        }

        if (duplicateCount > VALIDATION_LIMITS.MAX_DUPLICATE_COUNT) {
          console.warn(`⚠️ Row ${i} has duplicate count of ${duplicateCount} - this seems high`)
        }

        // Only add copies if duplicateCount > 0
        for (let j = 0; j < duplicateCount; j++) {
          const duplicate = { ...row }
          // Preserve __spreadsheetRow
          if (row.__spreadsheetRow !== undefined) {
            Object.defineProperty(duplicate, '__spreadsheetRow', {
              value: row.__spreadsheetRow,
              enumerable: false,
              writable: false,
              configurable: true
            })
          }
          result.push(duplicate)
        }

        if (i % PROGRESS_UPDATE.FREQUENCY === 0) {
          const progress = Math.round((i / totalRecords) * 100)
          progressCallback?.(`Processing duplicates (${i + 1} of ${totalRecords} records, ${progress}%)...`)
          await new Promise((resolve) => setTimeout(resolve, PROGRESS_UPDATE.YIELD_INTERVAL_MS))
        }
      }
    } else {
      const recordCounts = []
      let maxCopies = 0

      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        let duplicateCount = 1

        if (mode === 'column') {
          if (column) {
            const rawValue = row[column]
            // Handle empty, undefined, or non-numeric values
            const columnValue = (rawValue === '' || rawValue === undefined || rawValue === null)
              ? 0
              : (parseInt(rawValue) || 0)
            duplicateCount = columnValue + (addSubtract || 0)
            // Allow 0 copies (skip row), but not negative
            duplicateCount = Math.max(0, duplicateCount)
          }
        } else if (mode === 'fixed') {
          duplicateCount = Math.max(0, fixed || 1)
        }

        if (duplicateCount > VALIDATION_LIMITS.MAX_DUPLICATE_COUNT) {
          console.warn(`⚠️ Row ${i} has duplicate count of ${duplicateCount} - this seems high`)
        }

        recordCounts.push(duplicateCount)
        maxCopies = Math.max(maxCopies, duplicateCount)
      }

      for (let copyNum = 0; copyNum < maxCopies; copyNum++) {
        for (let i = 0; i < data.length; i++) {
          if (copyNum < recordCounts[i]) {
            const duplicate = { ...data[i], __setNumber: i + 1, __copyNumber: copyNum + 1 }
            // Preserve __spreadsheetRow
            if (data[i].__spreadsheetRow !== undefined) {
              Object.defineProperty(duplicate, '__spreadsheetRow', {
                value: data[i].__spreadsheetRow,
                enumerable: false,
                writable: false,
                configurable: true
              })
            }
            result.push(duplicate)
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