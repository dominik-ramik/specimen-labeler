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
              <div class="font-weight-bold mb-2">
                Why Use This Instead of Mail Merge?
              </div>
              <ul class="feature-list">
                <li>
                  <strong>Intelligent Duplicate Handling</strong> — Generate
                  multiple copies based on column values
                </li>
                <li>
                  <strong>Smart Date Formatting</strong> — Convert dates to
                  standard formats
                </li>
                <li>
                  <strong>Coordinate Transformation</strong> — Parse and convert
                  geographic coordinates
                </li>
                <li>
                  <strong>Multiple Labels Per Page</strong> — Automatically
                  detects template layout
                </li>
                <li>
                  <strong>Browser Storage</strong> — Files saved locally for
                  quick reuse
                </li>
              </ul>
            </v-alert>

            <h4 class="section-heading">Step by step:</h4>
            <v-timeline density="compact" side="end">
              <v-timeline-item dot-color="primary" size="small">
                <div class="step-content">
                  <strong>1. Prepare your Word template</strong>
                  <p>
                    Create a .docx file with placeholders like
                    <code>{Plant Name}</code> reflecting the column names in
                    your spreadsheet
                  </p>
                </div>
              </v-timeline-item>
              <v-timeline-item dot-color="primary" size="small">
                <div class="step-content">
                  <strong>2. Prepare your spreadsheet</strong>
                  <p>
                    Organize data with column headers matching your placeholders
                  </p>
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

      <v-expansion-panel value="showcase">
        <v-expansion-panel-title class="panel-title">
          <v-icon start color="primary">mdi-star-face</v-icon>
          Try it yourself: Showcase Files
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="content-section">
            <p class="section-text mb-4">
              Ready to test the app? We've prepared a set of showcase files for
              you to experiment with.
              <strong>Download them to your computer</strong>, then upload them
              to the app (at the top of the page) to see the generator in
              action.
            </p>

            <div class="d-flex flex-column gap-2 mb-4">
              <v-btn
                :href="showcaseTemplateUrl"
                download="Botanical_Label_Template.docx"
                color="primary"
                variant="flat"
                prepend-icon="mdi-file-word-outline"
                class="text-none justify-start"
                height="48"
              >
                <div class="d-flex flex-column align-start">
                  <span class="font-weight-bold">Download Word Template</span>
                  <span class="text-caption opacity-80" style="line-height: 1"
                    >Contains placeholders for Species, Location, etc.</span
                  >
                </div>
              </v-btn>

              <v-btn
                :href="showcaseDataUrl"
                download="Collections_Data_Example.xlsx"
                color="success"
                variant="flat"
                prepend-icon="mdi-file-excel-outline"
                class="text-none justify-start"
                height="48"
              >
                <div class="d-flex flex-column align-start">
                  <span class="font-weight-bold"
                    >Download Data Spreadsheet</span
                  >
                  <span class="text-caption opacity-80" style="line-height: 1"
                    >A mock collection dataset</span
                  >
                </div>
              </v-btn>
            </div>
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
              <li>
                <strong>From Row to End</strong> — Start from a specific row
              </li>
              <li>
                <strong>From Row to Row</strong> — Process a specific range
              </li>
            </ul>

            <v-divider class="my-4"></v-divider>

            <h5 class="subsection-heading">Label Copies</h5>
            <ul class="option-list">
              <li>
                <strong>Get from Column</strong> — Use a column value for copy
                count
              </li>
              <li>
                <strong>Fixed Number</strong> — Same copies for all records
              </li>
              <li><strong>Collation</strong> — Choose ordering of copies</li>
            </ul>

            <v-divider class="my-4"></v-divider>

            <h5 class="subsection-heading">Formatting Options</h5>
            <ul class="option-list">
              <li>
                <strong>Date Format</strong> — Multiple formats with 15+ locales
              </li>
              <li>
                <strong>Decimal Format</strong> — Dot (1.5) or comma (1,5)
              </li>
              <li>
                <strong>Geocoordinates</strong> — Transform between DMS and
                decimal
              </li>
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
            <h5 class="subsection-heading">1. The Source Data</h5>
            <p class="section-text mb-2">
              To understand how templates work, let's look at this simplified
              dataset. Notice the <strong>"Copies"</strong> column — we can use
              this to tell the app how many labels to print for each row.
            </p>
            <v-table density="compact" class="border mb-4">
              <thead>
                <tr>
                  <th class="font-weight-bold text-primary">Species</th>
                  <th class="font-weight-bold text-primary">Location</th>
                  <th class="font-weight-bold text-primary">ID_No</th>
                  <th class="font-weight-bold text-primary">Date</th>
                  <th class="font-weight-bold text-secondary">Copies</th>
                </tr>
              </thead>
              <tbody>
                <tr class="bg-blue-lighten-5">
                  <td><strong>Acer rubrum</strong></td>
                  <td>Vermont, USA</td>
                  <td>JD-101</td>
                  <td>2023-09-15</td>
                  <td><strong>2</strong></td>
                </tr>
                <tr>
                  <td>Quercus alba</td>
                  <td>New York, USA</td>
                  <td>JD-102</td>
                  <td>2023-09-16</td>
                  <td>1</td>
                </tr>
                <tr>
                  <td>Pinus strobus</td>
                  <td>Maine, USA</td>
                  <td>JD-103</td>
                  <td>2023-09-17</td>
                  <td>1</td>
                </tr>
                <tr>
                  <td>Betula papyrifera</td>
                  <td>New Hampshire, USA</td>
                  <td>JD-104</td>
                  <td>2023-09-18</td>
                  <td>1</td>
                </tr>
                <tr>
                  <td>Tsuga canadensis</td>
                  <td>Vermont, USA</td>
                  <td>JD-105</td>
                  <td>2023-09-19</td>
                  <td>1</td>
                </tr>
                <tr>
                  <td>Fagus grandifolia</td>
                  <td>Vermont, USA</td>
                  <td>JD-106</td>
                  <td>2023-09-20</td>
                  <td>1</td>
                </tr>
              </tbody>
            </v-table>

            <h5 class="subsection-heading">2. Basic Syntax</h5>
            <ul class="option-list">
              <li>
                <strong>Placeholders:</strong> Use column headers inside curly
                braces, e.g., <code>{Species}</code>.
              </li>
              <li>
                <strong>Next Record:</strong> Use <code>{:next}</code> to
                separate one label from another.
              </li>
            </ul>

            <v-divider class="my-4"></v-divider>

            <h5 class="subsection-heading">
              3. Standard Example: Multiple Labels per Page
            </h5>
            <p class="section-text">
              This example demonstrates a <strong>2x2 table</strong> (4 labels
              per page, each in one cell of the table).
            </p>
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              class="my-3 border-s-4"
            >
              <template v-slot:prepend>
                <v-icon color="info">mdi-information</v-icon>
              </template>
              <div class="text-body-2">
                <strong>Duplicate Handling:</strong> If you select the "Copies"
                column in the <strong>Label copies</strong> settings, the app
                will generate 2 labels for <strong>Acer rubrum</strong> before
                moving to <strong>Quercus alba</strong>. This is often useful
                e.g. when you recorded how many duplicates of each specimen you
                have and want to print sets of labels for each set of duplicated
                specimens. <br /><br />In the
                <strong>Label copies</strong> settings you can use the
                <strong>offset by</strong> option to increase or decrease the
                given number of copies. A use case is when you want to send all
                but one duplicate of your specimens to other institutions and
                print the appropriate (duplicates count minus one for the one
                you keep) number of labels.
              </div>
            </v-alert>

            <div
              class="mt-4 mb-1 text-caption font-weight-bold text-uppercase text-grey-darken-1"
            >
              Word Template Layout (2x2)
            </div>
            <v-card variant="outlined" class="pa-0 overflow-hidden mb-4">
              <div class="d-flex border-b">
                <div class="flex-1 pa-3 border-e">
                  <div class="text-caption text-grey mb-1">Cell 1</div>
                  <div class="font-weight-bold text-primary">{Species}</div>
                  <div class="text-caption mt-1">
                    Loc: {Location}<br />
                    Date: {Date}<br />
                    Ref: <strong>#{ID_No}</strong>
                  </div>
                </div>
                <div class="flex-1 pa-3 bg-grey-lighten-5">
                  <div class="text-caption text-grey mb-1">Cell 2</div>
                  <code
                    class="text-warning font-weight-bold text-caption d-block mb-1"
                    >{:next}</code
                  >
                  <div class="font-weight-bold text-primary">{Species}</div>
                  <div class="text-caption mt-1">
                    Loc: {Location}<br />
                    Date: {Date}<br />
                    Ref: <strong>#{ID_No}</strong>
                  </div>
                </div>
              </div>
              <div class="d-flex">
                <div class="flex-1 pa-3 border-e bg-grey-lighten-5">
                  <div class="text-caption text-grey mb-1">Cell 3</div>
                  <code
                    class="text-warning font-weight-bold text-caption d-block mb-1"
                    >{:next}</code
                  >
                  <div class="font-weight-bold text-primary">{Species}</div>
                  <div class="text-caption mt-1">...</div>
                </div>
                <div class="flex-1 pa-3 bg-grey-lighten-5">
                  <div class="text-caption text-grey mb-1">Cell 4</div>
                  <code
                    class="text-warning font-weight-bold text-caption d-block mb-1"
                    >{:next}</code
                  >
                  <div class="font-weight-bold text-primary">{Species}</div>
                  <div class="text-caption mt-1">...</div>
                </div>
              </div>
            </v-card>

            <div
              class="mt-2 mb-1 text-caption font-weight-bold text-uppercase text-grey-darken-1"
            >
              Result (Sheet 1)
            </div>
            <v-card variant="flat" class="pa-2 border bg-grey-lighten-4 mb-4">
              <div class="d-flex gap-2">
                <v-sheet
                  class="flex-1 pa-2 rounded border border-s-4"
                  style="border-left-color: #2196f3 !important"
                  elevation="1"
                >
                  <div class="font-weight-bold">Acer rubrum</div>
                  <div class="text-caption text-grey-darken-1">
                    Loc: Vermont, USA<br />
                    Date: 2023-09-15<br />
                    Ref: <strong>#JD-101</strong>
                  </div>
                  <div class="mt-1 text-xs text-blue font-weight-bold">
                    Copy 1 of 2
                  </div>
                </v-sheet>

                <v-sheet
                  class="flex-1 pa-2 rounded border border-s-4"
                  style="border-left-color: #2196f3 !important"
                  elevation="1"
                >
                  <div class="font-weight-bold">Acer rubrum</div>
                  <div class="text-caption text-grey-darken-1">
                    Loc: Vermont, USA<br />
                    Date: 2023-09-15<br />
                    Ref: <strong>#JD-101</strong>
                  </div>
                  <div class="mt-1 text-xs text-blue font-weight-bold">
                    Copy 2 of 2
                  </div>
                </v-sheet>
              </div>

              <div class="d-flex gap-2 mt-2">
                <v-sheet class="flex-1 pa-2 rounded border" elevation="1">
                  <div class="font-weight-bold">Quercus alba</div>
                  <div class="text-caption text-grey-darken-1">
                    Loc: New York, USA<br />
                    Date: 2023-09-16<br />
                    Ref: <strong>#JD-102</strong>
                  </div>
                </v-sheet>

                <v-sheet class="flex-1 pa-2 rounded border" elevation="1">
                  <div class="font-weight-bold">Pinus strobus</div>
                  <div class="text-caption text-grey-darken-1">
                    Loc: Maine, USA<br />
                    Date: 2023-09-17<br />
                    Ref: <strong>#JD-103</strong>
                  </div>
                </v-sheet>
              </div>
            </v-card>

            <v-divider class="my-4"></v-divider>

            <h5 class="subsection-heading">4. Advanced example</h5>
            <p class="section-text">
              You may need to print two different labels of different formats
              for the <strong>same specimen</strong> side-by-side.
            </p>
            <p class="section-text mt-2">For example, you might need:</p>
            <ul class="ml-4 mt-1 mb-2">
              <li>
                <strong>Label A (Left):</strong> A tiny label to fit inside a
                vial.
              </li>
              <li>
                <strong>Label B (Right):</strong> A detailed label to stick on
                the outer surface of the vial.
              </li>
            </ul>

            <p class="section-text">
              <strong>How to do it:</strong> Place placeholders for the same
              record in both table cells. Only use the <code>{:next}</code> tag
              when you are ready to move to the <em>next</em> label set.
            </p>

            <div
              class="mt-4 mb-1 text-caption font-weight-bold text-uppercase text-grey-darken-1"
            >
              Step A: Word Template Layout
            </div>
            <v-card variant="outlined" class="pa-3 template-example">
              <div class="d-flex gap-2 align-stretch">
                <div class="flex-1 pa-2 border small-label position-relative">
                  <div class="text-caption text-grey mb-1">
                    Cell 1: Vial Label
                  </div>
                  <code>{Species}<br />#{ID_No}</code>
                </div>

                <div
                  class="flex-1 pa-2 border detailed-label position-relative"
                >
                  <div class="text-caption text-grey mb-1">
                    Cell 2: Container Label
                  </div>
                  <code
                    ><strong>COLLECTION VOUCHER</strong><br />
                    Taxon: {Species}<br />
                    Loc: {Location}<br />
                    Date: {Date}</code
                  >
                </div>
              </div>

              <div class="text-center my-2 position-relative">
                <v-divider
                  class="position-absolute w-100"
                  style="top: 50%"
                ></v-divider>
                <span class="bg-white px-2 position-relative text-caption">
                  <code class="text-warning font-weight-bold">{:next}</code>
                  (System jumps to Row 2)
                </span>
              </div>

              <div class="d-flex gap-2 align-stretch opacity-50">
                <div class="flex-1 pa-2 border small-label">
                  <code>{Species}<br />#{ID_No}</code>
                </div>
                <div class="flex-1 pa-2 border detailed-label">
                  <code><strong>COLLECTION VOUCHER</strong><br />...</code>
                </div>
              </div>
            </v-card>

            <div
              class="mt-4 mb-1 text-caption font-weight-bold text-uppercase text-grey-darken-1"
            >
              Step B: Final Generated Document
            </div>
            <v-card variant="flat" class="pa-3 border bg-grey-lighten-4">
              <div class="d-flex gap-2 mb-3 bg-white pa-2 elevation-1 rounded">
                <div
                  class="flex-1 pa-2 border-e d-flex flex-column justify-center"
                >
                  <div class="font-italic text-body-2">Acer rubrum</div>
                  <div class="font-weight-bold text-caption">#JD-101</div>
                </div>
                <div class="flex-1 pa-2 pl-4">
                  <div class="font-weight-bold text-caption mb-1">
                    COLLECTION VOUCHER
                  </div>
                  <div
                    class="text-caption text-grey-darken-2"
                    style="line-height: 1.3"
                  >
                    Taxon: <span class="text-black">Acer rubrum</span><br />
                    Loc: <span class="text-black">Vermont, USA</span><br />
                    Date: <span class="text-black">15 Sep 2023</span>
                  </div>
                </div>
              </div>

              <div class="d-flex gap-2 bg-white pa-2 elevation-1 rounded">
                <div
                  class="flex-1 pa-2 border-e d-flex flex-column justify-center"
                >
                  <div class="font-italic text-body-2">Quercus alba</div>
                  <div class="font-weight-bold text-caption">#JD-102</div>
                </div>
                <div class="flex-1 pa-2 pl-4">
                  <div class="font-weight-bold text-caption mb-1">
                    COLLECTION VOUCHER
                  </div>
                  <div
                    class="text-caption text-grey-darken-2"
                    style="line-height: 1.3"
                  >
                    Taxon: <span class="text-black">Quercus alba</span><br />
                    Loc: <span class="text-black">New York, USA</span><br />
                    Date: <span class="text-black">16 Sep 2023</span>
                  </div>
                </div>
              </div>
            </v-card>

            <v-alert type="warning" variant="tonal" class="mb-4 mt-4">
              <div class="font-weight-bold">Common Mistakes</div>
              <ul class="mt-2">
                <li>
                  Column names are case-sensitive: <code>{Plant Name}</code> ≠
                  <code>{plant name}</code>
                </li>
                <li>
                  No spaces after opening brace: <code>{genus}</code> not
                  <code>{ genus}</code>
                </li>
              </ul>
            </v-alert>
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

      <v-expansion-panel value="about" readonly="true" v-model="alwaysExpand">
        <v-expansion-panel-title class="panel-title">
          <v-icon start color="primary">mdi-information</v-icon>
          About
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <div class="content-section">
            <p class="section-text">
              <strong>Author:</strong> Dominik M. Ramík<br />
              <strong>Website:</strong>
              <a
                href="https://dominicweb.eu"
                target="_blank"
                class="text-primary text-decoration-none"
              >
                https://dominicweb.eu
              </a>
            </p>
            <p class="section-text mt-2">
              This tool was originally developed for the research program
              <strong>Plants and People of Vanuatu</strong>:
              <a
                href="https://pvnh.net/plants-and-people-of-vanuatu/"
                target="_blank"
                class="text-primary text-decoration-none"
              >
                https://pvnh.net/plants-and-people-of-vanuatu/
              </a>
            </p>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup>
import { ref } from "vue";

import showcaseTemplateUrl from "@/assets/showcase_template.docx";
import showcaseDataUrl from "@/assets/showcase_data.xlsx";

const openPanels = ref(["howto", "about"]);

// Method to programmatically control panels
const showTemplateGuide = () => {
  // Close all panels first, then open only the template panel
  openPanels.value = ["template"];
};

// Expose method to parent
defineExpose({
  showTemplateGuide,
});
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
