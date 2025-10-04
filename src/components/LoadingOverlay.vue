<template>
  <div v-if="show" class="loading-overlay">
    <div class="loading-content">
      <div class="spinner"></div>
      <div class="loading-message">{{ message }}</div>
      <div v-if="progress > 0" class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div v-if="progress > 0" class="progress-text">{{ progress }}%</div>
    </div>
  </div>
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
  z-index: 1000;
  align-items: center;
  justify-content: center;
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  height: 100%;
  width: 100%;
  left: 0;
  top: 0;
  position: fixed;
}

.loading-content {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  background: white;
  padding: 30px;
  text-align: center;
}

.spinner {
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
  border-radius: 50%;
  border-top: 4px solid #667eea;
  border: 4px solid #f3f3f3;
  height: 40px;
  width: 40px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-message {
  margin-bottom: 10px;
  color: #333;
  font-weight: 500;
}

.progress-bar {
  margin-top: 15px;
  overflow: hidden;
  border-radius: 4px;
  background: #e0e0e0;
  height: 8px;
  width: 250px;
  margin-left: auto;
  margin-right: auto;
}

.progress-fill {
  transition: width 0.3s ease;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  height: 100%;
}

.progress-text {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}
</style>
