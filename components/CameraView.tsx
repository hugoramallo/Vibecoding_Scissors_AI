import React, { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { detectGestureFromVideo } from '../services/gestureService';
import { Gesture, GameState } from '../types';
import { GESTURE_EMOJIS } from '../constants';

interface CameraViewProps {
  gameState: GameState;
  onGestureDetected: (gesture: Gesture) => void;
  currentDetectedGesture: Gesture;
}

const CameraView: React.FC<CameraViewProps> = ({ gameState, onGestureDetected, currentDetectedGesture }) => {
  const webcamRef = useRef<Webcam>(null);
  const animationFrameRef = useRef<number | null>(null);

  const runDetection = () => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const timestamp = performance.now();
      const gesture = detectGestureFromVideo(video, timestamp);
      onGestureDetected(gesture);
    }
    animationFrameRef.current = requestAnimationFrame(runDetection);
  };

  useEffect(() => {
    // Start detection loop when component mounts
    animationFrameRef.current = requestAnimationFrame(runDetection);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700 bg-black">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={true}
        className="w-full h-full object-cover"
        videoConstraints={{
          facingMode: "user",
          width: 640,
          height: 480
        }}
      />
      
      {/* Overlay for Detected Gesture */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 flex items-center gap-3 transition-all duration-300">
        <span className="text-white text-sm uppercase tracking-wider font-semibold">
          Detectando:
        </span>
        <span className="text-2xl font-bold text-yellow-400">
          {currentDetectedGesture !== Gesture.NONE ? currentDetectedGesture : "..."}
        </span>
        <span className="text-3xl">
          {GESTURE_EMOJIS[currentDetectedGesture] || ''}
        </span>
      </div>

      {/* Visual Feedback Overlay during Countdown */}
      {gameState === GameState.COUNTDOWN && (
        <div className="absolute inset-0 border-8 border-yellow-500/50 animate-pulse rounded-2xl pointer-events-none" />
      )}
    </div>
  );
};

export default CameraView;