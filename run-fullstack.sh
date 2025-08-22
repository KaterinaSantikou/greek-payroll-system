#!/bin/bash

# Full Stack Development - Run both servers
echo "🚀 Starting Full Stack Development Mode..."

# Setup client dependencies if needed
if [ ! -d "client/node_modules/vite" ]; then
  echo "📦 Setting up client dependencies..."
  cd client
  mkdir -p node_modules/.bin
  cp -r ../node_modules/vite ../node_modules/react ../node_modules/react-dom ../node_modules/@types ../node_modules/@vitejs ../node_modules/typescript node_modules/ 2>/dev/null
  cp ../node_modules/.bin/vite node_modules/.bin/ 2>/dev/null
  cd ..
fi

# Start backend in background
echo "🔗 Starting backend (Express on port 3000)..."
NODE_ENV=development tsx server/index.ts &
BACKEND_PID=$!

# Start frontend in background  
echo "⚛️ Starting frontend (Vite on port 5173)..."
cd client && ../node_modules/.bin/vite --host 0.0.0.0 --port 5173 &
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