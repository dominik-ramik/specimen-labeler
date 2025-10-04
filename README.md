# 🌿 Specimen Labeler

A web application for automatically generating formatted specimen labels from Excel/CSV data using Word document templates.

## Overview

The Specimen Labeler streamlines the process of creating multiple specimen labels by:
- Reading data from Excel spreadsheets or CSV files
- Applying consistent formatting (dates, decimals, coordinates)
- Handling duplicate label generation
- Populating Word document templates with flexible layouts
- Generating ready-to-print label documents

Perfect for herbaria, museums, research institutions, and anyone needing to generate large batches of formatted labels.

## Features

### Date Formatting
Convert dates to various scientific formats:
- **Month name Day, Year**: January 26, 2025
- **Three-letter month Day, Year**: Jan 26, 2025
- **Roman numeral month**: 26-I-2025
- **Year Month Day (ISO)**: 2025-01-26
- **Three-letter month (uppercase)**: 26 JAN 2025

### Coordinate Transformation
- Parse and convert geographic coordinates between formats
- Input formats: DMS, Decimal with direction, Signed decimal, Coordinate pairs
- Output formats: DMS, Decimal with direction, Signed decimal
- Automatic direction detection (N/S/E/W)

### Duplicate Handling
- Generate multiple copies per record
- Column-based or fixed count
- Collated or uncollated output
- Optional +/- adjustment

### Record Selection
- Process all records
- Start from specific row to end
- Process specific row range

## How to Use

### 1. Prepare Your Word Template

Create a `.docx` file with the following structure:

#### Basic Structure

- **Page loop tags**: Wrap your content with `{#pages}` at the beginning and `{/pages}` at the end
- **Page break**: Add a page break (Ctrl+Enter) just before the `{/pages}` tag
- **Placeholders**: Use column names in curly braces

#### Placeholder Formats

You can use two placeholder formats:

1. **Simple format**: `{Plant Name}` 
   - Automatically treated as position #1
   - Perfect for single-label-per-page templates

2. **Numbered format**: `{Plant Name#1}`, `{Plant Name#2}`, `{Plant Name#3}`
   - Use for multiple labels per page
   - Numbers (#1, #2, #3...) represent different label positions
   - Must be sequential without gaps (e.g., don't skip from #1 to #3)

**Important Notes:**
- Column names must **exactly match** your spreadsheet headers (case-sensitive!)
- You can mix both formats — simple placeholders default to #1
- Example: If your template has placeholders #1 through #4, and you have 12 records, you'll get 3 pages (4 labels per page)

#### Example Templates

**Single label per page:**

```
{#pages}
  {Plant Name} - {Location}
{/pages}
```

**Multiple labels per page:**

```
{#pages}
  {Plant Name#1} - {Location#1}
  {Plant Name#2} - {Location#2}
  {Plant Name#3} - {Location#3}
{/pages}
```

### 2. Load Your Data

- Navigate to the **Data** tab
- Upload your Excel or CSV file
- Map your columns to the corresponding label fields

### 3. Configure Label Settings

- Set your label format options (e.g., label size, margins)
- Choose your output format (e.g., PDF, Word)
- Configure date formats:
  - Month name Day, Year: January 26, 2025
  - Three-letter month Day, Year: Jan 26, 2025
  - Roman numeral month: 26-I-2025
  - Year Month Day: 2025-01-26
  - Three-letter month: 26 JAN 2025

### 4. Generate Labels

- Click on the **Generate Labels** button
- Review the generated labels for any errors or adjustments
- Download your labels or print them directly
