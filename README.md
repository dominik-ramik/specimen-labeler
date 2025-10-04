# 🌿 Specimen Labeler

A web application for automatically generating formatted specimen labels from Excel/CSV data using Word document templates.

## Overview

The Specimen Labeler streamlines the process of creating multiple specimen labels by:
- Reading data from Excel spreadsheets (.xlsx, .xls) or CSV files (.csv, .tsv)
- Applying consistent formatting (dates with international locales, decimals, coordinates)
- Handling intelligent duplicate label generation with collation options
- Populating Word document templates with flexible multi-label layouts
- Generating ready-to-print label documents

Perfect for herbaria, museums, research institutions, and anyone needing to generate large batches of formatted labels efficiently.

## Key Features

### 📅 International Date Formatting
Convert dates to various scientific formats with **15+ language support**:
- **Full month names**: January 26, 2025 (English) • Janvier 26, 2025 (French) • Januar 26, 2025 (German)
- **Three-letter months**: Jan 26, 2025 (English) • janv. 26, 2025 (French) • Jan 26, 2025 (German)
- **Roman numerals**: 26-I-2025 (language-independent, perfect for international collections)
- **ISO standard**: 2025-01-26 (unambiguous international format)
- **Uppercase short**: 26 JAN 2025 (English) • 26 JANV 2025 (French)

**Supported locales**: English, Czech, German, Spanish, French, Italian, Polish, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi

### 🌍 Coordinate Transformation
Parse and convert geographic coordinates between formats automatically:
- **Input formats**: DMS (40°42'46.3"N), Decimal+direction (40.712778N), Signed decimal (-74.006000), Coordinate pairs (40.7128 -74.0060)
- **Output formats**: DMS, Decimal with direction, Signed decimal
- **Smart detection**: Automatically recognizes coordinate formats and direction indicators (N/S/E/W)
- **Decimal format support**: Respects your decimal separator preference (dot vs. comma)

### 🔄 Intelligent Duplicate Handling
- **Column-based**: Generate copies based on a spreadsheet column value (e.g., "# of specimens")
- **Fixed count**: Create the same number of copies for all records (e.g., 3 copies of everything)
- **Adjustment**: Add or subtract from column values (+/- modifier)
- **Collation options**:
  - *Collated*: Interleave copies (Label1, Label2, Label3, Label1, Label2, Label3...) — easier for manual sorting
  - *Uncollated*: Group copies together (Label1, Label1, Label1, Label2, Label2, Label2...) — faster for automated processes

### 📋 Flexible Record Selection
- Process all records from your spreadsheet
- Start from a specific row to the end (e.g., skip headers or process from row 10)
- Process a specific row range (e.g., rows 25-100)

### 💾 Browser Storage
- Files stored locally in IndexedDB for quick reuse
- Configuration settings automatically saved in localStorage
- No data leaves your browser — complete privacy

### 📄 Multiple Labels Per Page
- Automatically detects template layout (1, 2, 4, 6, 8+ labels per page)
- Uses numbered placeholders: `{ColumnName#1}`, `{ColumnName#2}`, etc.
- Flexible: Mix simple `{ColumnName}` and numbered formats in same template

## How to Use

### 1. Prepare Your Word Template

Create a `.docx` file with the following structure:

#### Required Components

1. **Page loop tags**: 
   - Opening tag: `{#pages}` at the beginning of your template content
   - Closing tag: `{/pages}` at the end
   - These tags tell the app where to repeat content for multiple pages

2. **Page break**: 
   - Add a page break (Ctrl+Enter in Word) just before the `{/pages}` closing tag
   - This ensures each page prints separately

3. **Placeholders**: 
   - Use your spreadsheet column names inside curly braces
   - **Important**: Column names must match exactly (case-sensitive!)

#### Placeholder Formats

You can use two placeholder formats:

**Simple format**: `{Plant Name}` 
- Automatically treated as position #1
- Perfect for single-label-per-page templates
- Can be mixed with numbered format

**Numbered format**: `{Plant Name#1}`, `{Plant Name#2}`, `{Plant Name#3}`
- Use for multiple labels per page
- Numbers represent different label positions on the same page
- Must be sequential without gaps (don't skip numbers!)
- App automatically detects the maximum number to determine labels per page

#### Example Templates

**Single label per page:**
```
{#pages}
Plant: {Plant Name}
Location: {Location}
Date: {Date Collected}
--- Page Break (Ctrl+Enter) ---
{/pages}
```

**Four labels per page (2×2 grid):**
```
{#pages}
[Label 1]                    [Label 2]
Plant: {Plant Name#1}        Plant: {Plant Name#2}
Location: {Location#1}       Location: {Location#2}
Date: {Date Collected#1}     Date: {Date Collected#2}

[Label 3]                    [Label 4]
Plant: {Plant Name#3}        Plant: {Plant Name#4}
Location: {Location#3}       Location: {Location#4}
Date: {Date Collected#3}     Date: {Date Collected#4}
--- Page Break (Ctrl+Enter) ---
{/pages}
```

### 2. Prepare Your Data File

Organize your specimen data in a spreadsheet:
- **Required**: Column headers in the first row (must match template placeholders exactly!)
- **Format**: Excel (.xlsx, .xls) or CSV (.csv, .tsv)
- **Example columns**: Plant Name, Location, Date Collected, Latitude, Longitude, # Duplicates

**Example spreadsheet structure:**
```
| Plant Name      | Location           | Date Collected | # Duplicates |
|-----------------|--------------------|----------------|--------------|
| Rosa canina     | London, UK         | 2024-01-15     | 3            |
| Quercus robur   | Nottingham, UK     | 2024-01-16     | 2            |
| Acer platanoides| New York, USA      | 2024-01-17     | 1            |
```

### 3. Upload Files

1. **Upload Word template**: Drag and drop your .docx file into the "Template" drop zone
2. **Upload data file**: Drag and drop your .xlsx or .csv file into the "Collection Spreadsheet" drop zone
3. **Select sheet** (Excel only): If using Excel with multiple sheets, choose which sheet contains your data

### 4. Configure Options

#### Data Selection
- **Record Selection**: Choose which rows to process (all, from row X, or rows X-Y)
- **Duplicates**: Set up duplication (none, column-based, or fixed number)
- **Collation**: Choose collated (interleaved) or uncollated (grouped) order

#### Formatting Options
- **Date Format**: Select column, locale, and format style
  - Example: "Date Collected" column → French locale → "26 janvier 2025"
- **Decimal Format**: Choose dot (1.5) or comma (1,5) separator
- **Geocoordinate Transformation**: Parse and convert coordinate formats
  - Example: Input "40.7128 -74.0060" → Output "40°42'46.3"N 74°0'21.6"W"

### 5. Generate Labels

Click the **"Generate Labels"** button:
- The app validates your template structure
- Processes your data with selected formatting
- Generates a Word document with your formatted labels
- Automatically downloads the result

## Technical Details

### Template Engine
- Uses **Docxtemplater** for Word document generation
- Supports loops, conditionals, and complex layouts
- Learn more: [Docxtemplater Documentation](https://docxtemplater.com/docs/tag-types/)

### Data Processing
- Handles Excel serial date numbers automatically
- Supports multiple date input formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, ISO)
- Smart coordinate parsing with format auto-detection
- Validates duplicate counts to prevent excessive output

### Browser Compatibility
- Modern browsers with IndexedDB support required
- Chrome, Firefox, Edge, Safari (latest versions)
- Local storage only — no data sent to servers

### File Size Limits
- Template validation ensures reasonable output sizes
- Warns if generating >10,000 pages or >50MB files
- Automatic validation of duplicate multipliers

## Troubleshooting

### Common Issues

**"Template references missing columns"**
- Ensure placeholder names match Excel column headers exactly (case-sensitive!)
- Check for typos in curly braces: `{Plant Name}` not `{PlantName}`

**"Template has placeholder numbering gap"**
- Placeholders must be sequential: #1, #2, #3 (not #1, #3, #5)
- Fix by renumbering placeholders without gaps

**"Cannot read the file"**
- Close the file in Word/Excel if it's open
- Try refreshing the page and re-uploading files
- Clear browser storage and re-upload

**Sheet selection not appearing**
- Only Excel files require sheet selection
- CSV files are automatically ready after upload

**Dates not formatting correctly**
- Ensure the selected column actually contains dates
- Check that values can be parsed as dates (try ISO format: YYYY-MM-DD)
- If parsing fails, values remain unchanged

## License

© 2025 Dominik M. Ramík

## Credits

Built with:
- Vue 3
- Docxtemplater
- SheetJS (xlsx)
- PapaParse (CSV parsing)
- PizZip
- FileSaver.js
