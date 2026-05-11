import { defineConfig } from "vite";

import react from "@vitejs/plugin-react";

import { VitePWA }
  from "vite-plugin-pwa";

export default defineConfig({

  plugins: [

    react(),

    VitePWA({

      registerType:
        "autoUpdate",

      manifest: {

        name:
          "Frazon's Least Count",

        short_name:
          "Least Count",

        description:
          "Neon card game tracker",

        theme_color:
          "#0d0d0d",

        background_color:
          "#0d0d0d",

        display:
          "standalone",

        start_url:
          "/",

        icons: [

          {
            src: "new icon-512.png",

            sizes: "192x192",

            type: "image/png"
          },

          {
            src: "new icon-512.png",

            sizes: "512x512",

            type: "image/png"
          }

        ]
      }
    })
  ]
});