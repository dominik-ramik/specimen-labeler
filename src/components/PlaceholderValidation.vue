<template>
  <div v-if="hasIssues || isValidating" class="placeholder-validation">
    <!-- Loading state -->
    <v-alert
      v-if="isValidating"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-2"
    >
      <template #prepend>
        <v-progress-circular
          indeterminate
          size="18"
          width="2"
        />
      </template>
      Validating template placeholders...
    </v-alert>

    <!-- Errors -->
    <v-alert
      v-for="(error, index) in validationErrors"
      :key="'error-' + index"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-2"
    >
      <div class="font-weight-medium">{{ error.message }}</div>
      <ul v-if="error.items?.length" class="validation-list mt-1">
        <li v-for="item in error.items" :key="item">
          <code>{{ '{' + item + '}' }}</code>
        </li>
      </ul>
      <div v-if="error.suggestion" class="text-body-2 mt-1 text-medium-emphasis">
        💡 {{ error.suggestion }}
      </div>
    </v-alert>

    <!-- Warnings -->
    <v-alert
      v-for="(warning, index) in validationWarnings"
      :key="'warning-' + index"
      :type="warning.severity === 'info' ? 'info' : 'warning'"
      variant="tonal"
      density="compact"
      class="mb-2"
    >
      <div class="font-weight-medium">{{ warning.message }}</div>
      <div v-if="warning.items?.length" class="validation-items mt-1">
        <code v-for="item in warning.items" :key="item" class="validation-item">
          {{ warning.type === 'unmatched-placeholders' ? '{' + item + '}' : item }}
        </code>
        <span v-if="warning.extraCount" class="text-medium-emphasis">
          ...and {{ warning.extraCount }} more
        </span>
      </div>
      <div v-if="warning.suggestion" class="text-body-2 mt-2 text-medium-emphasis">
        💡 {{ warning.suggestion }}
      </div>
    </v-alert>
  </div>
</template>

<script setup>
import { usePlaceholderValidation } from '@/composables/usePlaceholderValidation'

const {
  validationErrors,
  validationWarnings,
  isValidating,
  hasIssues
} = usePlaceholderValidation()
</script>

<style scoped>
.placeholder-validation {
  margin-bottom: 8px;
}

.placeholder-validation code {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.85em;
  font-family: 'Consolas', 'Monaco', monospace;
}

.validation-list {
  list-style-type: none;
  padding-left: 0;
  margin: 4px 0 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.validation-list li {
  display: inline-flex;
}

.validation-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.validation-item {
  display: inline-block;
}
</style>
