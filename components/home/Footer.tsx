"use client";

import Link from "next/link";

const links = [
  { label: "Quality", href: "/quality" },
  { label: "Contact", href: "/contact" },
  { label: "Terms", href: "/terms" },
  { label: "My Lab", href: "/account" },
];

export default function Footer() {
  return (
    <footer style={footer}>
      <div style={container}>
        <div style={top}>
          <div>
            <p style={brand}>PUGPEP</p>
            <h2 style={headline}>Precision Starts Here.</h2>
            <p style={copy}>
              Premium research compounds with transparent quality documentation,
              fast delivery, and a streamlined laboratory experience.
            </p>
          </div>

          <nav style={nav}>
            {links.map((link) => (
              <Link key={link.href} href={link.href} style={navLink}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div style={bottom}>
          <span>© {new Date().getFullYear()} PugPep. All Rights Reserved.</span>
          <span>Research Use Only • Not for Human Consumption</span>
        </div>
      </div>
    </footer>
  );
}

const footer = {
  background: "#020203",
  borderTop: "1px solid rgba(0,217,255,.18)",
  padding: "56px 20px 30px",
  color: "#fff",
};

const container = {
  maxWidth: 1320,
  margin: "0 auto",
};

const top = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 40,
};

const brand = {
  margin: 0,
  color: "#00d9ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".18em",
};

const headline = {
  margin: "10px 0",
  fontSize: "clamp(28px,4vw,44px)",
};

const copy = {
  maxWidth: 600,
  color: "#a8a8b0",
  lineHeight: 1.7,
};

const nav = {
  display: "grid",
  gap: 12,
  alignContent: "start",
};

const navLink = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
};

const bottom = {
  marginTop: 40,
  paddingTop: 20,
  borderTop: "1px solid rgba(255,255,255,.08)",
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: 12,
  color: "#8f8f97",
  fontSize: 13,
};