// Application-wide constants

export const VALIDATION_LIMITS = {
  MAX_DUPLICATE_COUNT: 50,
  MAX_DUPLICATE_MULTIPLIER: 100,
  MAX_PAGE_COUNT: 10000,
  MAX_FILE_SIZE_MB: 50
}

export const PROGRESS_UPDATE = {
  FREQUENCY: 10, // Update progress every N items
  CHUNK_SIZE: 5, // Process in chunks of N pages
  YIELD_INTERVAL_MS: 1 // Yield control every N milliseconds
}

export const STORAGE_KEYS = {
  TEMPLATE: 'template',
  EXCEL: 'excel',
  CONFIG: 'configuration'
}

export const DATE_FORMATS = {
  ROMAN: 'roman',
  ISO: 'iso',
  ENGLISH: 'english',
  THREE_LETTER: 'threeletter'
}

export const DECIMAL_FORMATS = {
  DOT: 'dot',
  COMMA: 'comma'
}

export const GEOCOORD_FORMATS = {
  DMS: 'dms',
  DECIMAL_DIRECTION: 'decimal-direction',
  DECIMAL_SIGNED: 'decimal-signed'
}
