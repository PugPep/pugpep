"use client";

import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

const LOGO_PATH = "/pugpep-logo.png";

export default function AuthShell({
  eyebrow = "PUGPEP ACCESS",
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main style={page}>
      <div style={orbPink} />
      <div style={orbBlue} />
      <div style={orbGreen} />

      <section style={shell}>
        <div style={logoGlow} />

        <div
          style={{
            ...logoBackdrop,
            backgroundImage: `url(${LOGO_PATH})`,
          }}
        />

        <div style={content}>
          <p style={eyebrowStyle}>
            {eyebrow}
          </p>

          <h1 style={titleStyle}>
            {title}
          </h1>

          {subtitle ? (
            <p style={subtitleStyle}>
              {subtitle}
            </p>
          ) : null}

          <div style={body}>
            {children}
          </div>

          {footer ? (
            <div style={footerWrap}>
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  position: "relative" as const,
  overflow: "hidden",
  padding: "24px 16px",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(circle at 12% 15%, rgba(255,0,153,.28), transparent 28%), radial-gradient(circle at 84% 18%, rgba(0,217,255,.28), transparent 30%), radial-gradient(circle at 48% 90%, rgba(0,255,153,.18), transparent 26%), linear-gradient(135deg, #0a0a16 0%, #100816 42%, #07111a 100%)",
  color: "#fff",
};

const shell = {
  position: "relative" as const,
  width: "100%",
  maxWidth: 620,
  borderRadius: 28,
  overflow: "hidden",
  border:
    "1px solid rgba(255,255,255,.18)",
  background:
    "rgba(10, 12, 22, 0.20)",
  boxShadow:
    "0 0 0 1px rgba(255,255,255,.05) inset, 0 24px 80px rgba(0,0,0,.46), 0 0 55px rgba(255,0,153,.24), 0 0 75px rgba(0,217,255,.18)",
  backdropFilter:
    "blur(6px) saturate(115%)",
  WebkitBackdropFilter:
    "blur(6px) saturate(115%)",
};

const content = {
  position: "relative" as const,
  zIndex: 2,
  padding: "30px 24px 26px",
};

const logoBackdrop = {
  position: "absolute" as const,
  inset: 0,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "78%",
  opacity: 0.20,
  filter:
    "drop-shadow(0 0 18px rgba(255,0,153,.24)) drop-shadow(0 0 24px rgba(0,217,255,.14))",
  pointerEvents: "none" as const,
};

const logoGlow = {
  position: "absolute" as const,
  inset: "-20%",
  background:
    "radial-gradient(circle at 45% 45%, rgba(255,0,153,.10), transparent 28%), radial-gradient(circle at 60% 52%, rgba(0,217,255,.09), transparent 30%), radial-gradient(circle at 50% 70%, rgba(0,255,153,.05), transparent 24%)",
  pointerEvents: "none" as const,
};

const eyebrowStyle = {
  margin: 0,
  color: "#75f6ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".22em",
  textTransform:
    "uppercase" as const,
  textShadow:
    "0 0 12px rgba(0,217,255,.55)",
};

const titleStyle = {
  margin: "8px 0 8px",
  fontSize:
    "clamp(30px, 5vw, 42px)",
  lineHeight: 1.05,
  fontWeight: 1000,
  letterSpacing: "-.03em",
  color: "#ffffff",
  textShadow:
    "0 0 18px rgba(255,0,153,.42), 0 0 26px rgba(0,217,255,.30)",
};

const subtitleStyle = {
  margin: "0 0 22px",
  color:
    "rgba(255,255,255,.84)",
  lineHeight: 1.6,
  fontSize: 15,
};

const body = {
  position: "relative" as const,
  zIndex: 2,
};

const footerWrap = {
  marginTop: 22,
  position: "relative" as const,
  zIndex: 2,
};

const orbPink = {
  position: "absolute" as const,
  width: 320,
  height: 320,
  borderRadius: "50%",
  top: -90,
  left: -80,
  background:
    "rgba(255,0,153,.12)",
  filter: "blur(34px)",
};

const orbBlue = {
  position: "absolute" as const,
  width: 300,
  height: 300,
  borderRadius: "50%",
  top: 50,
  right: -90,
  background:
    "rgba(0,217,255,.12)",
  filter: "blur(34px)",
};

const orbGreen = {
  position: "absolute" as const,
  width: 280,
  height: 280,
  borderRadius: "50%",
  bottom: -70,
  left: "30%",
  background:
    "rgba(0,255,153,.08)",
  filter: "blur(32px)",
};
