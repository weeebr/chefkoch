import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

/** Same path as Vercel `api/groq.ts` — avoids CORS (Groq blocks browser origins). */
const groqProxy = {
  target: "https://api.groq.com",
  changeOrigin: true,
  rewrite: () => "/openai/v1/chat/completions",
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api/groq": groqProxy,
    },
  },
  preview: {
    proxy: {
      "/api/groq": groqProxy,
    },
  },
});

