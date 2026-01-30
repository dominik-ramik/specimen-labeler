<template>
  <v-card
    class="drop-zone"
    :class="{
      'drag-over': isDragging,
      'has-file': filename,
      'is-saved': isSaved
    }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
    :elevation="isDragging ? 6 : 2"
    hover
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      style="display: none"
      @change="handleFileSelect"
    />
    
    <v-btn
      v-if="filename"
      icon
      class="delete-btn"
      @click.stop="handleDelete"
      title="Clear file"
      size="small"
      variant="flat"
    >
      <v-icon size="small">mdi-close</v-icon>
    </v-btn>
    
    <v-card-text class="drop-zone-content">
      <template v-if="!filename">
        <div v-if="heading" class="drop-zone-heading">{{ heading }}</div>
        <v-icon size="40" :color="isDragging ? 'white' : 'primary'" class="mb-2">
          mdi-cloud-upload-outline
        </v-icon>
        <div class="drop-zone-text">{{ text }}</div>
        <div class="drop-zone-subtext">{{ subtext }}</div>
        
        <template v-if="fileType === 'template'">
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            class="mt-2"
            @click.stop="handleTemplateHelp"
          >
            <v-icon start size="small">mdi-help-circle-outline</v-icon>
            Template guide
          </v-btn>
        </template>
      </template>
      
      <template v-else>
        <div v-if="heading" class="file-heading">{{ heading }}</div>
        <v-icon size="36" :color="isSaved ? 'white' : 'primary'" class="mb-2">
          {{ fileType === 'template' ? 'mdi-file-word' : 'mdi-file-excel' }}
        </v-icon>
        <div class="file-name">{{ filename }}</div>
        <div class="file-meta">
          <v-chip size="x-small" :color="isSaved ? 'rgba(255,255,255,0.2)' : 'grey-lighten-2'" variant="flat">
            {{ fileSize }}
          </v-chip>
          <v-chip v-if="isSaved" size="x-small" color="rgba(255,255,255,0.2)" variant="flat">
            <v-icon start size="x-small">mdi-check</v-icon>
            Saved
          </v-chip>
        </div>
        
        <template v-if="fileType === 'template'">
          <v-btn
            variant="outlined"
            :color="isSaved ? 'white' : 'primary'"
            size="small"
            class="mt-3"
            @click.stop="handleTemplateHelp"
          >
            <v-icon start size="small">mdi-help-circle-outline</v-icon>
            Template guide
          </v-btn>
        </template>
      </template>
      
      <slot name="extra-content"></slot>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  icon: { type: String, default: '' },
  heading: { type: String, default: '' },
  text: { type: String, default: 'Drop file here' },
  subtext: { type: String, default: 'or click to browse' },
  accept: { type: String, default: '*' },
  filename: { type: String, default: '' },
  isSaved: { type: Boolean, default: false },
  fileSize: { type: String, default: '' },
  fileType: { type: String, default: '' }
})

const emit = defineEmits(['file-selected', 'file-cleared', 'show-template-help'])
const fileInput = ref(null)
const isDragging = ref(false)

// Watch for external clears (e.g., from App.vue) to reset the input
watch(() => props.filename, (newValue) => {
  if (!newValue && fileInput.value) {
    fileInput.value.value = ''
  }
})

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('file-selected', file)
  }
  // We do NOT clear value here, allowing the "change" event to work naturally
  // unless the user selects the exact same file immediately without clearing.
  // But our 'watch' handles the clear state.
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    emit('file-selected', file)
  }
}

const handleDelete = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  emit('file-cleared')
}

const handleTemplateHelp = () => {
  emit('show-template-help')
}
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #e0e0e0;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafbff;
  position: relative;
  min-height: 140px;
}

.drop-zone:hover {
  border-color: #667eea;
  background: #f0f7ff;
}

.drop-zone.drag-over {
  border-color: #764ba2;
  background: #f3e5f5;
  transform: scale(1.02);
}

.drop-zone.has-file {
  border-style: solid;
  border-color: #667eea;
  background: #fff;
}

.drop-zone.is-saved {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

/* Ensure text is readable when saved (gradient background) */
.drop-zone.is-saved .file-heading,
.drop-zone.is-saved .file-name {
  color: white;
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
}

.drop-zone-heading {
  font-weight: 600;
  margin-bottom: 8px;
  color: #555;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.file-heading {
  font-weight: 600;
  margin-bottom: 8px;
  opacity: 0.9;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.drop-zone-text {
  font-weight: 500;
  color: #424242;
}

.drop-zone-subtext {
  font-size: 0.8rem;
  color: #757575;
  margin-top: 4px;
}

.file-name {
  font-weight: 600;
  word-break: break-all;
  max-width: 100%;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.1);
  color: inherit;
  z-index: 2;
}

.delete-btn:hover {
  background: rgba(0,0,0,0.2);
}
</style>