"""
Chess Analytics Service
Provides comprehensive analytics and statistics processing for chess games
"""

from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import json
import statistics
from collections import defaultdict

app = Flask(__name__)

class ChessAnalytics:
    """Main analytics processor for chess games and player statistics"""
    
    @staticmethod
    def calculate_stats(games):
        """Calculate comprehensive stats from list of games"""
        if not games:
            return {
                'totalGames': 0,
                'wins': 0,
                'losses': 0,
                'draws': 0,
                'winRate': 0,
                'averageAccuracy': 0,
                'averageElo': 1200,
                'totalMoves': 0,
                'averageMoveTime': 0,
                'currentWinStreak': 0,
                'bestWinStreak': 0
            }
        
        total = len(games)
        wins = sum(1 for g in games if g.get('result') == 'win')
        losses = sum(1 for g in games if g.get('result') == 'loss')
        draws = sum(1 for g in games if g.get('result') == 'draw')
        
        accuracies = [g.get('analysis', {}).get('totalAccuracy', 0) for g in games if g.get('analysis')]
        avg_accuracy = statistics.mean(accuracies) if accuracies else 0
        
        total_moves = sum(len(g.get('moves', [])) for g in games)
        avg_moves_per_game = total_moves / total if total > 0 else 0
        
        return {
            'totalGames': total,
            'wins': wins,
            'losses': losses,
            'draws': draws,
            'winRate': round((wins / total * 100) if total > 0 else 0, 2),
            'averageAccuracy': round(avg_accuracy, 2),
            'averageElo': 1200,
            'totalMoves': total_moves,
            'averageMoveTime': 0,
            'currentWinStreak': ChessAnalytics.calculate_win_streak(games),
            'bestWinStreak': ChessAnalytics.calculate_best_win_streak(games)
        }
    
    @staticmethod
    def calculate_win_streak(games):
        """Calculate current win streak from most recent games"""
        if not games:
            return 0
        
        streak = 0
        for game in reversed(games):
            if game.get('result') == 'win':
                streak += 1
            else:
                break
        return streak
    
    @staticmethod
    def calculate_best_win_streak(games):
        """Calculate best win streak from all games"""
        if not games:
            return 0
        
        best_streak = 0
        current_streak = 0
        
        for game in games:
            if game.get('result') == 'win':
                current_streak += 1
                best_streak = max(best_streak, current_streak)
            else:
                current_streak = 0
        
        return best_streak
    
    @staticmethod
    def analyze_move_patterns(games):
        """Analyze move patterns and classifications"""
        blunders = 0
        tactical = 0
        strategic = 0
        best_moves = 0
        
        for game in games:
            moves = game.get('moves', [])
            for move in moves:
                move_type = move.get('moveType', 'strategic')
                if move_type == 'blunder':
                    blunders += 1
                elif move_type == 'tactical':
                    tactical += 1
                elif move_type == 'strategic':
                    strategic += 1
                elif move_type == 'best':
                    best_moves += 1
        
        total_moves = blunders + tactical + strategic + best_moves
        
        return {
            'blunders': blunders,
            'tactical': tactical,
            'strategic': strategic,
            'bestMoves': best_moves,
            'totalMoves': total_moves,
            'tacticalAccuracy': round((tactical / total_moves * 100) if total_moves > 0 else 0, 2)
        }
    
    @staticmethod
    def analyze_performance_by_opponent(games):
        """Analyze performance against different opponents"""
        opponent_stats = defaultdict(lambda: {'wins': 0, 'losses': 0, 'draws': 0, 'games': 0, 'totalAccuracy': 0})
        
        for game in games:
            opponent = game.get('opponent', {})
            opponent_name = opponent.get('name', 'Unknown') if isinstance(opponent, dict) else opponent
            
            result = game.get('result', 'draw')
            opponent_stats[opponent_name]['games'] += 1
            opponent_stats[opponent_name][result] += 1
            
            accuracy = game.get('analysis', {}).get('totalAccuracy', 0)
            opponent_stats[opponent_name]['totalAccuracy'] += accuracy
        
        # Calculate averages and win rates
        result = {}
        for opponent, stats in opponent_stats.items():
            games_played = stats['games']
            result[opponent] = {
                'gamesPlayed': games_played,
                'wins': stats['wins'],
                'losses': stats['losses'],
                'draws': stats['draws'],
                'winRate': round((stats['wins'] / games_played * 100) if games_played > 0 else 0, 2),
                'avgAccuracy': round((stats['totalAccuracy'] / games_played) if games_played > 0 else 0, 2)
            }
        
        return result
    
    @staticmethod
    def analyze_color_performance(games):
        """Analyze performance as white vs black"""
        white_stats = {'wins': 0, 'losses': 0, 'draws': 0, 'games': 0, 'totalAccuracy': 0}
        black_stats = {'wins': 0, 'losses': 0, 'draws': 0, 'games': 0, 'totalAccuracy': 0}
        
        for game in games:
            player_color = game.get('playerColor', 'w')
            result = game.get('result', 'draw')
            accuracy = game.get('analysis', {}).get('totalAccuracy', 0)
            
            if player_color == 'w':
                white_stats['games'] += 1
                white_stats[result] += 1
                white_stats['totalAccuracy'] += accuracy
            else:
                black_stats['games'] += 1
                black_stats[result] += 1
                black_stats['totalAccuracy'] += accuracy
        
        return {
            'asWhite': {
                'games': white_stats['games'],
                'wins': white_stats['wins'],
                'losses': white_stats['losses'],
                'draws': white_stats['draws'],
                'winRate': round((white_stats['wins'] / white_stats['games'] * 100) if white_stats['games'] > 0 else 0, 2),
                'avgAccuracy': round((white_stats['totalAccuracy'] / white_stats['games']) if white_stats['games'] > 0 else 0, 2)
            },
            'asBlack': {
                'games': black_stats['games'],
                'wins': black_stats['wins'],
                'losses': black_stats['losses'],
                'draws': black_stats['draws'],
                'winRate': round((black_stats['wins'] / black_stats['games'] * 100) if black_stats['games'] > 0 else 0, 2),
                'avgAccuracy': round((black_stats['totalAccuracy'] / black_stats['games']) if black_stats['games'] > 0 else 0, 2)
            }
        }
    
    @staticmethod
    def analyze_accuracy_trends(games, last_n=10):
        """Get accuracy trend for last N games"""
        recent_games = games[-last_n:] if len(games) > last_n else games
        
        trends = {
            'accuracyTrend': [g.get('analysis', {}).get('totalAccuracy', 0) for g in recent_games],
            'resultTrend': [1 if g.get('result') == 'win' else (0.5 if g.get('result') == 'draw' else 0) for g in recent_games],
            'dates': [g.get('gameDate', datetime.now().isoformat()) for g in recent_games]
        }
        
        return trends
    
    @staticmethod
    def get_opening_statistics(games):
        """Analyze opening statistics"""
        opening_stats = defaultdict(lambda: {'wins': 0, 'losses': 0, 'draws': 0, 'games': 0, 'totalAccuracy': 0})
        
        for game in games:
            opening = game.get('openingName', 'Unknown')
            result = game.get('result', 'draw')
            accuracy = game.get('analysis', {}).get('totalAccuracy', 0)
            
            opening_stats[opening]['games'] += 1
            opening_stats[opening][result] += 1
            opening_stats[opening]['totalAccuracy'] += accuracy
        
        result = {}
        for opening, stats in opening_stats.items():
            games_played = stats['games']
            result[opening] = {
                'gamesPlayed': games_played,
                'wins': stats['wins'],
                'losses': stats['losses'],
                'draws': stats['draws'],
                'winRate': round((stats['wins'] / games_played * 100) if games_played > 0 else 0, 2),
                'avgAccuracy': round((stats['totalAccuracy'] / games_played) if games_played > 0 else 0, 2)
            }
        
        return dict(sorted(result.items(), key=lambda x: x[1]['gamesPlayed'], reverse=True))


# API Endpoints
@app.route('/api/analytics/stats', methods=['POST'])
def calculate_stats():
    """Calculate overall stats from games"""
    try:
        data = request.json
        games = data.get('games', [])
        
        stats = ChessAnalytics.calculate_stats(games)
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/analytics/moves', methods=['POST'])
def analyze_moves():
    """Analyze move patterns"""
    try:
        data = request.json
        games = data.get('games', [])
        
        moves = ChessAnalytics.analyze_move_patterns(games)
        return jsonify(moves)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/analytics/opponents', methods=['POST'])
def analyze_opponents():
    """Analyze performance by opponent"""
    try:
        data = request.json
        games = data.get('games', [])
        
        opponents = ChessAnalytics.analyze_performance_by_opponent(games)
        return jsonify(opponents)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/analytics/colors', methods=['POST'])
def analyze_colors():
    """Analyze color performance"""
    try:
        data = request.json
        games = data.get('games', [])
        
        colors = ChessAnalytics.analyze_color_performance(games)
        return jsonify(colors)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/analytics/trends', methods=['POST'])
def get_trends():
    """Get accuracy and result trends"""
    try:
        data = request.json
        games = data.get('games', [])
        last_n = data.get('last_n', 10)
        
        trends = ChessAnalytics.analyze_accuracy_trends(games, last_n)
        return jsonify(trends)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/analytics/openings', methods=['POST'])
def get_openings():
    """Get opening statistics"""
    try:
        data = request.json
        games = data.get('games', [])
        
        openings = ChessAnalytics.get_opening_statistics(games)
        return jsonify(openings)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/analytics/comprehensive', methods=['POST'])
def get_comprehensive_analytics():
    """Get all analytics at once"""
    try:
        data = request.json
        games = data.get('games', [])
        
        analytics = {
            'stats': ChessAnalytics.calculate_stats(games),
            'moves': ChessAnalytics.analyze_move_patterns(games),
            'opponents': ChessAnalytics.analyze_performance_by_opponent(games),
            'colors': ChessAnalytics.analyze_color_performance(games),
            'trends': ChessAnalytics.analyze_accuracy_trends(games),
            'openings': ChessAnalytics.get_opening_statistics(games)
        }
        
        return jsonify(analytics)
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'Chess Analytics'})


if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=False)
