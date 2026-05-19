#!/bin/bash
# VaultMind Backend Startup Script (Linux/Mac)

echo "=========================================="
echo "🚀 VaultMind 2.0 Backend Starting..."
echo "=========================================="

cd /d/DEmo

echo "Installing dependencies..."
pip install -q fastapi uvicorn pandas torch joblib

echo ""
echo "Starting FastAPI on http://127.0.0.1:8000..."
python main.py
