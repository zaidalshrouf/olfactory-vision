import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { vibe, candidateFragrances } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 250, 
      messages: [
        {
          role: "system",
          content: `You are a master perfumer selecting the top 5 fragrance matches from a candidates list.

RULES:
1. Select the 5 best matches based on scent profile ('accords') and requested vibe.
2. Keep "matchReason" ultra-concise (1 sentence, max 15 words).
3. Return a JSON object with a "matches" array.

JSON Output Schema:
{
  "matches": [
    {
      "id": "candidate_id",
      "brand": "Brand Name",
      "name": "Perfume Name",
      "accords": ["accord1", "accord2"],
      "matchPercentage": 95,
      "matchReason": "Ultra-short 1-sentence reason why it matches."
    }
  ]
}`
        },
        {
          role: "user",
          content: `Vibe: "${vibe}"\nCandidates: ${JSON.stringify(candidateFragrances)}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const rankData = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(rankData);

  } catch (error) {
    console.error("Reranker Error:", error);
    return NextResponse.json({ error: "Failed to rerank candidates." }, { status: 500 });
  }
}