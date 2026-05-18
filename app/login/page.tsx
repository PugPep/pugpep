"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Logged in successfully.");
      window.location.href = "/";
    }
  }

  return (
    <main style={{ padding: 40, color: "#fff", background: "#000", minHeight: "100vh" }}>
      <h1 style={{ color: "#ff45d8" }}>Login</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10, padding: 10 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 10, padding: 10 }}
      />

      <button onClick={handleLogin}>Login</button>
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