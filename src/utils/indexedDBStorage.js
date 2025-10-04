const DB_NAME = 'SpecimenLabelerDB'
const DB_VERSION = 2 // Increment version for schema change
const STORE_NAME = 'files'

// Initialize IndexedDB with improved schema
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

// Save file to IndexedDB - stores ArrayBuffer directly
export async function saveFileToIndexedDB(key, file) {
  try {
    const db = await openDB()
    const arrayBuffer = await file.arrayBuffer()
    
    const fileData = {
      id: key,
      name: file.name,
      type: file.type,
      size: file.size,
      arrayBuffer: arrayBuffer, // Store ArrayBuffer directly
      savedAt: new Date().toISOString()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(fileData)

      request.onsuccess = () => {
        console.log(`File saved to IndexedDB: ${key} (${file.name}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`)
        resolve(fileData)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to save file to IndexedDB:', error)
    throw error
  }
}

// Load file from IndexedDB - returns stored data with ArrayBuffer
export async function loadFileFromIndexedDB(key) {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const result = request.result
        if (result) {
          console.log(`File loaded from IndexedDB: ${key} (${result.name}, ${(result.size / 1024 / 1024).toFixed(2)} MB)`)
        }
        resolve(result)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to load file from IndexedDB:', error)
    return null
  }
}

// Get ArrayBuffer directly from stored data
export function getArrayBuffer(fileData) {
  if (!fileData) return null
  
  try {
    // New format: arrayBuffer is stored directly
    if (fileData.arrayBuffer) {
      return fileData.arrayBuffer
    }
    
    // Legacy format: data field (for backward compatibility during migration)
    if (fileData.data) {
      return fileData.data
    }
    
    return null
  } catch (error) {
    console.error('Failed to get ArrayBuffer:', error)
    return null
  }
}

// Convert stored file data to File object (for file inputs)
export function indexedDBDataToFile(fileData) {
  if (!fileData) return null

  try {
    const arrayBuffer = getArrayBuffer(fileData)
    if (!arrayBuffer) return null
    
    const blob = new Blob([arrayBuffer], { type: fileData.type })
    return new File([blob], fileData.name, { type: fileData.type })
  } catch (error) {
    console.error('Failed to convert IndexedDB data to File:', error)
    return null
  }
}

// Delete file from IndexedDB
export async function deleteFileFromIndexedDB(key) {
  try {
    const db = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => {
        console.log(`File deleted from IndexedDB: ${key}`)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to delete file from IndexedDB:', error)
  }
}

// Migrate from LocalStorage to IndexedDB and CLEANUP old data
export async function migrateFromLocalStorage(key) {
  try {
    const localStorageKey = key === 'template' ? 'specimensLabeler_template' : 'excelFile'
    const stored = localStorage.getItem(localStorageKey)
    
    if (!stored) return null

    const parsed = JSON.parse(stored)
    console.log(`Migrating ${key} from LocalStorage to IndexedDB...`)

    // Convert base64 back to binary
    const binaryString = atob(parsed.data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Create File object
    const file = new File([bytes], parsed.name, { type: parsed.type })
    
    // Save to IndexedDB
    await saveFileToIndexedDB(key, file)
    
    // 🔥 CLEANUP: Remove from LocalStorage after successful migration
    localStorage.removeItem(localStorageKey)
    console.log(`✅ Migration complete and LocalStorage cleaned up: ${key}`)

    return parsed
  } catch (error) {
    console.error(`Failed to migrate ${key} from LocalStorage:`, error)
    return null
  }
}

// Cleanup all legacy LocalStorage data (call this once on app init)
export function cleanupLegacyStorage() {
  const legacyKeys = [
    'specimensLabeler_template',
    'excelFile',
    'specimensLabeler_start-row',
    'specimensLabeler_end-row',
    'specimensLabeler_duplicates-column',
    'specimensLabeler_add-subtract',
    'specimensLabeler_fixed-duplicates',
    'specimensLabeler_date-format',
    'specimensLabeler_geocoord-single-column',
    'specimensLabeler_geocoord-lat-column',
    'specimensLabeler_geocoord-lon-column',
    'specimensLabeler_record-selection',
    'specimensLabeler_duplicates-mode',
    'specimensLabeler_decimal-format',
    'specimensLabeler_geocoord-mode'
  ]
  
  let cleaned = 0
  legacyKeys.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      cleaned++
    }
  })
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} legacy storage keys`)
  }
}