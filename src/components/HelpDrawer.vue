<template>
  <v-navigation-drawer
    v-model="drawerOpen"
    location="right"
    :temporary="true"
    :width="drawerWidth"
    class="help-drawer"
    :permanent="false"
    :rail="false"
    :touchless="true"
  >
    <v-toolbar color="#4338ca" density="compact">
      <v-toolbar-title class="text-white font-weight-bold">
        <v-icon start>mdi-book-open-variant</v-icon>
        Help & Documentation
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="drawerOpen = false" color="white" variant="text">
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </v-toolbar>
    
    <div class="help-content">
      <HowToUseContent ref="contentRef" />
    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import HowToUseContent from './HowToUseContent.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const contentRef = ref(null)

const drawerOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Use the smaller of 900px or 100vw
const drawerWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return Math.min(900, window.innerWidth)
  }
  return 900
})

// Method to open drawer and show template guide
const openWithTemplateGuide = () => {
  drawerOpen.value = true
  // Wait for drawer to open, then show template guide
  setTimeout(() => {
    contentRef.value?.showTemplateGuide()
  }, 100)
}

// Expose method to parent
defineExpose({
  openWithTemplateGuide
})
</script>

<style scoped>
.help-drawer {
  z-index: 2000 !important;
}

.help-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.help-content {
  padding: 16px;
  overflow-y: auto;
  height: calc(100% - 48px);
}
</style>
