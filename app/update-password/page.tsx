"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabaseClient";

export default function UpdatePasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
  async function checkRecovery() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error(error);
    }

    if (data.session) {
      setReady(true);
      return;
    }

    setTimeout(async () => {
      const { data: delayedData } = await supabase.auth.getSession();

      if (delayedData.session) {
        setReady(true);
      } else {
        setMessage(
          "Reset link could not be verified. Please request a new password reset email."
        );
      }
    }, 1000);
  }

  checkRecovery();
}, []);

  async function updatePassword() {
    if (!password) {
      alert("Enter a new password.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    localStorage.removeItem("pugpep_password_recovery");
localStorage.removeItem("pugpep_password_recovery");
await supabase.auth.signOut();
setMessage("Password updated successfully. Please log in with your new password.");
  }

  if (!ready) {
    return (
      <main style={page}>
        <section style={box}>
          <h1 style={{ color: "#ff45d8" }}>
            Verifying Reset Link...
          </h1>
        </section>
      </main>
    );
  }

  return (
    <main style={page}>
      <section style={box}>
        <h1 style={{ color: "#ff45d8" }}>
          Create New Password
        </h1>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        <button onClick={updatePassword} style={button}>
          Update Password
        </button>

        {message && (
          <p style={{ color: "#00ff99" }}>
            {message}
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