@echo off
echo 🌌 Starting Exoplanet Explorer with AI Chatbot...
echo ==========================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Start backend server
echo 🚀 Starting backend server...
cd server

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing backend dependencies...
    call npm install
)

REM Generate Prisma client and setup database
if not exist "prisma\dev.db" (
    echo 🗄️ Setting up database...
    call npm run prisma:generate
    call npm run prisma:migrate
    call npm run seed
)

REM Start backend in background
echo 🔧 Starting backend server on port 3001...
start "Backend Server" cmd /k "npm run dev"

REM Wait for backend to be ready
echo ⏳ Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Go back to frontend directory
cd ..

REM Install frontend dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    call npm install
)

REM Start frontend
echo 🎨 Starting frontend server on port 5173...
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ✅ Exoplanet Explorer is now running!
echo.
echo 🌐 Frontend: http://localhost:5173
echo 🔌 Backend API: http://localhost:3001
echo 🤖 AI Chatbot: Integrated in the frontend
echo.
echo Features available:
echo • 🪐 Interactive 3D planet exploration
echo • 🔍 Advanced planet search and filtering
echo • 📊 Planet comparison tools
echo • 🤖 AI-powered chatbot assistant
echo • 💾 Persistent chat history and favorites
echo • 📈 Data visualization and analytics
echo.
echo Both servers are now running in separate windows.
echo Close the terminal windows to stop the servers.
echo.
pause