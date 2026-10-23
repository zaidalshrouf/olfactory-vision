import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();

    if (!keyword) {
      return NextResponse.json({ error: "Keyword required" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        keyword
      )}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    const data = await res.json();
    const imageUrl = data.results[0]?.urls?.regular || null;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Unsplash API error:", error);
    return NextResponse.json({ imageUrl: null }, { status: 500 });
  }
}