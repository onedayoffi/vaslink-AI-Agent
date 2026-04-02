import { GoogleGenAI, Type } from "@google/genai";

const PRO_MODEL = "gemini-3.1-pro-preview";
const TRIAL_MODEL = "gemini-3.1-flash-lite-preview";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface UserMemory {
  design?: string;
  coding?: string;
  behavior?: string;
}

export async function* generateCodeStream(
  messages: Message[], 
  systemInstruction: string, 
  isPro: boolean = false,
  customApiKey?: string,
  engine: "gemini" | "deepseek" = "gemini",
  memory?: UserMemory
) {
  const memoryContext = memory ? `
[PERSISTENT MEMORY]
- Design Preferences: ${memory.design || "None recorded yet"}
- Coding Style: ${memory.coding || "None recorded yet"}
- User Info & Behavior: ${memory.behavior || "None recorded yet"}
` : "";

  const fullSystemInstruction = `${systemInstruction}\n${memoryContext}`;

  if (engine === "gemini") {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error("GEMINI_API_KEY is not configured correctly. Please set it in Settings (Admin) or your .env file.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    try {
      const responseStream = await ai.models.generateContentStream({
        model: isPro ? PRO_MODEL : TRIAL_MODEL,
        contents,
        config: {
          systemInstruction: isPro 
            ? `${fullSystemInstruction}\n\n[PRO MODE ENABLED] You are in HIGH-PERFORMANCE mode. Every line of code must be industry-standard. Focus on: 1. Visual perfection (Dribbble/Awwwards level). 2. Persuasive and complete copywriting. 3. Advanced CSS (animations, glassmorphism, responsive grids). 4. Clean and secure backend logic. 5. PERFECT RESPONSIVENESS: Follow the [RESPONSIVE DESIGN RULES] strictly, ensuring 2-column grids for products and tight typography on mobile. Do not simplify anything.`
            : `${fullSystemInstruction}\n\n[TRIAL MODE] Provide quick and efficient code. Focus on core functionality.`,
          temperature: isPro ? 0.8 : 0.6,
          topP: 0.95,
          topK: 40,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      console.error("Gemini Streaming Error:", error);
      throw error;
    }
  } else {
    // DeepSeek Streaming implementation
    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "your_deepseek_api_key_here") {
      throw new Error("DEEPSEEK_API_KEY is not configured correctly. Please set it in Settings (Admin) or your .env file.");
    }

    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: fullSystemInstruction },
            ...messages
          ],
          temperature: isPro ? 0.7 : 0.5,
          max_tokens: 4096,
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DeepSeek API Error: ${errorData.error?.message || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to get response reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") return;
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content;
              if (content) yield content;
            } catch (e) {
              console.error("Error parsing stream line:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("DeepSeek Streaming Error:", error);
      throw error;
    }
  }
}

export async function extractMemory(
  messages: Message[],
  currentMemory: UserMemory,
  customApiKey?: string
): Promise<UserMemory | null> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
Analyze the following conversation and extract updated persistent memory for the user.
Current Memory:
- Design: ${currentMemory.design || "None"}
- Coding: ${currentMemory.coding || "None"}
- Behavior/Info: ${currentMemory.behavior || "None"}

Conversation:
${messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

Instructions:
1. Extract new design preferences (colors, fonts, style).
2. Extract new coding preferences (languages, frameworks, style).
3. Extract new personal info (name, job, birthday) or behavior patterns.
4. If no new information is found for a category, keep the current memory.
5. Return the updated memory in JSON format.
`;

  try {
    const response = await ai.models.generateContent({
      model: TRIAL_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            design: { type: Type.STRING },
            coding: { type: Type.STRING },
            behavior: { type: Type.STRING }
          },
          required: ["design", "coding", "behavior"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Memory Extraction Error:", error);
    return null;
  }
}

export async function generateCode(
  messages: Message[], 
  systemInstruction: string, 
  isPro: boolean = false,
  customApiKey?: string,
  engine: "gemini" | "deepseek" = "gemini"
) {
  if (engine === "gemini") {
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error("GEMINI_API_KEY is not configured correctly. Please set it in Settings (Admin) or your .env file.");
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
  } else {
    // DeepSeek implementation
    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "your_deepseek_api_key_here") {
      throw new Error("DEEPSEEK_API_KEY is not configured correctly. Please set it in Settings (Admin) or your .env file.");
    }

    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemInstruction },
            ...messages
          ],
          temperature: isPro ? 0.7 : 0.5,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DeepSeek API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("DeepSeek API Error:", error);
      throw error;
    }
  }
}

// Placeholder for DeepSeek if implemented via server-side proxy
// Since we are client-side only by default, and DeepSeek requires a key,
// we'd normally need a backend to keep it safe. 
// For now, we'll focus on Gemini as the primary engine.
