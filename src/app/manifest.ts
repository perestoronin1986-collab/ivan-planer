import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IvanPlaner",
    short_name: "Plan",
    description: "Личный планер задач",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#c4b5fd",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
