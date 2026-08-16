"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendResetEmail(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (sending) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Enter your email address.");
      return;
    }

    setSending(true);
    setMessage("");
    setErrorMessage("");

    try {
      const callbackUrl = new URL(
        "/auth/callback",
        window.location.origin
      );

      callbackUrl.searchParams.set(
        "next",
        "/update-password"
      );

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: callbackUrl.toString(),
          }
        );

      if (error) {
        throw error;
      }

      setMessage(
        "Password reset email sent. Check your inbox and spam folder."
      );
    } catch (error) {
      console.error(
        "Password reset email error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send the reset email. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={page}>
      <section style={box}>
        <h1 style={{ color: "#ff45d8" }}>
          Forgot Password
        </h1>

        <p
          style={{
            color: "#aaaaaa",
            lineHeight: 1.6,
          }}
        >
          Enter the email address connected
          to your account.
        </p>

        <form onSubmit={sendResetEmail}>
          <input
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            style={input}
            required
          />

          <button
            type="submit"
            disabled={sending}
            style={{
              ...button,
              opacity: sending ? 0.65 : 1,
              cursor: sending
                ? "not-allowed"
                : "pointer",
            }}
          >
            {sending
              ? "Sending..."
              : "Send Reset Email"}
          </button>
        </form>

        {message && (
          <p style={{ color: "#00ff99" }}>
            {message}
          </p>
        )}

        {errorMessage && (
          <p style={{ color: "#ff6666" }}>
            {errorMessage}
          </p>
        )}
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: 35,
};

const box = {
  maxWidth: 500,
  margin: "60px auto",
  padding: 25,
  border: "1px solid #333",
  borderRadius: 14,
  background: "#080808",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 12,
  marginBottom: 14,
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  borderRadius: 8,
};

const button = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "none",
  background:
    "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
};