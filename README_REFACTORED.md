# Specimen Labeler - Vue 3 Refactored Version

A Vue 3 application for generating specimen labels from Excel data and Word templates.

## 🎉 Refactoring Complete!

This project has been completely refactored from vanilla JavaScript to Vue 3 with the Composition API. All functionality from the old codebase (`specimen-labeler-v-old`) has been ported to modern Vue components and composables.

## ⚙️ Setup Instructions

### 1. Install Dependencies

**IMPORTANT:** Due to PowerShell execution policy restrictions, you need to run this command manually:

```bash
npm install docxtemplater pizzip file-saver xlsx
```

### 2. Run the Development Server

```bash
npm run dev
```

### 3. Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/
│   ├── FileDropZone.vue          # Drag-and-drop file upload component
│   ├── ConfigurationSection.vue  # All configuration options
│   └── HowToUse.vue              # Usage examples and documentation
├── composables/
│   ├── useAppState.js            # Application state management
│   └── useStorage.js             # LocalStorage persistence
├── services/
│   └── labelGenerator.js         # Label generation logic
├── utils/
│   ├── excelHandler.js           # Excel file reading
│   ├── formatter.js              # Data formatting (dates, decimals, geocoords)
│   └── processor.js              # Data processing utilities
├── App.vue                       # Main application component
└── main.js                       # Application entry point
```

## 🚀 Features

### From Old Codebase (All Ported)
- ✅ Drag-and-drop file upload for Word templates (.docx)
- ✅ Drag-and-drop file upload for Excel files (.xlsx)
- ✅ Excel sheet selection with auto-detection
- ✅ Column header detection and auto-mapping
- ✅ Template storage in localStorage
- ✅ Configuration persistence
- ✅ Record selection (all, from-to-end, from-to-row)
- ✅ Duplicate handling (from column or fixed number)
- ✅ Date formatting (Roman, ISO, English, Three-letter)
- ✅ Decimal formatting (dot or comma)
- ✅ Geocoordinate transformation (DMS format)
- ✅ Template validation
- ✅ Automatic page generation
- ✅ Progress tracking with loading overlay
- ✅ Success/error message display
- ✅ Document download with timestamp

### Vue 3 Enhancements
- 🎨 Modern Composition API
- 📦 Modular component architecture
- ⚡ Reactive state management
- 🔄 Auto-saving configuration
- 💾 Persistent template storage
- 🎯 Type-safe composables

## 📖 How to Use

1. **Upload Word Template**: Drop or select a .docx file with placeholders like `{Plant Name#1}`, `{Location#1}`, etc.
2. **Upload Excel File**: Drop or select an .xlsx file with your specimen data
3. **Select Sheet**: Choose the appropriate sheet from your Excel file
4. **Configure Options**: Set record selection, duplicates, date format, etc.
5. **Generate Labels**: Click "Generate Labels" to create your document
6. **Download**: The generated .docx file will be automatically downloaded

## 🔧 Configuration Options

### Record Selection
- **All Records**: Process all rows in the Excel sheet
- **From Row to End**: Start from a specific row
- **From Row to Row**: Process a range of rows

### Duplicates Handling
- **Get from Column**: Use a column value to determine number of duplicates (with +/- adjustment)
- **Fixed Number**: Use a fixed number for all records

### Date Formatting
- Roman numeral month (26-V-2025)
- Year Month Day (2025-05-26)
- Month name Day, Year (May 26, 2025)
- Three-letter month (26 MAY 2025)

### Geocoordinate Transformation
- Convert decimal coordinates to DMS (Degrees Minutes Seconds) format
- Support for single column or separate lat/lon columns

## 🔍 Technical Details

### State Management
Uses Vue 3 Composition API with `ref` and `computed` for reactive state management. State is shared across components using composables.

### Data Processing Pipeline
1. **Excel Reading**: XLSX library reads and parses Excel files
2. **Record Selection**: Filter records based on row selection
3. **Formatting**: Apply date, decimal, and geocoordinate formatting
4. **Duplication**: Create duplicates based on configuration
5. **Page Generation**: Split data into pages based on template structure
6. **Template Rendering**: Use docxtemplater to populate Word template
7. **Document Export**: Generate and download .docx file

### Storage
- Configuration saved to localStorage automatically
- Template stored as base64 in localStorage for persistence
- Auto-restore on page reload

## 🎨 Styling

The application uses a botanical green theme (#2c5530) consistent with the original design:
- Clean, modern UI
- Drag-and-drop zones with visual feedback
- Loading overlays with progress messages
- Success/error message displays
- Responsive design for mobile and desktop

## 📝 Notes

- The old codebase is preserved in `specimen-labeler-v-old/` for reference
- All logic has been ported to Vue 3 without Vuetify (removed unnecessary dependency)
- The application maintains backward compatibility with saved configurations
- Template validation ensures column names match between Excel and Word template

## 👨‍💻 Developer

© 2025 [Dominik M. Ramík](https://dominicweb.eu)

## 📄 License

Private project
