#!/bin/bash
# Build script for the LaTeX presentation
# Usage: ./build_presentation.sh

set -e

FILE="presentation"

echo "=== Building presentation ==="
pdflatex -interaction=nonstopmode "$FILE.tex"
pdflatex -interaction=nonstopmode "$FILE.tex"

echo ""
echo "=== Done! Output: ${FILE}.pdf ==="
echo "Open it with: open ${FILE}.pdf"
