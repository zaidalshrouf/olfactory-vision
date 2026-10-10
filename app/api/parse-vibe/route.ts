import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { vibe } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a master perfumer and fragrance data translator. 
          The user will give you a mood, scene, or memory. 
          Translate it into a structured JSON object containing:
          1. "ai_reasoning": A 2-sentence explanation of what scent profile fits this vibe.
          2. "main_accords": An array of the 3-4 main fragrance accords (e.g., ["Woody", "Amber"]).
          3. "image_keyword": A highly descriptive search term (1-3 words) that visually represents this mood. We will use this to find an atmospheric background image.
          Output ONLY valid JSON.`
        },
        { 
          role: "user", 
          content: vibe 
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiData = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(aiData);

  } catch (error) {
    console.error("OpenAI Error:", error);
    return NextResponse.json({ error: "Failed to parse the vibe." }, { status: 500 });
  }
}