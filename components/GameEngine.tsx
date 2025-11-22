import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Gesture, GameResult } from '../types';
import { initializeHandLandmarker } from '../services/gestureService';
import { generateGameCommentary } from '../services/geminiService';
import { COUNTDOWN_SECONDS, GESTURE_EMOJIS } from '../constants';
import CameraView from './CameraView';
import { Play, RefreshCw, Cpu, Trophy } from 'lucide-react';

const GameEngine: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING_MODEL);
  const [currentGesture, setCurrentGesture] = useState<Gesture>(Gesture.NONE);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [result, setResult] = useState<GameResult | null>(null);
  const [score, setScore] = useState({ user: 0, cpu: 0 });
  const [aiCommentary, setAiCommentary] = useState<string>("");
  const [loadingCommentary, setLoadingCommentary] = useState(false);

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
  };

  // Countdown Logic
  useEffect(() => {
    if (gameState === GameState.COUNTDOWN) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Countdown finished, capture result
        finishGameTurn();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, countdown]);

  const finishGameTurn = async () => {
    setGameState(GameState.RESULT);
    
    // 1. Get final user move
    let userFinalMove = currentGesture;
    // Fallback if detection failed or ambiguous
    if (userFinalMove === Gesture.UNKNOWN || userFinalMove === Gesture.NONE) {
      // For gameplay flow, if we can't detect, let's default to ROCK or handle error.
      // Here we'll count it as unknown and auto-lose or draw. Let's treat UNKNOWN as a loss to CPU for simplicity or just "None".
      // A better UX: If UNKNOWN, maybe ask to retry? Let's proceed with whatever is currently in state.
    }

    // 2. CPU Move
    const cpuFinalMove = getRandomGesture();

    // 3. Calculate Winner
    let winner: 'user' | 'cpu' | 'draw' = 'draw';
    if (userFinalMove === Gesture.UNKNOWN || userFinalMove === Gesture.NONE) {
      winner = 'cpu'; // Penalty for bad gesture
    } else {
      winner = determineWinner(userFinalMove, cpuFinalMove);
    }

    // 4. Update Score
    if (winner === 'user') setScore(s => ({ ...s, user: s.user + 1 }));
    if (winner === 'cpu') setScore(s => ({ ...s, cpu: s.cpu + 1 }));

    const gameResult: GameResult = {
      userMove: userFinalMove,
      cpuMove: cpuFinalMove,
      winner
    };
    setResult(gameResult);

    // 5. Fetch Gemini Commentary
    if (process.env.API_KEY) {
        setLoadingCommentary(true);
        const comment = await generateGameCommentary(userFinalMove, cpuFinalMove, winner);
        setAiCommentary(comment);
        setLoadingCommentary(false);
    } else {
        setAiCommentary(winner === 'user' ? "¡Ganaste!" : winner === 'cpu' ? "La máquina gana." : "Empate.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-6xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 mb-2">
          GestuRock AI
        </h1>
        <p className="text-slate-400">Piedra, Papel o Tijera vs CPU con Visión Artificial</p>
      </header>

      {/* Main Arena */}
      <div className="flex flex-col lg:flex-row gap-8 items-center justify-center w-full max-w-6xl">
        
        {/* Player Side */}
        <div className="flex flex-col items-center gap-4 relative">
            <div className="absolute -top-12 left-0 bg-blue-600 px-4 py-1 rounded-full text-sm font-bold tracking-wider shadow-lg border border-blue-400">
                TÚ: {score.user}
            </div>
            {gameState === GameState.LOADING_MODEL ? (
                <div className="w-full max-w-md aspect-[4/3] bg-slate-800 rounded-2xl flex flex-col items-center justify-center border-4 border-slate-700 animate-pulse">
                    <RefreshCw className="w-12 h-12 text-slate-500 animate-spin mb-4" />
                    <span className="text-slate-400 font-medium">Cargando IA Vision...</span>
                </div>
            ) : (
                <CameraView 
                    gameState={gameState} 
                    onGestureDetected={handleGestureDetected}
                    currentDetectedGesture={currentGesture}
                />
            )}
        </div>

        {/* Center Status / VS */}
        <div className="flex flex-col items-center justify-center w-full max-w-[200px] h-32 lg:h-auto gap-4 z-10">
            {gameState === GameState.COUNTDOWN && (
                <div className="text-8xl font-black text-yellow-400 font-display animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                    {countdown}
                </div>
            )}
            
            {gameState === GameState.IDLE && (
                <button 
                    onClick={startGame}
                    className="bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-400 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transform transition-all hover:scale-110 flex items-center gap-2"
                >
                    <Play className="w-6 h-6 fill-current" />
                    JUGAR
                </button>
            )}

            {gameState === GameState.RESULT && (
                <button 
                    onClick={startGame}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-full transition-colors flex items-center gap-2 border border-slate-500"
                >
                    <RefreshCw className="w-5 h-5" />
                    Reiniciar
                </button>
            )}
        </div>

        {/* CPU Side */}
        <div className="flex flex-col items-center gap-4 relative">
             <div className="absolute -top-12 right-0 bg-red-600 px-4 py-1 rounded-full text-sm font-bold tracking-wider shadow-lg border border-red-400">
                CPU: {score.cpu}
            </div>
            <div className={`w-full max-w-md aspect-[4/3] rounded-2xl flex flex-col items-center justify-center border-4 relative overflow-hidden transition-colors duration-500
                ${gameState === GameState.RESULT && result?.winner === 'cpu' ? 'border-green-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}
                ${gameState === GameState.RESULT && result?.winner === 'user' ? 'border-red-500 opacity-80' : ''}
            `}>
                {gameState === GameState.RESULT && result ? (
                    <div className="flex flex-col items-center animate-in zoom-in duration-300">
                        <span className="text-[8rem] leading-none filter drop-shadow-lg">
                            {GESTURE_EMOJIS[result.cpuMove]}
                        </span>
                        <span className="text-2xl font-display font-bold mt-4 text-slate-300">
                            {result.cpuMove}
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center opacity-50">
                        <Cpu className="w-24 h-24 text-slate-600 mb-4" />
                        <span className="text-slate-500 font-display text-xl">Esperando...</span>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Result & Commentary Section */}
      {gameState === GameState.RESULT && result && (
        <div className="mt-12 w-full max-w-3xl animate-in slide-in-from-bottom-10 duration-500">
             <div className={`p-8 rounded-3xl text-center border-2 shadow-2xl relative overflow-hidden
                ${result.winner === 'user' ? 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-500/50' : 
                  result.winner === 'cpu' ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50 border-red-500/50' : 
                  'bg-slate-800/50 border-slate-600/50'}
             `}>
                <div className="relative z-10">
                    <h2 className="text-5xl font-display font-black mb-4 uppercase tracking-tighter">
                        {result.winner === 'user' ? '¡VICTORIA!' : result.winner === 'cpu' ? 'DERROTA' : 'EMPATE'}
                    </h2>
                    
                    <div className="bg-black/30 rounded-xl p-6 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center justify-center gap-2 mb-2 text-yellow-400 text-sm uppercase font-bold tracking-widest">
                             <Trophy className="w-4 h-4" /> Comentario de la IA
                        </div>
                        {loadingCommentary ? (
                            <div className="flex justify-center space-x-2">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        ) : (
                            <p className="text-xl md:text-2xl italic text-slate-200 font-serif">
                                "{aiCommentary}"
                            </p>
                        )}
                    </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default GameEngine;