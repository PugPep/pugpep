"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function sendResetEmail() {
    if (!email) return alert("Enter your email.");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: "https://pugpep.com/update-password",
    });
localStorage.setItem("pugpep_password_recovery", "yes");
    if (error) {
      alert(error.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox.");
  }

  return (
    <main style={page}>
      <section style={box}>
        <h1 style={{ color: "#ff45d8" }}>Forgot Password</h1>

        <input
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <button onClick={sendResetEmail} style={button}>
            
          Send Reset Email
        </button>

        {message && <p style={{ color: "#00ff99" }}>{message}</p>}
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
  background: "linear-gradient(90deg, #00b7ff, #ff2fd0)",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};