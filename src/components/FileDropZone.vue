<template>
  <div
    class="drop-zone"
    :class="{
      'drag-over': isDragging,
      'has-file': filename,
      'is-saved': isSaved,
      'file-type-template': fileType === 'template',
      'file-type-excel': fileType === 'excel'
    }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      style="display: none"
      @change="handleFileSelect"
    />
    
    <!-- Delete button (only shown when file is present) -->
    <button
      v-if="filename"
      class="delete-btn"
      @click.stop="handleDelete"
      title="Clear file"
      aria-label="Clear file"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    </button>
    
    <div v-if="!filename" class="drop-zone-content">
      <div v-if="heading" class="drop-zone-heading">{{ heading }}</div>
      <div class="drop-zone-text">{{ text }}</div>
      <div class="drop-zone-subtext">{{ subtext }}</div>
    </div>
    
    <div v-else class="file-info">
      <div v-if="heading" class="file-heading">{{ heading }}</div>
      <div class="file-details">
        <div class="file-name">{{ filename }}</div>
        <div class="file-meta">
          <span class="file-size">{{ fileSize }}</span>
          <span v-if="isSaved" class="saved-badge">✓ Saved</span>
        </div>
      </div>
    </div>
    
    <slot name="extra-content"></slot>

    <template v-if="fileType === 'template' && !filename">
      <div class="help-button-container">
        <button
          type="button"
          class="help-button"
          @click.stop="handleTemplateHelp"
        >
          📖 How to prepare a template
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    default: ''
  },
  heading: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: 'Drop file here'
  },
  subtext: {
    type: String,
    default: 'or click to browse'
  },
  accept: {
    type: String,
    default: '*'
  },
  filename: {
    type: String,
    default: ''
  },
  isSaved: {
    type: Boolean,
    default: false
  },
  fileSize: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['file-selected', 'file-cleared', 'show-template-help'])

const fileInput = ref(null)
const isDragging = ref(false)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleDrop = (e) => {
  isDragging.value = false
  const files = e.dataTransfer.files
  if (files.length > 0) {
    emit('file-selected', files[0])
  }
}

const handleFileSelect = (e) => {
  const files = e.target.files
  if (files.length > 0) {
    emit('file-selected', files[0])
  }
}

const handleDelete = (e) => {
  e.preventDefault()
  e.stopPropagation()
  emit('file-cleared')
}

const handleTemplateHelp = (e) => {
  e.preventDefault()
  e.stopPropagation()
  // Prevent file input from being triggered
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  emit('show-template-help')
}
</script>

<style scoped>
.drop-zone {
  border: 3px dashed #c7d2fe;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
  min-height: 150px;
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 24px;
  box-sizing: border-box;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
  position: relative;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #667eea;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.2);
  border-style: solid;
}

.drop-zone.has-file {
  border-style: solid;
}

/* Template file (gradient purple-blue) */
.drop-zone.file-type-template.is-saved {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.drop-zone.file-type-template.is-saved:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.drop-zone.file-type-template.is-saved .drop-zone-heading,
.drop-zone.file-type-template.is-saved .file-heading,
.drop-zone.file-type-template.is-saved .drop-zone-text,
.drop-zone.file-type-template.is-saved .file-name {
  color: white;
}

.drop-zone.file-type-template.is-saved .drop-zone-subtext,
.drop-zone.file-type-template.is-saved .file-size {
  color: rgba(255, 255, 255, 0.9);
}

/* Excel file - now uses same gradient as template */
.drop-zone.file-type-excel.is-saved {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.drop-zone.file-type-excel.is-saved:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.drop-zone.file-type-excel.is-saved .drop-zone-heading,
.drop-zone.file-type-excel.is-saved .file-heading,
.drop-zone.file-type-excel.is-saved .drop-zone-text,
.drop-zone.file-type-excel.is-saved .file-name {
  color: white;
}

.drop-zone.file-type-excel.is-saved .drop-zone-subtext,
.drop-zone.file-type-excel.is-saved .file-size {
  color: rgba(255, 255, 255, 0.9);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.drop-zone-heading {
  font-size: 1.25rem;
  font-weight: 700;
  color: #4338ca;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.drop-zone-text {
  font-size: 0.95rem;
  color: #6366f1;
  font-weight: 500;
  margin-bottom: 4px;
  letter-spacing: 0.3px;
}

.drop-zone-subtext {
  font-size: 0.85rem;
  color: #6366f1;
  margin-bottom: 8px;
  font-weight: 400;
  opacity: 0.8;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.file-heading {
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.file-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.file-name {
  font-size: 0.9rem;
  color: #333;
  font-weight: 600;
  text-align: center;
  word-break: break-word;
  max-width: 90%;
}

.file-meta {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-size {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.saved-badge {
  font-size: 0.75rem;
  color: white;
  background: rgba(255, 255, 255, 0.25);
  padding: 4px 12px;
  border-radius: 14px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.delete-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: #667eea;
}

.delete-btn:hover {
  background: white;
  border-color: #667eea;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.delete-btn svg {
  display: block;
}

/* Delete button styling for saved files (white on gradient) */
.drop-zone.is-saved .delete-btn {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
}

.drop-zone.is-saved .delete-btn:hover {
  background: rgba(255, 255, 255, 0.4);
  border-color: white;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.help-button-container {
  margin-top: 12px;
  text-align: center;
}

.help-button {
  background: linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%);
  border: 2px solid #667eea;
  color: #667eea;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.15);
}

.help-button:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
</style>