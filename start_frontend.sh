#!/bin/bash
# VaultMind Frontend Startup Script (Linux/Mac)

echo "=========================================="
echo "🚀 VaultMind 2.0 Frontend Starting..."
echo "=========================================="

cd /d/DEmo/frontend

echo "Installing dependencies..."
npm install

echo ""
echo "Starting React dev server on http://localhost:5173..."
npm run dev
