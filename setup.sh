#!/bin/bash
# Chess Legends - Setup Script

echo "🚀 Chess Legends - Setup"
echo "========================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js $(node --version) found"

# Check MongoDB
if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
    echo "⚠️  MongoDB not found."
    echo "   Install from: https://www.mongodb.com/try/download/community"
    echo "   Or use MongoDB Atlas: https://www.mongodb.com/cloud/atlas"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env if not exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chess-legends
JWT_SECRET=your_jwt_secret_key_change_in_production_12345
EOF
    echo "✅ .env created. Please update with your API keys!"
else
    echo "✅ .env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎮 Next steps:"
echo "1. Update .env with your Gemini API key"
echo "2. Make sure MongoDB is running: mongosh"
echo "3. Start the app: npm start"
echo ""
echo "🌍 Then open: http://localhost:5173"
