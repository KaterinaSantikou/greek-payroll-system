#!/bin/bash

echo "🚀 Starting Full Stack PayrollSync..."

# Start backend
npm run dev &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) on port 3000"

# Start frontend  
cd client && npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID) on port 5173"

echo ""
echo "🌐 Access your React app at: http://localhost:5173"
echo "🔌 API endpoints at: http://localhost:3000/api/*"
echo ""

# Keep both running
wait