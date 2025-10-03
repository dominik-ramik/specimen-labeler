<template>
  <div class="example-section">
    <div
      class="example-title"
      :class="{ expanded: isExpanded }"
      @click="toggleExpanded"
    >
      📋 How to use
    </div>
    <div v-if="isExpanded" class="example-content">
      <!-- Introduction -->
      <div class="intro-section">
        <h4>What is this app?</h4>
        <p>
          The <strong>Specimen Labeler</strong> is a tool designed to
          automatically generate formatted specimen labels from your Excel
          spreadsheet data using a Word document template. It saves time by
          creating multiple labels with consistent formatting, handling
          duplicates, and applying various data transformations.
        </p>

        <h4 style="margin-top: 20px">How to use it - Step by step:</h4>
        <ol class="steps-list">
          <li>
            <strong>Prepare your Word template</strong> - Create a .docx file
            with:
            <ul style="margin-top: 8px; margin-bottom: 8px">
              <li>
                <strong>Page loop tags:</strong> Add <code>{#pages}</code> at
                the very beginning and <code>{/pages}</code> at the very end of
                your document
              </li>
              <li>
                <strong>Placeholders:</strong> Use numbered placeholders like
                <code>{Plant Name#1}</code>, <code>{Location#1}</code>,
                <code>{Plant Name#2}</code>, etc.
              </li>
              <li>
                <strong>The numbers (#1, #2, #3...) represent label positions within a single page if you have multiple pages per sheet:</strong>
                #1 is the first label, #2 is the second label, and so on. The template will be repeated 
                for each page, filling in different data for each repetition. For example, if your template 
                has 4 label positions (#1 through #4), and you have 12 records, the app will generate 3 pages.
              </li>
            </ul>
          </li>
          <li>
            <strong>Prepare your Excel spreadsheet or CSV file</strong> - Organize your
            specimen data in columns with clear headers that match your template
            placeholders.
            <div style="margin-top: 8px; padding: 8px 12px; background: #e3f2fd; border-left: 3px solid #2196f3; border-radius: 4px;">
              <strong>💡 Google Sheets & Office 365 Users:</strong><br>
              <span style="font-size: 0.95em;">
                Export your spreadsheet as <code>.xlsx</code> or <code>.csv</code> format and upload it here. 
                The app automatically detects the file format and processes it correctly.
              </span>
            </div>
          </li>
          <li>
            <strong>Upload the Word template</strong> - Drag and drop (or click
            to browse) your .docx template file. It will be saved for future
            use.
          </li>
          <li>
            <strong>Upload the Excel/CSV file</strong> - Drag and drop (or click to
            browse) your .xlsx or .csv data file. It will also be saved for reuse.
          </li>
          <li>
            <strong>Select the sheet</strong> - Choose which Excel sheet
            contains your data from the dropdown menu.
          </li>
          <li>
            <strong>Configure options</strong> - Set up your preferences
            (details below). Your settings are automatically saved.
          </li>
          <li>
            <strong>Generate labels</strong> - Click the "Generate Labels"
            button (or press Ctrl+Enter). The app will process your data and
            download a new Word document.
          </li>
        </ol>

        <div class="tip-box">
          💡 <strong>Tip:</strong> Your template and Excel file are saved in
          your browser, so they'll be ready when you return!
        </div>
      </div>

      <!-- Configuration Options Explanation -->
      <div class="config-explanation">
        <h4>📋 Configuration Options Explained:</h4>

        <div class="option-group">
          <h5>Data Selection</h5>
          <ul>
            <li>
              <strong>Record Selection:</strong> Choose which rows from your
              Excel sheet to process
              <ul>
                <li><em>All Records</em> - Process every row</li>
                <li>
                  <em>From Row to End</em> - Start from a specific row number
                </li>
                <li>
                  <em>From Row to Row</em> - Process only a specific range
                </li>
              </ul>
            </li>
            <li>
              <strong>Duplicates Handling:</strong> Control how many copies of
              each label to generate
              <ul>
                <li>
                  <em>Get from Column</em> - Use a column value (e.g., "#
                  Duplicates") with optional +/- adjustment
                </li>
                <li>
                  <em>Fixed Number</em> - Create the same number of copies for
                  all records
                </li>
              </ul>
            </li>
          </ul>
        </div>

        <div class="option-group">
          <h5>Formatting Options</h5>
          <ul>
            <li>
              <strong>Date Format:</strong> Choose how dates appear in your
              labels
              <ul>
                <li><em>Roman numeral month</em> - 26-V-2025</li>
                <li><em>Year Month Day</em> - 2025-05-26</li>
                <li><em>Month name Day, Year</em> - May 26, 2025</li>
                <li><em>Three-letter month</em> - 26 MAY 2025</li>
              </ul>
            </li>
            <li>
              <strong>Decimal Format:</strong> Choose decimal separator (Dot:
              1.5 or Comma: 1,5)
            </li>
          </ul>
        </div>

        <div class="option-group">
          <h5>Geocoordinate Transformation</h5>
          <ul>
            <li>
              <strong>No transformation</strong> - Leave coordinates as-is
            </li>
            <li>
              <strong>Single column</strong> - Convert "12.345 -67.890" format
              from one column
            </li>
            <li>
              <strong>Separate columns</strong> - Convert latitude and longitude
              from two columns
            </li>
            <li>
              <strong>Output formats available:</strong>
              <ul>
                <li><em>DMS</em> - Degrees Minutes Seconds (12°34'56.7"N)</li>
                <li><em>Decimal with Direction</em> - 12.582417N</li>
                <li><em>Signed Decimal</em> - 12.582417 or -12.582417</li>
              </ul>
            </li>
          </ul>
        </div>

        <div class="option-group">
          <h5>Supported File Formats</h5>
          <ul>
            <li>
              <strong>Data Files:</strong> Excel (.xlsx, .xls) and CSV (.csv, .tsv)
              <ul>
                <li>Excel files can have multiple sheets</li>
                <li>CSV files are automatically parsed (comma, tab, or semicolon delimited)</li>
                <li>Google Sheets: Export as .xlsx or .csv</li>
                <li>Office 365: Export as .xlsx or .csv</li>
              </ul>
            </li>
            <li>
              <strong>Template Files:</strong> Microsoft Word (.docx)
            </li>
          </ul>
        </div>
      </div>

      <!-- Examples -->
      <h4 style="margin-top: 30px; margin-bottom: 15px">Examples:</h4>

      <div class="example-grid">
        <!-- Excel Format Example -->
        <div>
          <h4>Excel Spreadsheet Format</h4>
          <table class="excel-table">
            <thead>
              <tr>
                <th>Plant Name</th>
                <th>Location</th>
                <th>Date Collected</th>
                <th># Duplicates</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rosa canina</td>
                <td>Kew Gardens, London</td>
                <td>2024-01-15</td>
                <td>3</td>
              </tr>
              <tr>
                <td>Quercus robur</td>
                <td>Sherwood Forest, Nottinghamshire</td>
                <td>2024-01-16</td>
                <td>2</td>
              </tr>
              <tr>
                <td>Acer platanoides</td>
                <td>Central Park, New York</td>
                <td>2024-01-17</td>
                <td>1</td>
              </tr>
              <tr>
                <td>Fagus sylvatica</td>
                <td>Black Forest, Germany</td>
                <td>2024-01-18</td>
                <td>2</td>
              </tr>
              <tr>
                <td>Betula pendula</td>
                <td>Järvafältet Nature Reserve, Sweden</td>
                <td>2024-01-19</td>
                <td>1</td>
              </tr>
              <tr>
                <td>Pinus sylvestris</td>
                <td>Caledonian Forest, Scotland</td>
                <td>2024-01-20</td>
                <td>3</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Word Template Example -->
        <div>
          <h4>Word Template Format</h4>
          <div class="word-template">
            <div
              style="
                margin-bottom: 10px;
                color: #d32f2f;
                font-size: 11px;
                font-weight: 600;
                background: #ffebee;
                padding: 4px 8px;
                border-radius: 3px;
              "
            >
              ⚠️ REQUIRED: {#pages} at start
            </div>
            <div class="template-content">
              <div class="label-item">
                <div>
                  <strong>Plant:</strong>
                  <span class="placeholder">{Plant Name#1}</span>
                </div>
                <div>
                  <strong>Location:</strong>
                  <span class="placeholder">{Location#1}</span>
                </div>
                <div>
                  <strong>Date:</strong>
                  <span class="placeholder">{Date Collected#1}</span>
                </div>
              </div>
              <div class="label-item">
                <div>
                  <strong>Plant:</strong>
                  <span class="placeholder">{Plant Name#2}</span>
                </div>
                <div>
                  <strong>Location:</strong>
                  <span class="placeholder">{Location#2}</span>
                </div>
                <div>
                  <strong>Date:</strong>
                  <span class="placeholder">{Date Collected#2}</span>
                </div>
              </div>
            </div>
            <div class="template-content" style="margin-top: 10px">
              <div class="label-item">
                <div>
                  <strong>Plant:</strong>
                  <span class="placeholder">{Plant Name#3}</span>
                </div>
                <div>
                  <strong>Location:</strong>
                  <span class="placeholder">{Location#3}</span>
                </div>
                <div>
                  <strong>Date:</strong>
                  <span class="placeholder">{Date Collected#3}</span>
                </div>
              </div>
              <div class="label-item">
                <div>
                  <strong>Plant:</strong>
                  <span class="placeholder">{Plant Name#4}</span>
                </div>
                <div>
                  <strong>Location:</strong>
                  <span class="placeholder">{Location#4}</span>
                </div>
                <div>
                  <strong>Date:</strong>
                  <span class="placeholder">{Date Collected#4}</span>
                </div>
              </div>
            </div>
            <div
              style="
                margin-top: 10px;
                color: #d32f2f;
                font-size: 11px;
                font-weight: 600;
                background: #ffebee;
                padding: 4px 8px;
                border-radius: 3px;
              "
            >
              ⚠️ REQUIRED: {/pages} at end
            </div>
          </div>
          <div class="important-note">
            <strong>⚠️ Important:</strong> The <code>{#pages}</code> and
            <code>{/pages}</code> tags tell the app where to repeat the page
            content. Without them, only one page will be generated!
          </div>
        </div>
      </div>

      <!-- Output Example -->
      <div style="margin-top: 25px">
        <h4>Expected Output Result</h4>
        <div style="font-size: 14px; color: #666; margin-bottom: 15px">
          With the example data above (12 total labels from 6 records), the
          generated Word document would contain 3 pages with 4 labels per page:
        </div>

        <div class="example-grid">
          <div>
            <div style="font-weight: 600; margin-bottom: 10px">
              Page 1 (4 labels)
            </div>
            <div class="word-template" style="min-height: auto">
              <div class="template-content">
                <div class="label-item">
                  <div><strong>Plant:</strong> Rosa canina</div>
                  <div><strong>Location:</strong> Kew Gardens, London</div>
                  <div><strong>Date:</strong> 2024-01-15</div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> Rosa canina</div>
                  <div><strong>Location:</strong> Kew Gardens, London</div>
                  <div><strong>Date:</strong> 2024-01-15</div>
                </div>
              </div>
              <div class="template-content" style="margin-top: 10px">
                <div class="label-item">
                  <div><strong>Plant:</strong> Rosa canina</div>
                  <div><strong>Location:</strong> Kew Gardens, London</div>
                  <div><strong>Date:</strong> 2024-01-15</div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> Quercus robur</div>
                  <div>
                    <strong>Location:</strong> Sherwood Forest, Nottinghamshire
                  </div>
                  <div><strong>Date:</strong> 2024-01-16</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style="font-weight: 600; margin-bottom: 10px">
              Page 2 (4 labels)
            </div>
            <div class="word-template" style="min-height: auto">
              <div class="template-content">
                <div class="label-item">
                  <div><strong>Plant:</strong> Quercus robur</div>
                  <div>
                    <strong>Location:</strong> Sherwood Forest, Nottinghamshire
                  </div>
                  <div><strong>Date:</strong> 2024-01-16</div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> Acer platanoides</div>
                  <div><strong>Location:</strong> Central Park, New York</div>
                  <div><strong>Date:</strong> 2024-01-17</div>
                </div>
              </div>
              <div class="template-content" style="margin-top: 10px">
                <div class="label-item">
                  <div><strong>Plant:</strong> Fagus sylvatica</div>
                  <div><strong>Location:</strong> Black Forest, Germany</div>
                  <div><strong>Date:</strong> 2024-01-18</div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> Fagus sylvatica</div>
                  <div><strong>Location:</strong> Black Forest, Germany</div>
                  <div><strong>Date:</strong> 2024-01-18</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="example-grid" style="margin-top: 20px">
          <div>
            <div style="font-weight: 600; margin-bottom: 10px">
              Page 3 (4 labels)
            </div>
            <div class="word-template" style="min-height: auto">
              <div class="template-content">
                <div class="label-item">
                  <div><strong>Plant:</strong> Betula pendula</div>
                  <div>
                    <strong>Location:</strong> Järvafältet Nature Reserve,
                    Sweden
                  </div>
                  <div><strong>Date:</strong> 2024-01-19</div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> Pinus sylvestris</div>
                  <div>
                    <strong>Location:</strong> Caledonian Forest, Scotland
                  </div>
                  <div><strong>Date:</strong> 2024-01-20</div>
                </div>
              </div>
              <div class="template-content" style="margin-top: 10px">
                <div class="label-item">
                  <div><strong>Plant:</strong> Pinus sylvestris</div>
                  <div>
                    <strong>Location:</strong> Caledonian Forest, Scotland
                  </div>
                  <div><strong>Date:</strong> 2024-01-20</div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> Pinus sylvestris</div>
                  <div>
                    <strong>Location:</strong> Caledonian Forest, Scotland
                  </div>
                  <div><strong>Date:</strong> 2024-01-20</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";

const STORAGE_KEY = "specimensLabeler_howToUseExpanded";

const isExpanded = ref(false);

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

// Load saved state on mount
onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      isExpanded.value = saved === "true";
    }
  } catch (error) {
    console.warn("Failed to load How to Use state:", error);
  }
});

// Save state when it changes
watch(isExpanded, (newValue) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(newValue));
  } catch (error) {
    console.warn("Failed to save How to Use state:", error);
  }
});
</script>

<style scoped>
.example-section {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.example-title {
  font-weight: 600;
  color: #2c5530;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
}

.example-title::before {
  content: "▶";
  transition: transform 0.2s;
}

.example-title.expanded::before {
  transform: rotate(90deg);
}

.example-content {
  margin-top: 15px;
}

.example-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.excel-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.excel-table th {
  background: #4472c4;
  color: white;
  padding: 8px;
  text-align: left;
}

.excel-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #eee;
}

.word-template {
  background: white;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: "Times New Roman", serif;
  font-size: 11px;
}

.template-content {
  display: flex;
  gap: 10px;
}

.label-item {
  flex: 1;
  padding: 8px;
  border: 1px dashed #ccc;
  background: #fafafa;
}

.placeholder {
  color: #2c5530;
  font-weight: bold;
  background: #e8f5e8;
  padding: 1px 3px;
  border-radius: 2px;
}

h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
}

.intro-section {
  background: white;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 25px;
  border-left: 4px solid #2c5530;
}

.intro-section p {
  line-height: 1.7;
  color: #555;
  margin-bottom: 0;
}

.steps-list {
  margin: 15px 0;
  padding-left: 25px;
  line-height: 1.8;
}

.steps-list li {
  margin-bottom: 12px;
  color: #555;
}

.steps-list code {
  background: #e8f5e8;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "Courier New", monospace;
  font-size: 0.9em;
  color: #2c5530;
}

.tip-box {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  padding: 12px 15px;
  margin-top: 15px;
  font-size: 14px;
  color: #856404;
}

.config-explanation {
  background: white;
  padding: 20px;
  border-radius: 6px;
  margin: 25px 0;
  border-left: 4px solid #2196f3;
}

.option-group {
  margin-bottom: 20px;
}

.option-group:last-child {
  margin-bottom: 0;
}

.option-group h5 {
  color: #2c5530;
  margin: 0 0 10px 0;
  font-size: 15px;
}

.option-group ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

.option-group ul ul {
  margin-top: 6px;
  margin-bottom: 6px;
  padding-left: 25px;
  font-size: 0.95em;
  color: #666;
}

.option-group li {
  margin-bottom: 10px;
}

.option-group ul ul li {
  margin-bottom: 4px;
}

.important-note {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 13px;
  color: #856404;
  line-height: 1.5;
}

.important-note code {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 5px;
  border-radius: 3px;
  font-family: "Courier New", monospace;
  font-size: 0.9em;
}

@media (max-width: 768px) {
  .example-grid {
    grid-template-columns: 1fr;
  }

  .template-content {
    flex-direction: column;
  }
}
</style>
