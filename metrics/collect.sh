#!/bin/bash
# Collect metrics for all three TodoMVC implementations
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
MAM_ROOT="$(dirname "$(dirname "$ROOT")")"

echo "=== TodoMVC Comparison Metrics ==="
echo ""

echo "## LOC (Lines of Code)"
echo ""

echo "### hyoo_todomvc (\$mol)"
echo "Logic (view.ts):  $(wc -l < "$MAM_ROOT/hyoo/todomvc/todomvc.view.ts") lines"
echo "Template (tree):  $(wc -l < "$MAM_ROOT/hyoo/todomvc/todomvc.view.tree") lines"
echo "CSS:              $(wc -l < "$MAM_ROOT/hyoo/todomvc/todomvc.css") lines"
echo "Tests:            $(wc -l < "$MAM_ROOT/hyoo/todomvc/todomvc.test.ts") lines"
echo ""

echo "### Lit"
find "$ROOT/lit/src" -name '*.ts' -exec wc -l {} + 2>/dev/null || echo "(not built)"
echo ""

echo "### Symbiote"
find "$ROOT/symbiote/src" -name '*.js' -exec wc -l {} + 2>/dev/null || echo "(not available)"
echo ""

echo "### Cruzo"
find "$ROOT/cruzo/src" -name '*.ts' -exec wc -l {} + 2>/dev/null || echo "(not available)"
echo ""

echo "## Bundle Sizes"
echo ""

echo "### hyoo_todomvc"
if [ -f "$MAM_ROOT/hyoo/todomvc/-/web.js" ]; then
    RAW=$(wc -c < "$MAM_ROOT/hyoo/todomvc/-/web.js")
    GZIP=$(gzip -c "$MAM_ROOT/hyoo/todomvc/-/web.js" | wc -c)
    echo "Raw:    ${RAW} bytes ($(( RAW / 1024 )) KB)"
    echo "Gzip:   ${GZIP} bytes ($(( GZIP / 1024 )) KB)"
    if command -v brotli &> /dev/null; then
        BROTLI=$(brotli -c "$MAM_ROOT/hyoo/todomvc/-/web.js" | wc -c)
        echo "Brotli: ${BROTLI} bytes ($(( BROTLI / 1024 )) KB)"
    fi
fi
echo ""

echo "### Lit"
if [ -f "$ROOT/lit/dist/index.js" ]; then
    RAW=$(wc -c < "$ROOT/lit/dist/index.js")
    GZIP=$(gzip -c "$ROOT/lit/dist/index.js" | wc -c)
    echo "Raw:    ${RAW} bytes ($(( RAW / 1024 )) KB)"
    echo "Gzip:   ${GZIP} bytes ($(( GZIP / 1024 )) KB)"
    if command -v brotli &> /dev/null; then
        BROTLI=$(brotli -c "$ROOT/lit/dist/index.js" | wc -c)
        echo "Brotli: ${BROTLI} bytes ($(( BROTLI / 1024 )) KB)"
    fi
fi
echo ""

echo "### Cruzo"
if [ -f "$ROOT/cruzo/dist/index.js" ]; then
    RAW=$(wc -c < "$ROOT/cruzo/dist/index.js")
    GZIP=$(gzip -c "$ROOT/cruzo/dist/index.js" | wc -c)
    echo "Raw:    ${RAW} bytes ($(( RAW / 1024 )) KB)"
    echo "Gzip:   ${GZIP} bytes ($(( GZIP / 1024 )) KB)"
    if command -v brotli &> /dev/null; then
        BROTLI=$(brotli -c "$ROOT/cruzo/dist/index.js" | wc -c)
        echo "Brotli: ${BROTLI} bytes ($(( BROTLI / 1024 )) KB)"
    fi
fi
echo ""

echo "### Symbiote (library, no bundler)"
if [ -d "$ROOT/symbiote/node_modules/@symbiotejs/symbiote/core" ]; then
    LIB_RAW=$(find "$ROOT/symbiote/node_modules/@symbiotejs/symbiote/core" -name '*.js' -exec cat {} + | wc -c)
    LIB_GZIP=$(find "$ROOT/symbiote/node_modules/@symbiotejs/symbiote/core" -name '*.js' -exec cat {} + | gzip | wc -c)
    APP_RAW=$(find "$ROOT/symbiote/src" -name '*.js' -exec cat {} + | wc -c)
    APP_GZIP=$(find "$ROOT/symbiote/src" -name '*.js' -exec cat {} + | gzip | wc -c)
    echo "Library raw:  ${LIB_RAW} bytes ($(( LIB_RAW / 1024 )) KB)"
    echo "Library gzip: ${LIB_GZIP} bytes ($(( LIB_GZIP / 1024 )) KB)"
    echo "App raw:      ${APP_RAW} bytes ($(( APP_RAW / 1024 )) KB)"
    echo "App gzip:     ${APP_GZIP} bytes ($(( APP_GZIP / 1024 )) KB)"
fi
