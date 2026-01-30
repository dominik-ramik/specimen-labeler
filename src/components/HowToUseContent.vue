<template>
  <div class="help-sections">
    <!-- How to Use Section -->
    <v-expansion-panels v-model="openPanels" multiple>
      <v-expansion-panel value="howto">
        <v-expansion-panel-title class="panel-title">
          <v-icon start color="primary">mdi-information-outline</v-icon>
          How to Use This App
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <!-- Introduction -->
          <div class="content-section">
            <h4 class="section-heading">What is this app?</h4>
            <p class="section-text">
              The <strong>Specimen Labeler</strong> is a tool designed to
              automatically generate formatted specimen labels from your Excel
              spreadsheet or CSV data using a Word document template.
            </p>

            <v-alert type="info" variant="tonal" class="my-4">
              <div class="font-weight-bold mb-2">Why Use This Instead of Mail Merge?</div>
              <ul class="feature-list">
                <li><strong>Intelligent Duplicate Handling</strong> — Generate multiple copies based on column values</li>
                <li><strong>Smart Date Formatting</strong> — Convert dates to scientific formats (15+ languages)</li>
                <li><strong>Coordinate Transformation</strong> — Parse and convert geographic coordinates</li>
                <li><strong>Multiple Labels Per Page</strong> — Automatically detects template layout</li>
                <li><strong>Browser Storage</strong> — Files saved locally for quick reuse</li>
              </ul>
            </v-alert>

            <h4 class="section-heading">Step by step:</h4>
            <v-timeline density="compact" side="end">
              <v-timeline-item dot-color="primary" size="small">
                <div class="step-content">
                  <strong>1. Prepare your Word template</strong>
                  <p>Create a .docx file with placeholders like <code>{Plant Name}</code></p>
                </div>
              </v-timeline-item>
              <v-timeline-item dot-color="primary" size="small">
                <div class="step-content">
                  <strong>2. Prepare your spreadsheet</strong>
                  <p>Organize data with column headers matching your placeholders</p>
                </div>
              </v-timeline-item>
              <v-timeline-item dot-color="primary" size="small">
                <div class="step-content">
                  <strong>3. Upload files</strong>
                  <p>Drag and drop your template and data file</p>
                </div>
              </v-timeline-item>
              <v-timeline-item dot-color="primary" size="small">
                <div class="step-content">
                  <strong>4. Configure options</strong>
                  <p>Set record selection, duplicates, and formatting</p>
                </div>
              </v-timeline-item>
              <v-timeline-item dot-color="primary" size="small">
                <div class="step-content">
                  <strong>5. Generate!</strong>
                  <p>Click the button and download your labels</p>
                </div>
              </v-timeline-item>
            </v-timeline>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="options">
        <v-expansion-panel-title class="panel-title">
          <v-icon start color="primary">mdi-cog-outline</v-icon>
          Configuration Options Explained
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="content-section">
            <h5 class="subsection-heading">Record Selection</h5>
            <ul class="option-list">
              <li><strong>All Records</strong> — Process every row</li>
              <li><strong>From Row to End</strong> — Start from a specific row</li>
              <li><strong>From Row to Row</strong> — Process a specific range</li>
            </ul>

            <v-divider class="my-4"></v-divider>

            <h5 class="subsection-heading">Label Copies</h5>
            <ul class="option-list">
              <li><strong>Get from Column</strong> — Use a column value for copy count</li>
              <li><strong>Fixed Number</strong> — Same copies for all records</li>
              <li><strong>Collation</strong> — Choose ordering of copies</li>
            </ul>

            <v-divider class="my-4"></v-divider>

            <h5 class="subsection-heading">Formatting Options</h5>
            <ul class="option-list">
              <li><strong>Date Format</strong> — Multiple formats with 15+ locales</li>
              <li><strong>Decimal Format</strong> — Dot (1.5) or comma (1,5)</li>
              <li><strong>Geocoordinates</strong> — Transform between DMS and decimal</li>
            </ul>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="template">
        <v-expansion-panel-title class="panel-title">
          <v-icon start color="primary">mdi-file-document-outline</v-icon>
          Template Construction Guide
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="content-section">
            <v-alert type="warning" variant="tonal" class="mb-4">
              <div class="font-weight-bold">Common Mistakes</div>
              <ul class="mt-2">
                <li>Column names are case-sensitive: <code>{Plant Name}</code> ≠ <code>{plant name}</code></li>
                <li>No spaces after opening brace: <code>{genus}</code> not <code>{ genus}</code></li>
              </ul>
            </v-alert>

            <h5 class="subsection-heading">Basic Syntax</h5>
            <ul class="option-list">
              <li><strong>Placeholders:</strong> <code>{Column Name}</code></li>
              <li><strong>Next record:</strong> <code>{:next}</code></li>
            </ul>

            <h5 class="subsection-heading mt-4">Single Label Per Page</h5>
            <v-card variant="outlined" class="pa-3 template-example">
              <code>
                Plant: {Plant Name}<br>
                Location: {Location}<br>
                Date: {Date Collected}
              </code>
            </v-card>

            <h5 class="subsection-heading mt-4">Four Labels Per Page (2×2)</h5>
            <v-card variant="outlined" class="pa-3 template-example">
              <div class="d-flex gap-2">
                <div class="flex-1 pa-2 border">
                  <code>{Plant Name}<br>{Location}</code>
                </div>
                <div class="flex-1 pa-2 border">
                  <code class="text-warning">{:next}</code><br>
                  <code>{Plant Name}<br>{Location}</code>
                </div>
              </div>
              <div class="d-flex gap-2 mt-2">
                <div class="flex-1 pa-2 border">
                  <code class="text-warning">{:next}</code><br>
                  <code>{Plant Name}<br>{Location}</code>
                </div>
                <div class="flex-1 pa-2 border">
                  <code class="text-warning">{:next}</code><br>
                  <code>{Plant Name}<br>{Location}</code>
                </div>
              </div>
            </v-card>

            <h5 class="subsection-heading mt-4">Paired Labels (Same Record Twice)</h5>
            <p class="section-text">
              Omit <code>{:next}</code> between labels to use the same record for both:
            </p>
            <v-card variant="outlined" class="pa-3 template-example">
              <div class="d-flex gap-2">
                <div class="flex-1 pa-2 border small-label">
                  <small class="text-grey">Small (vial)</small><br>
                  <code>{Species}<br>{Location}</code>
                </div>
                <div class="flex-1 pa-2 border detailed-label">
                  <small class="text-grey">Detailed (container)</small><br>
                  <code>Species: {Species}<br>Location: {Location}<br>Collector: {Collector}</code>
                </div>
              </div>
              <div class="text-center my-2">
                <code class="text-warning">{:next}</code>
              </div>
              <div class="d-flex gap-2">
                <div class="flex-1 pa-2 border small-label">
                  <code>{Species}<br>{Location}</code>
                </div>
                <div class="flex-1 pa-2 border detailed-label">
                  <code>Species: {Species}<br>...</code>
                </div>
              </div>
            </v-card>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="formats">
        <v-expansion-panel-title class="panel-title">
          <v-icon start color="primary">mdi-file-table-outline</v-icon>
          Supported File Formats
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="content-section">
            <h5 class="subsection-heading">Data Files</h5>
            <v-chip-group>
              <v-chip color="success" variant="flat">.xlsx</v-chip>
              <v-chip color="success" variant="flat">.xls</v-chip>
              <v-chip color="success" variant="flat">.csv</v-chip>
              <v-chip color="success" variant="flat">.tsv</v-chip>
            </v-chip-group>
            <p class="section-text mt-2">
              Compatible with Google Sheets, Office 365, LibreOffice, OpenOffice
            </p>

            <h5 class="subsection-heading mt-4">Template Files</h5>
            <v-chip-group>
              <v-chip color="primary" variant="flat">.docx</v-chip>
            </v-chip-group>
            <p class="section-text mt-2">
              Microsoft Word 2007+ format (not .doc)
            </p>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const openPanels = ref(['howto'])

// Method to programmatically control panels
const showTemplateGuide = () => {
  // Close all panels first, then open only the template panel
  openPanels.value = ['template']
}

// Expose method to parent
defineExpose({
  showTemplateGuide
})
</script>

<style scoped>
.help-sections {
  max-width: 100%;
}

.panel-title {
  font-weight: 600;
}

.content-section {
  padding: 8px 0;
}

.section-heading {
  color: #4338ca;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.subsection-heading {
  color: #4338ca;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-text {
  color: #555;
  line-height: 1.6;
  font-size: 14px;
}

.feature-list,
.option-list {
  padding-left: 20px;
  margin: 0;
}

.feature-list li,
.option-list li {
  margin-bottom: 6px;
  color: #555;
  font-size: 14px;
}

.step-content {
  padding: 4px 0;
}

.step-content p {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #666;
}

.template-example {
  background: #f8f9fa;
  font-size: 12px;
}

.template-example code {
  color: #4338ca;
}

.template-example .text-warning {
  color: #e65100 !important;
}

.border {
  border: 1px dashed #ccc !important;
  border-radius: 4px;
}

.small-label {
  background: #fff8e1;
}

.detailed-label {
  background: #e8f5e9;
}

.flex-1 {
  flex: 1;
}

.gap-2 {
  gap: 8px;
}
</style>
