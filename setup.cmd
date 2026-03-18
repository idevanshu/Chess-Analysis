@echo off
REM Chess Legends - Windows Setup Script

echo.
echo 🚀 Chess Legends - Setup
echo ========================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found

REM Check MongoDB
where mongosh >nul 2>nul
if %errorlevel% neq 0 (
    where mongo >nul 2>nul
    if %errorlevel% neq 0 (
        echo ⚠️  MongoDB not found.
        echo    Install from: https://www.mongodb.com/try/download/community
        echo    Or use MongoDB Atlas: https://www.mongodb.com/cloud/atlas
    )
)

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

REM Create .env if not exists
if not exist .env (
    echo.
    echo 📝 Creating .env file...
    (
        echo GEMINI_API_KEY=your_gemini_api_key_here
        echo PORT=3001
        echo MONGODB_URI=mongodb://localhost:27017/chess-legends
        echo JWT_SECRET=your_jwt_secret_key_change_in_production_12345
    ) > .env
    echo ✅ .env created. Please update with your API keys!
) else (
    echo ✅ .env already exists
)

echo.
echo ✅ Setup complete!
echo.
echo 🎮 Next steps:
echo 1. Update .env with your Gemini API key
echo 2. Make sure MongoDB is running in another terminal
echo 3. Start the app: npm start
echo.
echo 🌍 Then open: http://localhost:5173
echo.
pause
