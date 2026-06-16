import { NextRequest, NextResponse } from "next/server";
import { getGemini } from "@/lib/gemini";
import { Type } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { category = "any" } = body;

    const t0 = Date.now();
    const ai = getGemini();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a funny, clean joke about the category: "${category}". It must have a clear setup and punchline.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "The category or theme of the joke.",
            },
            setup: {
              type: Type.STRING,
              description: "The joke's opening or question.",
            },
            punchline: {
              type: Type.STRING,
              description: "The funny resolution/answer to the joke.",
            },
          },
          required: ["category", "setup", "punchline"],
        },
      },
    });

    const latencyMs = Date.now() - t0;
    const resultText = response.text || "{}";

    let jokeData;
    try {
      jokeData = JSON.parse(resultText);
    } catch {
      jokeData = {
        category: category,
        setup: "Why do programmers wear glasses?",
        punchline: "Because they cannot C#!",
      };
    }

    return NextResponse.json({
      success: true,
      data: jokeData,
      meta: {
        latencyMs,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("API Error in /api/generate/joke:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An error occurred during joke generation.",
      },
      { status: 500 }
    );
  }
}
