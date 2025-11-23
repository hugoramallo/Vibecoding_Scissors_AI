import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { Gesture, Landmark, GestureResult } from '../types';

let handLandmarker: HandLandmarker | null = null;

export const initializeHandLandmarker = async (): Promise<void> => {
  if (handLandmarker) return;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
};

export const detectGestureFromVideo = (video: HTMLVideoElement, timestamp: number): GestureResult => {
  if (!handLandmarker) return { gesture: Gesture.UNKNOWN, landmarks: [] };

  const result: HandLandmarkerResult = handLandmarker.detectForVideo(video, timestamp);

  if (!result.landmarks || result.landmarks.length === 0) {
    return { gesture: Gesture.NONE, landmarks: [] };
  }

  const landmarks = result.landmarks[0] as Landmark[]; // First detected hand
  const gesture = classifyGesture(landmarks);
  
  return { gesture, landmarks };
};

// Simple heuristic gesture classifier
const classifyGesture = (landmarks: Landmark[]): Gesture => {
  // Finger indices in MediaPipe Hand Landmark Model
  // Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20
  // Wrist: 0
  // Joints (PIP): Index 6, Middle 10, Ring 14, Pinky 18

  const wrist = landmarks[0];

  const isFingerOpen = (tipIdx: number, pipIdx: number): boolean => {
    // Simple Euclidean distance check: is tip further from wrist than PIP joint?
    const tipDist = Math.sqrt(Math.pow(landmarks[tipIdx].x - wrist.x, 2) + Math.pow(landmarks[tipIdx].y - wrist.y, 2));
    const pipDist = Math.sqrt(Math.pow(landmarks[pipIdx].x - wrist.x, 2) + Math.pow(landmarks[pipIdx].y - wrist.y, 2));
    return tipDist > pipDist * 1.1; // Add a small buffer
  };

  const isIndexOpen = isFingerOpen(8, 6);
  const isMiddleOpen = isFingerOpen(12, 10);
  const isRingOpen = isFingerOpen(16, 14);
  const isPinkyOpen = isFingerOpen(20, 18);
  
  // Rock: All fingers closed (except maybe thumb)
  if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return Gesture.ROCK;
  }

  // Paper: All fingers open
  if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
    return Gesture.PAPER;
  }

  // Scissors: Index and Middle open, others closed
  if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return Gesture.SCISSORS;
  }

  return Gesture.UNKNOWN;
};