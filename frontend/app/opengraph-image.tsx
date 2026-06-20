import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/config";

// Generated social card (T36 PART 5). Rendered on demand — no binary asset is
// committed. Next wires this as both og:image and twitter:image. This is a
// TODO-safe placeholder; replace with brand artwork when design is ready.
export const alt = `${SITE_NAME} — AI-powered exam preparation`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            lineHeight: 1.3,
            maxWidth: 900,
            color: "#dbeafe",
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    size,
  );
}
