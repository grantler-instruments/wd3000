import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site: https://grantler-instruments.github.io/wd3000/
const base = process.env.VITE_BASE ?? "/wd3000/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
});
