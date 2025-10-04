const DB_NAME = 'SpecimenLabelerDB'
const DB_VERSION = 1
const STORE_NAME = 'files'

// Initialize IndexedDB
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

// Save file to IndexedDB
export async function saveFileToIndexedDB(key, file) {
  try {
    const db = await openDB()
    const arrayBuffer = await file.arrayBuffer()
    
    const fileData = {
      id: key,
      name: file.name,
      type: file.type,
      size: file.size,
      data: arrayBuffer,
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

// Load file from IndexedDB
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

// Convert stored file data back to File object
export function indexedDBDataToFile(fileData) {
  if (!fileData) return null

  try {
    const blob = new Blob([fileData.data], { type: fileData.type })
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

// Migrate from LocalStorage to IndexedDB
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
    
    // Remove from LocalStorage
    localStorage.removeItem(localStorageKey)
    console.log(`Migration complete: ${key}`)

    return parsed
  } catch (error) {
    console.error(`Failed to migrate ${key} from LocalStorage:`, error)
    return null
  }
}
