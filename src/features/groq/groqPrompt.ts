/**
 * Prompt composition: interpolates runtime variables into the canonical prompt.
 * OWNERSHIP: variable interpolation and fragment selection only.
 * FORBIDDEN: behavioral/policy instruction text. All instructions live in recipe-api-persona.md.
 */
import type { RecipeGenerationInput } from "./groqTypes";

export type RecipeBatchInfo = {
  batchIndex: number;
  totalBatches: number;
  recipesPerCall: number;
};

function extractSection(source: string, name: string): string {
  const marker = `<!-- @section:${name} -->`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Missing prompt section: ${name}`);
  const contentStart = start + marker.length;
  const nextMarker = source.indexOf("<!-- @section:", contentStart);
  const content =
    nextMarker === -1
      ? source.slice(contentStart)
      : source.slice(contentStart, nextMarker);
  return content.trim();
}

export function buildSystemPrompt(
  canonicalPromptSource: string,
  willingToShop: boolean,
): string {
  const system = extractSection(canonicalPromptSource, "SYSTEM");
  const policy = willingToShop
    ? extractSection(canonicalPromptSource, "POLICY_SHOPPING")
    : extractSection(canonicalPromptSource, "POLICY_NO_SHOPPING");
  return `${system}\n\n${policy}`;
}

function escLineValue(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\n/g, " ").trim();
}

function line(key: string, value: string): string {
  return `${key}:${escLineValue(value)}`;
}

export function buildUserPrompt(
  input: RecipeGenerationInput,
  batch: RecipeBatchInfo,
): string {
  const slotStart = batch.batchIndex * batch.recipesPerCall + 1;
  const slotEnd = slotStart + batch.recipesPerCall - 1;
  const totalRecipes = batch.recipesPerCall * batch.totalBatches;
  const location = input.regionLabel.trim() || "Hedingen (CH)";

  const lines: string[] = [
    "NUTZERDATEN",
    line("WILLING_TO_SHOP", input.willingToShop ? "Yes" : "No"),
    line(
      "STRICT_USE_ALL_SELECTED",
      input.strictUseAllSelected ? "Yes" : "No",
    ),
    line("LOCATION", location),
    line("BATCH_INDEX", String(batch.batchIndex)),
    line("BATCH_TOTAL", String(batch.totalBatches)),
    line("SLOT_RANGE", `${slotStart}–${slotEnd} of ${totalRecipes}`),
    line(
      "USE_STARCH_BASE_THIS_SLOT",
      input.useStarchBaseThisSlot ? "Yes" : "No",
    ),
    line("USE_CREATIVE_THIS_SLOT", input.useCreativeThisSlot ? "Yes" : "No"),
    line(
      "PREVIOUS_SLOT_USED_STARCH_BASE",
      input.previousSlotUsedStarchBase == null
        ? "Unknown"
        : input.previousSlotUsedStarchBase
          ? "Yes"
          : "No",
    ),
    line(
      "PREVIOUS_SLOT_CREATIVE_MODE",
      input.previousSlotCreativeMode ?? "Unknown",
    ),
  ];

  for (const p of input.pantryLines) {
    if (p.status === "spice") {
      lines.push(line("SPICE_INGREDIENT", `${p.name}|spice|${p.category}`));
      continue;
    }
    const prep = p.status === "precooked" ? "precooked" : "raw";
    lines.push(line("INGREDIENT", `${p.name}|${prep}|${p.category}`));
  }

  for (const t of input.previousRecipeTitles ?? []) {
    if (t.trim()) lines.push(line("PREVIOUS_TITLE", t.trim()));
  }
  for (const p of input.previousRecipeHints ?? []) {
    const parts = [
      p.title.trim(),
      p.tag?.trim() || "no-tag",
      p.equipmentNote?.trim() || "no-setup",
      p.flavorNote?.trim() || "no-flavor",
    ];
    lines.push(line("PREVIOUS_PROFILE", parts.join(" | ")));
  }

  return `${lines.join("\n")}\n\nGenerate exactly ${batch.recipesPerCall} recipe(s) for slots ${slotStart}–${slotEnd}.\n`;
}
