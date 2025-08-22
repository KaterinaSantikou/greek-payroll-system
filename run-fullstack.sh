#!/bin/bash

# Full Stack Development - Run both servers
echo "🚀 Starting Full Stack Development Mode..."

# Start backend in background
echo "Starting backend (Express on port 3000)..."
npm run dev &
BACKEND_PID=$!

# Start frontend in background  
echo "Starting frontend (Vite on port 5173)..."
cd client && npm run dev &
FRONTEND_PID=$!

echo "✅ Backend PID: $BACKEND_PID (port 3000)"
echo "✅ Frontend PID: $FRONTEND_PID (port 5173)"
echo ""
echo "🌐 Access your React app at: http://localhost:5173"
echo "🔌 API endpoints available at: http://localhost:3000/api/*"
echo ""

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID