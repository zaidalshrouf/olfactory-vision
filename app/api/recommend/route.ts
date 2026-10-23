import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vibe, candidateFragrances } = body;

    if (!vibe || !Array.isArray(candidateFragrances)) {
      return NextResponse.json(
        { error: "Invalid payload parameters." },
        { status: 400 }
      );
    }

    if (candidateFragrances.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    const cappedCandidates = candidateFragrances.slice(0, 10);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 250,
      messages: [
        {
          role: "system",
          content: `You are a master perfumer selecting the top 5 fragrance matches from a candidates list.

Select the 5 best matches based on scent profile ('accords') and requested vibe.
Return a JSON object with a "matches" array containing objects with: id, brand, name, accords, matchPercentage.`
        },
        {
          role: "user",
          content: `Vibe: "${vibe.slice(0, 200)}"\nCandidates: ${JSON.stringify(cappedCandidates)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const rankData = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(rankData);

  } catch (error) {
    console.error("Reranker Error:", error);
    return NextResponse.json(
      { error: "Failed to rank candidate fragrances." },
      { status: 500 }
    );
  }
}