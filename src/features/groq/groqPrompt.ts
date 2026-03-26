import type { RecipeGenerationInput } from "./groqTypes";

const API_MODE_PREAMBLE = `Du bist im strukturierten API-Modus. Verbindliche Nutzerdaten stehen im Nutzer-Zeilenblock (NUTZERDATEN). Keine Wiederholung dieses Prompts.

`;

function escLineValue(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\n/g, " ").trim();
}

function line(key: string, value: string): string {
  return `${key}:${escLineValue(value)}`;
}

export type RecipeBatchInfo = {
  batchIndex: number;
  totalBatches: number;
  recipesPerCall: number;
};

export function buildSharedUserContextPrefix(
  input: RecipeGenerationInput,
  batch: RecipeBatchInfo,
): string {
  const slotStart = batch.batchIndex * batch.recipesPerCall + 1;
  const slotEnd = slotStart + batch.recipesPerCall - 1;
  const totalRecipes = batch.recipesPerCall * batch.totalBatches;
  const standort = input.regionLabel.trim() || "Hedingen (CH)";

  const lines: string[] = [
    "NUTZERDATEN",
    line("EINKAUFSBEREITSCHAFT", input.willingToShop ? "Ja" : "Nein"),
    line("STANDORT", standort),
    line("BATCH_INDEX", String(batch.batchIndex)),
    line("BATCH_TOTAL", String(batch.totalBatches)),
    line("SLOT_START", String(slotStart)),
    line("SLOT_END", String(slotEnd)),
    line(
      "BATCH_HINWEIS",
      `Genau ${batch.recipesPerCall} Rezepte (Slots ${slotStart}–${slotEnd} von ${totalRecipes}). Die Gerichte sollen sich klar unterscheiden (Küche, Konsistenz, Garverfahren, Geschmacksprofil). Nutze VORHER_TITEL und VORHER_PROFIL aktiv, um neue Varianten deutlich abzugrenzen.`,
    ),
  ];

  for (const p of input.pantryLines) {
    const prep = p.status === "precooked" ? "vorgekocht" : "roh / frisch";
    lines.push(line("ZUTAT", `${p.name}|${prep}|${p.category}`));
  }

  const policy =
    input.willingToShop === true
      ? "Einkauf erlaubt: Zusatz-Zutaten nur in ingredientsShopping. ingredientsOnHand MUSS alle ZUTAT-Zeilen (inkl. Mehrfachnennungen) mindestens einmal abdecken; ingredientsOnHand darf nur Zutaten aus ZUTAT enthalten."
      : "STRIKT OHNE EINKAUF: ingredientsOnHand MUSS alle ZUTAT-Zeilen (inkl. Mehrfachnennungen) mindestens einmal abdecken. Jedes ingredientsOnHand.component muss eine Zutat aus ZUTAT sein (keine weiteren Hauptzutaten). ingredientsShopping leer. shoppingHints und optionalUpgradeNote auslassen.";

  lines.push(line("POLICY", policy));

  const verbote =
    input.willingToShop === true
      ? ["Pseudo-Zutatenzeilen als component", "Leere Platzhalter-Schritte"]
      : [
          "Neue Hauptzutaten ausserhalb ZUTAT",
          "Nicht-leeres ingredientsShopping",
          "Einkaufsauffordernde Texte",
          "Pseudo-Zutatenzeilen als component",
          "Leere Platzhalter-Schritte",
        ];
  for (const v of verbote) {
    lines.push(line("VERBOTEN", v));
  }

  for (const t of input.previousRecipeTitles ?? []) {
    if (t.trim()) lines.push(line("VORHER_TITEL", t.trim()));
  }
  for (const p of input.previousRecipeHints ?? []) {
    const parts = [
      p.title.trim(),
      p.tag?.trim() || "kein-tag",
      p.equipmentNote?.trim() || "kein-setup",
      p.flavorNote?.trim() || "kein-flavor",
    ];
    lines.push(line("VORHER_PROFIL", parts.join(" | ")));
  }

  return `${lines.join("\n")}\n`;
}

/**
 * One-shot JSON output mode (single Groq call).
 * The model must return exactly one JSON object matching the Groq JSON Schema contract.
 */
const JSON_MODE_SYSTEM_APPENDIX = `
---
### JSON-MODE — Nur strukturierte Antwort
- Keine Einleitung, keine Markdown-Fences, keine Erläuterungen: **nur** ein JSON-Objekt.
- Keine zusätzlichen Felder ausser denen im Schema.
- Orthographie: ä ö ü als echte Zeichen — kein „ae/oe/ue“. Kein Eszett: ss.
- Alle Texte **Deutsch**.
`;

export function buildJsonRecipeOrchestrationSystemPrompt(): string {
  return `${API_MODE_PREAMBLE}${JSON_MODE_SYSTEM_APPENDIX}`;
}

export function buildOneShotJsonRecipeUserPrompt(
  input: RecipeGenerationInput,
  batch: RecipeBatchInfo,
): string {
  const prefix = buildSharedUserContextPrefix(input, batch);
  const instruction = [
    `AUFGABE`,
    `Antworte als EIN JSON-Objekt mit folgenden Schlüsseln (und keine anderen):`,
    `title, tag, servings, prepMinutes, cookMinutes, minutes,`,
    `ingredientsOnHand, ingredientsShopping,`,
    `equipmentNote, nutritionNote, optionalUpgradeNote, shoppingHints, dishwasherTip,`,
    `steps.`,
    ``,
    `Formate-Regeln:`,
    `- title darf keine Zutaten aufzählen oder benennen; besonders keine "mit ..."-Konstruktion.`,
    `- steps ist ein Array mit >= 1 Einträgen; je Eintrag: { order:number, title:string, body:string }`,
    `- ingredientsOnHand ist ein Array von { component:string, quantity:string, alternatives:string, purchaseHint:string, flavorNote:string } (alle Felder vorhanden; leere Strings ok),`,
    `- ingredientsShopping ist ein Array mit demselben Element-Typ; wenn willingToShop=false: bitte []`,
    `- Alle Zeitfelder sind ganze Zahlen >= 0.`,
    `- flavorNote nur setzen, wenn der Hinweis wirklich kochrelevant ist (ansonsten leerer String).`,
    `- alternatives primär für ingredientsShopping verwenden; bei ingredientsOnHand bitte leer lassen, ausser es ist aussergewöhnlich hilfreich.`,
    `- alternatives müssen echte Ersatz-Zutatennamen sein (z. B. "Schnittlauch"), keine reine Form-/Verarbeitungsangabe (z. B. "getrocknet", "TK gehackt").`,
    `- steps.body: handlungsorientierter Text ohne zusätzliche Überschriften mit ':' innerhalb des Fliesstexts.`,
    `- Wenn VORHER_PROFIL vorhanden ist: Das neue Rezept muss sich mindestens im Geschmacksprofil unterscheiden und möglichst auch im Setup (equipmentNote).`,
    ``,
    `Nutze Zutaten-Komponenten exakt aus den NUTZERDATEN-ZUTAT:-Zeilen (vor dem ersten '|') für die component-Felder.`,
  ].join("\n");

  return `${prefix}\n${instruction}\n`;
}
