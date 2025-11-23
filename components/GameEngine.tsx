import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Gesture, GameResult } from '../types';
import { initializeHandLandmarker } from '../services/gestureService';
import { generateGameCommentary } from '../services/geminiService';
import { COUNTDOWN_SECONDS, GESTURE_EMOJIS } from '../constants';
import CameraView from './CameraView';
import { Play, RefreshCw, Cpu, Trophy, AlertTriangle, User, Minus } from 'lucide-react';

const GameEngine: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING_MODEL);
  const [currentGesture, setCurrentGesture] = useState<Gesture>(Gesture.NONE);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [result, setResult] = useState<GameResult | null>(null);
  const [score, setScore] = useState({ user: 0, cpu: 0 });
  const [aiCommentary, setAiCommentary] = useState<string>("");
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  
  // For CPU Animation
  const [cpuShuffleGesture, setCpuShuffleGesture] = useState<Gesture>(Gesture.ROCK);
  const cpuIntervalRef = useRef<number | null>(null);

  // To store the last valid gesture to prevent "None" flickering at the last second
  const lastValidGestureRef = useRef<Gesture>(Gesture.NONE);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await initializeHandLandmarker();
        setGameState(GameState.IDLE);
      } catch (error) {
        console.error("Failed to load MediaPipe model", error);
        alert("Error cargando el modelo de visión. Por favor recarga la página.");
      }
    };
    loadModel();
  }, []);

  const handleGestureDetected = useCallback((gesture: Gesture) => {
    setCurrentGesture(gesture);
    if (gesture !== Gesture.NONE && gesture !== Gesture.UNKNOWN) {
      lastValidGestureRef.current = gesture;
    }
  }, []);

  const determineWinner = (user: Gesture, cpu: Gesture): 'user' | 'cpu' | 'draw' => {
    if (user === cpu) return 'draw';
    if (
      (user === Gesture.ROCK && cpu === Gesture.SCISSORS) ||
      (user === Gesture.PAPER && cpu === Gesture.ROCK) ||
      (user === Gesture.SCISSORS && cpu === Gesture.PAPER)
    ) {
      return 'user';
    }
    return 'cpu';
  };

  const getRandomGesture = (): Gesture => {
    const moves = [Gesture.ROCK, Gesture.PAPER, Gesture.SCISSORS];
    return moves[Math.floor(Math.random() * moves.length)];
  };

  const startGame = () => {
    setGameState(GameState.COUNTDOWN);
    setCountdown(COUNTDOWN_SECONDS);
    setResult(null);
    setAiCommentary("");
    lastValidGestureRef.current = Gesture.NONE; // Reset valid gesture

    // Start CPU Shuffling animation
    if (cpuIntervalRef.current) clearInterval(cpuIntervalRef.current);
    cpuIntervalRef.current = window.setInterval(() => {
        setCpuShuffleGesture(prev => {
            if (prev === Gesture.ROCK) return Gesture.PAPER;
            if (prev === Gesture.PAPER) return Gesture.SCISSORS;
            return Gesture.ROCK;
        });
    }, 100);
  };

  // Countdown Logic
  useEffect(() => {
    if (gameState === GameState.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Countdown finished
        finishGameTurn();
      }
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, countdown]);

  const finishGameTurn = async () => {
    // Stop CPU animation
    if (cpuIntervalRef.current) {
        clearInterval(cpuIntervalRef.current);
        cpuIntervalRef.current = null;
    }

    setGameState(GameState.RESULT);
    
    // 1. Get final user move
    // Prefer the current gesture, but fallback to the last valid one if currently "Unknown"/None
    // This helps if the user moves slightly during the exact millisecond of capture.
    let userFinalMove = currentGesture;
    if ((userFinalMove === Gesture.NONE || userFinalMove === Gesture.UNKNOWN) && lastValidGestureRef.current !== Gesture.NONE) {
      userFinalMove = lastValidGestureRef.current;
    }
    
    // 2. CPU Move
    const cpuFinalMove = getRandomGesture();

    // 3. Handle No Gesture Detected
    if (userFinalMove === Gesture.UNKNOWN || userFinalMove === Gesture.NONE) {
         const gameResult: GameResult = {
            userMove: Gesture.NONE,
            cpuMove: cpuFinalMove,
            winner: 'cpu', // Default loss if no hand shown
            message: "No detecté tu mano a tiempo."
          };
          setResult(gameResult);
          setAiCommentary("¡No vi tu mano! Punto para mí por incomparecencia.");
          setScore(s => ({ ...s, cpu: s.cpu + 1 }));
          return;
    }

    // 4. Calculate Winner
    const winner = determineWinner(userFinalMove, cpuFinalMove);

    // 5. Update Score (STRICTLY only if not a draw)
    if (winner === 'user') {
        setScore(s => ({ ...s, user: s.user + 1 }));
    } else if (winner === 'cpu') {
        setScore(s => ({ ...s, cpu: s.cpu + 1 }));
    } else {
        // Draw - do NOT increment any score
        console.log("Empate - Scores unchanged");
    }

    const gameResult: GameResult = {
      userMove: userFinalMove,
      cpuMove: cpuFinalMove,
      winner
    };
    setResult(gameResult);

    // 6. Fetch Gemini Commentary
    if (process.env.API_KEY) {
        setLoadingCommentary(true);
        const comment = await generateGameCommentary(userFinalMove, cpuFinalMove, winner);
        setAiCommentary(comment);
        setLoadingCommentary(false);
    } else {
        setAiCommentary(
            winner === 'user' ? "¡Victoria humana!" : 
            winner === 'cpu' ? "Victoria de la CPU." : 
            "¡Es un empate! Nadie suma puntos."
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white flex flex-col items-center p-4 overflow-x-hidden relative font-sans">
      {/* Background Ambient Light */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

      {/* Header */}
      <header className="mb-8 text-center z-10 pt-4">
        <div className="inline-flex items-center justify-center gap-2 mb-3 px-4 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] text-slate-400 tracking-widest uppercase backdrop-blur-sm">
            <Cpu className="w-3 h-3" /> Powered by Gemini AI & MediaPipe
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.3)]">
          GESTUROCK AI
        </h1>
      </header>

      {/* Main Game Area - Parallel Layout */}
      <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 w-full max-w-6xl z-10">
        
        {/* PLAYER CAMERA CARD */}
        <div className="flex-1 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className={`relative h-full bg-slate-900/80 border rounded-2xl p-3 flex flex-col transition-all duration-500
                ${gameState === GameState.RESULT && result 
                    ? (result.winner === 'user' ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]' 
                       : result.winner === 'draw' ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]'
                       : 'border-red-500/50')
                    : 'border-slate-700'}
            `}>
                <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-cyan-400" />
                        <span className="font-bold tracking-wider text-sm text-slate-200">JUGADOR</span>
                    </div>
                    {gameState === GameState.RESULT && (
                        <>
                            {result?.winner === 'user' && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">GANADOR</span>}
                            {result?.winner === 'draw' && <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">EMPATE</span>}
                        </>
                    )}
                </div>
                
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
                    {gameState === GameState.LOADING_MODEL ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                            <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-xs tracking-widest">CARGANDO MODELO...</span>
                        </div>
                    ) : (
                        <CameraView 
                            gameState={gameState} 
                            onGestureDetected={handleGestureDetected}
                            currentDetectedGesture={currentGesture}
                        />
                    )}
                </div>
            </div>
        </div>

        {/* VS CENTER COLUMN */}
        <div className="w-full lg:w-32 flex flex-col items-center justify-center shrink-0 gap-4 py-4 lg:py-0">
            {gameState === GameState.COUNTDOWN ? (
                <div className="relative flex items-center justify-center w-24 h-24 animate-[bounce_0.5s_infinite]">
                    <div className="text-8xl font-black text-yellow-400 font-display drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]">
                        {countdown}
                    </div>
                </div>
            ) : gameState === GameState.RESULT ? (
                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                     <span className="text-4xl font-black italic text-slate-500">VS</span>
                     <button 
                        onClick={startGame}
                        className="mt-4 p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-110 transition-transform active:scale-95"
                    >
                        <RefreshCw className="w-6 h-6 text-white" />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={startGame}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-20"
                >
                    <Play className="w-10 h-10 text-white fill-current ml-1 group-hover:animate-pulse" />
                </button>
            )}
        </div>

        {/* CPU CAMERA CARD */}
        <div className="flex-1 relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
             <div className={`relative h-full bg-slate-900/80 border rounded-2xl p-3 flex flex-col transition-all duration-500
                ${gameState === GameState.RESULT && result 
                    ? (result.winner === 'cpu' ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]' 
                       : result.winner === 'draw' ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]'
                       : 'border-red-500/50')
                    : 'border-slate-700'}
            `}>
                <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-red-400" />
                        <span className="font-bold tracking-wider text-sm text-slate-200">CPU (AI)</span>
                    </div>
                    {gameState === GameState.RESULT && (
                        <>
                            {result?.winner === 'cpu' && <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded">GANADOR</span>}
                            {result?.winner === 'draw' && <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">EMPATE</span>}
                        </>
                    )}
                </div>
                
                <div className={`relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-white/5 shadow-inner transition-all duration-300`}>
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

                    {gameState === GameState.COUNTDOWN ? (
                        <div className="z-10 flex flex-col items-center">
                             <div className="text-9xl animate-[pulse_0.1s_ease-in-out_infinite] filter blur-[1px]">
                                {GESTURE_EMOJIS[cpuShuffleGesture]}
                             </div>
                        </div>
                    ) : gameState === GameState.RESULT && result ? (
                        <div className="z-10 flex flex-col items-center animate-in zoom-in duration-300">
                            <div className="text-[8rem] leading-none drop-shadow-2xl">
                                {GESTURE_EMOJIS[result.cpuMove]}
                            </div>
                            <div className="mt-2 text-2xl font-black text-white uppercase tracking-widest opacity-80">
                                {result.cpuMove}
                            </div>
                        </div>
                    ) : (
                        <div className="z-10 flex flex-col items-center opacity-20">
                            <Cpu className="w-16 h-16 mb-2" />
                            <span className="font-mono text-xs tracking-widest">ESPERANDO JUGADOR</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* SCOREBOARD SECTION (BELOW) */}
      <div className="w-full max-w-4xl mt-8 z-10">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Score Display */}
            <div className="flex items-center gap-8 md:gap-12 bg-black/20 px-8 py-4 rounded-2xl border border-white/5">
                <div className="flex flex-col items-center">
                    <span className="text-xs text-cyan-500 font-bold tracking-widest mb-1">JUGADOR</span>
                    <span className="text-4xl font-mono font-bold text-white">{score.user}</span>
                </div>
                <div className="h-12 w-px bg-slate-700"></div>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-red-500 font-bold tracking-widest mb-1">CPU</span>
                    <span className="text-4xl font-mono font-bold text-white">{score.cpu}</span>
                </div>
            </div>

            {/* Commentary Area */}
            <div className="flex-1 w-full">
                {gameState === GameState.RESULT && result ? (
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            {result.winner === 'user' ? <Trophy className="w-4 h-4 text-yellow-500" /> : 
                             result.winner === 'draw' ? <Minus className="w-4 h-4 text-slate-400" /> :
                             <AlertTriangle className="w-4 h-4 text-slate-500" />}
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Comentarista AI</span>
                        </div>
                        {loadingCommentary ? (
                            <div className="h-8 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                            </div>
                        ) : (
                            <p className="text-lg text-slate-200 font-medium leading-relaxed animate-in fade-in slide-in-from-right-4">
                                "{aiCommentary}"
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-slate-600 text-sm italic">
                        El comentarista está esperando el resultado...
                    </div>
                )}
            </div>
        </div>
      </div>

    </div>
  );
};

export default GameEngine;