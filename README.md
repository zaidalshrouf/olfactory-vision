# Olfactory Vision — AI Fragrance Discovery Engine

A full-stack fragrance discovery web application that translates natural language sensory descriptions, specific notes, and brand acronyms into curated perfume recommendations using a two-stage hybrid retrieval and LLM reranking pipeline.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=flat-square&logo=openai)

---

## Key Features

- **Sensory Vibe Parsing:** Converts open-ended prompts (*"reading books by a fireplace"*, *"fresh summer LV fragrance"*) into structured accord profiles and atmospheric mood imagery.
- **Brand & Acronym Resolution:** Automatically resolves abbreviations (`LV` → `Louis Vuitton`, `YSL` → `Yves Saint Laurent`) prior to database querying.
- **Note-to-Accord Expansion:** Maps specific ingredient searches (e.g., `mango`) to macro-accord families (`Tropical`, `Fruity`, `Sweet`) to overcome rigid array-matching limits.
- **Two-Stage Hybrid Search Pipeline:**
  1. **Stage 1 (PostgreSQL + JS Pre-Scoring):** Executes parallel lookups across `brand`, `name`, and `accords` in Supabase, then ranks candidates using weighted relevance scoring.
  2. **Stage 2 (LLM Semantic Reranker):** Uses OpenAI `gpt-4o-mini` in strict JSON mode to select the top 5 contextual matches.
- **Sub-300ms Fast-Path Bypass:** Detects high-confidence direct title or brand matches (`score >= 10`) and returns results immediately without invoking the Stage 2 reranker.
- **Interactive UI & Persisted Wishlist:** Includes visual longevity/sillage performance bars, minimum longevity filtering, a fragrance detail modal, and `localStorage` wishlist persistence.
- **API Guardrails:** Enforces server-side input sanitization, 200-character query limits, candidate payload caps, and strict `max_tokens` ceilings.

---

## Architecture Pipeline

```text
[ User Prompt ]
       │
       ▼
┌──────────────────────┐
│  /api/parse-vibe     │ ──> OpenAI GPT-4o-mini
└──────────────────────┘      (Extracts brand, primary note, expanded accords)
       │
       ▼
┌──────────────────────┐
│ Supabase PostgreSQL  │ ──> Multi-Query Retrieval (Brand + Name + Accords)
└──────────────────────┘
       │
       ▼
┌──────────────────────┐
│ JS Relevance Scorer  │ ──> Weights & Sorts Candidate Pool
└──────────────────────┘
       │
  ┌────┴──────────────────────────┐
  │ Direct Match (Score >= 10)?   │
 YES                             NO
  │                               │
  ▼                               ▼
[ Instant Return (<300ms) ]  ┌──────────────────────┐
                             │  /api/recommend      │ ──> OpenAI Reranker
                             └──────────────────────┘
                                    │
                                    ▼
                          [ Top 5 Ranked Matches ]
```

---

## Local Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone [https://github.com/your-username/olfactory-vision.git](https://github.com/your-username/olfactory-vision.git)
   cd olfactory-vision
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
