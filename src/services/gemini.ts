import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeMeal(foodText: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 식단 설명을 분석하여 칼로리와 영양성분(탄수화물, 단백질, 지방 - g 단위)을 추정해줘. 모든 결과는 반드시 한국어로 작성해야 해.
    식단: "${foodText}"
    데이터는 JSON 형식으로 반환해줘.`,
    config: {
      systemInstruction: "너는 전문 영양사야. 모든 답변은 반드시 한국어로만 작성해. 영어를 섞지 마.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          foodName: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          isHighProtein: { type: Type.BOOLEAN }
        },
        required: ["foodName", "calories", "protein", "carbs", "fat", "isHighProtein"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function analyzeExercise(exerciseText: string, weight: number) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 운동에 대한 소모 칼로리를 추정해줘. 모든 결과는 반드시 한국어로 작성해야 해.
    사용자 체중: ${weight}kg
    운동: "${exerciseText}"
    데이터는 JSON 형식으로 반환해줘.`,
    config: {
      systemInstruction: "너는 전문 운동 코치야. 모든 답변은 반드시 한국어로만 작성해. 영어를 섞지 마.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          exerciseName: { type: Type.STRING },
          caloriesBurned: { type: Type.NUMBER },
          duration: { type: Type.NUMBER, description: "duration in minutes" }
        },
        required: ["exerciseName", "caloriesBurned", "duration"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function getRecipeRecommendation(ingredients: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `다음 재료를 사용하여 건강한 저칼로리 다이어트 레시피를 추천해줘: "${ingredients}". 
    모든 결과(이름, 재료, 조리 방법 등)는 반드시 한국어로 작성해야 해.
    반드시 다음 JSON 형식을 지켜줘: name(요리 이름), ingredients(재료 리스트), instructions(조리 단계 리스트), calories(칼로리 숫자), macros(탄단지 객체).`,
    config: {
      systemInstruction: "너는 다이어트 요리 전문가야. 모든 답변은 반드시 한국어로만 작성해. 영어를 섞지 마. 친근하고 상냥한 말투를 사용해.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          calories: { type: Type.NUMBER },
          macros: { 
            type: Type.OBJECT,
            properties: {
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
            },
            required: ["protein", "carbs", "fat"]
          },
        },
        required: ["name", "ingredients", "instructions", "calories", "macros"],
      },
    },
  });

  return JSON.parse(response.text);
}
