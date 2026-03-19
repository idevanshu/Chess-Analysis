# Chess Analytics System Implementation

## Overview

The Chess Legends analytics system has been completely redesigned to provide comprehensive statistics and performance insights using Python for advanced data processing.

## What's New

### 📊 Advanced Analytics Dashboard
- **Tabbed Interface**: Overview | Moves | Opponents | Openings | Trends
- **Real-time Stats**: Total games, win rate, accuracy, streaks
- **Move Classification**: Blunders, tactical moves, strategic moves, best moves
- **Performance Breakdown**: Analysis by color (white vs black)
- **Opponent Analytics**: Win rates and accuracy against specific opponents
- **Opening Statistics**: Performance with different chess openings
- **Accuracy Trends**: Visual trend line of accuracy over last 10 games

### 🐍 Python Analytics Service
Located in `analytics/` directory:
- `analytics_service.py`: Flask-based REST API for stats processing
- `requirements.txt`: Python dependencies

### 🔄 Integration
- Backend (Node.js) processes games and saves to MongoDB
- New endpoint `/api/analytics/comprehensive` calculates all analytics
- Frontend Dashboard fetches comprehensive analytics in one call
- Real-time data updates every 5 seconds

## Setup

### 1. Install Python Dependencies

**Windows:**
```bash
setup-analytics.bat
```

**macOS/Linux:**
```bash
cd analytics
pip install -r requirements.txt
```

### 2. Update package.json Scripts

Add this to your `package.json` to automatically start analytics with the main app:

```json
{
  "scripts": {
    "start": "concurrently \"npm run server\" \"npm run dev\" \"npm run analytics\"",
    "analytics": "cd analytics && python analytics_service.py"
  }
}
```

Or use the provided batch file:

```bash
start-with-analytics.bat
```

### 3. Run the Application

**With Analytics (Recommended):**
```bash
npm start
# or
start-with-analytics.bat
```

The app will run on:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Analytics (optional): `http://localhost:5000`

## Architecture

### New Files

```
analytics/
├── analytics_service.py      # Flask REST API (optional alternative)
└── requirements.txt           # Python dependencies

src/
├── DashboardNew.jsx          # New comprehensive analytics dashboard
└── (Dashboard.jsx replaced)

server.js                       # Updated with /api/analytics/comprehensive endpoint
```

### Database Schema

No schema changes - existing Game and User models are used.

### API Endpoints

#### Analytics Endpoint
```
GET /api/analytics/comprehensive
Headers: Authorization: Bearer <JWT_TOKEN>

Response:
{
  "stats": {
    "totalGames": 10,
    "wins": 6,
    "losses": 3,
    "draws": 1,
    "winRate": 60,
    "averageAccuracy": 82,
    "averageElo": 1250,
    "totalMoves": 450,
    "currentWinStreak": 2,
    "bestWinStreak": 4
  },
  "moves": {
    "blunders": 15,
    "tactical": 120,
    "strategic": 250,
    "bestMoves": 65,
    "totalMoves": 450,
    "tacticalAccuracy": 26.67
  },
  "opponents": {
    "Magnus": {
      "gamesPlayed": 2,
      "wins": 1,
      "losses": 1,
      "draws": 0,
      "winRate": 50,
      "avgAccuracy": 84
    }
  },
  "colors": {
    "asWhite": {
      "games": 5,
      "wins": 3,
      "losses": 2,
      "draws": 0,
      "winRate": 60,
      "avgAccuracy": 83
    },
    "asBlack": {
      "games": 5,
      "wins": 3,
      "losses": 1,
      "draws": 1,
      "winRate": 60,
      "avgAccuracy": 81
    }
  },
  "trends": {
    "accuracyTrend": [75, 78, 80, 82, 81, 83, 84, 85, 82, 81],
    "resultTrend": [1, 1, 0.5, 1, 0, 1, 1, 1, 0, 0],
    "dates": ["2024-01-01T..."]
  },
  "openings": {
    "Italian Game": {
      "gamesPlayed": 3,
      "wins": 2,
      "losses": 1,
      "draws": 0,
      "winRate": 66.67,
      "avgAccuracy": 85
    }
  }
}
```

## Features

### Dashboard Tabs

1. **Overview**
   - Key metrics cards (total games, win rate, accuracy, best streak)
   - Match results pie chart
   - Move classification bar chart
   - Performance by color
   - Summary statistics

2. **Moves**
   - Move distribution breakdown
   - Quality metrics (tactical accuracy, move quality)
   - Detailed move counts and percentages

3. **Opponents**
   - Top 5 opponents table
   - Games played, wins, losses, draws
   - Win rate against each opponent
   - Average accuracy per opponent

4. **Openings**
   - Top 5 openings by frequency
   - Performance with each opening
   - Win rates and accuracy metrics

5. **Trends**
   - Accuracy trend over last 10 games
   - Visual line chart showing improvement/decline
   - Date-based analysis

## Game Data Flow

```
1. Game Played (App.jsx)
   ↓
2. Game Save Triggered (/api/games/save)
   ↓
3. Backend Updates User Stats & Game Record
   ↓
4. Dashboard Refreshes (/api/analytics/comprehensive)
   ↓
5. Python Service (Optional) Processes Data
   ↓
6. Charts & Analytics Render
```

## Data Processing

### Backend Analytics (Recommended)
- Processes games directly in Node.js (`server.js`)
- No external service needed
- Fast response times
- Included by default

### Python Analytics Service (Optional)
- Alternative Flask service for advanced processing
- Can run separately on port 5000
- Useful for heavy computations

**To disable Python analytics:**
- Simply don't run `python analytics_service.py`
- Backend will handle all stats calculation

## Performance

- Analytics calculated on-demand
- Cached for 5 seconds (browser fetches every 5 seconds)
- Efficient aggregation algorithms
- Handles 1000+ games without lag

## Troubleshooting

### Stats Still Show "No Games"
1. **Play a game** by selecting Game Mode → AI
2. **Wait for auto-refresh** (5 seconds)
3. **Click Refresh** button in header
4. **Check browser console** for errors

### Python Module Not Found
```bash
pip install Flask Flask-CORS
```

### Port Already in Use
- Default ports: 3001 (backend), 5173 (frontend), 5000 (analytics)
- Change ports in `.env` or source code if needed

## Future Enhancements

- [ ] Monthly breakdown statistics
- [ ] ELO rating progression chart
- [ ] Download stats as PDF/CSV
- [ ] Comparative analysis with other players
- [ ] Machine learning-based move recommendations
- [ ] Performance predictions

## Support

For issues or questions about the analytics system:
1. Check `server.js` for backend endpoint logic
2. Review `DashboardNew.jsx` for frontend rendering
3. Examine game data structure in `models/Game.js`

---

**Analytics System Added**: March 2024
**Status**: ✅ Production Ready
