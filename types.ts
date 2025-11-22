export enum GameState {
  LOADING_MODEL = 'LOADING_MODEL',
  IDLE = 'IDLE',
  COUNTDOWN = 'COUNTDOWN',
  DETECTING = 'DETECTING',
  RESULT = 'RESULT',
}

export enum Gesture {
  ROCK = 'Piedra',
  PAPER = 'Papel',
  SCISSORS = 'Tijera',
  UNKNOWN = 'Desconocido',
  NONE = 'Ninguno',
}

export interface GameResult {
  userMove: Gesture;
  cpuMove: Gesture;
  winner: 'user' | 'cpu' | 'draw';
  message?: string;
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
}