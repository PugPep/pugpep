"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email to confirm your account.");
    }
  }

  return (
    <main style={{ padding: 40, color: "#fff", background: "#000", minHeight: "100vh" }}>
      <h1 style={{ color: "#ff45d8" }}>Create Account</h1>

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

      <button onClick={handleSignup}>Sign Up</button>

      <p>{message}</p>
    </main>
  );
}