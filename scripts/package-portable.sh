#!/bin/bash
set -e

# Change to project root
cd "$(dirname "$0")/.."

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
OUTPUT_DIR="dist-portable"
PACKAGE_NAME="SatisfactoryLayoutTool-${VERSION}-macos"

echo ""
echo "================================================================"
echo "   Satisfactory Layout Tool - Portable Packaging Script (macOS)"
echo "   Version ${VERSION}"
echo "================================================================"
echo ""

echo "Step 1/5: Cleaning previous builds..."
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}/${PACKAGE_NAME}"

echo ""
echo "Step 2/5: Building frontend..."
npm run build

echo ""
echo "Step 3/5: Building Rust backend..."
npm run rust:build

echo ""
echo "Step 4/5: Building launcher..."
cd launcher
npm install
npm run build:macos
cd ..

echo ""
echo "Step 5/5: Assembling package..."

# Copy launcher
cp "launcher/dist/SatisfactoryLayoutTool" "${OUTPUT_DIR}/${PACKAGE_NAME}/"

# Copy Rust server
cp "src-tauri/target/release/standalone-server" "${OUTPUT_DIR}/${PACKAGE_NAME}/"

# Copy frontend dist
cp -R "dist" "${OUTPUT_DIR}/${PACKAGE_NAME}/dist"

# Copy real license, attribution, and changelog files
cp "LICENSE" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
cp "docs/legal/AGPL-3.0.txt" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
cp "docs/legal/ADDITIONAL_TERMS.md" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
cp "NOTICE" "${OUTPUT_DIR}/${PACKAGE_NAME}/"
cp "CHANGELOG.md" "${OUTPUT_DIR}/${PACKAGE_NAME}/" 2>/dev/null || true
cp "docs/INSTALL.md" "${OUTPUT_DIR}/${PACKAGE_NAME}/" 2>/dev/null || true

# Create HOW_TO_USE.txt
cat > "${OUTPUT_DIR}/${PACKAGE_NAME}/HOW_TO_USE.txt" << 'EOL'
Satisfactory Layout Tool (macOS)
================================

1. Double-click 'SatisfactoryLayoutTool'
   (You may need to right-click > Open if Gatekeeper blocks it)
2. Wait for the app to open in your browser
3. Keep the terminal window open while using the app
4. Close the terminal window when done

Troubleshooting:
- If the browser doesn't open, go to: http://127.0.0.1:5173
- Make sure all files stay in the same folder

License: This software is licensed under the GNU AGPL-3.0-or-later
with additional attribution-preservation terms. See LICENSE,
docs/legal/AGPL-3.0.txt, docs/legal/ADDITIONAL_TERMS.md, and NOTICE.
EOL

# Make binaries executable
chmod +x "${OUTPUT_DIR}/${PACKAGE_NAME}/SatisfactoryLayoutTool"
chmod +x "${OUTPUT_DIR}/${PACKAGE_NAME}/standalone-server"

echo ""
echo "================================================================"
echo "   BUILD COMPLETE!"
echo "================================================================"
echo ""
echo "Package created at: ${OUTPUT_DIR}/${PACKAGE_NAME}/"
echo ""
echo "To distribute:"
echo "  1. Zip the folder: ${OUTPUT_DIR}/${PACKAGE_NAME}"
echo "  2. Upload as a release asset on GitHub"
echo ""
