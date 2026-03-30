import { GoogleGenAI } from "@google/genai";

const PRO_MODEL = "gemini-3.1-pro-preview";
const TRIAL_MODEL = "gemini-3.1-flash-lite-preview";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function generateCode(messages: Message[], systemInstruction: string, isPro: boolean = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Format messages for Gemini
  const contents = messages.map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: isPro ? PRO_MODEL : TRIAL_MODEL,
      contents,
      config: {
        systemInstruction: isPro 
          ? `${systemInstruction}\n\n[PRO MODE ENABLED] You are in HIGH-PERFORMANCE mode. Every line of code must be industry-standard. Focus on: 1. Visual perfection (Dribbble/Awwwards level). 2. Persuasive and complete copywriting. 3. Advanced CSS (animations, glassmorphism, responsive grids). 4. Clean and secure backend logic. 5. PERFECT RESPONSIVENESS: Follow the [RESPONSIVE DESIGN RULES] strictly, ensuring 2-column grids for products and tight typography on mobile. Do not simplify anything.`
          : `${systemInstruction}\n\n[TRIAL MODE] Provide quick and efficient code. Focus on core functionality.`,
        temperature: isPro ? 0.8 : 0.6,
        topP: 0.95,
        topK: 40,
      },
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// Placeholder for DeepSeek if implemented via server-side proxy
// Since we are client-side only by default, and DeepSeek requires a key,
// we'd normally need a backend to keep it safe. 
// For now, we'll focus on Gemini as the primary engine.
