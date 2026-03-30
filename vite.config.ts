import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { generateRecipeMiddleware } from "./src/server/generateRecipeMiddleware";

export default defineConfig({
  plugins: [react(), generateRecipeMiddleware()],
  server: {
    port: 5173,
  },
});
