# 🌿 Specimen Labeler

A Vue 3 application for automatically generating formatted specimen labels from Excel/CSV data using Word document templates.

## 📋 Overview

The Specimen Labeler streamlines the process of creating multiple specimen labels by:
- Reading data from Excel spreadsheets or CSV files
- Applying consistent formatting (dates, decimals, coordinates)
- Handling duplicate label generation
- Populating Word document templates
- Generating ready-to-print label documents

Perfect for herbaria, museums, research institutions, and anyone needing to generate large batches of formatted labels.

## ⚡ Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎯 How to Use

### 1. Prepare Your Word Template

Create a `.docx` file with:

- **Page loop tags**: Add `{#pages}` at the very beginning and `{/pages}` at the very end
- **Numbered placeholders**: Use format like `{Plant Name#1}`, `{Location#1}`, `{Plant Name#2}`, etc.
- **Multiple labels per page**: Numbers (#1, #2, #3...) represent label positions on each page

**Example template structure:**

```
{#pages}
  {Plant Name#1} - {Location#1}
  {Plant Name#2} - {Location#2}
{/pages}
```

### 2. Load Your Data

- Navigate to the **Data** tab
- Upload your Excel or CSV file
- Map your columns to the corresponding label fields

### 3. Configure Label Settings

- Set your label format options (e.g., label size, margins)
- Choose your output format (e.g., PDF, Word)

### 4. Generate Labels

- Click on the **Generate Labels** button
- Review the generated labels for any errors or adjustments
- Download your labels or print them directly

## 📂 Project Structure

```
src/
├── components/      # Vue components
├── views/           # Views for different pages
├── App.vue          # Main app component
└── main.js          # App entry point
public/
├── templates/       # Word templates
└── uploads/         # Uploaded Excel/CSV files
```

## 🛠️ Development

- **Hot Module Replacement (HMR)** is enabled for rapid development.
- **Linting**: Run `npm run lint` to check code quality.
- **Testing**: Unit tests are located in the `tests/` directory. Run them with `npm run test`.

## 📦 Build

- The build output will be in the `dist/` directory.
- Static assets are versioned and hashed for cache busting.

## 🔧 Configuration

- Configuration files are located in the root directory.
- Modify `vite.config.js` for Vite-specific settings.
- Update `vue.config.js` for Vue CLI options.

## 📚 Resources

- [Vue 3 Documentation](https://v3.vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Word Document Templates](https://docs.microsoft.com/en-us/office/open-xml/)

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
