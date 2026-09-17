import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IvanPlaner",
    short_name: "Plan",
    description: "Личный планер задач",
    start_url: "/login",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c4b5fd",
    // Долгое нажатие на иконку PWA → «Записать мысль»: открывает инбокс и
    // сразу просит диктовку, без навигации по приложению.
    shortcuts: [
      {
        name: "Записать мысль",
        short_name: "Мысль",
        url: "/inbox?rec=1",
        icons: [{ src: "/icon1", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      {
        src: "/icon1",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
