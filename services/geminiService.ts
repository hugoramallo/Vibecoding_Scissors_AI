import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, GEMINI_SYSTEM_INSTRUCTION } from "../constants";
import { Gesture } from "../types";

let aiClient: GoogleGenAI | null = null;

const getClient = () => {
  if (!aiClient) {
    // NOTE: In a real app, never expose API keys on client side directly if not secured.
    // For this demo context, we assume process.env.API_KEY is available.
    if (process.env.API_KEY) {
      aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }
  return aiClient;
};

export const generateGameCommentary = async (
  userMove: Gesture,
  cpuMove: Gesture,
  winner: 'user' | 'cpu' | 'draw'
): Promise<string> => {
  const client = getClient();
  if (!client) return "¡Buena partida!";

  const prompt = `
    Juego: Piedra, Papel, Tijera.
    Humano: ${userMove}
    CPU: ${cpuMove}
    Ganador: ${winner === 'user' ? 'Humano' : winner === 'cpu' ? 'CPU' : 'Empate'}
  `;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        temperature: 1.0,
      }
    });

    return response.text || "¡Interesante resultado!";
  } catch (error) {
    console.error("Error fetching commentary:", error);
    return "¡Bien jugado!";
  }
};
