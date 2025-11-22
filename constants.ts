import { Gesture } from './types';

// Map gestures to Emojis
export const GESTURE_EMOJIS: Record<Gesture, string> = {
  [Gesture.ROCK]: '✊',
  [Gesture.PAPER]: '✋',
  [Gesture.SCISSORS]: '✌️',
  [Gesture.UNKNOWN]: '❓',
  [Gesture.NONE]: '',
};

// Gemini Model Configuration
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_SYSTEM_INSTRUCTION = `
Eres un comentarista ingenioso y sarcástico de un juego de Piedra, Papel, Tijera. 
Tu trabajo es dar una respuesta de una sola frase muy corta (máximo 15 palabras) reaccionando al resultado del juego.
Sé divertido. Si gana la CPU, presume un poco. Si gana el humano, pon una excusa o felicítalo a regañadientes.
`;

// Game Logic
export const COUNTDOWN_SECONDS = 3;
