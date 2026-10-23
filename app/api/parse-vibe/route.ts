import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vibe = body?.vibe;

    if (!vibe || typeof vibe !== "string") {
      return NextResponse.json(
        { error: "A valid text query is required." },
        { status: 400 }
      );
    }

    const sanitizedVibe = vibe.trim();

    if (sanitizedVibe.length === 0) {
      return NextResponse.json(
        { error: "Query cannot be empty." },
        { status: 400 }
      );
    }

    if (sanitizedVibe.length > 200) {
      return NextResponse.json(
        { error: "Query exceeds maximum limit of 200 characters." },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a master perfumer and fragrance database query parser.
          
          Analyze the user's request and return a JSON object with:
          1. "ai_reasoning": A 2-sentence explanation of what scent profile fits this request.
          2. "main_accords": Array of 3-5 descriptive accords for display.
          3. "search_terms": Array of database search terms. Always include macro-accord families for specific notes (e.g. if user asks for "mango", include ["mango", "tropical", "fruity", "sweet"]).
          4. "primary_note": The single core key note requested (e.g., "mango", "coffee", "vanilla"). If none, return null.
          5. "brand": If a brand or acronym is mentioned (e.g., "LV"), return the full official brand name ("Louis Vuitton"). Otherwise, null.
          6. "image_keyword": 1-3 word query for mood photography.`
        },
        { role: "user", content: sanitizedVibe }
      ],
      response_format: { type: "json_object" }
    });

    const aiData = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(aiData);

  } catch (error) {
    console.error("OpenAI Parse Vibe Error:", error);
    return NextResponse.json(
      { error: "Failed to process fragrance query." },
      { status: 500 }
    );
  }
}