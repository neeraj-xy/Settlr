#!/bin/bash

# 1. Rename the problematic directory
if [ -d "dist/assets/node_modules" ]; then
  echo "Renaming dist/assets/node_modules to dist/assets/vendor_assets..."
  mv dist/assets/node_modules dist/assets/vendor_assets
else
  echo "Directory dist/assets/node_modules not found. Skipping rename."
fi

# 2. Patch all references in JS and HTML files
echo "Patching references in dist..."
# Using LC_ALL=C for sed compatibility on MacOS
find dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.map" -o -name "*.json" \) -exec sed -i '' 's/assets\/node_modules/assets\/vendor_assets/g' {} +

echo "Done! Assets migrated and references patched."
