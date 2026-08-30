"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabaseClient";
import AuthShell from "../../components/auth/AuthShell";

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
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        "Password reset email sent. Check your inbox and follow the reset link."
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not send the reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="PUGPEP PASSWORD RECOVERY"
      title="Forgot Password"
      subtitle="Use the same neon glass-card design as login and registration, with a cleaner vibrant look and less heavy black."
      footer={
        <div style={footerRow}>
          <Link href="/login" style={footerLink}>
            Back to Login
          </Link>
          <Link href="/" style={footerLinkSecondary}>
            Return Home
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={form}>
        <label style={label}>
          Email
          <input
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={input}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...primaryButton,
            opacity: loading ? 0.72 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "SENDING RESET LINK..." : "SEND RESET LINK"}
        </button>
      </form>

      {message ? (
        <div
          style={{
            ...messageBox,
            ...(isError ? messageError : messageSuccess),
          }}
        >
          {message}
        </div>
      ) : null}
    </AuthShell>
  );
}

const form = {
  display: "grid",
  gap: 14,
};

const label = {
  display: "grid",
  gap: 8,
  fontWeight: 700,
  color: "#f6f7fb",
  fontSize: 14,
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(8, 14, 24, .54)",
  color: "#fff",
  padding: "14px 14px",
  outline: "none",
  fontSize: 15,
  boxShadow:
    "inset 0 0 0 1px rgba(255,255,255,.03), 0 0 18px rgba(0,217,255,.06)",
};

const primaryButton = {
  border: "1px solid #00d9ff",
  borderRadius: 16,
  padding: "14px 16px",
  background:
    "linear-gradient(135deg, rgba(0,217,255,.94), rgba(0,132,255,.88))",
  color: "#04111b",
  fontWeight: 1000,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  boxShadow: "0 0 24px rgba(0,217,255,.35)",
};

const messageBox = {
  marginTop: 16,
  padding: "14px 16px",
  borderRadius: 14,
  fontSize: 14,
  lineHeight: 1.55,
  fontWeight: 700,
};

const messageSuccess = {
  border: "1px solid rgba(0,255,153,.45)",
  background: "rgba(0,255,153,.10)",
  color: "#92ffd0",
  boxShadow: "0 0 18px rgba(0,255,153,.14)",
};

const messageError = {
  border: "1px solid rgba(255,88,130,.42)",
  background: "rgba(255,88,130,.10)",
  color: "#ffb0c1",
  boxShadow: "0 0 18px rgba(255,88,130,.12)",
};

const footerRow = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap" as const,
  justifyContent: "space-between",
  alignItems: "center",
};

const footerLink = {
  color: "#86f6ff",
  textDecoration: "none",
  fontWeight: 800,
};

const footerLinkSecondary = {
  color: "#ff87e9",
  textDecoration: "none",
  fontWeight: 800,
};