# 🌿 Specimen Labeler

A web application for automatically generating formatted specimen labels from Excel/CSV data using Word document templates.

## Overview

The Specimen Labeler streamlines the process of creating multiple specimen labels by:
- Reading data from Excel spreadsheets (.xlsx, .xls) or CSV files (.csv, .tsv)
- Applying consistent formatting (dates with international locales, decimals, coordinates)
- Handling intelligent duplicate label generation with collation options
- Populating Word document templates with a simple cursor-based placeholder system
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

### 📊 Data Sorting
Sort your data before label generation:
- **Multi-level sorting**: Sort by multiple columns (e.g., Location, then Date)
- **Flexible order**: Ascending or descending for each column
- **Smart comparison**: Handles text, numbers, and dates automatically
- **Empty value handling**: Blank cells sort to the end

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

Create a `.docx` file with simple placeholders that match your spreadsheet columns:

#### Simple Cursor-Based Syntax

The app uses an intuitive cursor-based system — much simpler than traditional mail merge:

1. **Placeholders**: Use your column names in curly braces
   - Example: `{Plant Name}`, `{Location}`, `{Date Collected}`
   - **Important**: Column names must match exactly (case-sensitive!)

2. **Cursor advancement**: Use `{:next}` to move to the next record
   - All placeholders *before* the first `{:next}` refer to record #1
   - All placeholders *after* `{:next}` refer to record #2, and so on
   - Omit `{:next}` between labels to print the same record multiple times (useful for paired labels)

3. **Automatic features**: The app handles these automatically:
   - Page loop wrapping
   - Page breaks between pages
   - Data chunking and pagination

#### Example Templates

**Single label per page:**
```
Plant: {Plant Name}
Location: {Location}
Date: {Date Collected}
```
(No `{:next}` needed — the app generates one page per record)

**Four labels per page (2×2 grid):**
```
┌─────────────────────────┬─────────────────────────┐
│ Plant: {Plant Name}     │ {:next}                 │
│ Location: {Location}    │ Plant: {Plant Name}     │
│ Date: {Date Collected}  │ Location: {Location}    │
│                         │ Date: {Date Collected}  │
├─────────────────────────┼─────────────────────────┤
│ {:next}                 │ {:next}                 │
│ Plant: {Plant Name}     │ Plant: {Plant Name}     │
│ Location: {Location}    │ Location: {Location}    │
│ Date: {Date Collected}  │ Date: {Date Collected}  │
└─────────────────────────┴─────────────────────────┘
```

**Paired labels (same record in two formats):**

Useful when you need a small label for vials AND a detailed label for containers:

```
┌──────────────────┬──────────────────────────────────────┐
│ {Species}        │ Museum Collection                    │
│ {Location}       │ Species: {Species}                   │
│                  │ Location: {Location}                 │
│ (small label)    │ GPS: {Coordinates}                   │
│                  │ Collector: {Collector}               │
│                  │ (detailed label)                     │
├──────────────────┴──────────────────────────────────────┤
│ {:next}                                                 │
├──────────────────┬──────────────────────────────────────┤
│ {Species}        │ Museum Collection                    │
│ {Location}       │ Species: {Species}                   │
│                  │ Location: {Location}                 │
│ (small label)    │ GPS: {Coordinates}                   │
│                  │ Collector: {Collector}               │
│                  │ (detailed label)                     │
└──────────────────┴──────────────────────────────────────┘
```

Notice: No `{:next}` between the small and detailed label — they use the same record. The `{:next}` only appears between record pairs.
