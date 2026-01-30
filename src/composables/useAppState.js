import { ref, computed } from 'vue'

const templateFile = ref(null)
const templateBuffer = ref(null) // 🆕 Store template ArrayBuffer for validation
const excelFile = ref(null)
const sheetName = ref(null)
const headers = ref([])
const data = ref([])
const cachedExcelData = ref(null) // 🆕 Cache parsed Excel data

export function useAppState() {
  const setTemplateFile = (file) => {
    templateFile.value = file
  }

  // 🆕 Store template buffer for placeholder extraction
  const setTemplateBuffer = (buffer) => {
    templateBuffer.value = buffer
  }

  const setExcelFile = (file) => {
    excelFile.value = file
    // Clear cached data when new file is uploaded
    cachedExcelData.value = null
  }

  const setSheetName = (name) => {
    sheetName.value = name
    // Clear cached data when sheet changes
    cachedExcelData.value = null
  }

  const setHeaders = (headerList) => {
    headers.value = headerList
  }

  const setData = (dataList) => {
    data.value = dataList
  }

  // 🆕 Cache Excel data after first read
  const setCachedExcelData = (excelData) => {
    cachedExcelData.value = excelData
  }

  // 🆕 Get cached Excel data
  const getCachedExcelData = () => {
    return cachedExcelData.value
  }

  const isReady = computed(() => {
    return templateFile.value && excelFile.value && sheetName.value
  })

  return {
    templateFile,
    templateBuffer, // 🆕
    excelFile,
    sheetName,
    headers,
    data,
    setTemplateFile,
    cachedExcelData,
    setTemplateBuffer, // 🆕
    setExcelFile,
    setSheetName,
    setHeaders,
    setData,
    setCachedExcelData, // 🆕
    getCachedExcelData, // 🆕
    isReady
  }
}
