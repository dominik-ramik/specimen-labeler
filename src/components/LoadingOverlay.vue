<template>
  <v-overlay :model-value="show" class="loading-overlay" persistent>
    <div class="loading-wrapper">
      <v-card class="loading-content" elevation="6">
        <v-card-text class="text-center">
          <v-progress-circular
            color="primary"
            indeterminate
            size="64"
          ></v-progress-circular>
          
          <div class="loading-message mt-4">{{ message }}</div>
          
          <v-progress-linear
            v-if="progress > 0"
            :model-value="progress"
            color="primary"
            height="8"
            class="mt-4"
            rounded
          ></v-progress-linear>
          
          <div v-if="progress > 0" class="progress-text mt-2">{{ progress }}%</div>
        </v-card-text>
      </v-card>
    </div>
  </v-overlay>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: 'Processing...'
  },
  progress: {
    type: Number,
    default: 0
  }
})
</script>

<style scoped>
.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.loading-content {
  padding: 30px;
  min-width: 300px;
}

.loading-message {
  color: #333;
  font-weight: 500;
  font-size: 16px;
}

.progress-text {
  font-size: 14px;
  color: #666;
}
</style>
