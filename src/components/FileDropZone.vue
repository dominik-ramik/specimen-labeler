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
    
    <div v-if="!filename" class="drop-zone-content">
      <div class="drop-zone-icon">{{ icon }}</div>
      <div class="drop-zone-text">{{ text }}</div>
      <div class="drop-zone-subtext">{{ subtext }}</div>
    </div>
    
    <div v-else class="file-info">
      <div class="file-icon">{{ icon }}</div>
      <div class="file-details">
        <div class="file-name">{{ filename }}</div>
        <div class="file-meta">
          <span class="file-size">{{ fileSize }}</span>
          <span v-if="isSaved" class="saved-badge">✓ Saved</span>
        </div>
      </div>
    </div>
    
    <slot name="extra-content"></slot>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    default: '📄'
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
    default: 'default' // 'template', 'excel', or 'default'
  }
})

const emit = defineEmits(['file-selected'])

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
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
  min-height: 150px; /* Minimum height */
  height: auto; /* Changed from 100% to auto to allow natural expansion */
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding-top: 20px;
  box-sizing: border-box; /* Ensure padding is included in height calculations */
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #999;
  background: #f0f0f0;
}

.drop-zone.has-file {
  border-style: solid;
}

/* Template file (blue) */
.drop-zone.file-type-template.is-saved {
  border-color: #1976d2;
  background: #e3f2fd;
}

.drop-zone.file-type-template.is-saved:hover {
  border-color: #1565c0;
  background: #d1e9fc;
}

/* Excel file (green) */
.drop-zone.file-type-excel.is-saved {
  border-color: #2e7d32;
  background: #e8f5e8;
}

.drop-zone.file-type-excel.is-saved:hover {
  border-color: #1b5e20;
  background: #d4f0d4;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.drop-zone-icon {
  font-size: 1.5rem;
  margin-bottom: 8px;
  opacity: 0.7;
}

.drop-zone-text {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
  margin-bottom: 4px;
}

.drop-zone-subtext {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 8px;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.file-icon {
  font-size: 1.5rem;
  opacity: 0.7;
}

.file-details {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.file-name {
  font-size: 0.85rem;
  color: #333;
  font-weight: 600;
}

.file-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.file-size {
  font-size: 0.75rem;
  color: #666;
  font-weight: normal;
}

.saved-badge {
  font-size: 0.7rem;
  color: #1976d2;
  background: rgba(25, 118, 210, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  border: 1px solid rgba(25, 118, 210, 0.3);
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}
</style>
