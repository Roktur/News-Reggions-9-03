import { GoogleGenAI } from "@google/genai";

// Mapping user request for "Nano Banana 2" to the specific model ID
export const generateInfographic = async (
  topic: string, 
  styleDescription: string, 
  aspectRatio: string, 
  modelName: string,
  watermarkText?: string,
  showWatermark: boolean = true
): Promise<string> => {
  // Always create a new instance to ensure we pick up the latest API key from the environment
  // or the selection dialog if updated.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const watermarkInstruction = `5. Watermark: DO NOT include any watermarks, logos, or signatures on the image. The image should be clean of any branding or credits.`;

  const prompt = `
    Create a high-quality, educational infographic image.
    Topic: ${topic}
    
    VISUAL STYLE INSTRUCTIONS:
    ${styleDescription}
    
    CRITICAL REQUIREMENTS:
    1. Language: All text MUST be in RUSSIAN language (Русский язык).
    2. Accuracy: Ensure spelling and grammar are perfect.
    3. Accessibility: The content must be easy to understand for all ages.
    4. Layout: Clear hierarchy, using icons and large text for key points.
    ${watermarkInstruction}
    
    Do not produce photorealistic images unless the style specifically requests it. Focus on graphic design, clarity, and the requested aesthetic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: "1K",
        },
        // responseMimeType and responseSchema are NOT supported for image generation models
      },
    });

    // Check if we have candidates
    if (!response.candidates || response.candidates.length === 0) {
      // Check for finish reason if available
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error("Запрос заблокирован фильтрами безопасности. Попробуйте изменить тему.");
      }
      if (finishReason === 'RECITATION') {
        throw new Error("Запрос заблокирован из-за нарушения авторских прав.");
      }
      throw new Error("Модель не вернула ответ. Попробуйте еще раз или измените запрос.");
    }

    const parts = response.candidates[0].content?.parts;
    
    if (!parts || parts.length === 0) {
      throw new Error("Модель вернула пустой ответ (нет данных изображения).");
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const base64EncodeString = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${base64EncodeString}`;
      }
    }

    throw new Error("Данные изображения не найдены в ответе модели.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Throw a cleaner error message
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("API Key Error: Please select a valid project/key.");
    }
    throw new Error(error.message || "Failed to generate infographic.");
  }
};

export const rewriteText = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Ты профессиональный редактор. Твоя задача - переписать (сделать рерайт) предоставленного текста на русском языке.
      
      Требования:
      1. Полностью сохрани исходный смысл и факты.
      2. Сделай текст более читаемым, грамотным и стилистически согласованным.
      3. Убери тавтологию и словесный мусор.
      4. НЕ добавляй отсебятину, вступления (типа "Вот ваш текст") или заключения. Верни ТОЛЬКО переписанный текст.
      
      Исходный текст:
      ${text}`,
    });

    if (!response.text) {
      throw new Error("Пустой ответ от нейросети при переписывании текста.");
    }

    return response.text;
  } catch (error: any) {
    console.error("Rewrite Error:", error);
    if (error.message && error.message.includes("Requested entity was not found")) {
      throw new Error("Ошибка API ключа: Пожалуйста, выберите валидный проект/ключ.");
    }
    throw new Error(error.message || "Не удалось переписать текст.");
  }
};

export const checkApiKeySelection = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    return await window.aistudio.hasSelectedApiKey();
  }
  // If running outside the specific environment that supports this, assume true or handle differently
  // ideally, this app expects the specific environment.
  return !!process.env.API_KEY; 
};

export const openApiKeySelection = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    await window.aistudio.openSelectKey();
  }
};