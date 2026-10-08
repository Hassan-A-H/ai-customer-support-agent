import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite runs the React frontend on port 5173.
// The Express API runs on port 3000.
// The proxy forwards frontend API requests to Express.
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,

        // Convert:
        // /api/chat
        //
        // into:
        // /chat
        //
        // because Express exposes POST /chat.
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
