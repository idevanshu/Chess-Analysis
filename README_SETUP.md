# ♞ Chess Legends – AI-Powered Chess Analysis Platform

A full-stack chess application where you play against world-class AI opponents powered by Google Gemini, with comprehensive performance tracking and beautiful analytics dashboard.

## 🎯 Features

### Game Features
- ✅ **Play vs 6 Chess Legends**: Magnus Carlsen, Praggnanandhaa, Hikaru Nakamura, Kasparov, Bobby Fischer, Judit Polgár
- ✅ **Real-time AI Commentary** from Google Gemini (streams live)
- ✅ **Move Hints** with suggested best moves
- ✅ **Move History** tracking all played moves
- ✅ **Captured Pieces** counter
- ✅ **Game Over Detection** (checkmate, stalemate)
- ✅ **Play as White or Black**
- ✅ **Responsive Design** (mobile, tablet, desktop)

### Authentication & User System
- ✅ **User Registration & Login** with JWT auth
- ✅ **Secure Password Hashing** (bcryptjs)
- ✅ **Persistent User Sessions**
- ✅ **User Profiles** with stats

### Performance Tracking & Analytics
- ✅ **Game History** (all games saved)
- ✅ **Win Rate** calculation
- ✅ **Move Classification**: Blunders, Tactical, Strategic, Best moves
- ✅ **Accuracy Percentage** per game
- ✅ **ELO Rating** system
- ✅ **Performance by Opponent** (win rate vs each legend)
- ✅ **Opening Analysis** (favorite openings)
- ✅ **Beautiful Dashboard** with charts and statistics

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Lightning-fast bundler
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Beautiful charts & graphs
- **chess.js** - Chess engine & move validation
- **Lucide React** - Icon library

### Backend
- **Node.js + Express** - Web server
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Google Generative AI** - Gemini for chess commentary

### DevOps
- **concurrently** - Run frontend & backend together
- **dotenv** - Environment variable management

## 📋 Prerequisites

- **Node.js** v16+ ([download](https://nodejs.org/))
- **MongoDB** ([install locally](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Google Gemini API Key** ([get free key](https://ai.google.dev/))

## 🚀 Setup Instructions

### 1. Clone & Install Dependencies

```bash
cd chess-legends
npm install
```

### 2. Setup MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# macOS (Homebrew):
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection (MongoDB runs on port 27017 by default)
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string (looks like: `mongodb+srv://user:password@cluster.mongodb.net/database`)

### 3. Configure Environment Variables

Edit `.env` file in project root:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Backend Server
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/chess-legends
# OR for Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/chess-legends

# JWT Secret (change in production!)
JWT_SECRET=your_jwt_secret_key_change_in_production_12345
```

### 4. Start the Application

```bash
npm start
```

This runs:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3001 (Express server)

Open browser → **http://localhost:5173**

## 📚 API Endpoints

### Authentication

#### **POST /api/auth/signup**
Register a new user
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

#### **POST /api/auth/login**
Login user
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### **GET /api/auth/profile**
Get user profile (requires JWT token)

### Game Tracking

#### **POST /api/games/save**
Save completed game (requires JWT)
```json
{
  "opponent": "Magnus",
  "opponentElo": 2830,
  "playerColor": "w",
  "result": "win",
  "moves": [...],
  "duration": 1200
}
```

#### **GET /api/games/history**
Get user's game history (requires JWT, returns last 50 games)

### Performance Stats

#### **GET /api/stats/performance**
Get detailed performance analytics (requires JWT)

### AI Chat

#### **POST /api/chat**
Stream AI commentary from Gemini
```json
{
  "messages": [...],
  "systemInstruction": "You are Magnus Carlsen..."
}
```
Returns: Server-Sent Events (SSE) text stream

## 📊 Dashboard Metrics

The dashboard displays:

1. **Overview Stats**
   - Total games played
   - Win rate percentage
   - Average accuracy
   - ELO rating

2. **Charts**
   - Win/Loss/Draw pie chart
   - Move classification bar chart
   - Recent games table

3. **Performance Insights**
   - Games vs each opponent
   - Accuracy trends
   - Opening preferences
   - Move type distribution

## 🎮 How to Play

1. **Sign Up/Login**
   - Create account with email and password
   - Or login if you already have one

2. **Select Opponent**
   - Click player selector to choose a chess legend
   - Each has unique playing style and personality

3. **Choose Color**
   - Play as White (move first) or Black

4. **Make Moves**
   - Click piece to select it (highlights legal moves)
   - Click target square to move
   - Green circle = empty square, Border = capture

5. **Get Analysis**
   - Gemini AI provides real-time commentary
   - Analyzes your moves and suggests improvements

6. **View Stats**
   - Click "Stats" button to open performance dashboard
   - See detailed game analytics and trends

## 📁 Project Structure

```
chess-legends/
├── server.js                 # Express backend
├── models/
│   ├── User.js              # User schema
│   ├── Game.js              # Game schema
│   └── Performance.js       # Performance schema
├── src/
│   ├── App.jsx              # Main app component
│   ├── AuthPage.jsx         # Login/Signup UI
│   ├── Dashboard.jsx        # Analytics dashboard
│   ├── ChessBoard.jsx       # Chess board UI
│   ├── context/
│   │   └── AuthContext.jsx  # Auth provider
│   ├── useChessLogic.js     # Game logic hook
│   ├── useGemini.js         # Gemini AI hook
│   ├── players.js           # Chess legends data
│   ├── utils.js             # Utilities
│   └── index.css            # Tailwind styles
├── .env                      # Environment config
├── package.json              # Dependencies
└── vite.config.js           # Vite config
```

## 🔐 Security Notes

⚠️ **Important for Production:**
1. Change `JWT_SECRET` to a strong random string
2. Use environment-specific `.env` files
3. Enable HTTPS
4. Validate all user inputs on backend
5. Use MongoDB Atlas with VPC peering in production
6. Keep API keys secret (never commit to git)

## 🐛 Troubleshooting

### Backend not connecting to MongoDB
```bash
# Check if MongoDB is running
mongosh
# Should show connection successful
```

### "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Port already in use
```bash
# Kill process on port 3001 (macOS/Linux)
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Frontend can't reach backend
- Check server is running: http://localhost:3001 accessible?
- Verify `.env` PORT matches in `vite.config.js`

## 🤝 Contributing

Feel free to fork and submit pull requests!

## 📄 License

MIT License - feel free to use for personal projects

## 🚀 Future Enhancements

- [ ] Real-time multiplayer games
- [ ] Puzzle training mode
- [ ] Opening book explorer
- [ ] Endgame tablebase integration
- [ ] Video game replays
- [ ] Community tournaments
- [ ] Mobile app (React Native)
- [ ] Lichess/Chess.com integration

---

**Enjoy mastering chess with AI coaches! ♞♛♚**
