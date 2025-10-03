import { ref, computed } from 'vue'

const templateFile = ref(null)
const excelFile = ref(null)
const sheetName = ref(null)
const headers = ref([])
const data = ref([])

export function useAppState() {
  const setTemplateFile = (file) => {
    templateFile.value = file
  }

  const setExcelFile = (file) => {
    excelFile.value = file
  }

  const setSheetName = (name) => {
    sheetName.value = name
  }

  const setHeaders = (headerList) => {
    headers.value = headerList
  }

  const setData = (dataList) => {
    data.value = dataList
  }

  const isReady = computed(() => {
    return templateFile.value && excelFile.value && sheetName.value
  })

  return {
    templateFile,
    excelFile,
    sheetName,
    headers,
    data,
    setTemplateFile,
    setExcelFile,
    setSheetName,
    setHeaders,
    setData,
    isReady
  }
}
