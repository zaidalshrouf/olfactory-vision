"use client"
import { useState } from "react"

const dummyFragrances = [
  {
    id: 1,
    brand: "French Avenue",
    name: "Liquid Brun",
    ai_reasoning: "Test",
    top_notes: ["Cinnamon", "Orange Blossom", "Cardamom", "Bergamot"],
    middle_notes: ["Bourbon Vanilla", "Elemi"],
    base_notes: ["Praline", "Ambroxan", "Musk", "Guaiac Wood"],
    longevity: "Long lasting",
    projection: "Strong",
    sillage: "Strong"
  }
]

export default function Home() {
  const [vibe, setVibe] = useState("")

  return (
    <main className="p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">Olfactory Vision</h1>
      
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          console.log("User searched for:", vibe);
        }} 
        className="flex gap-4 mb-12 max-w-xl"
      >
        <input
          type="text"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="Describe a mood or scene..."
          className="flex-1 p-4 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button 
          type="submit"
          className="bg-black text-white px-8 py-4 rounded-xl font-medium hover:bg-gray-800 transition-colors"
        >
          Find Scents
        </button>
      </form>

      <div className="flex flex-col gap-6 max-w-xl">
        {dummyFragrances.map((fragrance) => (
          <div key={fragrance.id} className="border border-gray-200 p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{fragrance.brand}</p>
            <h2 className="text-2xl font-bold mb-2">{fragrance.name}</h2>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{fragrance.ai_reasoning}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-sm text-gray-600">
              <p><strong>Longevity:</strong> {fragrance.longevity}</p>
              <p><strong>Projection:</strong> {fragrance.projection}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}