# 🌿 Specimen Labeler

The **Specimen Labeler** is a web-based tool designed to automatically generate formatted specimen labels from your Excel spreadsheet or CSV data using a Word document template.

This application works entirely in your browser (no data is sent to a server) and unlike standard mail merge tools, offers specialized features for scientific and collection management needs.

## Features

* **Intelligent Duplicate Handling**: Generate multiple copies of a label based on specific column values (e.g., a "Count" column) or a fixed number.
* **Smart Date Formatting**: Automatically detect and convert dates to standard formats (e.g., ISO, Day-Month-Year).
* **Coordinate Transformation**: Parse and convert geographic coordinates between formats (e.g., DMS to Decimal Degrees).
* **Browser Storage**: Files are saved locally in your browser for quick reuse in future sessions.

## How to Use

### 1. Prepare your Word Template
Create a Microsoft Word (`.docx`) file to serve as your label layout. You can place one or many individual labels on a page and even print different types of labels for the same specimen side-by-side.
* Use placeholders wrapped in curly braces that match your spreadsheet column headers.
* **Example**: If your spreadsheet has a column named "Species", use `{Species}` in the Word document where you want that text to appear.
* **Multiple Labels per Page**: If you want multiple labels on a single page, design the page with a table or text boxes. Use the special tag `{:next}` to tell the generator where the next record/label begins.

### 2. Prepare your Spreadsheet
Organize your data in Excel (`.xlsx`), CSV, or TSV format.
* The first row must contain column headers.
* Ensure these headers match the placeholders in your Word template exactly (e.g., "Plant Name" vs "plant_name").

### 3. Upload Files
Drag and drop your prepared Template (`.docx`) and Data file (`.xlsx`/`.csv`) into the application's "Input Files" zone. To save your time, the files will be remembered by your browser (locally stored) for your next visit.

### 4. Configure Options
Use the configuration panels to customize the output:
* **Record Selection**: Choose a specific range of rows to process (e.g., rows 1-10) or process the entire dataset.
* **Label Copies**:
    * *Fixed*: Print X copies of every label.
    * *Column*: Use a value from a specific column (e.g., "Duplicates") to determine how many labels to print for that record. You can even apply an offset (e.g., Column Value - 1).
* **Formatting**: Select your preferred output format for numbers, dates and geocoordinates.

### 5. Generate
Click the **Generate Labels** button. The application will process your data and immediately download a new Word document containing all your generated labels.

## Supported Formats

* **Templates**: Microsoft Word `.docx` (Word 2007+)
* **Data**:
    * Excel `.xlsx`
    * Comma Separated Values `.csv`
    * Tab Separated Values `.tsv`

## About

**Author**: Dominik M. Ramík
**Website**: https://dominicweb.eu

This tool was originally developed for the research program **Plants and People of Vanuatu**: https://pvnh.net/plants-and-people-of-vanuatu/