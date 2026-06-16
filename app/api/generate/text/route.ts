import { NextRequest, NextResponse } from "next/server";
import { getGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, systemInstruction, temperature = 0.7 } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A valid 'prompt' string is required in the request body." },
        { status: 400 }
      );
    }

    const t0 = Date.now();
    const ai = getGemini();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are a helpful, precise API assistant.",
        temperature: Number(temperature),
      },
    });

    const latencyMs = Date.now() - t0;
    const generatedText = response.text || "";

    return NextResponse.json({
      success: true,
      data: {
        text: generatedText,
        model: "gemini-3.5-flash",
        charCount: generatedText.length,
        wordCount: generatedText.split(/\s+/).filter(Boolean).length,
      },
      meta: {
        latencyMs,
        timestamp: new Date().toISOString(),
        version: "v1",
      },
    });
  } catch (err: any) {
    console.error("API Error in /api/generate/text:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An error occurred during text generation.",
        status: 500,
      },
      { status: 500 }
    );
  }
}
