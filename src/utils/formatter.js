function getUserLocale() {
  return navigator.language || navigator.userLanguage || 'en-US'
}

function isDayFirstLocale() {
  const locale = getUserLocale()
  const monthFirstLocales = ['en-US', 'en-PH']
  return !monthFirstLocales.some(mf => locale.startsWith(mf))
}

// 🆕 Helper function to get month name in any locale
function getMonthName(monthIndex, locale, style = 'long') {
  // monthIndex: 0-11 (JavaScript Date month)
  // locale: BCP 47 locale code (e.g., 'en-US', 'fr-FR', 'cs-CZ')
  // style: 'long' (January), 'short' (Jan), 'narrow' (J)
  
  const date = new Date(2000, monthIndex, 1) // Use year 2000 as arbitrary reference
  
  try {
    const formatter = new Intl.DateTimeFormat(locale, { month: style })
    return formatter.format(date)
  } catch (error) {
    console.warn(`Failed to format month for locale ${locale}, falling back to en-US:`, error)
    // Fallback to English if locale is invalid
    const fallbackFormatter = new Intl.DateTimeFormat('en-US', { month: style })
    return fallbackFormatter.format(date)
  }
}

// 🆕 Helper function to resolve locale
function resolveLocale(localeConfig) {
  // localeConfig is now just the locale code (e.g., 'en-US', 'fr-FR', 'cs-CZ')
  return localeConfig || 'en-US'
}

function formatDate(dateString, format, locale = 'en-US') {
  if (!dateString || dateString.toString().trim() === '') return dateString

  try {
    let date

    // Handle Excel serial numbers (dates stored as numbers)
    if (!isNaN(dateString) && dateString > 0) {
      const serialNumber = parseFloat(dateString)
      // Excel date serial number starts from 1900-01-01
      if (serialNumber > 1 && serialNumber < 100000) {
        date = new Date((serialNumber - 25569) * 86400 * 1000)
      } else {
        date = new Date(dateString)
      }
    } 
    // Handle ambiguous date formats (DD/MM/YYYY vs MM/DD/YYYY)
    else if (dateString.toString().match(/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/)) {
      const str = dateString.toString()
      const parts = str.split(/[\/\-\.]/)
      const year = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])
      
      // Use locale to determine if it's day-first or month-first
      if (isDayFirstLocale()) {
        // DD/MM/YYYY format (Europe, most of world)
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        date = new Date(year, month, day)
      } else {
        // MM/DD/YYYY format (US)
        const month = parseInt(parts[0]) - 1
        const day = parseInt(parts[1])
        date = new Date(year, month, day)
      }
      
      // Validate the parsed date
      if (isNaN(date.getTime())) {
        // If failed, try the opposite format
        if (isDayFirstLocale()) {
          const month = parseInt(parts[0]) - 1
          const day = parseInt(parts[1])
          date = new Date(year, month, day)
        } else {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          date = new Date(year, month, day)
        }
      }
    }
    // Handle ISO format and other standard formats
    else if (dateString.toString().includes('/') || dateString.toString().includes('-') || dateString.toString().includes('.')) {
      date = new Date(dateString)
    } 
    // Try parsing as-is
    else {
      date = new Date(dateString)
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString, `(user locale: ${getUserLocale()})`)
      return dateString
    }

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    const monthIndex = date.getMonth()

    // 🆕 Use the locale directly
    const actualLocale = resolveLocale(locale)

    // 🆕 Roman numerals remain language-independent
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

    switch (format) {
      case 'roman':
        return `${day}-${romanNumerals[monthIndex]}-${year}`
      case 'iso':
        return `${year}-${month}-${day}`
      case 'english':
        return `${getMonthName(monthIndex, actualLocale, 'long')} ${day}, ${year}`
      case 'short':
        return `${getMonthName(monthIndex, actualLocale, 'short')} ${day}, ${year}`
      case 'threeletter':
        return `${day} ${getMonthName(monthIndex, actualLocale, 'short').toUpperCase()} ${year}`
      default:
        return dateString
    }
  } catch (error) {
    console.warn('Date formatting error:', error, 'for value:', dateString)
    return dateString
  }
}

function formatDecimal(value, format) {
  if (!value || value.toString().trim() === '') return value

  try {
    const numValue = parseFloat(value.toString().replace(',', '.'))
    if (isNaN(numValue)) return value

    const formatted = numValue.toString()

    if (format === 'comma') {
      return formatted.replace('.', ',')
    } else {
      return formatted
    }
  } catch (error) {
    console.warn('Decimal formatting error:', error)
    return value
  }
}

function isLikelyDate(value, metadata = null) {
  if (!value || value.toString().trim() === '') return false

  // If we have Excel metadata, use it first (most reliable)
  if (metadata && metadata.isDate) {
    console.log(`[DEBUG] Cell marked as date by Excel format:`, value)
    return true
  }

  const str = value.toString().trim()

  // Skip if it's just a small number (likely not a date)
  if (/^\d+$/.test(str)) {
    const num = parseInt(str)
    // Excel serial dates are typically > 25000 (year 1968+)
    // But also check for dates > 40000 (year 2009+) which are more common
    if (num < 1000) {
      return false
    }
    // If it's a reasonable Excel serial number, treat as date
    if (num >= 1 && num < 100000) {
      return true
    }
  }

  const datePatterns = [
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,        // DD/MM/YYYY or MM/DD/YYYY
    /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,          // YYYY-MM-DD
    /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,  // DD Jan, DD January
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}/i,  // Jan DD, January DD
    /^\d{5}$/,                                         // Excel serial (5 digits)
    /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i  // Month DD, YYYY
  ]

  // Check if it matches any date pattern
  if (datePatterns.some((pattern) => pattern.test(str))) {
    return true
  }

  // Try parsing as date - if it works and produces a valid year, it's likely a date
  const parsed = Date.parse(str)
  if (!isNaN(parsed)) {
    const date = new Date(parsed)
    const year = date.getFullYear()
    // Reasonable year range for specimen dates
    return year >= 1800 && year <= 2100
  }

  return false
}

function isLikelyDecimal(value) {
  if (!value || value.toString().trim() === '') return false

  const str = value.toString().trim()

  // Don't treat date-like patterns as decimals
  // Check for common date separators that might look like decimals
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str)) {
    return false // This looks like a date (DD/MM/YYYY, MM/DD/YYYY, etc.)
  }
  
  if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(str)) {
    return false // This looks like an ISO date (YYYY-MM-DD)
  }

  // Check for decimal pattern: digits with a single decimal separator
  // Must have digits on both sides of the separator
  return /^-?\d+[.,]\d+$/.test(str)
}

// Parse DMS (Degrees Minutes Seconds) format
function parseDMS(dmsString) {
  if (!dmsString || typeof dmsString !== 'string') return null
  
  // Match patterns like: 12°34'56"N, 12°34'56.7"N, 12° 34' 56" N
  const dmsPattern = /(-?\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*([NSEW])?/i
  const match = dmsString.match(dmsPattern)
  
  if (!match) return null
  
  const degrees = parseInt(match[1])
  const minutes = parseInt(match[2])
  const seconds = parseFloat(match[3])
  const direction = match[4]?.toUpperCase()
  
  let decimal = degrees + minutes / 60 + seconds / 3600
  
  // Apply direction
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal
  }
  
  return decimal
}

// Parse decimal degrees format
function parseDecimal(value) {
  if (value === null || value === undefined || value === '') return null
  
  const str = value.toString().trim()
  
  // 🆕 Handle European decimal comma format (e.g., "-19,5689")
  // Replace comma with dot for parsing
  const normalizedStr = str.replace(',', '.')
  
  // Handle formats like: "12.345N", "12.345 N", "-12.345"
  const decimalPattern = /^(-?\d+(?:[.,]\d+)?)\s*([NSEW])?$/i
  const match = normalizedStr.match(decimalPattern)
  
  if (!match) {
    const num = parseFloat(normalizedStr)
    return isNaN(num) ? null : num
  }
  
  let decimal = parseFloat(match[1])
  const direction = match[2]?.toUpperCase()
  
  if (direction === 'S' || direction === 'W') {
    decimal = -Math.abs(decimal)
  }
  
  return decimal
}

// Parse coordinate from various formats
function parseCoordinate(value) {
  if (!value) return null
  
  const str = value.toString().trim()
  
  // Try DMS format first
  if (str.includes('°') || str.includes("'") || str.includes('"')) {
    const dms = parseDMS(str)
    if (dms !== null) return dms
  }
  
  // Try decimal format
  return parseDecimal(str)
}

// Encode coordinate to DMS format with direction
function encodeAsDMS(decimal, isLatitude = true, decimalFormat = 'dot') {
  if (decimal === null || decimal === undefined || decimal === '') return ''
  
  const absDecimal = Math.abs(decimal)
  const degrees = Math.floor(absDecimal)
  const minutesFloat = (absDecimal - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1)
  
  // Apply decimal format to seconds
  const formattedSeconds = decimalFormat === 'comma' ? seconds.replace('.', ',') : seconds
  
  const direction = isLatitude 
    ? (decimal >= 0 ? 'N' : 'S') 
    : (decimal >= 0 ? 'E' : 'W')
  
  return `${degrees}°${minutes}'${formattedSeconds}"${direction}`
}

// Encode coordinate to decimal format with direction
function encodeAsDecimalWithDirection(decimal, isLatitude = true, decimalFormat = 'dot') {
  if (decimal === null || decimal === undefined || decimal === '') return ''
  
  const absValue = Math.abs(decimal).toFixed(6)
  
  // Apply decimal format
  const formattedValue = decimalFormat === 'comma' ? absValue.replace('.', ',') : absValue
  
  const direction = isLatitude 
    ? (decimal >= 0 ? 'N' : 'S') 
    : (decimal >= 0 ? 'E' : 'W')
  
  return `${formattedValue}${direction}`
}

// Encode coordinate to signed decimal format
function encodeAsSignedDecimal(decimal, decimalFormat = 'dot') {
  if (decimal === null || decimal === undefined || decimal === '') return ''
  
  const value = decimal.toFixed(6)
  
  // Apply decimal format
  return decimalFormat === 'comma' ? value.replace('.', ',') : value
}

// Encode coordinate based on output format
function encodeCoordinate(decimal, format, isLatitude = true, decimalFormat = 'dot') {
  if (decimal === null || decimal === undefined || decimal === '') return ''
  
  switch (format) {
    case 'dms':
      return encodeAsDMS(decimal, isLatitude, decimalFormat)
    case 'decimal-direction':
      return encodeAsDecimalWithDirection(decimal, isLatitude, decimalFormat)
    case 'decimal-signed':
      return encodeAsSignedDecimal(decimal, decimalFormat)
    default:
      return decimal.toString()
  }
}

function convertDecimalToDMS(decimal) {
  if (decimal === null || decimal === undefined || decimal === '') return decimal

  const absDecimal = Math.abs(decimal)
  const degrees = Math.floor(absDecimal)
  const minutesFloat = (absDecimal - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1)

  return `${degrees}°${minutes}'${seconds}"`
}

function formatGeocoordinate(value, isLatitude = true) {
  if (!value || value.toString().trim() === '') return value

  try {
    const decimal = parseFloat(value)
    if (isNaN(decimal)) return value

    const dms = convertDecimalToDMS(decimal)
    const direction = isLatitude ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W')

    return `${dms}${direction}`
  } catch (error) {
    console.warn('Geocoordinate formatting error:', error)
    return value
  }
}

function isLikelyGeocoordinate(value) {
  if (!value || value.toString().trim() === '') return false

  const str = value.toString().trim()

  // Check for DMS format
  if (str.includes('°') || str.includes("'") || str.includes('"')) {
    return parseDMS(str) !== null
  }

  // 🆕 Normalize comma to dot for decimal check
  const normalizedStr = str.replace(',', '.')
  const decimal = parseFloat(normalizedStr)
  if (!isNaN(decimal) && decimal >= -180 && decimal <= 180) {
    return true
  }

  // Check for lat/lon pair separated by space, comma, or tab
  // 🆕 Updated to handle both comma separators and tab/space
  const parts = str.split(/[\s\t]+/).filter(p => p.trim() !== '')
  if (parts.length === 2) {
    const lat = parseFloat(parts[0].replace(',', '.'))
    const lon = parseFloat(parts[1].replace(',', '.'))
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
  }

  return false
}

export function applyFormatting(data, config) {
  const { date, decimalFormat, geocoord } = config.formatting

  // Get date columns as array (support both old single column and new multiple columns)
  const dateColumns = date.columns || (date.column ? [date.column] : [])

  return data.map((row, rowIndex) => {
    const formattedRow = {}
    const metadata = row.__metadata || {}

    Object.keys(row).forEach((key) => {
      if (key === '__metadata') return
      
      let value = row[key]

      const skipColumns = ['sort #', 'CollNb', 'Initials']
      if (skipColumns.includes(key)) {
        formattedRow[key] = value
        return
      }

      const cellMeta = metadata[key] || null

      // Apply date formatting to all selected date columns
      if (date.mode === 'column' && dateColumns.includes(key)) {
        const formatted = formatDate(value, date.format, date.locale)
        value = formatted
      }

      // Apply decimal formatting (but not to date columns)
      if (!(date.mode === 'column' && dateColumns.includes(key)) && isLikelyDecimal(value)) {
        value = formatDecimal(value, decimalFormat)
      }

      // Apply geocoordinate transformation
      if (geocoord.mode !== 'none') {
        if (geocoord.mode === 'single') {
          // Single column with both lat and lon
          if (key === geocoord.singleColumn && isLikelyGeocoordinate(value)) {
            const str = value.toString().trim()
            const parts = str.split(/[\s,]+/)
            
            if (parts.length === 2) {
              // Parse both coordinates
              const lat = parseCoordinate(parts[0])
              const lon = parseCoordinate(parts[1])
              
              if (lat !== null && lon !== null) {
                // Encode based on output format WITH decimal format applied
                const latFormatted = encodeCoordinate(lat, geocoord.outputFormat, true, decimalFormat)
                const lonFormatted = encodeCoordinate(lon, geocoord.outputFormat, false, decimalFormat)
                value = `${latFormatted} ${lonFormatted}`
              }
            }
          }
        } else if (geocoord.mode === 'separate') {
          // Separate latitude column
          if (key === geocoord.latColumn) {
            const parsed = parseCoordinate(value)
            if (parsed !== null) {
              value = encodeCoordinate(parsed, geocoord.outputFormat, true, decimalFormat)
            }
          }
          // Separate longitude column
          else if (key === geocoord.lonColumn) {
            const parsed = parseCoordinate(value)
            if (parsed !== null) {
              value = encodeCoordinate(parsed, geocoord.outputFormat, false, decimalFormat)
            }
          }
        }
      }

      formattedRow[key] = value
    })

    // Attach metadata to the row object (non-enumerable but configurable for Vue reactivity)
    Object.defineProperty(formattedRow, '__metadata', {
      value: metadata,
      enumerable: false,
      writable: false,
      configurable: true
    })
    
    // Preserve __spreadsheetRow if present
    if (row.__spreadsheetRow !== undefined) {
      Object.defineProperty(formattedRow, '__spreadsheetRow', {
        value: row.__spreadsheetRow,
        enumerable: false,
        writable: false,
        configurable: true
      })
    }

    return formattedRow
  })
}