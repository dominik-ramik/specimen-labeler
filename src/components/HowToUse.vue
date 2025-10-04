<template>
  <div class="help-sections">
    <!-- How to Use Section -->
    <div class="example-section">
      <div
        class="example-title"
        :class="{ expanded: isHowToExpanded }"
        @click="toggleHowTo"
      >
        <span class="title-text">How to Use This App</span>
        <span class="expand-hint">{{ isHowToExpanded ? 'Click to collapse' : 'Click to expand' }}</span>
      </div>
      <div v-if="isHowToExpanded" class="example-content">
        
        <!-- Introduction -->
        <div class="content-card">
          <h4 class="section-heading">What is this app?</h4>
          <p class="section-text">
            The <strong>Specimen Labeler</strong> is a tool designed to
            automatically generate formatted specimen labels from your Excel
            spreadsheet data using a Word document template. It saves time by
            creating multiple labels with consistent formatting, handling
            duplicates, and applying various data transformations.
          </p>

          <div class="highlight-box advantage-box">
            <h4 class="highlight-title">Why Use This Instead of Mail Merge?</h4>
            <p class="highlight-text">
              Unlike traditional Word mail merge, this app offers powerful features specifically designed for specimen labeling:
            </p>
            <ul class="feature-list">
              <li><strong>Intelligent Duplicate Handling</strong> — Automatically generate multiple copies of each label based on a column value or fixed number, with flexible collation options</li>
              <li><strong>Smart Date Formatting</strong> — Convert dates to scientific formats (Roman numerals, ISO standard, etc.) with international month names support</li>
              <li><strong>Coordinate Transformation</strong> — Parse and convert geographic coordinates between formats (DMS ↔ Decimal) with automatic direction detection</li>
              <li><strong>Browser Storage</strong> — Your files and settings are saved locally for quick reuse</li>
              <li><strong>Flexible Record Selection</strong> — Process all records or select specific row ranges</li>
            </ul>
          </div>

          <h4 class="section-heading">How to use it - Step by step:</h4>
          <ol class="steps-list">
            <li><strong>Prepare your Word template</strong> - Create a .docx file with page loop tags, numbered placeholders, and a page break (see detailed example in the Template & Spreadsheet Structure section below)</li>
            <li><strong>Prepare your Excel spreadsheet or CSV file</strong> - Organize your specimen data in columns with clear headers that match your template placeholders</li>
            <li><strong>Upload the Word template</strong> - Drag and drop (or click to browse) your .docx template file. It will be saved for future use</li>
            <li><strong>Upload the Excel/CSV file</strong> - Drag and drop (or click to browse) your .xlsx or .csv data file. It will also be saved for reuse</li>
            <li><strong>Select the sheet (Excel only)</strong> - If you uploaded an Excel file, choose which sheet contains your data from the dropdown menu. CSV files skip this step</li>
            <li><strong>Configure options</strong> - Set up your preferences (duplicates, date formats, coordinates, etc.). Your settings are automatically saved</li>
            <li><strong>Generate labels</strong> - Click the "Generate Labels" button. The app will process your data and download a new Word document</li>
          </ol>

          <div class="info-box">
            <strong>Tip:</strong> Your template and data file are saved in your browser, so they'll be ready when you return!
          </div>
        </div>

        <!-- Configuration Options -->
        <div class="content-card">
          <h4 class="section-heading">Configuration Options Explained:</h4>

          <div class="option-section">
            <h5 class="option-heading">Data Selection</h5>
            <ul class="option-list">
              <li>
                <strong>Record Selection:</strong> Choose which rows from your data file to process
                <ul class="sub-list">
                  <li><em>All Records</em> - Process every row</li>
                  <li><em>From Row to End</em> - Start from a specific row number</li>
                  <li><em>From Row to Row</em> - Process only a specific range</li>
                </ul>
              </li>
              <li>
                <strong>Duplicates Handling:</strong> Control how many copies of each label to generate
                <ul class="sub-list">
                  <li><em>Get from Column</em> - Use a column value (e.g., "# Duplicates") with optional +/- adjustment</li>
                  <li><em>Fixed Number</em> - Create the same number of copies for all records</li>
                </ul>
              </li>
            </ul>
          </div>

          <div class="option-section">
            <h5 class="option-heading">Formatting Options</h5>
            <ul class="option-list">
              <li>
                <strong>Date Format:</strong> Choose whether and how to format dates
                <ul class="sub-list">
                  <li><em>No date formatting</em> - Leave all dates as-is</li>
                  <li><em>Format date column</em> - Select a specific column to format:
                    <ul class="sub-list">
                      <li><strong>Locale:</strong> Choose language for month names (English, your browser's language, or custom)</li>
                      <li><em>Month name Day, Year</em> - January 26, 2025 (or Janvier 26, 2025 in French)</li>
                      <li><em>Three-letter month Day, Year</em> - Jan 26, 2025 (or janv. 26, 2025 in French)</li>
                      <li><em>Roman numeral month</em> - 26-I-2025 (language-independent)</li>
                      <li><em>Year Month Day</em> - 2025-01-26 (ISO standard)</li>
                      <li><em>Three-letter month</em> - 26 JAN 2025 (or 26 JANV 2025 in French)</li>
                    </ul>
                  </li>
                </ul>
                <div class="note-text">
                  Note: If a value cannot be parsed as a date, it will remain unchanged in the output. Month names adapt automatically to your selected locale.
                </div>
              </li>
              <li><strong>Decimal Format:</strong> Choose decimal separator (Dot: 1.5 or Comma: 1,5)</li>
            </ul>
          </div>

          <div class="option-section">
            <h5 class="option-heading">Geocoordinate Transformation</h5>
            <ul class="option-list">
              <li><strong>No transformation</strong> - Leave coordinates as-is</li>
              <li><strong>Single column</strong> - Convert "12.345 -67.890" format from one column</li>
              <li><strong>Separate columns</strong> - Convert latitude and longitude from two columns</li>
              <li><strong>Output formats available:</strong>
                <ul class="sub-list">
                  <li><em>DMS</em> - Degrees Minutes Seconds (12°34'56.7"N)</li>
                  <li><em>Decimal with Direction</em> - 12.582417N</li>
                  <li><em>Signed Decimal</em> - 12.582417 or -12.582417</li>
                </ul>
              </li>
            </ul>
          </div>

          <div class="option-section">
            <h5 class="option-heading">Supported File Formats</h5>
            <ul class="option-list">
              <li>
                <strong>Data Files:</strong> Excel (.xlsx, .xls) and CSV (.csv, .tsv, .txt)
                <ul class="sub-list">
                  <li><strong>Excel files:</strong> Support multiple sheets - select the one you need after upload</li>
                  <li><strong>CSV files:</strong> Single-sheet format - automatically ready after upload (no sheet selection needed)</li>
                  <li>CSV delimiter detection: Comma, tab, or semicolon (automatic)</li>
                  <li>Google Sheets: Export as .xlsx or .csv</li>
                  <li>Office 365: Export as .xlsx or .csv</li>
                  <li>LibreOffice/OpenOffice: Export as .xlsx or .csv</li>
                </ul>
              </li>
              <li><strong>Template Files:</strong> Microsoft Word (.docx)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Template & Spreadsheet Structure Examples -->
    <div class="example-section" style="margin-top: 20px;">
      <div
        class="example-title"
        :class="{ expanded: isExamplesExpanded }"
        @click="toggleExamples"
      >
        <span class="title-text">Template & Spreadsheet Structure Examples</span>
        <span class="expand-hint">{{ isExamplesExpanded ? 'Click to collapse' : 'Click to expand' }}</span>
      </div>
      <div v-if="isExamplesExpanded" class="example-content">
        
        <!-- Template Construction Guide -->
        <div class="content-card">
          <h4 class="section-heading">How to Construct a Template</h4>
          
          <div class="highlight-box tech-box">
            <h5 class="highlight-subtitle">Template Engine</h5>
            <p class="highlight-text">
              This application uses <strong>Docxtemplater</strong> as the underlying template engine.
              Docxtemplater is a powerful library that allows you to generate Word documents from templates
              using simple placeholder syntax.
            </p>
            <p class="highlight-text">
              <strong>Learn more:</strong> 
              <a 
                href="https://docxtemplater.com/docs/tag-types/" 
                target="_blank" 
                rel="noopener noreferrer"
                class="external-link"
              >
                Docxtemplater Documentation & Demo
              </a>
              — Explore advanced features like conditional statements, loops, images, and more.
            </p>
          </div>

          <h5 class="subsection-heading">Basic Template Structure</h5>
          
          <p class="section-text">Your Word template can contain <strong>one or multiple label layouts on a single page</strong>. Each layout is identified by a unique number using the <code class="inline-code">#N</code> notation.</p>

          <ul class="instruction-list">
            <li>
              <strong>Page loop tags:</strong> Wrap your entire template content with <code class="inline-code">{#pages}</code> at
              the beginning and <code class="inline-code">{/pages}</code> at the end
              <div class="info-note">
                <strong>Note:</strong> These tags tell the app where to repeat the page content for multiple records
              </div>
            </li>
            <li>
              <strong>Page break:</strong> Add a page break (Ctrl+Enter in Word) 
              just before the <code class="inline-code">{/pages}</code> tag to ensure each page prints separately
              <div class="info-note">
                <strong>Tip:</strong> In Word, press Ctrl+Enter to insert a page break, 
                or use Insert → Page Break from the ribbon
              </div>
            </li>
            <li>
              <strong>Placeholders:</strong> Use curly braces with column names:
              <ul class="sub-list">
                <li><strong>Simple format:</strong> <code class="inline-code">{Plant Name}</code> — automatically treated as position #1</li>
                <li><strong>Numbered format:</strong> <code class="inline-code">{Plant Name#1}</code>, <code class="inline-code">{Plant Name#2}</code>, <code class="inline-code">{Plant Name#3}</code> — for multiple labels per page</li>
              </ul>
              <div class="info-note highlight">
                <strong>Important:</strong> Column names must <em>exactly match</em> 
                your spreadsheet column headers (case-sensitive!)
              </div>
            </li>
            <li>
              <strong>Multiple labels per page:</strong> The numbers (#1, #2, #3...) define different label positions:
              <ul class="sub-list">
                <li><strong>#1</strong> = First label position</li>
                <li><strong>#2</strong> = Second label position</li>
                <li><strong>#3</strong> = Third label position, and so on...</li>
              </ul>
              <div class="info-note">
                <strong>Example:</strong> If your template has placeholders #1 through #4, and you have 12 records, 
                the app will generate 3 pages (4 labels per page)
              </div>
            </li>
          </ul>

          <h5 class="subsection-heading">Template Flexibility</h5>
          <ul class="option-list">
            <li><strong>Single label per page:</strong> Use simple placeholders like <code class="inline-code">{Plant Name}</code> (or <code class="inline-code">{Plant Name#1}</code>)</li>
            <li><strong>Multiple labels per page:</strong> Use numbered placeholders <code class="inline-code">{Plant Name#1}</code>, <code class="inline-code">{Plant Name#2}</code>, etc.</li>
            <li><strong>Mixed numbering:</strong> You can mix simple and numbered placeholders — simple ones default to #1</li>
          </ul>

          <h5 class="subsection-heading">Supported File Formats</h5>
          <ul class="option-list">
            <li>
              <strong>Data Files:</strong> Excel (.xlsx, .xls) and CSV (.csv, .tsv, .txt)
              <ul class="sub-list">
                <li><strong>Excel files:</strong> Support multiple sheets - select the one you need after upload</li>
                <li><strong>CSV files:</strong> Single-sheet format - automatically ready after upload (no sheet selection needed)</li>
                <li>CSV delimiter detection: Comma, tab, or semicolon (automatic)</li>
              </ul>
            </li>
            <li><strong>Template Files:</strong> Microsoft Word (.docx)</li>
          </ul>
        </div>

        <!-- Visual Examples -->
        <div class="visual-examples-divider">
          <h3 class="examples-heading">Visual Examples</h3>
          <p class="examples-note">
            The examples below demonstrate the template structure using plant specimen data. 
            <strong>You can use any column names and data types that fit your needs</strong> 
            — the app works with any spreadsheet structure as long as the template placeholders match your column names exactly.
          </p>
        </div>

        <div class="example-grid">
          <!-- Excel Format Example -->
          <div class="grid-item">
            <h4 class="grid-heading">Excel/CSV Data Format</h4>
            <p class="grid-subtext">Example structure (use your own column names):</p>
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
          <div class="grid-item">
            <h4 class="grid-heading">Word Template Format</h4>
            <div class="info-box important-style">
              <strong>Column Name Mapping:</strong> Placeholder names must match your Excel column headers exactly (case-sensitive)!
              <br>Example: Excel column <code class="inline-code">"Plant Name"</code> → Template: <code class="inline-code">{Plant Name#1}</code>
            </div>
            <div class="word-template">
              <div class="template-tag">
                {#pages}
              </div>
              <div class="template-content">
                <div class="label-item">
                  <div><strong>Plant:</strong> <span class="placeholder">{Plant Name#1}</span></div>
                  <div><strong>Location:</strong> <span class="placeholder">{Location#1}</span></div>
                  <div><strong>Date:</strong> <span class="placeholder">{Date Collected#1}</span></div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> <span class="placeholder">{Plant Name#2}</span></div>
                  <div><strong>Location:</strong> <span class="placeholder">{Location#2}</span></div>
                  <div><strong>Date:</strong> <span class="placeholder">{Date Collected#2}</span></div>
                </div>
              </div>
              <div class="template-content" style="margin-top: 10px">
                <div class="label-item">
                  <div><strong>Plant:</strong> <span class="placeholder">{Plant Name#3}</span></div>
                  <div><strong>Location:</strong> <span class="placeholder">{Location#3}</span></div>
                  <div><strong>Date:</strong> <span class="placeholder">{Date Collected#3}</span></div>
                </div>
                <div class="label-item">
                  <div><strong>Plant:</strong> <span class="placeholder">{Plant Name#4}</span></div>
                  <div><strong>Location:</strong> <span class="placeholder">{Location#4}</span></div>
                  <div><strong>Date:</strong> <span class="placeholder">{Date Collected#4}</span></div>
                </div>
              </div>
              <div class="page-break-indicator">
                ⏎ Page Break (Ctrl+Enter)
              </div>
              <div class="template-tag">
                {/pages}
              </div>
            </div>
            <div class="info-box tip-style" style="margin-top: 12px;">
              <strong>Important:</strong> The <code class="inline-code">{#pages}</code> and
              <code class="inline-code">{/pages}</code> tags tell the app where to repeat the page
              content. The page break before <code class="inline-code">{/pages}</code> ensures each 
              page prints separately. Without the page break, all labels will run together!
            </div>
          </div>
        </div>

        <!-- Output Example -->
        <div style="margin-top: 40px">
          <h4 class="section-heading">Expected Output Result</h4>
          <p class="section-text">
            With the example data above (12 total labels from 6 records), the
            generated Word document would contain 3 pages with 4 labels per page:
          </p>

          <div class="example-grid">
            <div class="grid-item">
              <div class="page-title">Page 1 (4 labels)</div>
              <div class="word-template output-preview">
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
                    <div><strong>Location:</strong> Sherwood Forest, Nottinghamshire</div>
                    <div><strong>Date:</strong> 2024-01-16</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid-item">
              <div class="page-title">Page 2 (4 labels)</div>
              <div class="word-template output-preview">
                <div class="template-content">
                  <div class="label-item">
                    <div><strong>Plant:</strong> Quercus robur</div>
                    <div><strong>Location:</strong> Sherwood Forest, Nottinghamshire</div>
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
            <div class="grid-item">
              <div class="page-title">Page 3 (4 labels)</div>
              <div class="word-template output-preview">
                <div class="template-content">
                  <div class="label-item">
                    <div><strong>Plant:</strong> Betula pendula</div>
                    <div><strong>Location:</strong> Järvafältet Nature Reserve, Sweden</div>
                    <div><strong>Date:</strong> 2024-01-19</div>
                  </div>
                  <div class="label-item">
                    <div><strong>Plant:</strong> Pinus sylvestris</div>
                    <div><strong>Location:</strong> Caledonian Forest, Scotland</div>
                    <div><strong>Date:</strong> 2024-01-20</div>
                  </div>
                </div>
                <div class="template-content" style="margin-top: 10px">
                  <div class="label-item">
                    <div><strong>Plant:</strong> Pinus sylvestris</div>
                    <div><strong>Location:</strong> Caledonian Forest, Scotland</div>
                    <div><strong>Date:</strong> 2024-01-20</div>
                  </div>
                  <div class="label-item">
                    <div><strong>Plant:</strong> Pinus sylvestris</div>
                    <div><strong>Location:</strong> Caledonian Forest, Scotland</div>
                    <div><strong>Date:</strong> 2024-01-20</div>
                  </div>
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

const STORAGE_KEY_HOWTO = "specimensLabeler_howToUseExpanded";
const STORAGE_KEY_EXAMPLES = "specimensLabeler_examplesExpanded";

const isHowToExpanded = ref(false);
const isExamplesExpanded = ref(false);

const toggleHowTo = () => {
  isHowToExpanded.value = !isHowToExpanded.value;
};

const toggleExamples = () => {
  isExamplesExpanded.value = !isExamplesExpanded.value;
};

// Expose method to parent
const openExamples = () => {
  isExamplesExpanded.value = true
  // Save the state immediately
  try {
    localStorage.setItem(STORAGE_KEY_EXAMPLES, 'true')
  } catch (error) {
    console.warn("Failed to save Examples state:", error)
  }
}

defineExpose({
  openExamples
})

// Load saved state on mount
onMounted(() => {
  try {
    const savedHowTo = localStorage.getItem(STORAGE_KEY_HOWTO);
    if (savedHowTo !== null) {
      isHowToExpanded.value = savedHowTo === "true";
    }
    
    const savedExamples = localStorage.getItem(STORAGE_KEY_EXAMPLES);
    if (savedExamples !== null) {
      isExamplesExpanded.value = savedExamples === "true";
    }
  } catch (error) {
    console.warn("Failed to load help sections state:", error);
  }
});

// Save state when it changes
watch(isHowToExpanded, (newValue) => {
  try {
    localStorage.setItem(STORAGE_KEY_HOWTO, String(newValue));
  } catch (error) {
    console.warn("Failed to save How to Use state:", error);
  }
});

watch(isExamplesExpanded, (newValue) => {
  try {
    localStorage.setItem(STORAGE_KEY_EXAMPLES, String(newValue));
  } catch (error) {
    console.warn("Failed to save Examples state:", error);
  }
});
</script>

<style scoped>
/* Base styles for collapsible sections */
.help-sections {
  margin: 40px auto 30px;
  max-width: 1800px;
}

.example-section {
  margin: 40px auto 30px;
  max-width: 1800px;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  overflow: hidden;
}

/* Collapsible title styling - RESTORED */
.example-title {
  font-weight: 700;
  font-size: 20px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  transition: all 0.3s ease;
  position: relative;
}

.example-title:hover {
  background: rgba(255, 255, 255, 0.1);
}

.title-text {
  flex: 1;
  font-size: 22px;
  letter-spacing: 0.5px;
}

.expand-hint {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  transition: all 0.2s;
}

.example-title:hover .expand-hint {
  background: rgba(255, 255, 255, 0.3);
}

.example-title::before {
  content: "▶";
  font-size: 14px;
  transition: transform 0.3s;
  color: rgba(255, 255, 255, 0.9);
}

.example-title.expanded::before {
  transform: rotate(90deg);
}

/* Content area */
.example-content {
  margin-top: 0;
  padding: 24px;
  background: white;
  border-top: 3px solid rgba(255, 255, 255, 0.3);
}

/* Unified Content Cards */
.content-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Typography System */
.section-heading {
  color: #667eea;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 16px 0;
  letter-spacing: 0.3px;
}

.subsection-heading {
  color: #667eea;
  font-size: 17px;
  font-weight: 600;
  margin: 24px 0 12px 0;
}

.option-heading {
  color: #667eea;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 10px 0;
}

.section-text {
  line-height: 1.7;
  color: #555;
  margin-bottom: 16px;
}

.note-text {
  margin-top: 8px;
  font-size: 0.9em;
  color: #666;
  font-style: italic;
  padding-left: 8px;
  border-left: 2px solid #e0e0e0;
}

/* Highlight Boxes - Unified System */
.highlight-box {
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  border: 2px solid;
}

.highlight-box.advantage-box,
.highlight-box.tech-box {
  background: linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%);
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.highlight-title {
  margin: 0 0 12px 0;
  color: #667eea;
  font-size: 18px;
  font-weight: 700;
}

.highlight-subtitle {
  margin: 0 0 10px 0;
  color: #667eea;
  font-size: 16px;
  font-weight: 600;
}

.highlight-text {
  line-height: 1.6;
  color: #555;
  font-size: 14px;
  margin-bottom: 8px;
}

.highlight-text:last-child {
  margin-bottom: 0;
}

/* Info Boxes - Unified System */
.info-box {
  margin-top: 10px;
  padding: 10px 14px;
  background: #f8f9fa;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.9em;
  line-height: 1.5;
}

.info-box.tip-style {
  background: #fff3cd;
  border-left-color: #ffc107;
  color: #856404;
}

.info-box.important-style {
  background: #e3f2fd;
  border-left-color: #2196f3;
  color: #1565c0;
}

.info-note {
  margin-top: 10px;
  padding: 10px 14px;
  background: #f0f4ff;
  border-left: 3px solid #667eea;
  border-radius: 4px;
  font-size: 0.9em;
  line-height: 1.5;
  color: #555;
}

.info-note.highlight {
  background: #e8efff;
  border-left-width: 4px;
  font-weight: 500;
}

.info-note strong {
  color: #667eea;
  font-weight: 600;
}

/* Lists - Unified System */
.steps-list {
  margin: 15px 0;
  padding-left: 28px;
  line-height: 1.8;
  counter-reset: step-counter;
  list-style: none;
}

.steps-list > li {
  margin-bottom: 14px;
  color: #555;
  counter-increment: step-counter;
  position: relative;
}

.steps-list > li::before {
  content: counter(step-counter) ".";
  color: #667eea;
  font-weight: 700;
  position: absolute;
  left: -28px;
}

.instruction-list {
  margin: 15px 0;
  padding-left: 20px;
  line-height: 1.8;
}

.instruction-list > li {
  margin-bottom: 14px;
  color: #555;
}

.option-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

.option-list > li {
  margin-bottom: 12px;
  color: #555;
}

.sub-list {
  margin-top: 8px;
  margin-bottom: 8px;
  padding-left: 20px;
  font-size: 0.95em;
  color: #666;
  line-height: 1.6;
}

.sub-list > li {
  margin-bottom: 6px;
}

.feature-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
  color: #555;
}

.feature-list > li {
  margin-bottom: 10px;
}

.feature-list strong {
  color: #667eea;
  font-weight: 600;
}

/* Option Sections */
.option-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.option-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* Code Elements */
.inline-code {
  background: #e8efff;
  color: #667eea;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "Courier New", monospace;
  font-size: 0.9em;
  font-weight: 600;
}

/* Template and Output Preview Styles */
.word-template {
  background: white;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: "Times New Roman", serif;
  font-size: 11px;
}

.word-template.output-preview {
  background: #fafafa;
  border: 2px solid #667eea;
}

.template-tag {
  color: #d32f2f;
  font-size: 11px;
  font-weight: 600;
  background: #ffebee;
  padding: 4px 8px;
  border-radius: 3px;
  margin-bottom: 10px;
  font-family: "Courier New", monospace;
}

.template-tag:last-child {
  margin-bottom: 0;
  margin-top: 10px;
}

.page-break-indicator {
  margin-top: 10px;
  padding: 6px 8px;
  background: #e3f2fd;
  border: 1px dashed #2196f3;
  border-radius: 3px;
  text-align: center;
  font-size: 11px;
  color: #1976d2;
  font-weight: 600;
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
  font-size: 10px;
  line-height: 1.4;
}

.word-template.output-preview .label-item {
  background: white;
  border: 1px solid #ddd;
}

.label-item div {
  margin-bottom: 2px;
}

.label-item div:last-child {
  margin-bottom: 0;
}

.placeholder {
  color: #667eea;
  font-weight: bold;
  background: #e0e7ff;
  padding: 1px 3px;
  border-radius: 2px;
}

.page-title {
  font-weight: 600;
  margin-bottom: 10px;
  color: #667eea;
  font-size: 14px;
}

/* Table and template styles */
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

/* Grid layout */
.example-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .example-grid {
    grid-template-columns: 1fr;
  }

  .template-content {
    flex-direction: column;
  }
}
</style>