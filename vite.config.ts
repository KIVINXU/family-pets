import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
      },
      manifest: {
        name: "家庭幻兽奖励",
        short_name: "幻兽奖励",
        theme_color: "#42a978",
        background_color: "#f4faf2",
        display: "standalone",
        orientation: "portrait",
        icons: [],
      },
    }),
  ],
});
