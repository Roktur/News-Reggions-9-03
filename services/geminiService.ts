import { GoogleGenAI } from "@google/genai";

// Mapping user request for "Nano Banana 2" to the specific model ID
export const generateInfographic = async (
  topic: string, 
  styleDescription: string, 
  aspectRatio: string, 
  modelName: string,
  quality: string = "1K",
  watermarkText?: string,
  showWatermark: boolean = true
): Promise<string> => {
  // Always create a new instance to ensure we pick up the latest API key from the environment
  // or the selection dialog if updated.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const promptBase = `
    Create a high-quality, educational infographic image.
    Topic: ${topic}
    
    VISUAL STYLE INSTRUCTIONS:
    ${styleDescription}
    
    CRITICAL REQUIREMENTS:
    1. Language: All text MUST be in RUSSIAN language (Русский язык).
    2. Accuracy: Ensure spelling and grammar are perfect.
    3. Accessibility: The content must be easy to understand for all ages.
    4. Layout: Clear hierarchy, using icons and large text for key points.
    5. Temporal Context: The current year is 2026. Use this ONLY for background context. DO NOT explicitly write "2026" on the image unless the user's topic specifically includes it. Do not invent dates.
    6. Text Additions: You MUST include the main text provided in the "Topic". You MAY add short, punchy extra text (like labels, callouts, reactions, or short facts) IF AND ONLY IF it is highly relevant to the topic and directly enhances the message. DO NOT add random, meaningless, or hallucinated text just to fill space. Any added text must make logical sense in the context of the news.
    7. No Watermarks: DO NOT include any watermarks, logos, or signatures on the image. The image should be clean of any branding or credits.
    
    Do not produce photorealistic images unless the style specifically requests it. Focus on graphic design, clarity, and the requested aesthetic.
  `;

  let attempts = 0;
  const maxAttempts = 6; // Еще больше попыток
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Список моделей для ротации в случае сбоев
  const modelRotation = [
    modelName,
    modelName.includes('pro') ? 'gemini-3.1-flash-image-preview' : 'gemini-3-pro-image-preview'
  ];

  while (attempts < maxAttempts) {
    try {
      // Ротируем модель на 4-й и 5-й попытках
      const currentModel = (attempts >= 3) ? modelRotation[1] : modelRotation[0];
      
      let currentPrompt = promptBase;

      // Прогрессивное упрощение промпта
      if (attempts === 2) {
        currentPrompt = `
          High-quality infographic about: ${topic}
          Style: ${styleDescription}
          Requirements: Russian language text, clear icons, no watermarks.
        `;
      } else if (attempts >= 3) {
        // Максимальное упрощение для обхода внутренних ошибок рендеринга
        currentPrompt = `Infographic: ${topic}. Style: ${styleDescription}. Text in Russian.`;
      }

      // Слегка варьируем промпт, чтобы избежать кэширования ошибки на стороне API
      const variedPrompt = `${currentPrompt}\n\n(ID: ${Math.random().toString(36).substring(2, 9)})`;

      // На последних попытках пробуем уменьшить разрешение
      let currentImageSize = quality;
      if (attempts >= 2 && currentModel.includes('flash') && (quality === '2K' || quality === '4K')) {
        currentImageSize = "1K";
      } 
      if (attempts >= 4 && currentModel.includes('flash')) {
        currentImageSize = "512px";
      }

      const response = await ai.models.generateContent({
        model: currentModel,
        contents: {
          parts: [{ text: variedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: currentImageSize as any,
          },
        },
      });

      const candidate = response.candidates?.[0];
      
      if (!candidate) {
        throw new Error("Модель не вернула ни одного варианта ответа.");
      }

      const finishReason = candidate.finishReason;
      
      // Если это IMAGE_OTHER, пробуем еще раз
      if (finishReason === 'IMAGE_OTHER' && attempts < maxAttempts - 1) {
        attempts++;
        const backoffDelay = Math.pow(1.5, attempts) * 1000;
        console.warn(`Попытка ${attempts} не удалась (IMAGE_OTHER), модель: ${currentModel}. Повтор...`);
        await delay(backoffDelay);
        continue; 
      }

      if (finishReason === 'SAFETY') {
        throw new Error("Запрос заблокирован фильтрами безопасности. Попробуйте изменить тему или описание.");
      }
      if (finishReason === 'RECITATION') {
        throw new Error("Запрос заблокирован из-за обнаружения защищенного авторским правом контента.");
      }

      const parts = candidate.content?.parts;
      
      if (!parts || parts.length === 0) {
        if (finishReason && finishReason !== 'STOP') {
          throw new Error(`Генерация прервана. Причина: ${finishReason}`);
        }
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
      const isImageOther = error.message && error.message.includes("IMAGE_OTHER");
      
      if (attempts >= maxAttempts - 1 || !isImageOther) {
        console.error("Gemini API Error:", error);
        if (error.message && error.message.includes("Requested entity was not found")) {
          throw new Error("Ошибка API ключа: Пожалуйста, выберите валидный проект/ключ.");
        }
        throw new Error(error.message || "Не удалось создать инфографику.");
      }
      
      attempts++;
      const backoffDelay = Math.pow(1.5, attempts) * 1000;
      await delay(backoffDelay);
    }
  }
  
  throw new Error("Не удалось создать изображение после нескольких попыток.");
};

export const rewriteText = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Ты профессиональный редактор. Твоя задача - переписать (сделать рерайт) предоставленного текста на русском языке.
      
      Контекст времени: Сейчас 2026 год. Используй это ТОЛЬКО для правильного понимания относительного времени (например, чтобы понять, что "в прошлом году" = 2025). КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ добавлять упоминание 2026 года или других дат в текст, если их не было в исходнике или они не требуются по смыслу. Не придумывай даты.
      
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