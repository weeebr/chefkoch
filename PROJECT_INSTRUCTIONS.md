# culinary — agent instructions

## Purpose

**Mobile-only** single-page React (Vite + TypeScript + Tailwind) UI matching the references in [`goal/`](goal/). Ship an MVP: visual parity with PNGs, structure and semantics from legacy HTML where useful—**not** a verbatim HTML port. **UI copy is German** (`lang="de"` in `index.html`).

The app is **not** a responsive site: do **not** add Tailwind breakpoint variants (`sm:`, `md:`, `lg:`, etc.) for alternate layouts, navigation, or typography. Do **not** hide or swap UI by viewport width. If the UI is previewed in a wide browser window, it may use a centered max-width column (`max-w-xl` is typical); that is not “desktop support”—it is still one mobile layout.

## Sources of truth (order)

1. **This repo:** Tailwind theme, `index.css`, and component boundaries are authoritative for tokens and structure.
2. **PNGs:** Visual QA against `goal/*.png`.
3. **HTML in `goal/`:** Mine copy, section groupings, labels, and one-time token values. Do **not** mirror HTML file layout or treat it as layout canon. Legacy `goal/*.html` may still contain old responsive classes (`md:`, etc.)—**do not copy those patterns into `src/`**.

## Navigation

- **One SPA.** Do **not** add `react-router-dom` or any URL router.
- Hold `activeScreen` in React state (e.g. `useState<ActiveScreen>` in `App.tsx`).
- Render `IngredientsScreen` | `RecipesScreen` | `SettingsScreen` from that state. No URL sync required for MVP.
- **No top app bar** (no header navigation, search, or brand strip). **Primary navigation** is only the shared **bottom bar** on every screen.
- **Bottom navigation:** **One** `BottomNav` component, always visible, **one** active style on every screen: soft capsule (`bg-primary-container/40`, `rounded-2xl`, etc.) as in the Recipes/Settings references—not the solid `bg-primary` tab from legacy `ingredients.html`.

## Design system

- **Tokens:** Semantic colors and fonts live only in `tailwind.config.cjs` (`primary`, `surface`, `on-surface`, containers, etc.). Avoid raw hex in JSX.
- **Fonts:** Plus Jakarta Sans for headings (`font-headline`), Be Vietnam Pro for body (`font-body`). Linked in `index.html`.
- **Icons:** Material Symbols Outlined (linked in `index.html`). Use a small `MaterialIcon` helper or consistent `span` pattern with `font-variation-settings` where fill matters.

## Mock data (swappable)

- **All** stand-in lists and entities live under **`src/mocks/`** (per-domain files + optional `index.ts` barrel).
- Export **typed** data; put shared **types** in `src/types/` (or colocated) so real API shapes can replace mocks later.
- Screens **import** from `src/mocks/`; they do **not** embed large domain literals for lists/tables.
- Later: replace mock imports with fetches or a thin data hook without rewriting presentational components.

## File layout & separation of concerns

| Concern | Location |
|--------|----------|
| Design tokens | `tailwind.config.cjs` |
| Font links | `index.html` |
| Global CSS, resets | `src/index.css` |
| Domain types | `src/types/` |
| Mock data | `src/mocks/` |
| Layout (shell, bottom nav) | `src/components/layout/` |
| Reusable UI (chips, rows, cards) | `src/components/` |
| Full screens | `src/pages/` or `src/screens/` |

Keep each file’s responsibility obvious; avoid “god” components.

## Implementation order (for new work)

1. Tokens + fonts + base CSS  
2. Types + mock modules  
3. Shell + stateful bottom nav (always visible, mobile-only)  
4. Ingredients → Recipes → Settings screens (or shell first, then screens in parallel)

## DRY rules

- Single Tailwind theme extension; no duplicated color maps.
- One `BottomNav`, one active style; no `hideFromMdUp` or breakpoint-based visibility.
- Shared primitives for repeated chips, list rows, cards.
- No duplicated mock arrays across files.

## Out of scope (unless explicitly requested)

- `react-router-dom` or any client router  
- Backend, auth, real search  
- Dark mode (optional follow-up)  
- Tests  
- **Responsive / desktop layouts** (`sm:`+ breakpoint variants for layout or navigation)

## Agent discipline

- Minimal, focused diffs; no unrelated README churn; no drive-by refactors.
- Match existing naming and patterns in this repo when editing.
