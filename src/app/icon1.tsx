import { ImageResponse } from "next/og";

export const contentType = "image/png";

export const size = { width: 192, height: 192 };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: "#c4b5fd",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 700,
          letterSpacing: -2,
        }}
      >
        PLAN
      </div>
    ),
    { ...size },
  );
}
