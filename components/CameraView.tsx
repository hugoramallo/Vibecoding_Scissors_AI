import React, { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { detectGestureFromVideo } from '../services/gestureService';
import { Gesture, GameState, Landmark } from '../types';
import { GESTURE_EMOJIS } from '../constants';

interface CameraViewProps {
  gameState: GameState;
  onGestureDetected: (gesture: Gesture) => void;
  currentDetectedGesture: Gesture;
}

const CameraView: React.FC<CameraViewProps> = ({ gameState, onGestureDetected, currentDetectedGesture }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: Landmark[]) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    // Style
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Colors
    const COLOR_BONE = '#00f3ff'; // Cyan Neon
    const COLOR_JOINT = '#ff00ff';   // Magenta Neon

    // MediaPipe Hand connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],           // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],           // Index
      [0, 9], [9, 10], [10, 11], [11, 12],      // Middle
      [0, 13], [13, 14], [14, 15], [15, 16],    // Ring
      [0, 17], [17, 18], [18, 19], [19, 20],    // Pinky
      [5, 9], [9, 13], [13, 17]                 // Palm base
    ];

    // Draw Bones (Lines)
    ctx.strokeStyle = COLOR_BONE;
    ctx.beginPath();
    connections.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
    });
    ctx.stroke();

    // Draw Joints (Points)
    ctx.fillStyle = COLOR_JOINT;
    landmarks.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const runDetection = () => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4
    ) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Set canvas dimensions to match video
      if (canvasRef.current) {
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;
      }

      const timestamp = performance.now();
      const { gesture, landmarks } = detectGestureFromVideo(video, timestamp);
      
      // Update parent state with gesture
      onGestureDetected(gesture);

      // Draw on Canvas if we have landmarks
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          if (landmarks.length > 0) {
            drawHandSkeleton(ctx, landmarks);
          } else {
            ctx.clearRect(0, 0, videoWidth, videoHeight);
          }
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(runDetection);
  };

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(runDetection);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,243,255,0.3)] border-2 border-slate-700 bg-black">
      <Webcam
        ref={webcamRef}
        audio={false}
        mirrored={true}
        className="absolute inset-0 w-full h-full object-cover"
        videoConstraints={{
          facingMode: "user",
          width: 640,
          height: 480
        }}
      />
      
      {/* Canvas for MediaPipe Drawing */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
        style={{ transform: 'scaleX(-1)' }} // Mirror the canvas to match mirrored webcam
      />

      {/* Overlay for Detected Gesture */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/30 flex items-center gap-3 transition-all duration-300 z-10 shadow-lg whitespace-nowrap">
        <span className="text-cyan-400 text-[10px] uppercase tracking-widest font-bold">
          TU MANO
        </span>
        <span className="text-xl font-bold text-white min-w-[60px] text-center">
          {currentDetectedGesture !== Gesture.NONE ? currentDetectedGesture : "--"}
        </span>
        <span className="text-2xl">
          {GESTURE_EMOJIS[currentDetectedGesture] || ''}
        </span>
      </div>

      {/* Visual Feedback Overlay during Countdown */}
      {gameState === GameState.COUNTDOWN && (
        <div className="absolute inset-0 border-[6px] border-yellow-500/60 animate-[pulse_0.5s_ease-in-out_infinite] rounded-2xl pointer-events-none z-20" />
      )}
    </div>
  );
};

export default CameraView;