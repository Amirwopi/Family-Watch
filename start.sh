#!/bin/bash
echo "==================================================="
echo "    🎬 Family Watch Together"
echo "==================================================="

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup: Installing dependencies..."
    npm install
fi

if [ ! -f "server/dist/index.js" ]; then
    echo "[INFO] Building project..."
    npm run build
fi

echo "[OK] Server starting on http://localhost:5000"
npm start

