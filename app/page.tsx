"use client"
import { useState } from "react"

export default function Home() {
  const [vibe, setVibe] = useState("")
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vibe) return;
    
    setIsLoading(true);
    setResult(null); // Clear previous results

    try {
      const response = await fetch("/api/parse-vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Failed to fetch from API:", error);
    } finally {
      setIsLoading(false); // Turn off the loading state
    }
  };

  return (
    <main className="p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">Olfactory Vision</h1>
      
      <form onSubmit={handleSearch} className="flex gap-4 mb-12 max-w-xl">
        <input
          type="text"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="Describe a mood or scene..."
          className="flex-1 p-4 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button 
          type="submit"
          disabled={isLoading}
          className="bg-black text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300"
        >
          {isLoading ? "Analyzing..." : "Find Scents"}
        </button>
      </form>

      {/* This block only appears AFTER the AI returns a result */}
      {result && (
        <div className="flex flex-col gap-6 max-w-xl">
          <div className="border border-gray-200 p-6 rounded-xl shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Scent Profile</h2>
            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg mb-4 text-sm leading-relaxed">
              {result.ai_reasoning}
            </p>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-3">Main Accords</p>
              <div className="flex gap-2 flex-wrap">
                {result.main_accords?.map((accord: string, index: number) => (
                  <span key={index} className="bg-black text-white px-3 py-1 rounded-full text-xs">
                    {accord}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-3">Target Visual Vibe</p>
              <p className="text-gray-800 font-medium italic">"{result.image_keyword}"</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}