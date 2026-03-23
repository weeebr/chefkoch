# culinary

Mobile-only single-page UI; see [PROJECT_INSTRUCTIONS.md](./PROJECT_INSTRUCTIONS.md) for navigation, tokens, and constraints (no responsive/desktop layout variants in `src/`).

Vite + React + TypeScript + Tailwind. `src/App.tsx` is the starting point.

**Groq:** Under Settings, paste an API key from [console.groq.com](https://console.groq.com/) (stored in plain text in the browser). On Zutaten, select chips, optionally check **Auch einkaufen**, then **Neue Rezepte generieren** — the model follows [recipe-generator-draft.md](./recipe-generator-draft.md) and returns **three** recipes as structured JSON (mapped into the app’s recipe types). The app calls Groq via a **same-origin proxy** (`/api/groq`): run **`npm run dev`** locally (Vite proxies to Groq), or deploy to **Vercel** (serverless `api/groq.ts`; linked project: **`chefkoch`** — production: [chefkoch.vercel.app](https://chefkoch.vercel.app)). Opening `dist/index.html` from disk will not work for generation.
