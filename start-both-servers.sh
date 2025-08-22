#!/bin/bash

echo "🚀 Starting PayrollSync dual-server setup..."

# Start backend on port 3000
echo "Starting backend on port 3000..."
NODE_ENV=development PORT=3000 npx tsx server/index.ts &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend on port 5173  
echo "Starting frontend on port 5173..."
cd client
npx vite --config vite.config.dev.js --port 5173 --host 0.0.0.0 &
FRONTEND_PID=$!

echo "✅ Backend PID: $BACKEND_PID"
echo "✅ Frontend PID: $FRONTEND_PID"
echo "🌐 Frontend: http://localhost:5173"
echo "🌐 Backend API: http://localhost:3000/api"

# Wait for processes
wait $BACKEND_PID
wait $FRONTEND_PID