import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { generateRecipeOnceWithGroqJsonSchema } from "./src/server/groqGenerateRecipe";
import { generateRecipeRequestSchema } from "./src/server/groqGenerateRecipeRequest";

function generateRecipeMiddleware() {
  return {
    name: "generate-recipe-middleware",
    configureServer(server: any) {
      const corsHeaders: Record<string, string> = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, x-groq-api-key",
      };

      server.middlewares.use(
        "/api/generate-recipe",
        async (req: any, res: any, next: any) => {
          try {
            if (req.method === "OPTIONS") {
              res.writeHead(204, corsHeaders);
              res.end();
              return;
            }
            if (req.method !== "POST") return next();

            const bodyText = await new Promise<string>((resolve, reject) => {
              let acc = "";
              req.on("data", (chunk: any) => {
                acc += chunk.toString("utf8");
              });
              req.on("end", () => resolve(acc));
              req.on("error", reject);
            });

            let payload: unknown;
            try {
              payload = bodyText.trim() ? JSON.parse(bodyText) : {};
            } catch {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ error: { message: "Invalid JSON body." } }),
              );
              return;
            }

            const apiKeyHeader = req.headers["x-groq-api-key"];
            const apiKey =
              typeof apiKeyHeader === "string"
                ? apiKeyHeader
                : Array.isArray(apiKeyHeader)
                  ? apiKeyHeader[0] ?? ""
                  : "";
            if (!apiKey.trim()) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: {
                    message:
                      "Missing x-groq-api-key header. Bitte Groq-Schlüssel in Settings setzen.",
                  },
                }),
              );
              return;
            }

            const requestResult = generateRecipeRequestSchema.safeParse(payload);
            if (!requestResult.success) {
              const first = requestResult.error.issues[0];
              const where = first?.path?.join(".") || "body";
              const why = first?.message || "Invalid request payload.";
              res.writeHead(400, {
                "Content-Type": "application/json; charset=utf-8",
                ...corsHeaders,
              });
              res.end(JSON.stringify({ error: { message: `${where}: ${why}` } }));
              return;
            }

            const result = await generateRecipeOnceWithGroqJsonSchema(
              apiKey,
              requestResult.data,
            );

            res.writeHead(200, {
              "Content-Type": "application/json; charset=utf-8",
              ...corsHeaders,
            });
            res.end(
              JSON.stringify({
                recipe: result.recipe,
                totalTokens: result.totalTokens,
                finishReason: result.finishReason,
              }),
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Generate failed.";
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", ...corsHeaders });
            res.end(JSON.stringify({ error: { message: msg } }));
          }
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), generateRecipeMiddleware()],
  server: {
    port: 5173,
  },
});

