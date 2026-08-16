"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    const redirect =
      localStorage.getItem("pugpep_redirect_after_login") || "/";

    localStorage.removeItem("pugpep_redirect_after_login");

    setMessage("Logged in successfully.");
    window.location.href = redirect;
  }

  return (
    <main
      style={{
        padding: 40,
        color: "#fff",
        background: "#000",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#ff45d8" }}>Login</h1>

      <form
        onSubmit={handleLogin}
        style={{
          maxWidth: 420,
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 10,
            padding: 10,
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 10,
            padding: 10,
          }}
        />

        <button
          type="submit"
          disabled={submitting}
          style={{
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Logging In..." : "Login"}
        </button>
      </form>

      <p style={{ marginTop: 14 }}>
        <a
          href="/forgot-password"
          style={{
            color: "#00d9ff",
            textDecoration: "none",
          }}
        >
          Forgot Password?
        </a>
      </p>

      <p>{message}</p>
    </main>
  );
}