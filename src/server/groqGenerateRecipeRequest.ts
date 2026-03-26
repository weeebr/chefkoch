import { z } from "zod";

const pantryLineSchema = z
  .object({
    name: z.string().min(1),
    category: z.string().min(1),
    status: z.union([z.literal("raw"), z.literal("precooked")]),
  })
  .strict();

const previousRecipeHintSchema = z
  .object({
    title: z.string().min(1),
    tag: z.string().optional(),
    equipmentNote: z.string().optional(),
    flavorNote: z.string().optional(),
  })
  .strict();

export const generateRecipeRequestSchema = z
  .object({
    pantryLines: z.array(pantryLineSchema).min(1),
    willingToShop: z.boolean(),
    regionLabel: z.string(),
    previousRecipeTitles: z.array(z.string()).optional(),
    previousRecipeHints: z.array(previousRecipeHintSchema).optional(),
    generationIndex: z.number().int().min(0).default(0),
    totalRecipesToGenerate: z.number().int().min(1).default(1),
  })
  .strict();

export type GenerateRecipeRequestPayload = z.infer<typeof generateRecipeRequestSchema>;
