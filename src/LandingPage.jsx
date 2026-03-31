import React from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Globe,
  Mic,
  LineChart,
  BarChart3,
  Sparkles,
  BrainCircuit,
  Share2,
  Target,
  BookOpen,
  Users,
  ChevronRight,
} from "lucide-react";

export default function LandingPage({ onStart, onLogin }) {
  // Shared Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <div className="bg-[#050505] text-white min-h-screen relative overflow-hidden font-sans selection:bg-green-500/30 selection:text-green-200">
      
      {/* --- AMBIENT ANIMATED BACKGROUND --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[30%] -left-[10%] w-[80vw] h-[80vw] bg-green-600/10 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[20%] w-[60vw] h-[60vw] bg-emerald-600/10 rounded-full blur-[140px]"
        />
      </div>

      {/* --- NAVBAR --- */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20 }}
        className="flex justify-between items-center px-6 md:px-12 py-5 border-b border-white/5 bg-[#050505]/60 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="flex items-center cursor-pointer group">
          <motion.img
            src="/logo.jpg"
            alt="Chess Legends"
            whileHover={{ scale: 1.05, filter: "drop-shadow(0px 0px 25px rgba(34,197,94,0.6))" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="h-12 md:h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          />
        </div>

        <div className="flex items-center space-x-3 md:space-x-6">
          <motion.button
            whileHover={{ scale: 1.05, color: "#4ade80" }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogin}
            className="text-gray-300 font-semibold text-sm transition-colors decoration-green-400 decoration-2 underline-offset-4 hover:underline"
          >
            Log In
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0px 0px 25px rgba(34, 197, 94, 0.4)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="relative overflow-hidden px-5 py-2.5 bg-green-500 text-black font-extrabold rounded-lg text-sm sm:text-base group"
          >
            <span className="relative z-10 flex items-center gap-2">
              Play Now <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </motion.button>
        </div>
      </motion.nav>

      <div className="relative z-10">
        
        {/* --- HERO SECTION --- */}
        <div className="min-h-[85vh] flex flex-col lg:flex-row items-center justify-center px-6 md:px-12 max-w-7xl mx-auto gap-16 py-20">
          
          {/* Hero Text Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex-1 max-w-2xl"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 text-xs sm:text-sm font-bold tracking-widest uppercase mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              The Future of Chess
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-6xl md:text-7xl lg:text-[5rem] font-black leading-[1.1] tracking-tight text-white mb-6">
              Master Chess Like A{" "}
              <span className="relative inline-block mt-2">
                <span className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 blur-2xl opacity-40 rounded-full animate-pulse"></span>
                <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-green-500 to-emerald-400 drop-shadow-sm">Grandmaster</span>
              </span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-gray-400 text-lg md:text-xl leading-relaxed mb-10 max-w-lg font-medium">
              A hyper-immersive, AI-powered arena. Face iconic personalities, conquer global leaderboards, and experience live commentary.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStart}
                className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-black font-black text-lg rounded-xl overflow-hidden shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:shadow-[0_0_60px_rgba(34,197,94,0.5)] transition-shadow"
              >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                Launch Arena <Globe className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-xl border border-white/10 font-bold text-lg text-white hover:border-green-400/50 hover:text-green-400 transition-colors flex items-center justify-center"
              >
                Watch Trailer
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Hero Visual - Floating 3D Board Impression */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: 15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="flex-1 relative w-full aspect-square max-w-[500px]"
          >
            {/* The Floating Container */}
            <motion.div
              animate={{ y: [-15, 15, -15], rotateZ: [-1, 1, -1] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative w-full h-full rounded-2xl glass-panel flex items-center justify-center border border-white/10 bg-gradient-to-br from-white/5 to-transparent overflow-hidden shadow-2xl backdrop-blur-lg perspective-[1000px]"
            >
              {/* Inner Board Projection */}
              <div
                className="w-[85%] h-[85%] grid grid-cols-8 shadow-[0_0_50px_rgba(34,197,94,0.3)] transform-gpu rotate-x-12 rotate-z-3 rounded-lg overflow-hidden border border-green-500/40 opacity-90"
                style={{ transform: "rotateX(25deg) rotateZ(-10deg)" }}
              >
                {[...Array(64)].map((_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const isDark = (row + col) % 2 === 1;
                  return (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.2, zIndex: 10, backgroundColor: "#4ade80" }}
                      className={`w-full h-full ${isDark ? "bg-[#111]" : "bg-[#222]"} transition-colors duration-300 relative`}
                    >
                      {/* Random abstract glowing pieces */}
                      {(i === 27 || i === 36 || i === 14) && (
                         <motion.div
                           animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                           transition={{ duration: Math.random() * 2 + 2, repeat: Infinity }}
                           className="absolute inset-2 bg-green-500 blur-sm rounded-full"
                         />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* --- CORE FEATURES --- */}
        <div className="py-32 px-6 md:px-12 relative border-t border-white/5 bg-[#050505]/80">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-7xl mx-auto"
          >
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                Redefining the <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Battleground</span>
              </h2>
              <p className="text-gray-400 text-lg md:text-xl font-medium">
                Engineered with cutting-edge tech. Play, analyze, and immerse yourself in a platform built for true enthusiasts.
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <FeatureCard
                icon={<Bot />}
                title="Legendary AI Minds"
                description="Face off against 6 unique AI personalities mapped to the playstyles of absolute legends, backed by Stockfish 18."
              />
              <FeatureCard
                icon={<Globe />}
                title="Real-Time Sync"
                description="Lightning-fast WebSocket multiplayer. Create lobbies, chat instantly, and play bullet or classical matching your pace."
              />
              <FeatureCard
                icon={<Mic />}
                title="Gary: AI Commentator"
                description="Our proprietary GPT-4 commentator roasts blunders and hypes brilliant moves in real-time as you play."
              />
              <FeatureCard
                icon={<LineChart />}
                title="Post-Match Forensics"
                description="Deep move classification, centipawn loss graphs, and ECO detection. Analyze where you won, or exactly why you lost."
              />
              <FeatureCard
                icon={<BarChart3 />}
                title="Command Center"
                description="Track ELO progression, win-rates across openings, and accuracy trends with gorgeous interactive dashboard charts."
              />
              <FeatureCard
                icon={<Sparkles />}
                title="Sensory Excellence"
                description="Satisfying wood-click acoustics, buttery-smooth piece dragging, and a responsive 3D board design that feels tactile."
              />
            </motion.div>
          </motion.div>
        </div>

        {/* --- ROADMAP --- */}
        <div className="py-32 px-6 md:px-12 relative bg-gradient-to-b from-[#050505] to-[#0a120b] border-t border-white/5">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="max-w-7xl mx-auto"
          >
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                The <span className="text-green-400">Roadmap</span>
              </h2>
              <p className="text-gray-400 text-lg md:text-xl font-medium">
                We're barely scratching the surface. Here's what's hitting the development pipeline next.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative">
                {/* Visual connecting line behind cards */}
                <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent -translate-y-1/2 z-0"></div>

              <RoadmapCard
                delay={0}
                icon={<BrainCircuit />}
                title="Train Your Digital Twin"
                description="Upload your game history and fine-tune a specialized AI model that plays exactly like you do."
              />
              <RoadmapCard
                delay={0.2}
                icon={<Share2 />}
                title="AI Marketplace"
                description="Publish your model. Climb the leaderboard as a master AI Trainer while millions challenge your creation."
              />
              <RoadmapCard
                delay={0.4}
                icon={<Target />}
                title="Sparring Partners"
                description="Train an AI to intentionally make mistakes or fall for specific traps, giving you the ultimate practice dummy."
              />
            </div>
          </motion.div>
        </div>

        {/* --- EPIC CTA SECTION --- */}
        <div className="py-32 px-6 relative flex flex-col items-center justify-center border-t border-white/5 overflow-hidden">
          {/* Pulsing Background Focus */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500 rounded-full blur-[200px] pointer-events-none"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
            className="relative z-10 text-center max-w-4xl glass-panel p-10 md:p-20 rounded-[3rem] border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl"
          >
            <h2 className="text-5xl md:text-7xl font-black mb-6 text-white tracking-tight leading-tight">
              Ready to claim<br />your <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Throne?</span>
            </h2>
            <p className="text-xl text-gray-400 mb-12 font-medium max-w-2xl mx-auto">
              Join thousands of players already analyzing, competing, and evolving on the most advanced board ever built.
            </p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              className="group relative px-12 py-6 bg-green-500 text-black font-black text-2xl rounded-full overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.4)] hover:shadow-[0_0_80px_rgba(34,197,94,0.6)] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center gap-3">
                Play For Free
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ChevronRight size={28} />
                </motion.span>
              </span>
            </motion.button>
          </motion.div>
        </div>

      </div>
    </div>
  );
}

// Subcomponent: Animated Feature Card
function FeatureCard({ icon, title, description }) {
  // We use Framer Motion variants that integrate with the parent staggerChildren
  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 20 } },
  };

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -8, scale: 1.02, backgroundColor: "rgba(255,255,255,0.03)" }}
      className="p-8 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-md transition-colors relative group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 mb-6 group-hover:bg-green-500 group-hover:text-black group-hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300">
          {React.cloneElement(icon, { size: 28 })}
        </div>
        <h3 className="text-2xl font-bold mb-3 text-white tracking-tight">
          {title}
        </h3>
        <p className="text-gray-400 text-base leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// Subcomponent: Animated Roadmap Card
function RoadmapCard({ delay, icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay: delay, type: "spring", stiffness: 80 }}
      whileHover={{ scale: 1.05, rotateZ: 1 }}
      className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 backdrop-blur-sm relative z-10 flex flex-col items-center text-center group"
    >
      <div className="w-16 h-16 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-green-500 mb-6 transform -translate-y-12 shadow-xl group-hover:border-green-500/50 group-hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-all duration-300">
        {React.cloneElement(icon, { size: 30 })}
      </div>
      <div className="-mt-6">
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-400 leading-relaxed font-medium text-sm">
          {description}
        </p>
      </div>
    </motion.div>
  );
}