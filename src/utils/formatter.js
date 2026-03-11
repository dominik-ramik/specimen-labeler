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

function formatDate(dateString, format, locale = 'en-US', cellMetadata = null) {
  if (!dateString || dateString.toString().trim() === '') return dateString

  // Helper function to create dates strictly without JavaScript silently wrapping 
  // out-of-bounds days or months into future years.
  const createStrictDate = (y, m, d) => {
    const tempDate = new Date(y, m, d);
    if (tempDate.getFullYear() === y && tempDate.getMonth() === m && tempDate.getDate() === d) {
      return tempDate;
    }
    return new Date(NaN); // Force an invalid date if wrapping occurred
  };

  try {
    let date

    // Handle Excel serial numbers (dates stored as numbers)
    if (!isNaN(dateString) && dateString > 0) {
      const serialNumber = parseFloat(dateString)

      // When cell metadata is available from an Excel file (format !== null)
      // and explicitly says this is NOT a date cell, don't convert as serial.
      // This prevents plain numbers (e.g. specimen counts) in a mostly-date
      // column from being silently turned into bogus dates.
      const metaSaysNotDate = cellMetadata
        && cellMetadata.isDate === false
        && cellMetadata.format != null

      if (metaSaysNotDate) {
        // Excel tells us this cell is not formatted as a date — return as-is
        return dateString
      }

      // Either metadata confirms date, or no metadata (CSV) — use heuristic
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
      const yearPart = parseInt(parts[2])
      const year = parts[2].length === 2 ? 2000 + yearPart : yearPart

      let primaryMonth, primaryDay, fallbackMonth, fallbackDay;

      // Use locale to determine if it's day-first or month-first
      if (isDayFirstLocale()) {
        // DD/MM/YYYY format (Europe, most of world)
        primaryDay = parseInt(parts[0])
        primaryMonth = parseInt(parts[1]) - 1

        fallbackDay = parseInt(parts[1])
        fallbackMonth = parseInt(parts[0]) - 1
      } else {
        // MM/DD/YYYY format (US)
        primaryMonth = parseInt(parts[0]) - 1
        primaryDay = parseInt(parts[1])

        fallbackMonth = parseInt(parts[1]) - 1
        fallbackDay = parseInt(parts[0])
      }

      // Attempt parsing with strict bounds
      date = createStrictDate(year, primaryMonth, primaryDay)

      // If failed, try the opposite format fallback with strict bounds
      if (isNaN(date.getTime())) {
        date = createStrictDate(year, fallbackMonth, fallbackDay)
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
      console.error('Invalid date:', dateString, `(user locale: ${getUserLocale()})`)
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

  let decimal = Math.abs(degrees) + minutes / 60 + seconds / 3600

  if (degrees < 0 || direction === 'S' || direction === 'W') {
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
    // Only accept if the entire remaining string is a plain number.
    // parseFloat silently truncates at the first non-numeric character
    // (e.g. "1/15/2024" → 1), which would produce wrong coordinates.
    if (/^-?\d+(\.\d+)?$/.test(normalizedStr.trim())) {
      return parseFloat(normalizedStr)
    }
    return null
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

  if (seconds === '60.0') {
    seconds = '0.0'
    minutes += 1
    if (minutes === 60) {
      minutes = 0
      degrees += 1
    }
  }

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
  const parts = str.split(/\s*,\s*|\t+| {2,}/).filter(p => p.trim() !== '')
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
        const formatted = formatDate(value, date.format, date.locale, cellMeta)
        value = formatted
      }

      // Apply decimal formatting (but not to date columns, and not to cells
      // that Excel identifies as dates — those could be serial numbers)
      if (!(date.mode === 'column' && dateColumns.includes(key))
        && !cellMeta?.isDate
        && isLikelyDecimal(value)) {
        value = formatDecimal(value, decimalFormat)
      }

      // Apply geocoordinate transformation
      // Skip cells that Excel identifies as dates — they would be silently
      // truncated by parseFloat (e.g. "1/15/2024" → coordinate 1).
      if (geocoord.mode !== 'none' && !cellMeta?.isDate) {
        if (geocoord.mode === 'single') {
          // Single column with both lat and lon
          if (key === geocoord.singleColumn && isLikelyGeocoordinate(value)) {
            const str = value.toString().trim()
            const parts = str.split(/\s*,\s*|\t+| {2,}/).filter(p => p.trim() !== '')

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