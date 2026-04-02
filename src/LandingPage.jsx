import React from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Globe,
  Mic,
  LineChart,
  BarChart3,
  Sparkles,
  Share2,
  Target,
  BrainCircuit,
  ChevronRight,
  Github,
  Twitter,
  Youtube,
} from "lucide-react";

// Minimalist synthesized sound effects for pieces
const playSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'pickup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'drop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (e) {
    // silently fail if audio context is blocked by browser auto-play policies
  }
};

export default function LandingPage({ onStart, onLogin }) {
  // Shared Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
  };

  return (
    <div className="bg-[#0f0f12] text-white min-h-screen relative overflow-hidden font-sans">
      
      {/* Dynamic Pawn Background */}
      <FloatingPawns />

      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-5 border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center cursor-pointer">
          <img
            src="/logo.jpg"
            alt="Chess Legends"
            className="h-10 md:h-12 w-auto object-contain"
          />
        </div>

        <div className="flex items-center space-x-4 md:space-x-6">
          <button
            onClick={onLogin}
            className="text-gray-300 font-bold text-sm hover:text-white transition-colors"
          >
            Log In
          </button>
          
          <button
            onClick={onStart}
            className="px-5 py-2.5 bg-[#4ade80] hover:bg-[#22c55e] text-[#0f0f12] font-extrabold rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Sign Up
          </button>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-7xl mx-auto">
        
        {/* --- HERO SECTION --- (Chess.com Split Layout) */}
        <div className="min-h-[85vh] flex flex-col lg:flex-row items-center justify-between px-6 md:px-12 py-16 gap-12 lg:gap-20">
          
          {/* Left: Text & CTA CTA */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex-1 max-w-xl z-10 flex flex-col items-center lg:items-start text-center lg:text-left"
          >
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tight text-white mb-6 drop-shadow-lg">
              Master Chess <br className="hidden md:block" />
              <span className="text-[#4ade80]">Online.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-[#a1a1aa] text-lg md:text-2xl font-medium leading-snug mb-10 max-w-lg">
              Play everywhere, analyze deeply, and dominate the board. Join the ultimate arena for competitive chess.
            </motion.p>

            {/* Chess.com style blocky buttons */}
            <motion.div variants={itemVariants} className="flex flex-col w-full sm:w-auto gap-5">
              <button
                onClick={onStart}
                className="group flex items-center justify-center lg:justify-start gap-4 bg-[#81b64c] hover:bg-[#a3d160] text-white text-xl md:text-3xl font-black py-4 md:py-6 px-10 rounded-2xl shadow-[0_8px_0_#537133] hover:shadow-[0_4px_0_#537133] active:shadow-none active:translate-y-[8px] transition-all"
              >
                <div className="bg-black/10 p-2 md:p-3 rounded-xl rotate-[-10deg] group-hover:rotate-0 transition-transform">
                  <Globe className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="flex flex-col items-start leading-none text-left">
                  <span className="drop-shadow-sm">Play Online</span>
                  <span className="text-sm font-bold text-white/70 mt-1 uppercase tracking-wide">Play vs a Person</span>
                </div>
              </button>
              
              <button
                onClick={onStart}
                className="group flex items-center justify-center lg:justify-start gap-4 bg-[#312e2b] hover:bg-[#43403d] text-gray-200 text-xl md:text-3xl font-black py-4 md:py-6 px-10 rounded-2xl shadow-[0_8px_0_#211f1c] hover:shadow-[0_4px_0_#211f1c] active:shadow-none active:translate-y-[8px] transition-all"
              >
                <div className="bg-white/5 p-2 md:p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Bot className="w-8 h-8 md:w-10 md:h-10 text-gray-300" />
                </div>
                <div className="flex flex-col items-start leading-none text-left">
                  <span className="drop-shadow-sm">Play Bot</span>
                  <span className="text-sm font-bold text-white/40 mt-1 uppercase tracking-wide">Play vs Computer</span>
                </div>
              </button>
            </motion.div>
          </motion.div>

          {/* Right: Board Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex-1 w-full max-w-[600px] z-10 flex justify-center items-center relative"
          >
            <AnimatedBoard />
            
            {/* Simple decoration */}
            <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-[#4ade80]/10 rounded-full blur-[80px] -z-10"></div>
            <div className="absolute -top-8 -left-8 w-64 h-64 bg-[#4ade80]/5 rounded-full blur-[80px] -z-10"></div>
          </motion.div>
        </div>

        {/* --- CORE FEATURES --- */}
        <div className="py-24 px-6 md:px-12 relative border-t border-white/5">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Why <span className="text-[#4ade80]">Chess Legends?</span>
              </h2>
              <p className="text-[#a1a1aa] text-lg md:text-xl font-medium">
                Engineered with cutting-edge tech. Play, analyze, and immerse yourself in a platform built for true enthusiasts.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard icon={<Bot />} title="Legendary Bots" description="Face off against AI personalities mapped to the playstyles of absolute legends." />
              <FeatureCard icon={<Globe />} title="Real-Time Play" description="Lightning-fast multiplayer. Create lobbies, chat instantly, and play bullet or classical." />
              <FeatureCard icon={<Mic />} title="Live Commentator" description="Our AI commentator roasts blunders and hypes brilliant moves in real-time." />
              <FeatureCard icon={<LineChart />} title="Deep Analysis" description="Review move classification, centipawn loss graphs, and find exactly where you won." />
              <FeatureCard icon={<BarChart3 />} title="Command Center" description="Track ELO progression and accuracy trends with gorgeous interactive charts." />
              <FeatureCard icon={<Sparkles />} title="Tactile Feel" description="Satisfying board acoustics and buttery-smooth piece dragging." />
            </div>
          </motion.div>
        </div>

      </div>

      {/* --- FOOTER --- */}
      <Footer />
    </div>
  );
}

// Subcomponent: Animated 2D Board showing piece movement
function AnimatedBoard() {
  const [step, setStep] = React.useState(0);
  const [isInteractive, setIsInteractive] = React.useState(false);
  const [showTeacher, setShowTeacher] = React.useState(false);
  const [customBoard, setCustomBoard] = React.useState(null);
  
  const boardRef = React.useRef(null);

  const MOVES_SEQUENCE = React.useMemo(() => [
    // 0: Start
    { wp_e: 52, bp_e: 12, wp_d: 51, bp_d: 11, wn_g: 62, bn_b: 1, wp_a: 48, bp_h: 15 },
    // 1: e4
    { wp_e: 36, bp_e: 12, wp_d: 51, bp_d: 11, wn_g: 62, bn_b: 1, wp_a: 48, bp_h: 15 },
    // 2: e5
    { wp_e: 36, bp_e: 28, wp_d: 51, bp_d: 11, wn_g: 62, bn_b: 1, wp_a: 48, bp_h: 15 },
    // 3: Nf3
    { wp_e: 36, bp_e: 28, wp_d: 51, bp_d: 11, wn_g: 45, bn_b: 1, wp_a: 48, bp_h: 15 },
    // 4: Nc6
    { wp_e: 36, bp_e: 28, wp_d: 51, bp_d: 11, wn_g: 45, bn_b: 18, wp_a: 48, bp_h: 15 },
    // 5: d4
    { wp_e: 36, bp_e: 28, wp_d: 35, bp_d: 11, wn_g: 45, bn_b: 18, wp_a: 48, bp_h: 15 },
    // 6: exd4 (bp_e captures wp_d)
    { wp_e: 36, bp_e: 35, wp_d: -1, bp_d: 11, wn_g: 45, bn_b: 18, wp_a: 48, bp_h: 15 },
    // 7: Nxd4 (wn_g captures bp_e)
    { wp_e: 36, bp_e: -1, wp_d: -1, bp_d: 11, wn_g: 35, bn_b: 18, wp_a: 48, bp_h: 15 },
    // 8: a4
    { wp_e: 36, bp_e: -1, wp_d: -1, bp_d: 11, wn_g: 35, bn_b: 18, wp_a: 32, bp_h: 15 },
    // 9: h5
    { wp_e: 36, bp_e: -1, wp_d: -1, bp_d: 11, wn_g: 35, bn_b: 18, wp_a: 32, bp_h: 31 },
  ], []);

  React.useEffect(() => {
    // If the user hasn't successfully made a piece move, but is playing with them, pause it.
    // If customBoard is set, the user has taken over entirely! We stop the loop.
    if (isInteractive || showTeacher || customBoard) return; 

    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % MOVES_SEQUENCE.length);
    }, 2000); 
    return () => clearInterval(interval);
  }, [MOVES_SEQUENCE.length, isInteractive, showTeacher, customBoard]);

  const activePositions = customBoard || MOVES_SEQUENCE[step];

  const piecesConfig = [
    { id: 'wp_e', char: '♟', color: '#ffffff', outline: '#000000', z: 10 },
    { id: 'bp_e', char: '♟', color: '#111111', outline: '#ffffff', z: 10 },
    { id: 'wp_d', char: '♟', color: '#ffffff', outline: '#000000', z: 9 },
    { id: 'bp_d', char: '♟', color: '#111111', outline: '#ffffff', z: 9 },
    { id: 'wn_g', char: '♞', color: '#ffffff', outline: '#000000', z: 15 },
    { id: 'bn_b', char: '♞', color: '#111111', outline: '#ffffff', z: 15 },
    { id: 'wp_a', char: '♟', color: '#ffffff', outline: '#000000', z: 8 },
    { id: 'bp_h', char: '♟', color: '#111111', outline: '#ffffff', z: 8 },
  ];

  return (
    <div 
      ref={boardRef}
      onMouseEnter={() => setIsInteractive(true)}
      onMouseLeave={() => setIsInteractive(false)}
      className="w-full aspect-square rounded-xl md:rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] border-[10px] md:border-[16px] border-[#312e2b] bg-[#312e2b] relative cursor-crosshair"
    >
      {/* Background squares grid */}
      <div className="w-full h-full grid grid-cols-8 relative z-0">
        {[...Array(64)].map((_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isDark = (row + col) % 2 === 1;
          return (
            <div key={i} className={`w-full h-full ${isDark ? 'bg-[#739552]' : 'bg-[#ebecd0]'}`} />
          );
        })}
      </div>

      {/* Animated & Draggable Pieces Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {piecesConfig.map((piece) => {
          const pos = activePositions[piece.id];
          const isCaptured = pos === -1;
          const left = isCaptured ? '50%' : `${(pos % 8) * 12.5}%`;
          const top = isCaptured ? '50%' : `${Math.floor(pos / 8) * 12.5}%`;

          return (
            <motion.div
              key={piece.id}
              drag={!isCaptured}
              dragConstraints={boardRef}
              dragElastic={0.1}
              dragMomentum={false}
              whileDrag={{ scale: 1.5, zIndex: 100, cursor: 'grabbing' }}
              onDragStart={() => {
                setIsInteractive(true);
                playSound('pickup');
                setShowTeacher(false);
              }}
              onDragEnd={(_, info) => {
                playSound('drop');
                
                if (!boardRef.current) return;
                const boardRect = boardRef.current.getBoundingClientRect();
                const squareSize = boardRect.width / 8;
                
                const dxSquares = Math.round(info.offset.x / squareSize);
                const dySquares = Math.round(info.offset.y / squareSize);
                
                // If they didn't drag it out of its square, ignore
                if (dxSquares === 0 && dySquares === 0) {
                  return;
                }
                
                const startRow = Math.floor(pos / 8);
                const startCol = pos % 8;
                const destRow = startRow + dySquares;
                const destCol = startCol + dxSquares;
                const destPos = destRow * 8 + destCol;
                
                // Out of bounds check
                if (destRow < 0 || destRow > 7 || destCol < 0 || destCol > 7) {
                  setShowTeacher(true);
                  return;
                }
                
                let valid = false;
                // Basic Rules Validation
                if (piece.id.includes('n_')) {
                  // Knight logic
                  if ((Math.abs(dxSquares) === 1 && Math.abs(dySquares) === 2) ||
                      (Math.abs(dxSquares) === 2 && Math.abs(dySquares) === 1)) {
                    valid = true;
                  }
                } else if (piece.id.includes('p_')) {
                  // Pawn logic
                  const isWhite = piece.id.startsWith('w');
                  const forwardDir = isWhite ? -1 : 1;
                  const startRank = isWhite ? 6 : 1;
                  
                  if (dxSquares === 0) {
                    if (dySquares === forwardDir) valid = true; // 1 step
                    if (dySquares === forwardDir * 2 && startRow === startRank) valid = true; // 2 steps from start
                  } else if (Math.abs(dxSquares) === 1 && dySquares === forwardDir) {
                    // Capture diagonally
                    valid = true; 
                  }
                }
                
                if (!valid) {
                  setShowTeacher(true);
                  return;
                }
                
                // Legal move attempt! Check collisions.
                const newBoard = { ...activePositions };
                let collisionBlocked = false;
                
                Object.keys(newBoard).forEach(k => {
                  if (newBoard[k] === destPos && k !== piece.id) {
                    // Check if landing on your own piece
                    if (k.charAt(0) === piece.id.charAt(0)) {
                      collisionBlocked = true;
                    } else {
                      newBoard[k] = -1; // Captured!
                    }
                  }
                });
                
                if (collisionBlocked) {
                  setShowTeacher(true);
                  return;
                }
                
                // Excellent, apply user's move
                newBoard[piece.id] = destPos;
                setCustomBoard(newBoard);
                // Teacher explicitly dismissed when they make a good move
                setShowTeacher(false); 
              }}
              animate={{
                left,
                top,
                x: 0, // This resets framer-motion drag offset to snap nicely back or to the new grid tile!
                y: 0,
                opacity: isCaptured ? 0 : 1,
                scale: isCaptured ? 0 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 20,
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 }
              }}
              className="absolute w-[12.5%] h-[12.5%] flex items-center justify-center pointer-events-auto cursor-grab touch-none"
              style={{ zIndex: piece.z }}
            >
              <span 
                className="text-4xl sm:text-5xl md:text-6xl" 
                style={{ 
                  color: piece.color, 
                  lineHeight: 1,
                  filter: `drop-shadow(0px 8px 12px rgba(0,0,0,0.6)) drop-shadow(0px 1px 2px ${piece.outline})`
                }}
              >
                {piece.char}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Decorative Shadows */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none mix-blend-overlay z-20"></div>
      
      {/* Interactive overlay hint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isInteractive && !showTeacher ? 1 : 0 }}
        className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full z-30 pointer-events-none backdrop-blur-sm shadow-xl border border-white/10 tracking-widest uppercase"
      >
        Grab the pieces!
      </motion.div>

      {/* Animated Teacher Overlay */}
      {showTeacher && (
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.8 }}
          className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-end gap-3 pointer-events-auto"
        >
          {/* Custom Speech Bubble */}
          <div className="relative bg-[#ebecd0] text-[#18181b] p-3 md:p-4 rounded-2xl rounded-br-none shadow-2xl max-w-[180px] md:max-w-[220px]">
            <p className="font-extrabold text-sm md:text-base border-b border-black/10 pb-2 mb-2">
              Oh no, wrong move! 😅
            </p>
            <p className="text-xs md:text-sm text-[#312e2b] font-medium leading-tight mb-3">
              Want to learn how to play like a legend?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowTeacher(false)} 
                className="flex-1 bg-[#4ade80] hover:bg-[#22c55e] text-black text-xs font-black py-2 px-2 rounded-lg shadow-md transition-colors"
              >
                Learn with us!
              </button>
            </div>
            {/* Triangle tail */}
            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-[#ebecd0] rotate-45 shadow-[2px_2px_4px_rgba(0,0,0,0.1)]"></div>
          </div>
          
          {/* Animated Teacher Avatar */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#312e2b] border-[3px] border-[#4ade80] flex items-center justify-center shadow-lg relative"
          >
            <Bot className="w-8 h-8 md:w-10 md:h-10 text-[#4ade80]" />
            <div className="absolute -top-3 -right-2 text-xl md:text-2xl drop-shadow-sm">🎓</div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

// Subcomponent: Animated Feature Card
function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-8 rounded-2xl bg-[#18181b] hover:bg-[#27272a] border border-white/5 transition-all duration-300 group">
      <div className="w-14 h-14 rounded-xl bg-[#27272a] group-hover:bg-[#4ade80]/20 flex items-center justify-center text-[#4ade80] mb-6 transition-colors">
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white tracking-tight">
        {title}
      </h3>
      <p className="text-[#a1a1aa] leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}

// Subcomponent: Animated Pawn Background
function FloatingPawns() {
  const containerRef = React.useRef(null);
  
  // Generate random starting positions and durations for 15 pawns
  const pawns = React.useMemo(() => {
    return [...Array(15)].map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1.5, // rem size
      startX: Math.random() * 100, // vw
      delay: Math.random() * -30, // seconds
      duration: Math.random() * 20 + 25, // seconds
      opacity: Math.random() * 0.15 + 0.05,
      rotation: Math.random() * 360,
    }));
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#09090b]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.03)_0%,transparent_70%)] pointer-events-none"></div>
      {pawns.map((pawn) => (
        <motion.div
          key={pawn.id}
          drag
          dragConstraints={containerRef}
          whileHover={{ scale: 1.3, opacity: 0.8, filter: "drop-shadow(0px 0px 8px rgba(74,222,128,0.5))" }}
          whileDrag={{ scale: 1.5, opacity: 1, cursor: "grabbing" }}
          onDragStart={() => playSound('pickup')}
          onDragEnd={() => playSound('drop')}
          initial={{ 
            y: "110vh", 
            x: `${pawn.startX}vw`, 
            opacity: pawn.opacity, 
            rotate: pawn.rotation 
          }}
          animate={{ 
            y: "-20vh", 
            rotate: pawn.rotation + (Math.random() > 0.5 ? 180 : -180),
            x: `${pawn.startX + (Math.random() * 20 - 10)}vw`,
          }}
          transition={{
            duration: pawn.duration,
            delay: pawn.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute text-[#4ade80] drop-shadow-sm pointer-events-auto cursor-grab touch-none"
          style={{ fontSize: `${pawn.size}rem`, color: 'rgba(74,222,128,0.15)' }}
        >
          ♟
        </motion.div>
      ))}
    </div>
  );
}

// Subcomponent: Footer
function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-[#0a0a0c] pt-16 pb-8 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <img src="/logo.jpg" alt="Chess Legends" className="h-10 w-auto object-contain mb-6" />
            <p className="text-[#a1a1aa] text-sm leading-relaxed mb-6 font-medium">
              The premier platform for playing, analyzing, and mastering chess online. Join a global community of legends.
            </p>
            <div className="flex space-x-5 text-[#a1a1aa]">
              <a href="#" className="hover:text-[#4ade80] hover:-translate-y-1 transition-all"><Twitter size={22} /></a>
              <a href="#" className="hover:text-[#4ade80] hover:-translate-y-1 transition-all"><Github size={22} /></a>
              <a href="#" className="hover:text-[#4ade80] hover:-translate-y-1 transition-all"><Youtube size={22} /></a>
            </div>
          </div>
          
          {/* Links 1 */}
          <div>
            <h4 className="text-white font-black mb-5 uppercase tracking-wider text-sm">Play</h4>
            <ul className="space-y-3 text-[#a1a1aa] text-sm font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Play vs Person</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Play vs Computer</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tournaments</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Leaderboards</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-white font-black mb-5 uppercase tracking-wider text-sm">Learn</h4>
            <ul className="space-y-3 text-[#a1a1aa] text-sm font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Lessons</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Puzzles</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Articles</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Masterclasses</a></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="text-white font-black mb-5 uppercase tracking-wider text-sm">About</h4>
            <ul className="space-y-3 text-[#a1a1aa] text-sm font-medium">
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Developers</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between text-xs font-semibold text-[#71717a]">
          <p>&copy; {new Date().getFullYear()} Chess Legends. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Fair Play</a>
            <a href="#" className="hover:text-white transition-colors">Community Guidelines</a>
          </div>
        </div>
      </div>
    </footer>
  );
}