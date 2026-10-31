"use client";

import { type CSSProperties, type FormEvent, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    setIsError(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      setMessage("If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "We could not send the reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PasswordShell
      eyebrow="PUGPEP ACCOUNT ACCESS"
      title="Forgot Password?"
      subtitle="Enter your account email and we'll send you a link to reset your password."
      footer={<div style={footerRow}><Link href="/login" style={footerLink}>Back to Login</Link><Link href="/" style={footerLinkSecondary}>Return Home</Link></div>}
    >
      <form onSubmit={handleSubmit} style={form}>
        <label style={label}>Email
          <input type="email" autoComplete="email" placeholder="Email address" value={email}
            onChange={(event) => setEmail(event.target.value)} style={input} required />
        </label>
        <button type="submit" disabled={loading} style={{ ...primaryButton, opacity: loading ? .72 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "SENDING RESET LINK..." : "SEND RESET LINK"}
        </button>
      </form>
      {message && <div role={isError ? "alert" : "status"} style={{ ...messageBox, ...(isError ? messageError : messageSuccess) }}>{message}</div>}
    </PasswordShell>
  );
}

function PasswordShell({ eyebrow, title, subtitle, children, footer }: { eyebrow: string; title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="pp-login-page">
      <div className="pp-login-layout">
        <section className="pp-login-visual" aria-label="PugPep — Welcome to the Future of Biotech">
          <img className="pp-login-visual-image" src="/pugpep-login-visual.png" alt="PugPep laboratory mascot and Welcome to the Future of Biotech artwork" />
        </section>
        <section className="pp-login-form-panel">
          <div className="pp-login-form-inner">
            <p className="pp-login-eyebrow">{eyebrow}</p>
            <h1 className="pp-login-heading">{title}</h1>
            <p className="pp-login-subtitle">{subtitle}</p>
            {children}
            <div className="pp-login-footer">{footer}</div>
          </div>
        </section>
      </div>
      <style jsx>{`
        .pp-login-page { min-height: 100vh; display: grid; place-items: center; padding: 90px 22px 40px; box-sizing: border-box; color: #f6faff; background: radial-gradient(ellipse at 0% 30%, rgba(0,132,255,.14), transparent 50%), radial-gradient(ellipse at 100% 60%, rgba(232,34,190,.14), transparent 48%), #080d1b; }
        .pp-login-layout { display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(0, 1fr); width: min(1280px,100%); min-height: 740px; background: #09162b; border: 1px solid rgba(0,204,255,.65); border-right-color: rgba(235,38,208,.55); border-radius: 26px; overflow: hidden; box-shadow: 0 28px 100px rgba(0,0,0,.62), 0 0 38px rgba(0,180,255,.13); }
        .pp-login-visual { position: relative; min-height: 740px; overflow: hidden; background: #123456; }
        .pp-login-visual-image { display: block; position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center center; }
        .pp-login-visual::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 88%, rgba(4,12,29,.17)); pointer-events: none; }
        .pp-login-form-panel { min-width: 0; display: flex; justify-content: center; align-items: center; padding: clamp(27px, 4vw, 64px); box-sizing: border-box; background: radial-gradient(ellipse at 100% 100%,rgba(195,31,176,.13),transparent 57%), linear-gradient(160deg,#0c2242 0%,#0a1a33 45%,#090d21 100%); }
        .pp-login-form-inner { width: 100%; max-width: 440px; }
        .pp-login-eyebrow { font-size: 11px; color: #20ddf6; font-weight: 900; letter-spacing: .24em; margin: 0 0 17px; }
        .pp-login-heading { font-size: clamp(30px, 3vw, 39px); line-height: 1.1; margin: 0 0 12px; letter-spacing: -.03em; color: white; }
        .pp-login-subtitle { font-size: 15px; line-height: 1.6; color: #c6d5e8; margin: 0 0 29px; }
        .pp-login-footer { margin-top: 28px; }
        @media (max-width: 820px) {
          .pp-login-page { padding: 77px 12px 25px; align-items: start; }
          .pp-login-layout { grid-template-columns: minmax(0,1fr); min-height: 0; border-radius: 18px; }
          .pp-login-visual { min-height: 0; height: clamp(260px, 55vw, 460px); }
          .pp-login-visual-image { object-position: center 15%; }
          .pp-login-form-panel { padding: 32px 22px 34px; }
        }
        @media (max-width: 480px) {
          .pp-login-visual { height: 280px; }
          .pp-login-visual-image { object-position: center top; }
          .pp-login-form-panel { padding: 26px 18px 30px; }
          .pp-login-heading { font-size: 30px; }
        }
      `}</style>
    </main>
  );
}

const form: CSSProperties = { display: "grid", gap: 14 };
const label: CSSProperties = { display: "grid", gap: 8, fontWeight: 700, color: "#f6f7fb", fontSize: 14 };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 14, border: "1px solid rgba(187,214,244,.32)", background: "rgba(10,27,49,.82)", color: "#fff", padding: "14px", outline: "none", fontSize: 15, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.03), 0 0 18px rgba(0,217,255,.06)" };
const primaryButton: CSSProperties = { width: "100%", border: "1px solid #00d9ff", borderRadius: 16, padding: "14px 16px", background: "linear-gradient(100deg, #09cbed, #078ce8 48%, #ec1ad2)", color: "#04111b", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase", boxShadow: "0 0 24px rgba(0,217,255,.35)", cursor: "pointer" };
const messageBox: CSSProperties = { marginTop: 16, padding: "14px 16px", borderRadius: 14, fontSize: 14, lineHeight: 1.55, fontWeight: 700 };
const messageSuccess: CSSProperties = { border: "1px solid rgba(0,255,153,.45)", background: "rgba(0,255,153,.10)", color: "#92ffd0" };
const messageError: CSSProperties = { border: "1px solid rgba(255,88,130,.42)", background: "rgba(255,88,130,.10)", color: "#ffb0c1" };
const footerRow: CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" };
const footerLink: CSSProperties = { color: "#86f6ff", textDecoration: "none", fontWeight: 800 };
const footerLinkSecondary: CSSProperties = { color: "#ff87e9", textDecoration: "none", fontWeight: 800 };
