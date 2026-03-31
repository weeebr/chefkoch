import { z } from "zod";
import type { GroqIngredientLine, GroqRecipeJson, GroqStepLine } from "../features/groq/groqTypes";

/**
 * Groq contract: boring JSON Schema backed by Zod.
 * Kept intentionally plain so Groq structured outputs behave reliably.
 */

export const groqIngredientLineSchema: z.ZodType<GroqIngredientLine> = z
  .object({
    // Model MUST use `component` names (the client maps chips by matching component substrings).
    component: z.string().min(1),

    // Model MUST provide at least some quantity-like text for the UI to display.
    quantity: z.string().min(1),

    // Optional extras: if model doesn’t know, output empty string (still valid) or omit.
    // (We allow omission to keep the contract tolerant.)
    alternatives: z.string().optional(),
    purchaseHint: z.string().optional(),
    flavorNote: z.string().optional(),
  })
  .strict();

const groqSpiceIngredientLineSchema: z.ZodType<GroqIngredientLine> = z
  .object({
    component: z.string().min(1),
    // Spice quantities can be omitted by the model; we normalize downstream.
    quantity: z.string(),
    alternatives: z.string().optional(),
    purchaseHint: z.string().optional(),
    flavorNote: z.string().optional(),
  })
  .strict();

export const groqStepLineSchema: z.ZodType<GroqStepLine> = z
  .object({
    order: z.number().int().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
  })
  .strict();

// IMPORTANT: Groq rejects JSON Schemas that contain top-level `oneOf`/`anyOf`/`not`/`enum`.
// Zod effects (`refine`/`superRefine`) often translate to those constructs.
// So we keep `groqRecipeContractProviderSchema` *plain* for `response_format`,
// and apply cheap invariants only in Zod `safeParse()` later.
export const groqRecipeContractProviderSchema: z.ZodType<GroqRecipeJson> = z
  .object({
    title: z.string().min(1),
    tag: z.string().min(1),

    servings: z.number().int().min(1).max(99),
    minutes: z.number().int().min(0),

    ingredientsOnHand: z.array(groqIngredientLineSchema).min(1),
    ingredientsShopping: z.array(groqIngredientLineSchema),
    /** Explicit spices (not implicit base staples); may be empty. */
    spices: z.array(groqSpiceIngredientLineSchema),
    /** Canonical base staple names this recipe needs from the fixed implicit list. */
    requiredBaseStaples: z.array(z.string()),

    equipmentNote: z.string(),
    nutritionNote: z.string(),
    optionalUpgradeNote: z.string(),
    shoppingHints: z.string(),
    dishwasherTip: z.string(),

    // steps[] is the canonical structure in one-shot JSON mode.
    steps: z.array(groqStepLineSchema).min(4).max(7),
  })
  .strict();

export const groqRecipeContractSchema: z.ZodType<GroqRecipeJson> = groqRecipeContractProviderSchema;

export type GroqRecipeContract = z.infer<typeof groqRecipeContractSchema>;

/**
 * Groq-compatible JSON Schema for `response_format: { type: "json_schema" }`.
 *
 * We intentionally keep this schema literal and boring:
 * - `type: "object"` at the root
 * - no root `$ref`
 * - no root `oneOf`/`anyOf`/`enum`/`not`
 *
 * Zod remains the real single source of truth for validation (`safeParse`).
 */
const groqRecipeJsonSchemaForResponseFormat: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "tag",
    "servings",
    "minutes",
    "ingredientsOnHand",
    "ingredientsShopping",
    "spices",
    "requiredBaseStaples",
    "equipmentNote",
    "nutritionNote",
    "optionalUpgradeNote",
    "shoppingHints",
    "dishwasherTip",
    "steps",
  ],
  properties: {
    title: { type: "string", minLength: 1 },
    tag: { type: "string", minLength: 1 },
    servings: { type: "integer", minimum: 1, maximum: 99 },
    minutes: { type: "integer", minimum: 0 },
    ingredientsOnHand: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "component",
          "quantity",
          "alternatives",
          "purchaseHint",
          "flavorNote",
        ],
        properties: {
          component: { type: "string", minLength: 1 },
          quantity: { type: "string" },
          alternatives: { type: "string" },
          purchaseHint: { type: "string" },
          flavorNote: { type: "string" },
        },
      },
    },
    ingredientsShopping: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "component",
          "quantity",
          "alternatives",
          "purchaseHint",
          "flavorNote",
        ],
        properties: {
          component: { type: "string", minLength: 1 },
          quantity: { type: "string", minLength: 1 },
          alternatives: { type: "string" },
          purchaseHint: { type: "string" },
          flavorNote: { type: "string" },
        },
      },
    },
    spices: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "component",
          "quantity",
          "alternatives",
          "purchaseHint",
          "flavorNote",
        ],
        properties: {
          component: { type: "string", minLength: 1 },
          quantity: { type: "string", minLength: 1 },
          alternatives: { type: "string" },
          purchaseHint: { type: "string" },
          flavorNote: { type: "string" },
        },
      },
    },
    requiredBaseStaples: {
      type: "array",
      items: { type: "string" },
    },
    equipmentNote: { type: "string" },
    nutritionNote: { type: "string" },
    optionalUpgradeNote: { type: "string" },
    shoppingHints: { type: "string" },
    dishwasherTip: { type: "string" },
    steps: {
      type: "array",
      minItems: 4,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["order", "title", "body"],
        properties: {
          order: { type: "integer", minimum: 1 },
          title: { type: "string", minLength: 1 },
          body: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

/**
 * JSON schema for Groq structured outputs.
 * The Groq `strict: true` option on top will enforce the schema at decoding time.
 */
export function getGroqRecipeJsonSchema(): Record<string, unknown> {
  return groqRecipeJsonSchemaForResponseFormat;
}

