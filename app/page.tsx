"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [vibe, setVibe] = useState("");
  const [result, setResult] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search");

  useEffect(() => {
    const stored = localStorage.getItem("olfactory_favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load saved scents:", error);
      }
    }
  }, []);

  const toggleFavorite = (fragrance: any) => {
    let updatedFavorites: any[];
    const exists = favorites.some((item) => String(item.id) === String(fragrance.id));

    if (exists) {
      updatedFavorites = favorites.filter((item) => String(item.id) !== String(fragrance.id));
    } else {
      updatedFavorites = [...favorites, fragrance];
    }

    setFavorites(updatedFavorites);
    localStorage.setItem("olfactory_favorites", JSON.stringify(updatedFavorites));
  };

  const isFavorite = (id: string | number) => {
    return favorites.some((item) => String(item.id) === String(id));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vibe.trim()) return;

    setIsLoading(true);
    setResult(null);
    setMatches([]);
    setImageUrl(null);

    try {
      const response = await fetch("/api/parse-vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe }),
      });

      if (!response.ok) throw new Error("Failed to parse vibe.");
      const aiData = await response.json();
      setResult(aiData);

      if (aiData.image_keyword) {
        fetch("/api/get-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: aiData.image_keyword }),
        })
          .then((res) => res.json())
          .then((imgData) => {
            if (imgData.imageUrl) setImageUrl(imgData.imageUrl);
          })
          .catch((err) => console.error("Image fetch error:", err));
      }

      const rawTerms: string[] = aiData.search_terms || [];
      const primaryNote = (aiData.primary_note || vibe).toLowerCase();
      const targetBrand = aiData.brand || null;

      const searchTerms = Array.from(
        new Set([
          ...rawTerms,
          ...rawTerms.map((t) => t.toLowerCase()),
          ...rawTerms.map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()),
        ])
      );

      const candidateMap = new Map<string | number, any>();

      if (targetBrand) {
        const { data: brandMatches } = await supabase
          .from("fragrances")
          .select("id, brand, name, accords, longevity_avg, sillage_avg")
          .ilike("brand", `%${targetBrand}%`)
          .limit(30);

        (brandMatches || []).forEach((item) => candidateMap.set(item.id, item));
      }

      if (primaryNote.length > 2) {
        const { data: nameMatches } = await supabase
          .from("fragrances")
          .select("id, brand, name, accords, longevity_avg, sillage_avg")
          .ilike("name", `%${primaryNote}%`)
          .limit(20);

        (nameMatches || []).forEach((item) => candidateMap.set(item.id, item));
      }

      const { data: accordMatches } = await supabase
        .from("fragrances")
        .select("id, brand, name, accords, longevity_avg, sillage_avg")
        .overlaps("accords", searchTerms)
        .limit(40);

      (accordMatches || []).forEach((item) => {
        if (!candidateMap.has(item.id)) candidateMap.set(item.id, item);
      });

      let candidates = Array.from(candidateMap.values());

      if (candidates.length === 0) {
        const { data: fallback } = await supabase
          .from("fragrances")
          .select("id, brand, name, accords, longevity_avg, sillage_avg")
          .limit(20);
        candidates = fallback || [];
      }

      const scoredCandidates = candidates.map((item) => {
        let score = 0;
        const aName = (item.name || "").toLowerCase();
        const aBrand = (item.brand || "").toLowerCase();
        const aAccords = (Array.isArray(item.accords) ? item.accords : []).map(
          (x: string) => x.toLowerCase()
        );

        if (primaryNote && aName.includes(primaryNote)) score += 10;
        if (primaryNote && aAccords.includes(primaryNote)) score += 8;
        if (targetBrand && aBrand.includes(targetBrand.toLowerCase())) score += 10;

        searchTerms.forEach((term) => {
          const t = term.toLowerCase();
          if (aAccords.includes(t)) score += 2;
        });

        return { ...item, score };
      });

      scoredCandidates.sort((a, b) => b.score - a.score);

      const topCandidates = scoredCandidates.slice(0, 8);

      if (topCandidates.length > 0 && topCandidates[0].score >= 10) {
        const instantMatches = topCandidates.slice(0, 5).map((c) => ({
          ...c,
          matchPercentage: 98,
        }));

        setMatches(instantMatches);
        setIsLoading(false);
        return;
      }

      if (topCandidates.length > 0) {
        const payload = topCandidates.map((item) => ({
          id: item.id,
          brand: item.brand,
          name: item.name,
          accords: item.accords,
        }));

        const rankResponse = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vibe, candidateFragrances: payload }),
        });

        if (!rankResponse.ok) throw new Error("Failed to rerank candidates.");
        const rankData = await rankResponse.json();

        const candidateLookup = new Map(topCandidates.map((c) => [String(c.id), c]));
        const enrichedMatches = (rankData.matches || []).map((match: any) => {
          const fullData = candidateLookup.get(String(match.id));
          return {
            ...match,
            longevity_avg: fullData?.longevity_avg || match.longevity_avg,
            sillage_avg: fullData?.sillage_avg || match.sillage_avg,
          };
        });

        setMatches(enrichedMatches);
      }
    } catch (error) {
      console.error("Pipeline Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFragranceCard = (fragrance: any) => {
    const saved = isFavorite(fragrance.id);

    return (
      <div
        key={fragrance.id}
        className="border border-gray-200 p-5 rounded-xl shadow-sm bg-white hover:border-gray-300 transition-all relative"
      >
        <div className="flex justify-between items-start mb-2 pr-8">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              {fragrance.brand}
            </p>
            <p className="text-xl font-bold text-gray-900">{fragrance.name}</p>
          </div>
          {fragrance.matchPercentage && (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
              {fragrance.matchPercentage}% Match
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggleFavorite(fragrance)}
          className="absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-colors"
          title={saved ? "Remove from wishlist" : "Save to wishlist"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className={`w-6 h-6 ${saved ? "text-red-500" : "text-gray-400"}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>

        <div className="flex gap-1.5 flex-wrap my-3">
          {Array.isArray(fragrance.accords) &&
            fragrance.accords.map((acc: string, idx: number) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium"
              >
                {acc}
              </span>
            ))}
        </div>

        <div className="flex gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>
            Longevity:{" "}
            {typeof fragrance.longevity_avg === "number"
              ? fragrance.longevity_avg.toFixed(1)
              : fragrance.longevity_avg || fragrance.longevity || "Moderate"}
          </span>
          <span>•</span>
          <span>
            Sillage:{" "}
            {typeof fragrance.sillage_avg === "number"
              ? fragrance.sillage_avg.toFixed(1)
              : fragrance.sillage_avg || fragrance.projection || "Moderate"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <main className="p-8 font-sans max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Olfactory Vision
        </h1>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "search"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "favorites"
                ? "bg-white text-black shadow-sm"
                : "text-gray-500 hover:text-black"
            }`}
          >
            Saved Scents
            {favorites.length > 0 && (
              <span className="bg-black text-white px-1.5 py-0.5 rounded-full text-[10px]">
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "search" ? (
        <>
          <form onSubmit={handleSearch} className="flex gap-4 mb-12">
            <input
              type="text"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="Describe a mood, note, or brand (e.g. fresh LV fragrance, juicy mango)..."
              className="flex-1 p-4 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-black text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? "Analyzing..." : "Find Scents"}
            </button>
          </form>

          {result && (
            <div className="flex flex-col gap-6">
              {imageUrl && (
                <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-md">
                  <img
                    src={imageUrl}
                    alt={result.image_keyword || "Atmospheric vibe"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                    <p className="text-white text-sm font-medium italic">
                      Visual Mood: "{result.image_keyword}"
                    </p>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 p-6 rounded-xl shadow-sm bg-white">
                <h2 className="text-2xl font-bold mb-4 text-gray-900">
                  Scent Profile
                </h2>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg mb-4 text-sm leading-relaxed border border-gray-100">
                  {result.ai_reasoning}
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">
                    Main Accords
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {result.main_accords?.map((accord: string, index: number) => (
                      <span
                        key={index}
                        className="bg-black text-white px-3 py-1 rounded-full text-xs font-medium"
                      >
                        {accord}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {matches.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">
                    Recommended Matches
                  </h3>
                  <div className="flex flex-col gap-4">
                    {matches.map((fragrance) => renderFragranceCard(fragrance))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            Saved Wishlist ({favorites.length})
          </h2>
          {favorites.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-2xl">
              <p className="text-gray-500 text-sm mb-4">
                No saved fragrances in your wishlist yet.
              </p>
              <button
                onClick={() => setActiveTab("search")}
                className="bg-black text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
              >
                Discover Scents
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {favorites.map((fragrance) => renderFragranceCard(fragrance))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}