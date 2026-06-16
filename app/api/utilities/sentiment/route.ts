import { NextRequest, NextResponse } from "next/server";
import { getGemini } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "A valid 'text' string is required in the request body." },
        { status: 400 }
      );
    }

    const t0 = Date.now();
    const ai = getGemini();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Analyze the sentiment of the following text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              description: "Overall sentiment classification: positive, neutral, or negative.",
            },
            score: {
              type: Type.NUMBER,
              description: "Numeric score ranging from -1.0 (highly negative) to +1.0 (highly positive).",
            },
            confidence: {
              type: Type.NUMBER,
              description: "System confidence factor ranging from 0.0 to 1.0.",
            },
            summary: {
              type: Type.STRING,
              description: "A compact summary explaining the tone.",
            },
            keyPhrases: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Specific phrases in the text that indicate this sentiment score.",
            },
            suggestedResponseTone: {
              type: Type.STRING,
              description: "The recommended communication tone to adopt in response (e.g. empathetic, enthusiastic, calm, formal).",
            },
          },
          required: [
            "sentiment",
            "score",
            "confidence",
            "summary",
            "keyPhrases",
            "suggestedResponseTone",
          ],
        },
      },
    });

    const latencyMs = Date.now() - t0;
    const resultText = response.text || "{}";

    let parsedResult;
    try {
      parsedResult = JSON.parse(resultText);
    } catch (parseErr) {
      console.warn("Schema parsing fallback required:", resultText);
      parsedResult = {
        sentiment: "neutral",
        score: 0.0,
        confidence: 0.5,
        summary: "Analysis parsed successfully but had format issues.",
        keyPhrases: [],
        suggestedResponseTone: "neutral",
        raw: resultText
      };
    }

    return NextResponse.json({
      success: true,
      data: parsedResult,
      meta: {
        latencyMs,
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    });
  } catch (err: any) {
    console.error("API Error in /api/utilities/sentiment:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An error occurred during sentiment analysis.",
        status: 500,
      },
      { status: 500 }
    );
  }
}
