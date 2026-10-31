"use client";

import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabaseClient";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [ready, setReady] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function verifyRecoverySession() {
      setVerifying(true);
      setErrorMessage("");
      try {
        const url = new URL(window.location.href);
        const callbackError = url.searchParams.get("error");
        if (callbackError) {
          if (mounted) {
            setReady(false);
            setErrorMessage(callbackError === "missing_recovery_code"
              ? "The reset link did not contain a recovery code."
              : "This password reset link is invalid, expired, or has already been used.");
          }
          return;
        }
        // Retain the existing recovery flow: the server callback exchanges the code.
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) throw new Error("This password reset link is invalid or has expired.");
        if (mounted) setReady(true);
      } catch (error) {
        console.error("Password recovery verification error:", error);
        if (mounted) {
          setReady(false);
          setErrorMessage(error instanceof Error ? error.message : "This password reset link is invalid or has expired.");
        }
      } finally {
        if (mounted) setVerifying(false);
      }
    }
    void verifyRecoverySession();
    return () => { mounted = false; };
  }, [supabase]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updating || !ready) return;
    setMessage("");
    setErrorMessage("");
    // Do not trim passwords: whitespace may intentionally be part of a password.
    if (!password) { setErrorMessage("Enter a new password."); return; }
    if (password.length < 8) { setErrorMessage("Your new password must contain at least 8 characters."); return; }
    if (password !== confirmPassword) { setErrorMessage("The passwords do not match."); return; }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setPassword("");
      setConfirmPassword("");
      setReady(false);
      setMessage("Password updated successfully. You can now log in with your new password.");
    } catch (error) {
      console.error("Password update error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setUpdating(false);
    }
  }

  const title = verifying ? "Verifying Reset Link" : message ? "Password Updated" : ready ? "Create New Password" : "Reset Link Invalid";
  const subtitle = verifying ? "Checking your password reset request..." : message ? "Your account password has been changed." : ready
    ? "Choose a new password to regain access to your research account." : "This reset link cannot be used. Request a new one below.";

  return (
    <PasswordShell eyebrow="PUGPEP ACCOUNT ACCESS" title={title} subtitle={subtitle}
      footer={<div style={footerRow}><Link href="/login" style={footerLink}>Back to Login</Link><Link href="/" style={footerLinkSecondary}>Return Home</Link></div>}>
      {verifying ? <div role="status" style={{ ...messageBox, ...messageSuccess }}>Verifying your reset request...</div>
        : message ? <>
            <div role="status" style={{ ...messageBox, ...messageSuccess }}>{message}</div>
            <Link href="/login" style={{ ...primaryButton, display: "block", textAlign: "center", textDecoration: "none", marginTop: 18 }}>GO TO LOGIN</Link>
          </>
        : !ready ? <>
            <div role="alert" style={{ ...messageBox, ...messageError }}>{errorMessage || "This reset link has expired or is invalid."}</div>
            <Link href="/forgot-password" style={{ ...primaryButton, display: "block", textAlign: "center", textDecoration: "none", marginTop: 18 }}>REQUEST A NEW RESET LINK</Link>
          </>
        : <>
            <form onSubmit={updatePassword} style={form}>
              <label style={label}>New Password
                <input type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password}
                  onChange={(event) => setPassword(event.target.value)} style={input} minLength={8} required />
              </label>
              <label style={label}>Confirm New Password
                <input type="password" autoComplete="new-password" placeholder="Re-enter new password" value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)} style={input} minLength={8} required />
              </label>
              <button type="submit" disabled={updating} style={{ ...primaryButton, opacity: updating ? .72 : 1, cursor: updating ? "not-allowed" : "pointer" }}>
                {updating ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}
              </button>
            </form>
            {errorMessage && <div role="alert" style={{ ...messageBox, ...messageError }}>{errorMessage}</div>}
          </>}
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
