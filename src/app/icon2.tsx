import { ImageResponse } from "next/og";

export const contentType = "image/png";

export const size = { width: 512, height: 512 };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 160,
          background: "#c4b5fd",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          letterSpacing: -6,
        }}
      >
        PLAN
      </div>
    ),
    { ...size },
  );
}
