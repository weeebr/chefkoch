# culinary

Mobile-only single-page UI; see [PROJECT_INSTRUCTIONS.md](./PROJECT_INSTRUCTIONS.md) for navigation, tokens, and constraints (no responsive/desktop layout variants in `src/`).

Vite + React + TypeScript + Tailwind. `src/App.tsx` is the starting point.

**Groq:** Recipe generation is server-side only via `POST /api/generate-recipe` using `GROQ_API_KEY` from environment variables. On Zutaten, select chips, optionally check **Auch einkaufen**, then **Neue Rezepte generieren**. The backend requests one structured JSON recipe per call and the app composes the generated batch in the client state. Use `npm run dev` for local middleware routing or deploy to Vercel for the edge function endpoint.
