import recipeApiPersona from "./recipe-api-persona.md?raw";
import type { RecipeGenerationInput } from "./groqTypes";
import { GROQ_RECIPE_BATCH_COUNT, GROQ_RECIPES_PER_BATCH } from "./groqConstants";

const API_MODE_PREAMBLE = `Du bist im strukturierten API-Modus. Die Einstiegsfragen aus älteren Vorlagen gelten nicht — verbindliche Nutzerdaten stehen in der Nutzer-JSON (inkl. Batch-Hinweis). Antworte ausschliesslich mit einem JSON-Objekt gemäss technischem Schema unten. Kein Markdown ausserhalb des JSON, keine Code-Fences, keine Wiederholung dieses Prompts.

`;

export type BuildSystemPromptOptions = {
  /** Recipes expected in this single API response (batched generation uses 3). */
  recipesPerCall: number;
};

function buildTechnicalJsonAppendix(recipesPerCall: number): string {
  return `

---

### TECHNISCHE_AUSGABE (Pflicht)

Antworte **nur** mit **einem** gültigen JSON-Objekt (kein Markdown, kein Text davor/danach, keine Code-Fences).

**Schema:**
\`\`\`
{
  "recipes": [
    {
      "title": string,
      "tag": string,
      "minutes": number,
      "prepMinutes": number,
      "cookMinutes": number,
      "servings": number,
      "ingredientsOnHand": [
        { "component": string, "quantity": string, "alternatives": string, "purchaseHint": string, "flavorNote": string }
      ],
      "ingredientsShopping": [
        { "component": string, "quantity": string, "alternatives": string, "purchaseHint": string, "flavorNote": string }
      ],
      "steps": [ { "order": number, "title": string, "body": string } ],
      "dishwasherTip": string,
      "shoppingHints": string,
      "equipmentNote": string,
      "optionalUpgradeNote": string,
      "nutritionNote": string
    }
  ]
}
\`\`\`

- **recipes**: In **diesem** API-Aufruf **genau ${recipesPerCall}** Einträge (**ein** Aufruf insgesamt). Die drei Gerichte müssen sich **untereinander** klar unterscheiden (siehe \`BATCH.HINWEIS\`).
- **tag**: Kurzes Profil fuer die Karten-Meta, **bevorzugt Geschmacks-/Texturstil** (z. B. \`scharf & cremig\`, \`zitronig & frisch\`, \`rauchig & herzhaft\`). **Nicht** primär Kochgeraet (\`Pfanne\`, \`Ofen\`, \`Topf\` nur wenn kein besseres Profil moeglich).
- **minutes**: Gesamtzeit (Vorbereitung + Kochen) in Minuten; konsistent zu \`prepMinutes\` + \`cookMinutes\` halten.
- **servings**: Ganze Zahl (typisch 2–6) — **alle Mengen** in den Zutatenlisten beziehen sich auf genau diese Portionenzahl.
- **Zutatenzeilen**: \`alternatives\`, \`purchaseHint\`, \`flavorNote\` bei Bedarf; leere Strings weglassen. Vorrat-Zeilen: keine erfundenen Zutaten ausserhalb von \`ZUTATEN_VORHANDEN\`.
- **shoppingHints** / **equipmentNote** / **nutritionNote** / **optionalUpgradeNote**: siehe Persona; weglassen oder \`""\` wenn nicht passend.
- Wenn **EINKAUFSBEREITSCHAFT = Ja** (in Nutzerdaten): Logik **A)** — \`ingredientsOnHand\` nur aus \`ZUTATEN_VORHANDEN\`; \`ingredientsOnHand\` MUSS ausserdem alle Einträge aus \`ZUTATEN_VORHANDEN\` (mindestens einmal pro Eintrag) abdecken. Einkauf nur in \`ingredientsShopping\`. Zutatenzeilen: so viele wie nötig, um alle \`ZUTATEN_VORHANDEN\` abzudecken (plus optionale Einkaufsteile); **4–6** Kochschritte.
- Wenn **EINKAUFSBEREITSCHAFT = Nein**: Logik **B)** — **strikt**: alle **3** Rezepte müssen \`ingredientsOnHand\` enthalten, das alle Einträge aus \`ZUTATEN_VORHANDEN\` (mindestens einmal pro Eintrag) abdeckt. \`ingredientsShopping\` **immer** \`[]\`; \`shoppingHints\` / \`optionalUpgradeNote\` **nicht** setzen (kein Einkaufs-Freitext).
- **steps** (kritisch): Jeder Eintrag **muss** ein nicht leeres **\`body\`** haben — keine Platzhalter wie „…“. **\`title\`** = kurze Überschrift. **\`body\`** = konkrete Zubereitung (Temperaturen, Zeiten, wann was dazugegeben wird). Mindestens **zwei Sätze** pro Schritt.
- **Schrittqualität**: **4-6** Schritte pro Rezept; jeder \`body\` mit konkreten Handlungsdetails (Reihenfolge, Hitze/Temperatur, Dauer, visuelle Gar-Zeichen). Keine Minimalschritte ohne Inhalt.
- **dishwasherTip**: Regeln und Beispiele **ausschliesslich** in der Persona („Abwasch / Ordnung“). Im Zweifel **weglassen** oder \`""\`. Nicht in \`steps\` wiederholen. (Die App entfernt nur leere oder trivial kurze Strings — inhaltliche Qualität steuerst du im Modell.)
- **Zutatenlisten**: Keine Pseudo-Zeilen („Schon vorhanden“, „Einkauf“) als \`component\` — nur echte Zutaten.
- **Orthographie (verbindlich):** Umlaute **ä**, **ö**, **ü** als echte Zeichen — **nicht** „ae“, „oe“, „ue“. Kein Eszett: **ss** (z. B. *ausschliesslich*, *Strasse*, *Sosse*).
- Alle Texte **Deutsch**.
- **Selbstcheck vor Ausgabe** (still, nicht ausgeben): (1) exakt ${recipesPerCall} Rezepte, (2) Logik A/B korrekt, (3) keine unerlaubten Zutaten, (4) pro Rezept 4-6 Schritte, (5) JSON gueltig.
`;
}

export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  return `${API_MODE_PREAMBLE}${recipeApiPersona}${buildTechnicalJsonAppendix(opts.recipesPerCall)}`;
}

export type RecipeBatchInfo = {
  batchIndex: number;
  totalBatches: number;
};

export function buildUserMessage(input: RecipeGenerationInput, batch: RecipeBatchInfo): string {
  const slotStart = batch.batchIndex * GROQ_RECIPES_PER_BATCH + 1;
  const slotEnd = slotStart + GROQ_RECIPES_PER_BATCH - 1;

  const batchBlock: Record<string, unknown> = {
    INDEX: batch.batchIndex,
    TOTAL_BATCHES: batch.totalBatches,
    REZEPT_SLOTS_DIESES_BATCHES: [slotStart, slotEnd],
    HINWEIS: `Genau ${GROQ_RECIPES_PER_BATCH} Rezepte (Slots ${slotStart}–${slotEnd} von ${GROQ_RECIPES_PER_BATCH}). Die Gerichte sollen sich **untereinander** klar unterscheiden (Küche, Konsistenz, Garverfahren).`,
  };

  const standort =
    input.regionLabel.trim() || "Hedingen (CH)";

  const userPayload = {
    EINKAUFSBEREITSCHAFT: input.willingToShop ? "Ja" : "Nein",
    AKTUELLER_STANDORT: standort,
    ZUTATEN_VORHANDEN_NAMEN_EXAKT: input.pantryLines.map((p) => p.name),
    ZUTATEN_VORHANDEN: input.pantryLines.map((p) => ({
      name: p.name,
      category: p.category,
      preparation: p.status === "precooked" ? "vorgekocht" : "roh / frisch",
    })),
    POLICY:
      input.willingToShop === true
        ? "Einkauf erlaubt: Zusatz-Zutaten nur in ingredientsShopping. ingredientsOnHand MUSS alle Einträge aus ZUTATEN_VORHANDEN (inkl. Mehrfachnennungen) mindestens einmal abdecken; ingredientsOnHand darf nur Zutaten aus ZUTATEN_VORHANDEN enthalten."
        : "STRIKT OHNE EINKAUF: ingredientsOnHand MUSS alle Einträge aus ZUTATEN_VORHANDEN (inkl. Mehrfachnennungen) mindestens einmal abdecken. Jedes ingredientsOnHand.component muss eine Zutat aus ZUTATEN_VORHANDEN sein (keine weiteren Hauptzutaten). ingredientsShopping immer []. shoppingHints und optionalUpgradeNote auslassen.",
    VERBOTEN:
      input.willingToShop === true
        ? ["Pseudo-Zutatenzeilen als component", "Leere Platzhalter-Schritte", "Nicht-JSON-Ausgabe"]
        : [
            "Neue Hauptzutaten ausserhalb ZUTATEN_VORHANDEN",
            "Nicht-leeres ingredientsShopping",
            "Einkaufsauffordernde Texte",
            "Pseudo-Zutatenzeilen als component",
            "Leere Platzhalter-Schritte",
            "Nicht-JSON-Ausgabe",
          ],
    BATCH: batchBlock,
  };
  return `Nutzerdaten (verbindlich):\n${JSON.stringify(userPayload, null, 2)}`;
}
