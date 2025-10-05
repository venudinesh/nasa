#!/bin/bash

# Exoplanet Explorer - Backend & Frontend Startup Script

echo "🌌 Starting Exoplanet Explorer with AI Chatbot..."
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Start backend server
echo "🚀 Starting backend server..."
cd server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Generate Prisma client and setup database
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️ Setting up database..."
    npm run prisma:generate
    npm run prisma:migrate
    npm run seed
fi

# Start backend in background
echo "🔧 Starting backend server on port 3001..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 5

# Go back to frontend directory
cd ..

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
echo "🎨 Starting frontend server on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Exoplanet Explorer is now running!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:3001"
echo "🤖 AI Chatbot: Integrated in the frontend"
echo ""
echo "Features available:"
echo "• 🪐 Interactive 3D planet exploration"
echo "• 🔍 Advanced planet search and filtering"
echo "• 📊 Planet comparison tools"
echo "• 🤖 AI-powered chatbot assistant"
echo "• 💾 Persistent chat history and favorites"
echo "• 📈 Data visualization and analytics"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "👋 Goodbye!"
}

# Set up trap to catch Ctrl+C
trap cleanup INT

# Wait for user to stop
wait